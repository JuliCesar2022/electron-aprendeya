/**
 * Hot Reload System for Electron Development
 * Watches renderer files and reloads WebViews without closing windows
 */

const path = require('path');

let chokidar;
try {
    chokidar = require('chokidar');
} catch (error) {
    chokidar = null;
}

class HotReloadManager {
    constructor() {
        this.watchers = [];
        this.windows = new Map();
        this.isEnabled = process.env.NODE_ENV === 'development' && chokidar !== null;
        
        if (this.isEnabled) {
        } else if (process.env.NODE_ENV === 'development' && !chokidar) {
        }
    }

    /**
     * Registra una ventana para hot reload
     */
    registerWindow(window, windowType = 'main') {
        if (!this.isEnabled) return;
        
        this.windows.set(windowType, window);
    }

    /**
     * Inicia el sistema de hot reload
     */
    start() {
        if (!this.isEnabled) return;

        this.setupRendererWatcher();
        this.setupInterceptorWatcher();
        this.setupStyleWatcher();
        
    }

    /**
     * Observa cambios en archivos renderer generales
     */
    setupRendererWatcher() {
        const rendererPaths = [
            'src/renderer/**/*.js',
            'src/renderer/**/*.html',
            'src/preload/**/*.js'
        ];

        const watcher = chokidar.watch(rendererPaths, {
            ignored: [
                '**/node_modules/**',
                '**/udemy-interceptor*/**', // Estos tienen su propio watcher
                '**/*.tmp',
                '**/*.log'
            ],
            persistent: true,
            ignoreInitial: true
        });

        watcher.on('change', (filePath) => {
            const relativePath = path.relative(process.cwd(), filePath);
            
            this.reloadWebViews('renderer');
        });

        this.watchers.push(watcher);
    }

    /**
     * Observa cambios específicos en interceptores
     */
    setupInterceptorWatcher() {
        const interceptorPaths = [
            'src/renderer/udemy-interceptor/**/*.js',
            'src/renderer/udemy-interceptor-simple.js',
            'src/renderer/udemy-interceptor-loader.js'
        ];

        const watcher = chokidar.watch(interceptorPaths, {
            ignored: ['**/node_modules/**', '**/*.tmp', '**/*.log'],
            persistent: true,
            ignoreInitial: true
        });

        watcher.on('change', (filePath) => {
            const relativePath = path.relative(process.cwd(), filePath);
            
            // Para interceptores, recargamos específicamente el WebView de Udemy
            this.reloadUdemyWebView();
        });

        this.watchers.push(watcher);
    }

    /**
     * Observa cambios en estilos CSS
     */
    setupStyleWatcher() {
        const stylePaths = [
            'src/renderer/**/*.css',
            'src/renderer/**/assets/css/**/*.css'
        ];

        const watcher = chokidar.watch(stylePaths, {
            ignored: ['**/node_modules/**', '**/*.tmp', '**/*.log'],
            persistent: true,
            ignoreInitial: true
        });

        watcher.on('change', (filePath) => {
            const relativePath = path.relative(process.cwd(), filePath);
            
            // Para CSS, solo inyectamos los estilos sin recargar toda la página
            this.reloadStyles(filePath);
        });

        this.watchers.push(watcher);
    }

    /**
     * Recarga todas las WebViews registradas
     */
    reloadWebViews(source = 'general') {
        this.windows.forEach((window, windowType) => {
            if (window && !window.isDestroyed()) {
                try {
                    // Enviar evento a la ventana para que recargue sus WebViews
                    window.webContents.send('hot-reload-trigger', {
                        source: source,
                        timestamp: Date.now()
                    });
                    
                } catch (error) {
                    console.error(`❌ Error enviando hot reload a ${windowType}:`, error.message);
                }
            }
        });
    }

    /**
     * Recarga específicamente el WebView de Udemy
     */
    reloadUdemyWebView() {
        const udemyWindow = this.windows.get('udemy-webview') || this.windows.get('main');
        
        if (udemyWindow && !udemyWindow.isDestroyed()) {
            try {
                udemyWindow.webContents.send('hot-reload-interceptor', {
                    timestamp: Date.now(),
                    action: 'reload-udemy-webview'
                });
                
            } catch (error) {
                console.error('❌ Error enviando hot reload del interceptor:', error.message);
            }
        }
    }

    /**
     * Recarga estilos sin recargar toda la página
     */
    reloadStyles(filePath) {
        const relativePath = path.relative(process.cwd(), filePath);
        
        this.windows.forEach((window, windowType) => {
            if (window && !window.isDestroyed()) {
                try {
                    window.webContents.send('hot-reload-styles', {
                        filePath: relativePath,
                        timestamp: Date.now()
                    });
                    
                } catch (error) {
                    console.error(`❌ Error recargando estilos en ${windowType}:`, error.message);
                }
            }
        });
    }

    /**
     * Detiene todos los watchers
     */
    stop() {
        
        this.watchers.forEach(watcher => {
            watcher.close();
        });
        
        this.watchers = [];
        this.windows.clear();
        
    }

    /**
     * Remueve una ventana del registro
     */
    unregisterWindow(windowType) {
        if (this.windows.has(windowType)) {
            this.windows.delete(windowType);
        }
    }
}

module.exports = HotReloadManager;