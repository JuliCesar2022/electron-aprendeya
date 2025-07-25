/**
 * AppInitializer - Maneja la inicialización de la aplicación
 */
class AppInitializer {
    constructor() {
        this.splashScreen = document.getElementById('splashScreen');
        this.mainContent = document.getElementById('mainContent');
        this.statusMessage = document.getElementById('statusMessage');
        this.mainButton = document.getElementById('mainButton');
        this.demoButton = document.getElementById('demoButton');
        
        this.init();
    }

    async init() {
        
        try {
            // Marcar que la aplicación ha sido inicializada (primera vez)
            window.appInitialized = true;
            
            // Configurar listeners de actualizaciones PRIMERO
            this.setupUpdateListeners();
            
            // El proceso principal se encarga de la extracción automáticamente
            this.updateStatus('Configurando todo...');
            
            // Configurar listeners para eventos de extracción del proceso principal
            this.setupBraveExtractionListeners();
            
            // SIEMPRE mostrar splash screen primero para dar oportunidad a actualizaciones
            await this.showSplashScreen();
            
            // DESPUÉS verificar si hay sesión activa con timeout total
            const hasValidSession = await Promise.race([
                this.checkSession(),
                new Promise(resolve => setTimeout(() => {
                    resolve(false);
                }, 3000))
            ]);
            
            if (hasValidSession) {
                this.updateStatus('Sesión activa encontrada, optimizando cuenta...', 'success');
                
                // Optimizar cuenta con timeout
                await Promise.race([
                    this.optimizeUserAccount(),
                    new Promise(resolve => setTimeout(() => {
                        resolve();
                    }, 5000))
                ]);
                
                this.updateStatus('Cuenta optimizada, redirigiendo a Udemy...', 'success');
                await this.delay(500);
                this.redirectToUdemy();
                return;
            }
            
            // Si no hay sesión válida, mostrar opciones de login
            this.updateStatus('No hay sesión activa, mostrando opciones de login...', 'info');
            await this.delay(1000);
            this.showMainContent();
            
        } catch (error) {
            this.updateStatus('Error en inicialización, mostrando pantalla principal...', 'error');
            await this.delay(1000);
            this.showMainContent();
        }
    }

    setupBraveExtractionListeners() {
        if (window.electronAPI) {
            // Escuchar cuando inicia la extracción
            window.electronAPI.receive('brave-extraction-started', () => {
                this.updateStatus('Extrayendo navegador integrado...');
            });
            
            // Escuchar cuando termina la extracción
            window.electronAPI.receive('brave-extraction-completed', (result) => {
                if (result.success) {
                    this.updateStatus('Navegador integrado configurado ✓');
                } else {
                    this.updateStatus('Usando navegador del sistema');
                }
            });
        } else {
        }
    }

    async showSplashScreen() {
        this.updateStatus('Verificando actualizaciones...');
        await this.checkForUpdates();
        await this.delay(2000); // Dar más tiempo para actualizaciones
        
        this.updateStatus('Cargando componentes...');
        await this.delay(800);
        
        this.updateStatus('Verificando sesión...');
        await this.delay(600);
    }

    async checkForUpdates() {
        try {
            if (window.electronAPI) {
                
                const result = await window.electronAPI.invoke('check-for-updates');
                if (result && result.updateAvailable) {
                    this.updateStatus('Actualización disponible, descargando...', 'success');
                } else {
                }
            }
        } catch (error) {
        }
    }

    setupUpdateListeners() {
        // Los listeners de actualización ahora son manejados por UpdateManager
        
        if (!window.electronAPI) return;

        window.electronAPI.receive('perform-logout', () => {
            if (window.authManager) {
                window.authManager.logout();
            }
            localStorage.clear();
        });
    }





    async checkSession() {
        try {
            
            // Esperar a que authManager esté disponible con timeout
            let attempts = 0;
            while (!window.authManager && attempts < 5) {
                await this.delay(200);
                attempts++;
            }

            if (window.authManager) {
                const isAuthenticated = window.authManager.isAuthenticated() && 
                                      !window.authManager.isTokenExpired();
                
                if (isAuthenticated) {
                    const userInfo = window.authManager.getUserInfo();
                    return true;
                }
            } else {
            }

            // También verificar localStorage directamente
            const authToken = localStorage.getItem('authToken');
            const userData = localStorage.getItem('userData');
            
            if (authToken && userData) {
                try {
                    const parsedData = JSON.parse(userData);
                    const loginTime = new Date(parsedData.loginTime);
                    const now = new Date();
                    const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
                    
                    if (hoursDiff < 24) { // Token válido por 24 horas
                        return true;
                    } else {
                    }
                } catch (e) {
                }
            } else {
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    async optimizeUserAccount() {
        try {
            
            // Obtener token de authManager
            let token = null;
            if (window.authManager) {
                token = window.authManager.getToken();
            }
            
            // También verificar localStorage si no hay token
            if (!token) {
                token = localStorage.getItem('authToken');
            }
            
            if (!token) {
                return;
            }
            
            // Hacer petición para obtener cuenta óptima con timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
            
            const response = await fetch('https://aprendeya-backend.forif.co/api/v1/udemy-accounts/optimal-account', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                return;
            }
            
            const accountData = await response.json();
            
            // Extraer datos de la cuenta óptima
            const account = accountData.data || accountData;
            
            // Obtener datos del usuario
            const userInfo = window.authManager ? window.authManager.getUserInfo() : {};
            const userEmail = userInfo.email || account.email || '';
            const userFullname = userInfo.fullname || account.fullName || account.name || '';
            
            // Configurar cookies usando electronAPI
            if (window.electronAPI) {
                await window.electronAPI.invoke('set-cookies', [
                    { name: 'access_token', value: account.accessToken || '', domain: '.udemy.com', path: '/', secure: true },
                    { name: 'dj_session_id', value: account.dj_session_id || '', domain: '.udemy.com', path: '/', secure: true, httpOnly: false },
                    { name: 'client_id', value: account.client_id || '', domain: '.udemy.com', path: '/', secure: true },
                    { name: 'auth_token', value: token, domain: '.udemy.com', path: '/', secure: false },
                    { name: 'user_email', value: userEmail, domain: '.udemy.com', path: '/', secure: false },
                    { name: 'user_fullname', value: encodeURIComponent(userFullname), domain: '.udemy.com', path: '/', secure: false }
                ]);
                
            }
            
            // Conectar al socket con el ID de la cuenta óptima (proceso principal)
            const udemyId = account.id || account.udemyId;
            if (udemyId && window.electronAPI) {
                const result = await window.electronAPI.invoke('socket-connect', udemyId);
                if (result.success) {
                } else {
                }
            } else {
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
            } else {
            }
        }
    }

    updateStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message show ${type}`;
    }

    async showMainContent() {
        // Fade out splash screen
        this.splashScreen.style.opacity = '0';
        this.splashScreen.style.transform = 'translateY(-30px)';
        this.splashScreen.style.transition = 'all 0.5s ease';
        
        await this.delay(500);
        
        // Hide splash and show main content
        this.splashScreen.style.display = 'none';
        this.mainContent.style.display = 'block';
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.mainButton.addEventListener('click', () => {
            this.goToLogin();
        });

        this.demoButton.addEventListener('click', () => {
            this.goToUdemy();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.goToLogin();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.goToUdemy();
            }
        });
    }

    redirectToUdemy() {
        
        if (window.electronAPI) {
            window.electronAPI.send('go-to-udemy-webview');
        } else {
            window.location.href = 'https://www.udemy.com/';
        }
    }

    goToLogin() {
        
        if (window.electronAPI) {
            window.electronAPI.send('go-to-login');
        } else {
            window.location.href = 'login.html';
        }
    }

    goToUdemy() {
        this.redirectToUdemy();
    }


    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppInitializer;
} else {
    window.AppInitializer = AppInitializer;
}