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
            debugMode: options.debugMode === true // Default false
        };
        
        // Módulos
        this.modificationEngine = null;
        this.domObserver = null;
        this.keyboardShortcuts = null;
        
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
            console.log('⚠️ Interceptor ya está inicializado');
            return;
        }
        
        console.log('🚀 Inicializando Interceptor Core...');
        
        try {
            // Verificar entorno
            const envInfo = getEnvironmentInfo();
            if (this.config.debugMode) {
                logEnvironmentInfo();
            }
            
            if (!isSafeEnvironment()) {
                console.warn('⚠️ Entorno no seguro para el interceptor');
                showInterceptorNotification('Interceptor no disponible en este entorno', 'warning');
                return;
            }
            
            // Inicializar módulos core
            await this.initializeModules();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Interceptor Core inicializado exitosamente');
            
            // Auto-start si está habilitado
            if (this.config.autoStart) {
                setTimeout(() => this.start(), 1000);
            }
            
        } catch (error) {
            console.error('❌ Error inicializando Interceptor Core:', error);
            showInterceptorNotification('Error inicializando interceptor', 'error');
        }
    }
    
    /**
     * Inicializa todos los módulos del interceptor
     */
    async initializeModules() {
        console.log('📦 Inicializando módulos...');
        
        // 1. Motor de modificaciones
        if (this.config.enableModifications) {
            this.modificationEngine = new ModificationEngine();
            console.log('✅ ModificationEngine inicializado');
        }
        
        // 2. Observador DOM
        if (this.config.enableDOMObserver && this.modificationEngine) {
            this.domObserver = new DOMObserver(this.modificationEngine);
            console.log('✅ DOMObserver inicializado');
        }
        
        // 3. Atajos de teclado
        if (this.config.enableKeyboardShortcuts) {
            this.keyboardShortcuts = new KeyboardShortcuts(this);
            console.log('✅ KeyboardShortcuts inicializado');
        }
        
        console.log('📦 Todos los módulos inicializados');
    }
    
    /**
     * Configura los event listeners globales
     */
    setupEventListeners() {
        // Listener para cambios de página
        const handlePageChange = () => {
            if (this.isActive) {
                console.log('📄 Cambio de página detectado, reaplicando modificaciones...');
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
                console.log('👁️ Página visible, verificando modificaciones...');
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
            console.error('❌ Interceptor no está inicializado');
            return false;
        }
        
        if (this.isActive) {
            console.log('⚠️ Interceptor ya está activo');
            return true;
        }
        
        console.log('▶️ Iniciando Interceptor...');
        
        try {
            // Iniciar observador DOM
            if (this.domObserver) {
                this.domObserver.start();
            }
            
            // Aplicar modificaciones iniciales
            if (this.modificationEngine) {
                this.modificationEngine.applyAllModifications();
            }
            
            this.isActive = true;
            this.stats.startTime = Date.now();
            this.stats.totalActivations++;
            this.stats.lastActivity = Date.now();
            
            console.log('✅ Interceptor iniciado exitosamente');
            showInterceptorNotification('Interceptor activado', 'success', 2000);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error iniciando interceptor:', error);
            showInterceptorNotification('Error iniciando interceptor', 'error');
            return false;
        }
    }
    
    /**
     * Detiene el interceptor
     */
    stop() {
        if (!this.isActive) {
            console.log('⚠️ Interceptor ya está detenido');
            return true;
        }
        
        console.log('⏹️ Deteniendo Interceptor...');
        
        try {
            // Detener observador DOM
            if (this.domObserver) {
                this.domObserver.stop();
            }
            
            this.isActive = false;
            this.stats.lastActivity = Date.now();
            
            console.log('✅ Interceptor detenido exitosamente');
            showInterceptorNotification('Interceptor desactivado', 'info', 2000);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error deteniendo interceptor:', error);
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
        console.log('🔄 Reiniciando Interceptor...');
        
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
        
        console.log('⚙️ Configuración actualizada:', newConfig);
        
        // Reinicializar módulos si es necesario
        if (this.config.enableDOMObserver !== oldConfig.enableDOMObserver ||
            this.config.enableModifications !== oldConfig.enableModifications) {
            
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
            console.log('⚠️ Interceptor no está activo');
            return 0;
        }
        
        console.log('⚡ Forzando aplicación de modificaciones...');
        
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
                keyboardShortcuts: !!this.keyboardShortcuts
            },
            moduleStatus: {
                modificationEngine: this.modificationEngine?.getStats() || null,
                domObserver: this.domObserver?.getStatus() || null,
                keyboardShortcuts: this.keyboardShortcuts?.getStats() || null
            }
        };
    }
    
    /**
     * Registra información detallada del estado
     */
    logStatus() {
        const status = this.getStatus();
        
        console.group('🎯 Interceptor Core Status');
        console.log('Inicializado:', status.isInitialized);
        console.log('Activo:', status.isActive);
        console.log('Tiempo activo:', `${status.uptime}s`);
        console.log('Total activaciones:', status.stats.totalActivations);
        console.log('Total modificaciones:', status.stats.totalModifications);
        console.log('Última actividad:', new Date(status.stats.lastActivity).toLocaleTimeString());
        
        console.group('📦 Módulos');
        console.log('ModificationEngine:', status.modules.modificationEngine ? '✅' : '❌');
        console.log('DOMObserver:', status.modules.domObserver ? '✅' : '❌');
        console.log('KeyboardShortcuts:', status.modules.keyboardShortcuts ? '✅' : '❌');
        console.groupEnd();
        
        console.group('⚙️ Configuración');
        for (const [key, value] of Object.entries(status.config)) {
            console.log(`${key}:`, value);
        }
        console.groupEnd();
        
        console.groupEnd();
    }
    
    /**
     * Limpia recursos y event listeners
     */
    destroy() {
        console.log('🗑️ Destruyendo Interceptor Core...');
        
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
        console.log('✅ Interceptor Core destruido');
    }
}

// Función helper para crear una instancia global
export function createInterceptorInstance(options = {}) {
    if (window.udemyInterceptorCore) {
        console.log('⚠️ Ya existe una instancia del interceptor');
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