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
        
    }

    initializeAuthManager() {
        if (!window.authManager) {
            window.authManager = new AuthManager();
        }
        this.authManager = window.authManager;
    }

    initializeDialogSystem() {
        this.dialog = DialogManager.createGlobalInstance();
    }

    initializeComponents() {
        // Initialize Global UpdateManager
        if (window.UpdateManager) {
            this.updateManager = UpdateManager.createGlobalInstance();
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
            },
            onClose: () => {
            }
        });

        // Make components globally accessible
        window.coursePage = this;
        window.courseDropdown = this.courseDropdown;
        
        // Register WebView for hot reload in development
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
            this.setupHotReload();
        }

    }

    setupWebViewEvents() {
        if (!this.webview) return;

        // WebView DOM ready
        this.webview.addEventListener('dom-ready', () => {
            // Usar estrategia de reintentos para interceptor
            this.initializeInterceptorWithRetry();
            
            // INTERCEPTOR DE NAVEGACIÓN: Forzar navegación en WebView
            this.webview.executeJavaScript(`
                
                // INTERCEPTAR Y FORZAR NAVEGACIÓN (solución que funciona)
                document.addEventListener('click', function(e) {
                    const target = e.target.closest('a') || e.target;
                    
                    if (target.tagName === 'A' && target.href) {
                        
                        // Prevenir comportamiento por defecto y forzar navegación
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // Forzar navegación directa
                        window.location.href = target.href;
                    }
                }, true); // Capture phase
            `);
        });

        // WebView navigation events
        this.webview.addEventListener('did-navigate', (event) => {
            if (event.url.includes('udemy.com')) {
                // Limpiar interceptor anterior y reinyectar con reintentos
                this.cleanupPreviousInterceptor();
                this.initializeInterceptorWithRetry();
            }
        });

        this.webview.addEventListener('did-navigate-in-page', (event) => {
            if (event.url.includes('udemy.com')) {
                // Para navegación en página, solo reinicializar si es necesario
                this.checkAndReinitializeInterceptor();
            }
        });

        // Monitoreo de navegación (opcional para debug)
        this.webview.addEventListener('will-navigate', (event) => {
        });

        this.webview.addEventListener('did-fail-navigate', (event) => {
        });

        // Interceptar nuevas ventanas para mantener navegación en el mismo WebView
        this.webview.addEventListener('new-window', (event) => {
            
            // Prevenir que se abra nueva ventana
            event.preventDefault();
            
            try {
                // Intentar navegar internamente en el WebView
                this.webview.loadURL(event.url);
            } catch (error) {
                
                // Fallback: cambiar src
                this.webview.src = event.url;
            }
        });

        // WebView load events
        this.webview.addEventListener('did-finish-load', () => {
        });

        this.webview.addEventListener('did-fail-load', (event) => {
            // Filtrar errores no críticos comunes
            const ignoredUrls = [
                'gtm.udemy.com', // Google Tag Manager
                'sw_iframe.html', // Service Worker iframes
                'googletagmanager.com',
                'google-analytics.com',
                '/service_worker/',
                '_/service_worker/'
            ];
            
            const isIgnoredError = ignoredUrls.some(url => 
                event.validatedURL && event.validatedURL.includes(url)
            );
            
            // Solo mostrar errores críticos
            if (!isIgnoredError && event.isMainFrame) {
                   
                // Mostrar error al usuario solo si es crítico
                if (this.dialog) {
                    this.dialog.toast({
                        type: 'error',
                        title: 'Error de Carga',
                        message: 'Error cargando la página principal',
                        autoClose: 5000
                    });
                }
            }
        });

        // WebView console messages - IMPORTANTE: habilitar para ver errores del interceptor
        this.webview.addEventListener('console-message', (event) => {
            const prefix = '[WebView]';
            const message = `${prefix} ${event.message}`;
            const source = event.sourceId ? `(${event.sourceId}:${event.line})` : '';
            
            // Mostrar todos los logs del webview en la consola principal
            switch (event.level) {
                case 0: // LOG
                    console.log(message, source);
                    break;
                case 1: // WARNING  
                    console.warn(message, source);
                    break;
                case 2: // ERROR
                    console.error(message, source);
                    break;
                case 3: // DEBUG
                    console.debug(message, source);
                    break;
                default:
                    console.log(message, source);
            }
        });
    }

    setupIPCListeners() {
        if (!window.electronAPI) return;

        // Listen for WebView navigation requests
        window.electronAPI.receive('webview-navigate', (url) => {
            this.navigateToUrl(url);
        });

        // Listen for logout events
        window.electronAPI.receive('perform-logout', () => {
            this.handleLogoutFromMain();
        });

        // Listen for interceptor events
        this.setupInterceptorListeners();
        console.log('🔗 Escuchando eventos del interceptor...');
        
        // Setup message listeners from webview
        this.setupWebViewMessageListeners();
        
        // Listen for webview notifications
        window.electronAPI.receive('webview-notification', (data) => {
            this.showNotificationFromInterceptor(data);
        });
        
        // Setup polling system for interceptor queues
        this.setupInterceptorPolling();
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
            this.floatingWidget.updateInfo(`Mensaje: ${data.type || 'Nuevo'}`, true);
        });
    }

    setupWebViewMessageListeners() {
        console.log('🎯 Configurando listeners de WebView...');
        
        if (this.webview) {
            // Método 1: Escuchar eventos IPC del WebView (correcto para Electron)
            this.webview.addEventListener('ipc-message', (event) => {
                console.log('📨 IPC Message recibido en PARENT:', event.channel, event.args);
                
                if (event.channel === 'udemy-interceptor-message') {
                    const messageData = event.args[0];
                    console.log('✅ Mensaje de interceptor via IPC en PARENT:', messageData);
                    this.handleInterceptorMessage(messageData);
                }
            });
            
            // Método 2: Inyectar listener de DOM events en el WebView
            this.webview.addEventListener('dom-ready', () => {
                this.webview.executeJavaScript(`
                    console.log('🎯 Configurando listener DOM en WebView...');
                    
                    // Inicializar cola de notificaciones
                    if (!window.interceptorNotificationQueue) {
                        window.interceptorNotificationQueue = [];
                    }
                    
                    // Escuchar eventos customizados en el DOM del WebView
                    document.addEventListener('udemy-interceptor-notification', function(event) {
                        console.log('🔔 Evento interceptor recibido en WebView DOM:', event.detail);
                        
                        // Agregar a la cola para polling
                        window.interceptorNotificationQueue.push(event.detail);
                        console.log('✅ Notificación agregada a cola, total:', window.interceptorNotificationQueue.length);
                    });
                    
                    console.log('✅ Listener DOM configurado en WebView');
                `);
            });
            
            console.log('✅ Listener DOM injection configurado');
        } else {
            console.error('❌ WebView no disponible para configurar listeners');
        }
        
        // Método 3: Polling directo al WebView como solución definitiva
        setInterval(() => {
            if (this.webview) {
                this.webview.executeJavaScript(`
                    // Verificar si hay notificaciones pendientes en una cola global
                    if (window.interceptorNotificationQueue && window.interceptorNotificationQueue.length > 0) {
                        const notifications = [...window.interceptorNotificationQueue];
                        window.interceptorNotificationQueue = []; // Limpiar cola
                        notifications; // Retornar las notificaciones
                    } else {
                        null;
                    }
                `).then(notifications => {
                    if (notifications && notifications.length > 0) {
                        console.log('📨 Notificaciones obtenidas via POLLING:', notifications);
                        notifications.forEach(notification => {
                            console.log('✅ Procesando notificación via POLLING:', notification);
                            this.handleInterceptorMessage(notification);
                        });
                    }
                }).catch(error => {
                    // Silenciar errores de polling
                });
            }
        }, 500); // Revisar cada 500ms
    }

    handleInterceptorMessage(messageData) {
        const { event, data } = messageData;
        
        console.log(`🎯 Procesando evento: ${event}`, data);
        
        switch (event) {
            case 'show-notification':
                console.log('🔔 Procesando notificación del interceptor:', data);
                this.showNotificationFromInterceptor(data);
                break;
                
            case 'course-save-attempt':
                this.handleCourseSaveAttempt(data);
                break;
                
            case 'course-enroll-attempt':
                this.handleCourseEnrollAttempt(data);
                break;
                
            case 'open-in-brave':
                this.handleOpenInBrave(data);
                break;
                
            default:
        }
    }

    showNotificationFromInterceptor(data) {
        console.log('🎨 Mostrando notificación:', data);
        console.log('Dialog disponible:', !!this.dialog);
        
        if (this.dialog) {
            // Usar el DialogManager para mostrar la notificación
            this.dialog.toast({
                type: data.type || 'info',
                title: 'Udemy Interceptor',
                message: data.message,
                autoClose: 4000
            });
            console.log('✅ Notificación mostrada exitosamente');
        } else {
            console.error('❌ DialogManager no disponible');
        }
    }

    handleCourseSaveAttempt(data) {
        
        // Notificar al proceso principal si es necesario
        if (window.electronAPI) {
            window.electronAPI.send('course-action', {
                action: 'save',
                payload: data.payload,
                slug: data.slug
            });
        }
        
        // Mostrar notificación con DialogManager
        if (this.dialog) {
            this.dialog.toast({
                type: 'info',
                title: 'Guardando Curso',
                message: `Guardando: ${data.payload.name}`,
                autoClose: 3000
            });
        }
    }

    handleCourseEnrollAttempt(data) {
        
        // Notificar al proceso principal para abrir en Brave
        if (window.electronAPI && data.courseUrl) {
            const learnUrl = `https://www.udemy.com/course/${data.slug}/learn/`;
            
            // Notificar sobre la acción de inscripción
            window.electronAPI.send('course-action', {
                action: 'enroll',
                payload: data.payload,
                slug: data.slug,
                courseUrl: data.courseUrl,
                learnUrl: learnUrl
            });
        }
        
        // Mostrar notificación con DialogManager
        if (this.dialog) {
            this.dialog.toast({
                type: 'success',
                title: 'Inscripción',
                message: `Inscribiéndote en: ${data.payload.name}`,
                autoClose: 3000
            });
        }
    }

    handleOpenInBrave(data) {
        
        if (window.electronAPI && data.courseUrl) {
            // Usar el método navigateToCourse que ya maneja Brave
            const courseId = this.extractCourseId(data.courseUrl);
            this.navigateToCourse(courseId, data.courseUrl);
        }
    }

    extractCourseId(courseUrl) {
        // Extraer ID del curso de la URL
        const match = courseUrl.match(/\/course\/([^\/]+)/);
        return match ? match[1] : null;
    }

    async injectInterceptor() {
        try {
            if (window.electronAPI) {
                const interceptorCode = await window.electronAPI.invoke('get-udemy-interceptor-code');
                
                if (interceptorCode) {
                    
                    const wrappedCode = `
                        (function() {
                            try {
                                ${interceptorCode}
                                return true; // Indica éxito
                            } catch (e) {
                                return false; // Indica fallo
                            }
                        })();
                    `;
                    
                    try {
                        const injectionResult = await this.webview.executeJavaScript(wrappedCode);
                        
                        if (injectionResult === false) {
                            this.floatingWidget.updateStatus('error', 'Error ejecutando interceptor');
                            return false;
                        }
                        
                        this.floatingWidget.updateStatus('connected', 'Interceptor modular activo');
                        
                        // Verificar que el sistema esté inicializado después de un pequeño delay
                        return new Promise((resolve) => {
                            setTimeout(async () => {
                                try {
                                    const checkCode = `
                                        if (window.UdemyInterceptor) {
                                            const status = window.UdemyInterceptor.getStatus();
                                            status;
                                        } else {
                                            null;
                                        }
                                    `;
                                    
                                    const status = await this.webview.executeJavaScript(checkCode);
                                    
                                    if (status && (status.isInitialized || status.isActive)) {
                                        this.floatingWidget.updateStatus('connected', `Sistema listo • ${status.totalModifications} mods`);
                                        resolve(true);
                                    } else {
                                        this.floatingWidget.updateStatus('warning', 'Sistema modular incompleto');
                                        resolve(false);
                                    }
                                } catch (verifyError) {
                                    this.floatingWidget.updateStatus('error', 'Error verificando sistema');
                                    resolve(false);
                                }
                            }, 2000);
                        });
                        
                    } catch (jsError) {
                        this.floatingWidget.updateStatus('disconnected', 'Error ejecutando interceptor');
                        return false;
                    }
                } else {
                    this.floatingWidget.updateStatus('disconnected', 'Sin interceptor');
                    return false;
                }
            }
            return false;
        } catch (error) {
            this.floatingWidget.updateStatus('disconnected', 'Error obteniendo interceptor');
            return false;
        }
    }

    setupInterceptorPolling() {
        // Polling cada 2 segundos para revisar las colas del interceptor
        this.pollingInterval = setInterval(async () => {
            try {
                await this.checkInterceptorQueues();
            } catch (error) {
            }
        }, 2000);
        
    }

    async checkInterceptorQueues() {
        // Sistema de cola eliminado - las notificaciones ahora van directamente via electronAPI
        return;
    }

    // Función eliminada - sistema de cola removido
    // Las acciones ahora se manejan directamente via electronAPI

    async initializeInterceptorWithRetry(maxRetries = 3, currentRetry = 0) {
        
        try {
            const success = await this.injectInterceptor();
            
            if (success) {
                return true;
            }
            
            // Si falló y tenemos más reintentos
            if (currentRetry < maxRetries - 1) {
                const delay = 1000 * (currentRetry + 1); // Incrementar delay
                
                setTimeout(() => {
                    this.initializeInterceptorWithRetry(maxRetries, currentRetry + 1);
                }, delay);
            } else {
                this.floatingWidget.updateStatus('error', 'Error inicialización');
            }
            
        } catch (error) {
            if (currentRetry < maxRetries - 1) {
                const delay = 2000 * (currentRetry + 1);
                setTimeout(() => {
                    this.initializeInterceptorWithRetry(maxRetries, currentRetry + 1);
                }, delay);
            }
        }
    }

    async cleanupPreviousInterceptor() {
        try {
            await this.webview.executeJavaScript(`
                // Limpiar interceptor simple anterior
                if (window.udemyInterceptorInstance && window.udemyInterceptorInstance.cleanup) {
                    window.udemyInterceptorInstance.cleanup();
                }
                
                // Limpiar interceptor modular anterior  
                if (window.UdemyInterceptor && window.UdemyInterceptor.cleanup) {
                    window.UdemyInterceptor.cleanup();
                }
                
                // Limpiar observadores globales huérfanos
                if (window.interceptorObserver) {
                    window.interceptorObserver.disconnect();
                    window.interceptorObserver = null;
                }
                
                // Limpiar intervalos huérfanos
                if (window.interceptorInterval) {
                    clearInterval(window.interceptorInterval);
                    window.interceptorInterval = null;
                }
                
                // Limpiar registro global si existe
                if (window.interceptorProcessedElements) {
                    window.interceptorProcessedElements.clear();
                }
                
            `);
        } catch (error) {
        }
    }

    async checkAndReinitializeInterceptor() {
        try {
            const needsReinit = await this.webview.executeJavaScript(`
                // Verificar si el interceptor está activo y funcionando
                if (!window.UdemyInterceptor) {
                    true; // Necesita inicialización
                } else {
                    const status = window.UdemyInterceptor.getStatus ? window.UdemyInterceptor.getStatus() : {};
                    !(status.isInitialized || status.isActive); // Necesita si no está activo
                }
            `);
            
            if (needsReinit) {
                this.initializeInterceptorWithRetry();
            }
        } catch (error) {
            // En caso de error, reinicializar por seguridad
            this.initializeInterceptorWithRetry();
        }
    }

    async retryInterceptorInitialization() {
        
        try {
            // Forzar reinicialización en el webview
            await this.webview.executeJavaScript(`
                if (window.initializeInterceptor) {
                    window.initializeInterceptor();
                } else {
                }
            `);
            
            // Verificar después de un delay
            setTimeout(async () => {
                try {
                    const status = await this.webview.executeJavaScript('window.UdemyInterceptor ? window.UdemyInterceptor.getStatus() : null');
                    if (status && (status.isInitialized || status.isActive)) {
                        this.floatingWidget.updateStatus('connected', 'Sistema reinicializado');
                    } else {
                        this.floatingWidget.updateStatus('error', 'Fallo reinicialización');
                    }
                } catch (error) {
                }
            }, 1000);
            
        } catch (error) {
            this.floatingWidget.updateStatus('error', 'Error reinicialización');
        }
    }

    // Navigation methods
    navigateToUrl(url) {
        if (this.webview) {
            this.webview.src = url;
        }
    }

    navigateToMyLearning() {
        if (window.electronAPI) {
            window.electronAPI.send('go-to-my-learning');
        }
    }

    navigateToLogin() {
        if (window.electronAPI) {
            window.electronAPI.send('go-to-login');
        }
    }

    async navigateToCourse(courseId, courseUrl) {
        
        try {
            // Try to open in Brave first
            if (window.electronAPI) {
                const success = await window.electronAPI.invoke('chrome-launch-course', {
                    courseId: courseId,
                    courseUrl: courseUrl
                });
                
                if (success) {
                    return;
                }
            }
        } catch (error) {
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
        
        const confirmed = await this.dialog.confirm({
            title: 'Cerrar Sesión',
            message: '¿Estás seguro de que quieres cerrar la sesión? Se eliminarán todos los datos de autenticación.',
            animation: 'popup',
            confirmText: 'Cerrar Sesión',
            confirmType: 'danger',
            cancelText: 'Cancelar'
        });

        if (!confirmed) {
            return;
        }

        await this.executeLogout();
    }

    async handleLogoutFromMain() {
        // Handle logout initiated from main process (menu, etc.)
        await this.executeLogout();
    }

    async executeLogout() {
        
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
                        resolve();
                    });
                });
            }

            // Clear AuthManager data
            if (this.authManager) {
                this.authManager.logout();
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

            // Clear session storage
            sessionStorage.clear();

            // Clear Electron session cookies
            if (window.electronAPI) {
                const cookieResult = await window.electronAPI.invoke('clear-cookies');
                if (cookieResult.success) {
                } else {
                }
            }

            // Clear courses cache
            if (this.courseDropdown) {
                this.courseDropdown.invalidateCache();
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
                    window.electronAPI.send('go-to-home');
                }
            }, 1500);

        } catch (error) {
            
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
            window.electronAPI.send('webview-page-ready');
        }
    }

    // Hot reload setup for development
    setupHotReload() {
        // Load hot reload client
        const script = document.createElement('script');
        script.src = '../../hot-reload-client.js';
        script.type = 'module';
        document.head.appendChild(script);
        
        // Register WebView when client is ready
        setTimeout(() => {
            if (window.hotReloadClient && this.webview) {
                window.hotReloadClient.registerWebView(this.webview, 'udemy');
                console.log('🔥 WebView de Udemy registrado para hot reload');
            }
        }, 1000);
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.udemyWebViewPage && window.udemyWebViewPage.pollingInterval) {
        clearInterval(window.udemyWebViewPage.pollingInterval);
    }
});

// Make globally accessible for debugging
window.UdemyWebViewPage = UdemyWebViewPage;