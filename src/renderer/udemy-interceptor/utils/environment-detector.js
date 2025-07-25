/**
 * Environment Detector - Detección de contexto y ambiente
 * 
 * Detecta si el código se ejecuta en WebView, proceso principal de Electron,
 * o navegador normal, y proporciona información sobre el entorno.
 */

/**
 * Detecta si el código se ejecuta en un WebView de Electron
 * @returns {boolean} True si está en WebView
 */
export function isInWebView() {
    try {
        // Verificar si window.electronAPI está disponible pero limitado
        return window.electronAPI && 
               typeof window.electronAPI.receive === 'function' &&
               !window.electronAPI.invoke; // WebView no tiene invoke
    } catch (error) {
        return false;
    }
}

/**
 * Detecta si el código se ejecuta en el proceso principal de Electron
 * @returns {boolean} True si está en proceso principal
 */
export function isInElectronMain() {
    try {
        return window.electronAPI && 
               typeof window.electronAPI.invoke === 'function' &&
               typeof window.electronAPI.send === 'function';
    } catch (error) {
        return false;
    }
}

/**
 * Detecta si el código se ejecuta en un navegador normal (no Electron)
 * @returns {boolean} True si está en navegador normal
 */
export function isInBrowser() {
    return !window.electronAPI && typeof window !== 'undefined';
}

/**
 * Verifica si las APIs de Electron están disponibles
 * @returns {boolean} True si electronAPI está disponible
 */
export function hasElectronAPI() {
    try {
        return window.electronAPI && typeof window.electronAPI === 'object';
    } catch (error) {
        return false;
    }
}

/**
 * Obtiene información detallada del entorno actual
 * @returns {Object} Información del entorno
 */
export function getEnvironmentInfo() {
    const info = {
        isWebView: isInWebView(),
        isElectronMain: isInElectronMain(),
        isBrowser: isInBrowser(),
        hasElectronAPI: hasElectronAPI(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        domain: window.location.hostname,
        protocol: window.location.protocol,
        isUdemyDomain: window.location.hostname.includes('udemy.com'),
        timestamp: new Date().toISOString()
    };
    
    // Determinar el contexto principal
    if (info.isWebView) {
        info.context = 'webview';
    } else if (info.isElectronMain) {
        info.context = 'electron-main';
    } else if (info.isBrowser) {
        info.context = 'browser';
    } else {
        info.context = 'unknown';
    }
    
    return info;
}

/**
 * Verifica si el entorno es seguro para ejecutar funciones del interceptor
 * @returns {boolean} True si es seguro
 */
export function isSafeEnvironment() {
    const info = getEnvironmentInfo();
    
    // Solo es seguro en dominios de Udemy
    if (!info.isUdemyDomain) {
        return false;
    }
    
    // Debe tener acceso a las APIs necesarias
    return info.hasElectronAPI || info.isBrowser;
}

/**
 * Registra información del entorno en la consola (para debugging)
 */
export function logEnvironmentInfo() {
    const info = getEnvironmentInfo();
    
    console.group('🔍 Environment Detection');
    console.groupEnd();
}

/**
 * Espera a que el entorno esté listo
 * @param {number} timeout - Timeout en milisegundos
 * @returns {Promise<boolean>} Promise que resuelve cuando está listo
 */
export function waitForEnvironment(timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkEnvironment = () => {
            if (isSafeEnvironment()) {
                resolve(true);
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                resolve(false);
                return;
            }
            
            setTimeout(checkEnvironment, 100);
        };
        
        checkEnvironment();
    });
}

// Exportar función global para compatibilidad con código legacy
if (typeof window !== 'undefined') {
    window.hasElectronAPI = hasElectronAPI;
}