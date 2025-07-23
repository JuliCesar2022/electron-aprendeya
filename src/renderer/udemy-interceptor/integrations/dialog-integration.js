/**
 * Dialog Integration - Integración con el DialogManager global
 * 
 * Proporciona funciones wrapper para integrar el interceptor con el sistema
 * global de diálogos, reemplazando las notificaciones nativas del interceptor.
 */

/**
 * Muestra una notificación del interceptor usando el DialogManager global
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'info', 'success', 'warning', 'error'
 * @param {number} autoClose - Milisegundos para auto-cerrar (default: 3000)
 */
export function showInterceptorNotification(message, type = 'info', autoClose = 3000) {
    if (window.dialogManager) {
        return window.dialogManager.toast({
            type,
            title: 'Udemy Interceptor',
            message,
            autoClose
        });
    } else {
        console.log(`[Interceptor ${type.toUpperCase()}] ${message}`);
    }
}

/**
 * Muestra un loader/cargando usando el DialogManager global
 * @param {string} message - Mensaje de carga
 * @param {boolean} persistent - Si el diálogo debe ser persistente
 */
export function showInterceptorLoader(message, persistent = false) {
    if (window.dialogManager) {
        return window.dialogManager.show({
            type: 'info',
            title: 'Procesando...',
            message,
            animation: 'slide-right',
            position: 'top-right',
            persistent,
            buttons: persistent ? [] : [
                { text: 'Ocultar', type: 'secondary', action: () => window.dialogManager.hide() }
            ]
        });
    } else {
        console.log(`[Interceptor LOADING] ${message}`);
    }
}

/**
 * Oculta el loader actual
 */
export function hideInterceptorLoader() {
    if (window.dialogManager) {
        window.dialogManager.hide();
    }
}

/**
 * Muestra un diálogo de confirmación usando el DialogManager global
 * @param {string} message - Mensaje de confirmación
 * @param {string} title - Título del diálogo
 */
export function showInterceptorConfirm(message, title = 'Confirmación') {
    if (window.dialogManager) {
        return window.dialogManager.confirm({
            title,
            message,
            animation: 'popup'
        });
    } else {
        return Promise.resolve(confirm(`${title}: ${message}`));
    }
}

/**
 * Muestra una alerta usando el DialogManager global
 * @param {string} message - Mensaje de alerta
 * @param {string} title - Título del diálogo
 * @param {string} type - Tipo de alerta
 */
export function showInterceptorAlert(message, title = 'Interceptor', type = 'info') {
    if (window.dialogManager) {
        return window.dialogManager.alert({
            type,
            title,
            message,
            animation: 'popup'
        });
    } else {
        alert(`${title}: ${message}`);
        return Promise.resolve(true);
    }
}

/**
 * Funciones de compatibilidad con el código legacy
 * Mantienen los nombres originales para no romper el código existente
 */

// Reemplaza showUdemyNotification del código original
export function showUdemyNotification(message, type = 'success') {
    const typeMap = {
        'success': 'success',
        'error': 'error',
        'warning': 'warning',
        'info': 'info'
    };
    
    return showInterceptorNotification(message, typeMap[type] || 'info');
}

// Reemplaza showUdemyLoader del código original
export function showUdemyLoader(message) {
    return showInterceptorLoader(message, false);
}

// Reemplaza hideUdemyLoader del código original
export function hideUdemyLoader() {
    return hideInterceptorLoader();
}