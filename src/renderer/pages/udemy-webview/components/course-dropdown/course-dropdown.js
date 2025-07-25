/**
 * CourseDropdown Component
 * Handles the dropdown that shows user courses when hovering over My Learning button
 */
class CourseDropdown {
    constructor(options = {}) {
        this.options = {
            triggerId: 'my-learning-btn',
            containerId: 'courses-dropdown-container',
            apiEndpoint: 'fetch-user-courses',
            cacheDuration: 30000, // 30 seconds
            onCourseClick: null,
            onViewAllClick: null,
            onLoginClick: null,
            ...options
        };
        
        this.triggerElement = null;
        this.dropdownElement = null;
        this.container = null;
        
        // State
        this.coursesCache = null;
        this.cacheTimestamp = 0;
        this.dropdownTimeout = null;
        this.isVisible = false;
        
        this.init();
    }

    init() {
        this.createDropdown();
        this.setupEventListeners();
    
    }

    createDropdown() {
        // Get trigger element and container
        this.triggerElement = document.getElementById(this.options.triggerId);
        this.container = document.getElementById(this.options.containerId);
        
        if (!this.triggerElement || !this.container) {
            return;
        }

        // Create dropdown HTML
        const dropdownHTML = `
            <div class="courses-dropdown" id="courses-dropdown">
                <div class="loading-spinner">Cargando cursos...</div>
            </div>
        `;
        
        this.container.innerHTML = dropdownHTML;
        this.dropdownElement = document.getElementById('courses-dropdown');
    }

    setupEventListeners() {
        if (!this.triggerElement || !this.dropdownElement) return;

        // Mouse hover events for dropdown
        this.triggerElement.addEventListener('mouseenter', () => {
            clearTimeout(this.dropdownTimeout);
            this.show();
        });

        this.triggerElement.addEventListener('mouseleave', () => {
            this.dropdownTimeout = setTimeout(() => {
                this.hide();
            }, 200);
        });

        // Keep dropdown visible when mouse is over it
        this.dropdownElement.addEventListener('mouseenter', () => {
            clearTimeout(this.dropdownTimeout);
        });

        this.dropdownElement.addEventListener('mouseleave', () => {
            this.hide();
        });
    }

    async show(forceRefresh = false) {
        
        // Check if user is authenticated first
        if (!this.isUserAuthenticated()) {
            this.render(null, false, 'Por favor inicia sesión para ver tus cursos');
            this.dropdownElement.classList.add('show');
            this.isVisible = true;
            return;
        }
        
        // Show dropdown immediately
        this.dropdownElement.classList.add('show');
        this.isVisible = true;
        
        // Show loading state
        this.render(null, true);
        
        try {
            const courses = await this.fetchCourses(forceRefresh);
            this.render(courses);
        } catch (error) {
            this.render(null, false, error.message);
        }
    }

    hide() {
        this.dropdownElement.classList.remove('show');
        this.isVisible = false;
    }

    async fetchCourses(forceRefresh = false) {
        const now = Date.now();
        
        // Return cached data if still valid and not forcing refresh
        if (!forceRefresh && this.coursesCache && (now - this.cacheTimestamp < this.options.cacheDuration)) {
            return this.coursesCache;
        }

        // Get auth token from app localStorage
        const authToken = this.getAuthToken();
        if (!authToken) {
            throw new Error('No auth token found in app storage. Please log in again.');
        }


        // Make API call through main process
        const response = await window.electronAPI.invoke(this.options.apiEndpoint, {
            authToken: authToken,
            forceRefresh: forceRefresh
        });

      

        if (response && response.success) {
            // Ensure response.data is always an array
            let coursesData = response.data;
            
            if (!Array.isArray(coursesData)) {
                if (coursesData && typeof coursesData === 'object') {
                    coursesData = coursesData.courses || coursesData.results || coursesData.data || [];
                } else {
                    coursesData = [];
                }
            }
            
            this.coursesCache = coursesData;
            this.cacheTimestamp = now;
            return this.coursesCache;
        } else {
            throw new Error(response?.error || 'Failed to fetch courses');
        }
    }

    render(courses = null, isLoading = false, error = null) {
        let html = '';

        // Ensure courses is always an array when provided
        if (courses && !Array.isArray(courses)) {
            if (typeof courses === 'object') {
                courses = courses.courses || courses.results || courses.data || [];
            } else {
                courses = [];
            }
        }

        if (isLoading) {
            html = '<div class="loading-spinner">Cargando cursos...</div>';
        } else if (error) {
            const isAuthError = error.includes('auth token') || error.includes('login');
            
            html = `
                <div class="error-message">
                    ${isAuthError ? '🔐' : '❌'} ${error}
                    <br>
                    ${isAuthError ? 
                        '<button class="retry-btn" onclick="window.coursePage?.navigateToLogin()">Iniciar Sesión</button>' :
                        '<button class="retry-btn" onclick="window.courseDropdown?.show(true)">Reintentar</button>'
                    }
                </div>
            `;
        } else if (!courses || courses.length === 0) {
            html = `
                <div class="empty-state">
                    No tienes cursos matriculados aún.
                    <br>
                    <small>¡Explora nuestro catálogo!</small>
                </div>
            `;
        } else {
            // Header
            const courseCount = Array.isArray(courses) ? courses.length : 0;
            html += `
                <div class="dropdown-header">
                    <div class="dropdown-title">Mis Cursos (${courseCount})</div>
                    <div class="dropdown-actions">
                        <button class="dropdown-action-btn secondary" onclick="window.courseDropdown?.show(true)">
                            🔄
                        </button>
                        <button class="dropdown-action-btn" onclick="window.coursePage?.navigateToMyLearning()">
                            Ver todos
                        </button>
                    </div>
                </div>
            `;

            // Course items (show first 4)
            const coursesToShow = Array.isArray(courses) ? courses.slice(0, 4) : [];
            coursesToShow.forEach(course => {
                const imageUrl = course.course?.urlImage || course.image || '/img/default-course.jpg';
                const courseTitle = course.course?.name || course.title || 'Sin título';
                const courseId = course.course?.id || course.id;
                const courseUrl = course.course?.urlCourseUdemy || course.url;
                const lastAccessed = course.last_accessed ? 
                    new Date(course.last_accessed).toLocaleDateString() : 
                    'Nunca';
                
                html += `
                    <div class="course-item" onclick="window.courseDropdown?.navigateToCourse('${courseId}', 'https://www.udemy.com/course/${courseUrl}/learn')">
                        <img src="${imageUrl}" alt="${courseTitle}" class="course-image" onerror="this.src='/img/default-course.jpg'">
                        <div class="course-info">
                            <div class="course-title">${courseTitle}</div>
                            <div class="course-meta">
                                <span>Último acceso: ${lastAccessed}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            if (Array.isArray(courses) && courses.length > 4) {
                html += `
                    <div class="course-item" onclick="window.coursePage?.navigateToMyLearning()" style="text-align: center; font-style: italic; color: var(--gray-500);">
                        Ver ${courses.length - 4} cursos más...
                    </div>
                `;
            }
        }

        this.dropdownElement.innerHTML = html;
    }

    navigateToCourse(courseId, courseUrl) {
        this.hide();
        
        if (this.options.onCourseClick) {
            this.options.onCourseClick(courseId, courseUrl);
        }
    }

    // Helper methods
    isUserAuthenticated() {
        const authToken = this.getAuthToken();
        const isAuthenticated = window.authManager ? 
            window.authManager.isAuthenticated() : 
            !!authToken;
       
        
        return isAuthenticated && !!authToken;
    }

    getAuthToken() {
        let authToken = localStorage.getItem('authToken');
        
        if (!authToken && window.authManager) {
            authToken = window.authManager.getToken();
        }
        
        if (!authToken) {
            authToken = localStorage.getItem('auth_token') || 
                       localStorage.getItem('access_token');
        }
        
        return authToken;
    }

    invalidateCache() {
        this.coursesCache = null;
        this.cacheTimestamp = 0;
    }

    // Public methods
    refresh() {
        if (this.isVisible) {
            this.show(true);
        }
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        clearTimeout(this.dropdownTimeout);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CourseDropdown;
} else {
    window.CourseDropdown = CourseDropdown;
}