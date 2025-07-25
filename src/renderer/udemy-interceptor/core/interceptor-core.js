/**
 * Interceptor Core - Núcleo principal del interceptor
 * 
 * Clase principal que orquesta todos los módulos del interceptor de Udemy,
 * maneja el estado general y coordina las operaciones entre módulos.
 */

import { ModificationEngine } from './modification-engine.js';
import { DOMObserver } from './dom-observer.js';
import { KeyboardShortcuts } from '../ui/keyboard-shortcuts.js';
import { showInterceptorNotification } from '../integrations/dialog-integration.js';
import { getNavigationIntegration } from '../integrations/navigation-integration.js';
import { getEnvironmentInfo, isSafeEnvironment, logEnvironmentInfo } from '../utils/environment-detector.js';

/**
 * Clase principal del interceptor que coordina todos los módulos
 */
export class InterceptorCore {
    constructor(options = {}) {
        this.isActive = false;
        this.isInitialized = false;
        
        // Configuración
        this.config = {
            autoStart: options.autoStart !== false, // Default true
            enableKeyboardShortcuts: options.enableKeyboardShortcuts !== false, // Default true
            enableDOMObserver: options.enableDOMObserver !== false, // Default true
            enableModifications: options.enableModifications !== false, // Default true
            enableNavigation: options.enableNavigation !== false, // Default true
            debugMode: options.debugMode === true // Default false
        };
        
        // Módulos
        this.modificationEngine = null;
        this.domObserver = null;
        this.keyboardShortcuts = null;
        this.navigationIntegration = null;
        
        // Estado y estadísticas
        this.stats = {
            startTime: null,
            totalActivations: 0,
            totalModifications: 0,
            lastActivity: null
        };
        
        // Event listeners
        this.eventListeners = new Map();
        
        this.initialize();
    }
    
    /**
     * Inicializa el interceptor y todos sus módulos
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        
        
        try {
            // Verificar entorno
            const envInfo = getEnvironmentInfo();
            if (this.config.debugMode) {
                logEnvironmentInfo();
            }
            
            if (!isSafeEnvironment()) {
                showInterceptorNotification('Interceptor no disponible en este entorno', 'warning');
                return;
            }
            
            // Inicializar módulos core
            await this.initializeModules();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            
            // Auto-start si está habilitado
            if (this.config.autoStart) {
                setTimeout(() => this.start(), 1000);
            }
            
        } catch (error) {
            showInterceptorNotification('Error inicializando interceptor', 'error');
        }
    }
    
    /**
     * Inicializa todos los módulos del interceptor
     */
    async initializeModules() {
        
        // 1. Motor de modificaciones
        if (this.config.enableModifications) {
            this.modificationEngine = new ModificationEngine();
        }
        
        // 2. Observador DOM
        if (this.config.enableDOMObserver && this.modificationEngine) {
            this.domObserver = new DOMObserver(this.modificationEngine);
        }
        
        // 3. Atajos de teclado
        if (this.config.enableKeyboardShortcuts) {
            this.keyboardShortcuts = new KeyboardShortcuts(this);
        }
        
        // 4. Interceptor de navegación
        if (this.config.enableNavigation) {
            this.navigationIntegration = getNavigationIntegration();
        }
        
    }
    
    /**
     * Configura los event listeners globales
     */
    setupEventListeners() {
        // Listener para cambios de página
        const handlePageChange = () => {
            if (this.isActive) {
                setTimeout(() => {
                    if (this.domObserver) {
                        this.domObserver.forceExecution();
                    }
                }, 1000);
            }
        };
        
        // Listener para popstate (navegación del browser)
        window.addEventListener('popstate', handlePageChange);
        this.eventListeners.set('popstate', handlePageChange);
        
        // Listener para pushstate y replacestate (navegación SPA)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(handlePageChange, 500);
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(handlePageChange, 500);
        };
        
        // Listener para visibilidad de página
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && this.isActive) {
                setTimeout(() => {
                    if (this.domObserver) {
                        this.domObserver.forceExecution();
                    }
                }, 500);
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        this.eventListeners.set('visibilitychange', handleVisibilityChange);
    }
    
    /**
     * Inicia el interceptor
     */
    start() {
        if (!this.isInitialized) {
            return false;
        }
        
        if (this.isActive) {
            return true;
        }
        
        
        try {
            // Iniciar observador DOM
            if (this.domObserver) {
                this.domObserver.start();
            }
            
            // Activar interceptor de navegación
            if (this.navigationIntegration) {
                this.navigationIntegration.activate();
            }
            
            // Aplicar modificaciones iniciales
            if (this.modificationEngine) {
                this.modificationEngine.applyAllModifications();
            }
            
            this.isActive = true;
            this.stats.startTime = Date.now();
            this.stats.totalActivations++;
            this.stats.lastActivity = Date.now();
            
            showInterceptorNotification('Interceptor activado', 'success', 2000);
            
            return true;
            
        } catch (error) {
            showInterceptorNotification('Error iniciando interceptor', 'error');
            return false;
        }
    }
    
    /**
     * Detiene el interceptor
     */
    stop() {
        if (!this.isActive) {
            return true;
        }
        
        
        try {
            // Detener observador DOM
            if (this.domObserver) {
                this.domObserver.stop();
            }
            
            // Desactivar interceptor de navegación
            if (this.navigationIntegration) {
                this.navigationIntegration.deactivate();
            }
            
            this.isActive = false;
            this.stats.lastActivity = Date.now();
            
            showInterceptorNotification('Interceptor desactivado', 'info', 2000);
            
            return true;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Alterna el estado del interceptor (activar/desactivar)
     */
    toggle() {
        if (this.isActive) {
            return this.stop();
        } else {
            return this.start();
        }
    }
    
    /**
     * Reinicia el interceptor completamente
     */
    restart() {
        
        this.stop();
        
        setTimeout(() => {
            this.start();
        }, 1000);
    }
    
    /**
     * Actualiza la configuración del interceptor
     * @param {Object} newConfig - Nueva configuración
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        
        // Reinicializar módulos si es necesario
        if (this.config.enableDOMObserver !== oldConfig.enableDOMObserver ||
            this.config.enableModifications !== oldConfig.enableModifications ||
            this.config.enableNavigation !== oldConfig.enableNavigation) {
            
            if (this.isActive) {
                this.restart();
            }
        }
    }
    
    /**
     * Fuerza la aplicación de todas las modificaciones
     */
    forceModifications() {
        if (!this.isActive) {
            return 0;
        }
        
        
        let totalModified = 0;
        
        if (this.modificationEngine) {
            totalModified = this.modificationEngine.applyAllModifications();
        }
        
        this.stats.totalModifications += totalModified;
        this.stats.lastActivity = Date.now();
        
        if (totalModified > 0) {
            showInterceptorNotification(`${totalModified} modificaciones aplicadas`, 'success', 2000);
        }
        
        return totalModified;
    }
    
    /**
     * Obtiene el estado actual del interceptor
     * @returns {Object} Estado del interceptor
     */
    getStatus() {
        const uptime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
        
        return {
            isInitialized: this.isInitialized,
            isActive: this.isActive,
            uptime: Math.round(uptime / 1000), // segundos
            config: { ...this.config },
            stats: { ...this.stats },
            modules: {
                modificationEngine: !!this.modificationEngine,
                domObserver: !!this.domObserver,
                keyboardShortcuts: !!this.keyboardShortcuts,
                navigationIntegration: !!this.navigationIntegration
            },
            moduleStatus: {
                modificationEngine: this.modificationEngine?.getStats() || null,
                domObserver: this.domObserver?.getStatus() || null,
                keyboardShortcuts: this.keyboardShortcuts?.getStats() || null,
                navigationIntegration: this.navigationIntegration?.getStats() || null
            }
        };
    }
    
    /**
     * Registra información detallada del estado
     */
    logStatus() {
        const status = this.getStatus();
        
        console.group('🎯 Interceptor Core Status');
        
        console.group('📦 Módulos');
        console.groupEnd();
        
        console.group('⚙️ Configuración');
        for (const [key, value] of Object.entries(status.config)) {
        }
        console.groupEnd();
        
        console.groupEnd();
    }
    
    /**
     * Limpia recursos y event listeners
     */
    destroy() {
        
        // Detener si está activo
        if (this.isActive) {
            this.stop();
        }
        
        // Limpiar event listeners
        for (const [event, listener] of this.eventListeners) {
            if (event === 'popstate' || event === 'visibilitychange') {
                document.removeEventListener(event, listener);
            }
        }
        this.eventListeners.clear();
        
        // Limpiar módulos
        if (this.domObserver) {
            this.domObserver.stop();
        }
        
        this.modificationEngine = null;
        this.domObserver = null;
        this.keyboardShortcuts = null;
        
        this.isInitialized = false;
    }
}

// Función helper para crear una instancia global
export function createInterceptorInstance(options = {}) {
    if (window.udemyInterceptorCore) {
        return window.udemyInterceptorCore;
    }
    
    const interceptor = new InterceptorCore(options);
    window.udemyInterceptorCore = interceptor;
    
    // Exponer métodos útiles globalmente para debugging
    if (options.debugMode) {
        window.interceptorToggle = () => interceptor.toggle();
        window.interceptorStatus = () => interceptor.logStatus();
        window.interceptorForce = () => interceptor.forceModifications();
    }
    
    return interceptor;
}