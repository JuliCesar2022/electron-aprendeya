/**
 * Udemy Interceptor Loader - Cargador del sistema modular
 * 
 * Este archivo reemplaza al monolítico udemy-interceptor.js y carga
 * el nuevo sistema modular de manera compatible con la inyección actual.
 */

// Crear elemento script para cargar el sistema modular
const moduleScript = document.createElement('script');
moduleScript.type = 'module';
moduleScript.src = '/udemy-interceptor/index.js';

// Inyectar en el head del documento
document.head.appendChild(moduleScript);

// Mensaje de compatibilidad
console.log('🔄 Cargando sistema modular de Udemy Interceptor...');

// Función para verificar si el sistema está listo
function waitForInterceptorSystem(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkSystem = () => {
            // Verificar si el sistema global está disponible
            if (window.UdemyInterceptor && window.UdemyInterceptor.getStatus) {
                console.log('✅ Sistema modular de Udemy Interceptor cargado');
                resolve(window.UdemyInterceptor);
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                console.error('❌ Timeout esperando sistema modular');
                reject(new Error('Timeout loading modular system'));
                return;
            }
            
            setTimeout(checkSystem, 100);
        };
        
        checkSystem();
    });
}

// Exponer función para verificar el estado
window.waitForInterceptorSystem = waitForInterceptorSystem;

// Intentar cargar el sistema y reportar el estado
waitForInterceptorSystem().then(system => {
    console.log('🎉 Sistema Udemy Interceptor disponible globalmente');
    
    // Mantener compatibilidad con funciones legacy si es necesario
    if (!window.toggleInterceptor && system.toggle) {
        window.toggleInterceptor = system.toggle;
    }
    
    if (!window.getInterceptorStatus && system.getStatus) {
        window.getInterceptorStatus = system.getStatus;
    }
    
}).catch(error => {
    console.error('💥 Error cargando sistema modular:', error);
    
    // Fallback: mostrar mensaje de error
    if (typeof showInterceptorNotification === 'function') {
        showInterceptorNotification('Error cargando interceptor modular', 'error');
    }
});