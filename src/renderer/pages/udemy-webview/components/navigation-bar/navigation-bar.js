/**
 * NavigationBar Component
 * Handles the top navigation bar with My Learning dropdown and logout button
 */
class NavigationBar {
    constructor(options = {}) {
        this.options = {
            containerId: 'nav-bar',
            onMyLearningClick: null,
            onLogoutClick: null,
            ...options
        };
        
        this.container = null;
        this.myLearningBtn = null;
        this.logoutBtn = null;
        
        this.init();
    }

    init() {
        this.createNavigationBar();
        this.setupEventListeners();
        console.log('✅ NavigationBar initialized');
    }

    createNavigationBar() {
        // Create navigation bar HTML structure
        const navBarHTML = `
            <div class="nav-bar" id="${this.options.containerId}">
                <div class="nav-left">
                    <!-- Left side can have logo or other content in the future -->
                </div>
                <div class="nav-right">
                    <div class="nav-btn-with-dropdown">
                        <button class="nav-btn" id="my-learning-btn">
                            My Learning
                        </button>
                        <!-- Dropdown will be inserted here by CourseDropdown component -->
                        <div id="courses-dropdown-container"></div>
                    </div>
                    <button class="nav-btn logout" id="logout-btn">
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        `;
        
        // Insert into DOM
        document.body.insertAdjacentHTML('afterbegin', navBarHTML);
        
        // Get references
        this.container = document.getElementById(this.options.containerId);
        this.myLearningBtn = document.getElementById('my-learning-btn');
        this.logoutBtn = document.getElementById('logout-btn');
    }

    setupEventListeners() {
        // My Learning button click (for navigation to full page)
        if (this.myLearningBtn) {
            this.myLearningBtn.addEventListener('click', () => {
                if (this.options.onMyLearningClick) {
                    this.options.onMyLearningClick();
                }
            });
        }

        // Logout button click
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => {
                if (this.options.onLogoutClick) {
                    this.options.onLogoutClick();
                }
            });
        }
    }

    // Public methods
    getMyLearningButton() {
        return this.myLearningBtn;
    }

    getLogoutButton() {
        return this.logoutBtn;
    }

    getDropdownContainer() {
        return document.getElementById('courses-dropdown-container');
    }

    show() {
        if (this.container) {
            this.container.style.display = 'flex';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    destroy() {
        if (this.container) {
            this.container.remove();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationBar;
} else {
    window.NavigationBar = NavigationBar;
}