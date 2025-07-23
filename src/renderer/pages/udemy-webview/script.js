/**
 * Udemy WebView Page Main Controller
 * Orchestrates all components and handles page-level logic
 */
class UdemyWebViewPage {
    constructor() {
        // WebView elements
        this.webview = null;
        
        // Components
        this.navigationBar = null;
        this.courseDropdown = null;
        this.floatingWidget = null;
        this.dialog = null;
        this.updateManager = null;
        
        // Auth manager
        this.authManager = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Udemy WebView Page...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Get WebView reference
        this.webview = document.getElementById('udemy-webview');
        if (!this.webview) {
            console.error('❌ WebView element not found');
            return;
        }

        // Initialize auth manager
        this.initializeAuthManager();
        
        // Initialize dialog system
        this.initializeDialogSystem();
        
        // Initialize components
        this.initializeComponents();
        
        // Setup WebView events
        this.setupWebViewEvents();
        
        // Setup IPC listeners
        this.setupIPCListeners();
        
        // Notify main process that page is ready
        this.notifyPageReady();
        
        console.log('✅ Udemy WebView Page initialized successfully');
    }

    initializeAuthManager() {
        if (!window.authManager) {
            window.authManager = new AuthManager();
        }
        this.authManager = window.authManager;
        console.log('✅ Auth Manager initialized');
    }

    initializeDialogSystem() {
        this.dialog = DialogManager.createGlobalInstance();
        console.log('✅ Dialog System initialized');
    }

    initializeComponents() {
        // Initialize Global UpdateManager
        if (window.UpdateManager) {
            this.updateManager = UpdateManager.createGlobalInstance();
            console.log('✅ UpdateManager global inicializado en udemy-webview');
        }
        
        // Initialize Navigation Bar
        this.navigationBar = new NavigationBar({
            onMyLearningClick: () => this.navigateToMyLearning(),
            onLogoutClick: () => this.performLogout()
        });

        // Initialize Course Dropdown
        this.courseDropdown = new CourseDropdown({
            onCourseClick: (courseId, courseUrl) => this.navigateToCourse(courseId, courseUrl),
            onViewAllClick: () => this.navigateToMyLearning(),
            onLoginClick: () => this.navigateToLogin()
        });

        // Initialize Floating Widget
        this.floatingWidget = new FloatingWidget({
            onMinimize: (isMinimized) => {
                console.log('Widget minimized:', isMinimized);
            },
            onClose: () => {
                console.log('Widget closed');
            }
        });

        // Make components globally accessible
        window.coursePage = this;
        window.courseDropdown = this.courseDropdown;

        console.log('✅ All components initialized');
    }

    setupWebViewEvents() {
        if (!this.webview) return;

        // WebView DOM ready
        this.webview.addEventListener('dom-ready', () => {
            console.log('🌐 WebView DOM ready');
            setTimeout(() => this.injectInterceptor(), 1000);
        });

        // WebView navigation events
        this.webview.addEventListener('did-navigate', (event) => {
            console.log('🔍 WebView navigated to:', event.url);
            if (event.url.includes('udemy.com')) {
                setTimeout(() => {
                    this.injectInterceptor();
                }, 1000);
            }
        });

        this.webview.addEventListener('did-navigate-in-page', (event) => {
            console.log('🔍 WebView navigated in-page to:', event.url);
            if (event.url.includes('udemy.com')) {
                setTimeout(() => {
                    this.injectInterceptor();
                }, 1500);
            }
        });

        // WebView load events
        this.webview.addEventListener('did-finish-load', () => {
            console.log('✅ WebView finished loading');
        });

        this.webview.addEventListener('did-fail-load', (event) => {
            console.error('❌ WebView failed to load:', event);
        });

        // WebView console messages
        this.webview.addEventListener('console-message', (event) => {
            console.log('📨 WebView Console:', event.message);
        });
    }

    setupIPCListeners() {
        if (!window.electronAPI) return;

        // Listen for WebView navigation requests
        window.electronAPI.receive('webview-navigate', (url) => {
            console.log('📡 WebView navigation request:', url);
            this.navigateToUrl(url);
        });

        // Listen for logout events
        window.electronAPI.receive('perform-logout', () => {
            console.log('🔐 Logout event received from main process');
            this.handleLogoutFromMain();
        });

        // Listen for interceptor events
        this.setupInterceptorListeners();
    }

    setupInterceptorListeners() {
        if (!window.electronAPI) return;

        window.electronAPI.receive('socket-connected', (data) => {
            this.floatingWidget.updateStatus('connected', `Socket conectado • ID: ${data.udemyId}`);
        });

        window.electronAPI.receive('socket-disconnected', () => {
            this.floatingWidget.updateStatus('disconnected', 'Socket desconectado');
        });

        window.electronAPI.receive('socket-message', (data) => {
            console.log('📨 Socket message received:', data);
            this.floatingWidget.updateInfo(`Mensaje: ${data.type || 'Nuevo'}`, true);
        });
    }

    async injectInterceptor() {
        try {
            if (window.electronAPI) {
                const interceptorCode = await window.electronAPI.invoke('get-udemy-interceptor-code');
                
                if (interceptorCode) {
                    console.log('📝 Interceptor code length:', interceptorCode.length);
                    console.log('🎯 Injecting interceptor into WebView...');
                    
                    const wrappedCode = `
                        (function() {
                            try {
                                ${interceptorCode}
                            } catch (e) {
                                console.error('❌ Error en interceptor:', e);
                            }
                        })();
                    `;
                    
                    try {
                        await this.webview.executeJavaScript(wrappedCode);
                        console.log('✅ Interceptor modular injected successfully into WebView');
                        this.floatingWidget.updateStatus('connected', 'Interceptor modular activo');
                        
                        
                        // Verificar que el sistema esté inicializado después de un pequeño delay
                        setTimeout(async () => {
                            try {
                                const status = await this.webview.executeJavaScript('window.UdemyInterceptor ? window.UdemyInterceptor.getStatus() : null');
                                if (status && status.isInitialized) {
                                    console.log('✅ Sistema modular verificado:', status);
                                    this.floatingWidget.updateStatus('connected', 'Sistema modular listo');
                                } else {
                                    console.warn('⚠️ Sistema modular no se inicializó correctamente');
                                    this.floatingWidget.updateStatus('warning', 'Sistema modular incompleto');
                                }
                            } catch (verifyError) {
                                console.warn('⚠️ No se pudo verificar el estado del sistema:', verifyError);
                            }
                        }, 2000);
                        
                    } catch (jsError) {
                        console.error('❌ JavaScript execution error in WebView:', jsError);
                        this.floatingWidget.updateStatus('disconnected', 'Error ejecutando interceptor');
                    }
                } else {
                    console.error('❌ No interceptor code available');
                    this.floatingWidget.updateStatus('disconnected', 'Sin interceptor');
                }
            }
        } catch (error) {
            console.error('❌ Error getting interceptor code:', error);
            this.floatingWidget.updateStatus('disconnected', 'Error obteniendo interceptor');
        }
    }


    // Navigation methods
    navigateToUrl(url) {
        if (this.webview) {
            this.webview.src = url;
        }
    }

    navigateToMyLearning() {
        console.log('🏠 Going to My Learning page...');
        if (window.electronAPI) {
            window.electronAPI.send('go-to-my-learning');
        }
    }

    navigateToLogin() {
        console.log('🔐 Going to Login page...');
        if (window.electronAPI) {
            window.electronAPI.send('go-to-login');
        }
    }

    async navigateToCourse(courseId, courseUrl) {
        console.log('🎯 Navigating to course:', courseId, courseUrl);
        
        try {
            // Try to open in Brave first
            if (window.electronAPI) {
                const success = await window.electronAPI.invoke('chrome-launch-course', {
                    courseId: courseId,
                    courseUrl: courseUrl
                });
                
                if (success) {
                    console.log('✅ Course opened in Brave');
                    return;
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to open in Brave, falling back to WebView:', error);
        }
        
        // Fallback: navigate in WebView
        const fullUrl = courseUrl.startsWith('http') ? courseUrl : `https://www.udemy.com${courseUrl}`;
        this.navigateToUrl(fullUrl);
    }

    // WebView controls
    reload() {
        if (this.webview) {
            this.webview.reload();
        }
    }

    goBack() {
        if (this.webview) {
            this.webview.goBack();
        }
    }

    goForward() {
        if (this.webview) {
            this.webview.goForward();
        }
    }

    // Logout functionality
    async performLogout() {
        console.log('🔐 Logout button clicked, showing confirmation...');
        
        const confirmed = await this.dialog.confirm({
            title: 'Cerrar Sesión',
            message: '¿Estás seguro de que quieres cerrar la sesión? Se eliminarán todos los datos de autenticación.',
            animation: 'popup',
            confirmText: 'Cerrar Sesión',
            confirmType: 'danger',
            cancelText: 'Cancelar'
        });

        if (!confirmed) {
            console.log('🔐 Logout cancelled by user');
            return;
        }

        await this.executeLogout();
    }

    async handleLogoutFromMain() {
        // Handle logout initiated from main process (menu, etc.)
        await this.executeLogout();
    }

    async executeLogout() {
        console.log('🔐 Executing logout process...');
        
        try {
            // Show loading toast
            this.dialog.toast({
                type: 'info',
                title: 'Cerrando sesión...',
                message: 'Eliminando datos de sesión',
                autoClose: 2000
            });

            // Clear WebView data
            if (this.webview && this.webview.clearData) {
                await new Promise((resolve) => {
                    this.webview.clearData({
                        storages: ['cookies', 'localstorage', 'sessionstorage', 'indexdb', 'websql', 'cachestorage']
                    }, () => {
                        console.log('✅ WebView data cleared');
                        resolve();
                    });
                });
            }

            // Clear AuthManager data
            if (this.authManager) {
                this.authManager.logout();
                console.log('✅ AuthManager data cleared');
            }

            // Clear localStorage
            const localStorageKeys = [
                'auth_token', 'user_email', 'user_fullname', 'user_avatar',
                'dj_session_id', 'client_id', 'access_token', 'udemy_user_id', 'authToken'
            ];
            
            localStorageKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            localStorage.clear();
            console.log('✅ LocalStorage cleared');

            // Clear session storage
            sessionStorage.clear();
            console.log('✅ SessionStorage cleared');

            // Clear Electron session cookies
            if (window.electronAPI) {
                const cookieResult = await window.electronAPI.invoke('clear-cookies');
                if (cookieResult.success) {
                    console.log('✅ Electron session cookies cleared');
                } else {
                    console.warn('⚠️ Error clearing Electron cookies:', cookieResult.error);
                }
            }

            // Clear courses cache
            if (this.courseDropdown) {
                this.courseDropdown.invalidateCache();
                console.log('✅ Courses cache cleared');
            }

            // Show success message
            this.dialog.toast({
                type: 'success',
                title: 'Sesión cerrada',
                message: 'Se han eliminado todos los datos de autenticación',
                autoClose: 3000
            });

            // Redirect to home
            setTimeout(() => {
                if (window.electronAPI) {
                    console.log('🏠 Redirecting to home page...');
                    window.electronAPI.send('go-to-home');
                }
            }, 1500);

        } catch (error) {
            console.error('❌ Error during logout:', error);
            
            this.dialog.alert({
                type: 'error',
                title: 'Error al cerrar sesión',
                message: `Ocurrió un error durante el proceso de logout: ${error.message}`,
                animation: 'popup'
            });
        }
    }

    notifyPageReady() {
        if (window.electronAPI) {
            console.log('✅ WebView page loaded and ready');
            window.electronAPI.send('webview-page-ready');
        }
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.reload();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.goBack();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.goForward();
                        break;
                }
            }
        });
    }
}

// Initialize the page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.udemyWebViewPage = new UdemyWebViewPage();
});

// Make globally accessible for debugging
window.UdemyWebViewPage = UdemyWebViewPage;