/**
 * Udemy Interceptor - Punto de entrada principal
 * 
 * Inicializa y coordina todos los módulos del interceptor de Udemy.
 * Este archivo reemplaza el monolítico udemy-interceptor.js original.
 */

import { createInterceptorInstance } from './core/interceptor-core.js';
import { getBackendIntegration } from './integrations/backend-integration.js';
import { openCourseInBrave, isBraveAvailable } from './integrations/brave-integration.js';
import { showInterceptorNotification } from './integrations/dialog-integration.js';
import { getNavigationIntegration, toggleNavigationInterception, getNavigationStats } from './integrations/navigation-integration.js';
import { getEnvironmentInfo, waitForEnvironment } from './utils/environment-detector.js';

/**
 * Configuración principal del interceptor
 */
const INTERCEPTOR_CONFIG = {
    autoStart: true,
    enableKeyboardShortcuts: true,
    enableDOMObserver: true,
    enableModifications: true,
    enableNavigation: true, // Interceptor de navegación habilitado
    debugMode: false, // Cambiar a true para debugging
    initDelay: 1000 // Delay inicial para asegurar que la página esté lista
};

/**
 * Estado global del interceptor
 */
let interceptorInstance = null;
let backendIntegration = null;
let isInitialized = false;

/**
 * Inicializa el interceptor completo
 */
async function initializeInterceptor() {
    if (isInitialized) {
        return interceptorInstance;
    }
    
    
    try {
        // Verificar entorno
        const environmentReady = await waitForEnvironment(10000);
        
        if (!environmentReady) {
            showInterceptorNotification('Interceptor no disponible en este entorno', 'warning');
            return null;
        }
        
        // Inicializar integración con backend
        backendIntegration = getBackendIntegration();
        
        // Crear instancia principal del interceptor
        interceptorInstance = createInterceptorInstance(INTERCEPTOR_CONFIG);
        
        // Configurar funciones globales para compatibilidad
        setupGlobalFunctions();
        
        // Configurar event listeners globales
        setupGlobalEventListeners();
        
        isInitialized = true;
        
        // Mostrar notificación de éxito si no es modo debug
        if (!INTERCEPTOR_CONFIG.debugMode) {
            showInterceptorNotification('🎓 Interceptor de Udemy listo', 'success', 3000);
        }
        
        // Log del entorno si está en modo debug
        if (INTERCEPTOR_CONFIG.debugMode) {
            const envInfo = getEnvironmentInfo();
        }
        
        return interceptorInstance;
        
    } catch (error) {
        showInterceptorNotification('Error inicializando interceptor', 'error');
        
        // Reportar error al backend si es posible
        if (backendIntegration) {
            backendIntegration.reportError(error, { context: 'interceptor-initialization' });
        }
        
        return null;
    }
}

/**
 * Configura funciones globales para compatibilidad con código legacy
 */
function setupGlobalFunctions() {
    // Funciones para Brave integration
    window.openCourseInBrave = openCourseInBrave;
    window.isBraveAvailable = isBraveAvailable;
    
    // Funciones de navegación
    window.toggleNavigationInterception = toggleNavigationInterception;
    window.getNavigationStats = getNavigationStats;
    
    // Funciones del interceptor core
    if (interceptorInstance) {
        window.toggleInterceptor = () => interceptorInstance.toggle();
        window.restartInterceptor = () => interceptorInstance.restart();
        window.forceModifications = () => interceptorInstance.forceModifications();
        window.getInterceptorStatus = () => interceptorInstance.getStatus();
    }
    
    // Funciones de debugging (solo en modo debug)
    if (INTERCEPTOR_CONFIG.debugMode) {
        window.interceptorDebug = {
            status: () => interceptorInstance?.logStatus(),
            backend: () => backendIntegration?.logStatus(),
            navigation: () => getNavigationIntegration().logStatus(),
            restart: () => interceptorInstance?.restart(),
            force: () => interceptorInstance?.forceModifications(),
            config: INTERCEPTOR_CONFIG,
            instance: interceptorInstance
        };
    }
    
}

/**
 * Configura event listeners globales
 */
function setupGlobalEventListeners() {
    // Listener para cambios de visibilidad de página
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            
            if (interceptorInstance && interceptorInstance.isActive) {
                // Pequeño delay para asegurar que el DOM esté listo
                setTimeout(() => {
                    interceptorInstance.forceModifications();
                }, 500);
            }
        }
    });
    
    // Listener para errores no capturados (solo en modo debug)
    if (INTERCEPTOR_CONFIG.debugMode) {
        window.addEventListener('error', (event) => {
            
            if (backendIntegration) {
                backendIntegration.reportError(event.error, {
                    context: 'uncaught-error',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            }
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            
            if (backendIntegration) {
                backendIntegration.reportError(new Error(event.reason), {
                    context: 'unhandled-rejection'
                });
            }
        });
    }
    
}

/**
 * Reinicia completamente el interceptor
 */
async function restartInterceptor() {
    
    // Limpiar instancia actual
    if (interceptorInstance) {
        interceptorInstance.destroy();
        interceptorInstance = null;
    }
    
    if (backendIntegration) {
        backendIntegration.destroy();
        backendIntegration = null;
    }
    
    isInitialized = false;
    
    // Reinicializar después de un breve delay
    setTimeout(() => {
        initializeInterceptor();
    }, 1000);
}

/**
 * Verifica el estado del sistema completo
 */
function getSystemStatus() {
    return {
        isInitialized,
        interceptorStatus: interceptorInstance?.getStatus() || null,
        backendStatus: backendIntegration?.getStatus() || null,
        environment: getEnvironmentInfo(),
        config: INTERCEPTOR_CONFIG,
        timestamp: new Date().toISOString()
    };
}

/**
 * Función principal de inicialización que se ejecuta cuando se carga el script
 */
async function main() {
    
    try {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
        }
        
        // Delay adicional para asegurar que la página esté completamente cargada
        await new Promise(resolve => setTimeout(resolve, INTERCEPTOR_CONFIG.initDelay));
        
        // Inicializar interceptor
        const interceptor = await initializeInterceptor();
        
        if (interceptor) {
        } else {
        }
        
    } catch (error) {
        showInterceptorNotification('Error crítico en interceptor', 'error');
    }
}

// Exponer funciones principales para uso externo
window.UdemyInterceptor = {
    restart: restartInterceptor,
    getStatus: getSystemStatus,
    toggle: () => interceptorInstance?.toggle(),
    force: () => interceptorInstance?.forceModifications(),
    navigation: {
        toggle: toggleNavigationInterception,
        getStats: getNavigationStats,
        getIntegration: getNavigationIntegration
    }
};

// Ejecutar inicialización
main();

// Exportar para uso como módulo
export {
    initializeInterceptor,
    restartInterceptor,
    getSystemStatus,
    interceptorInstance,
    backendIntegration
};