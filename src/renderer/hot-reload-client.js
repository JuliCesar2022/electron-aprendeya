/**
 * Hot Reload Client - Handles hot reload events in renderer processes
 */

class HotReloadClient {
    constructor() {
        this.isEnabled = process.env.NODE_ENV === 'development';
        this.webviews = new Map();
        
        if (this.isEnabled) {
            this.setupListeners();
        }
    }

    /**
     * Configura los listeners para eventos de hot reload
     */
    setupListeners() {
        if (!window.electronAPI) {
            console.warn('⚠️ electronAPI no disponible para hot reload');
            return;
        }

        // Listener para hot reload general
        window.electronAPI.receive('hot-reload-trigger', (data) => {
            this.handleGeneralReload(data);
        });

        // Listener para hot reload específico del interceptor
        window.electronAPI.receive('hot-reload-interceptor', (data) => {
            this.handleInterceptorReload(data);
        });

        // Listener para hot reload de estilos
        window.electronAPI.receive('hot-reload-styles', (data) => {
            this.handleStyleReload(data);
        });
    }

    /**
     * Registra un WebView para hot reload
     */
    registerWebView(webview, name = 'default') {
        if (!this.isEnabled) return;
        
        this.webviews.set(name, webview);
    }

    /**
     * Maneja hot reload general
     */
    handleGeneralReload(data) {
        const { source } = data;
        
        switch (source) {
            case 'renderer':
                this.reloadPage();
                break;
            case 'preload':
                this.reloadWebViews();
                break;
            default:
                this.reloadWebViews();
        }
    }

    /**
     * Maneja hot reload específico del interceptor
     */
    handleInterceptorReload(data) {
        const { action } = data;
        
        switch (action) {
            case 'reload-udemy-webview':
                this.reloadUdemyWebView();
                break;
            default:
                this.reloadAllWebViews();
        }
    }

    /**
     * Maneja hot reload de estilos
     */
    handleStyleReload(data) {
        const { filePath } = data;
        
        // Intentar recargar estilos específicos sin recargar la página
        this.reloadStylesheets(filePath);
        
        // También recargar estilos en WebViews
        this.reloadWebViewStyles();
    }

    /**
     * Recarga la página completa
     */
    reloadPage() {
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }

    /**
     * Recarga todos los WebViews
     */
    reloadWebViews() {
        
        this.webviews.forEach((webview, name) => {
            if (webview && !webview.isDestroyed && !webview.isDestroyed()) {
                try {
                    webview.reload();
                } catch (error) {
                    console.error(`❌ Error recargando WebView ${name}:`, error);
                }
            }
        });
    }

    /**
     * Recarga específicamente el WebView de Udemy
     */
    reloadUdemyWebView() {
        const udemyWebView = this.webviews.get('udemy') || 
                            this.webviews.get('main') || 
                            document.getElementById('udemy-webview');
        
        if (udemyWebView) {
            try {
                
                // Limpiar interceptor antes del reload
                if (udemyWebView.executeJavaScript) {
                    udemyWebView.executeJavaScript(`
                        if (window.UdemyInterceptor && window.UdemyInterceptor.cleanup) {
                            window.UdemyInterceptor.cleanup();
                        }
                        if (window.udemyInterceptorInstance && window.udemyInterceptorInstance.cleanup) {
                            window.udemyInterceptorInstance.cleanup();
                        }
                    `).catch(err => {
                        console.warn('⚠️ Error limpiando interceptor:', err);
                    });
                }
                
                // Recargar después de una pequeña pausa
                setTimeout(() => {
                    udemyWebView.reload();
                }, 200);
                
            } catch (error) {
                console.error('❌ Error recargando WebView de Udemy:', error);
            }
        } else {
            console.warn('⚠️ WebView de Udemy no encontrado para hot reload');
        }
    }

    /**
     * Recarga todos los WebViews sin distinción
     */
    reloadAllWebViews() {
        
        // Buscar WebViews registrados
        this.reloadWebViews();
        
        // Buscar WebViews en el DOM
        const webviewElements = document.querySelectorAll('webview');
        webviewElements.forEach((webview, index) => {
            try {
                webview.reload();
            } catch (error) {
                console.error(`❌ Error recargando WebView DOM ${index}:`, error);
            }
        });
    }

    /**
     * Recarga hojas de estilo específicas
     */
    reloadStylesheets(changedFilePath) {
        
        // Buscar hojas de estilo que coincidan
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && this.isRelatedStylesheet(href, changedFilePath)) {
                this.reloadStylesheet(link);
            }
        });
        
        // También buscar estilos en WebViews
        this.reloadWebViewStyles();
    }

    /**
     * Verifica si una hoja de estilo está relacionada con el archivo cambiado
     */
    isRelatedStylesheet(href, changedFilePath) {
        // Extraer nombre del archivo sin extensión
        const fileName = changedFilePath.split('/').pop().replace('.css', '');
        return href.includes(fileName);
    }

    /**
     * Recarga una hoja de estilo específica
     */
    reloadStylesheet(linkElement) {
        try {
            const href = linkElement.getAttribute('href');
            const newHref = href.includes('?') 
                ? href.split('?')[0] + '?v=' + Date.now()
                : href + '?v=' + Date.now();
            
            linkElement.setAttribute('href', newHref);
        } catch (error) {
            console.error('❌ Error recargando hoja de estilo:', error);
        }
    }

    /**
     * Recarga estilos en WebViews
     */
    reloadWebViewStyles() {
        this.webviews.forEach((webview, name) => {
            if (webview && webview.executeJavaScript) {
                try {
                    webview.executeJavaScript(`
                        // Recargar hojas de estilo en el WebView
                        const links = document.querySelectorAll('link[rel="stylesheet"]');
                        links.forEach(link => {
                            const href = link.getAttribute('href');
                            if (href) {
                                const newHref = href.includes('?') 
                                    ? href.split('?')[0] + '?v=' + Date.now()
                                    : href + '?v=' + Date.now();
                                link.setAttribute('href', newHref);
                            }
                        });
                    `);
                    
                } catch (error) {
                    console.warn(`⚠️ Error recargando estilos en WebView ${name}:`, error);
                }
            }
        });
    }

    /**
     * Limpia los WebViews registrados
     */
    cleanup() {
        this.webviews.clear();
    }
}

// Inicializar automáticamente si estamos en desarrollo
let hotReloadClient = null;

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    document.addEventListener('DOMContentLoaded', () => {
        hotReloadClient = new HotReloadClient();
        
        // Hacer accesible globalmente para debugging
        window.hotReloadClient = hotReloadClient;
    });
}

// Exportar para uso manual
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HotReloadClient;
}