/**
 * Utility functions for the index page
 */

// Función para imprimir ruta actual (solo en consola)
function printCurrentRoute() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    console.log('📍 Ruta actual:', currentUrl);
    console.log('📂 Path actual:', currentPath);
}

// Función para interceptar y prevenir redirecciones (DESACTIVADA)
function preventRedirections() {
    console.log('ℹ️ Interceptores de redirección desactivados - redirecciones permitidas');
}

// Función para cargar la versión desde configuración
function loadVersion() {
    try {
        if (window.AppConfig && window.AppConfig.app.version) {
            document.getElementById('version-display').textContent = `v${window.AppConfig.app.version}`;
            console.log('✅ Versión cargada desde config:', window.AppConfig.app.version);
        } else {
            console.error('❌ No se pudo cargar la configuración');
            document.getElementById('version-display').textContent = 'v?.?.?';
        }
    } catch (error) {
        console.error('❌ Error cargando versión:', error);
        document.getElementById('version-display').textContent = 'v?.?.?';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { printCurrentRoute, preventRedirections, loadVersion };
} else {
    window.IndexUtils = { printCurrentRoute, preventRedirections, loadVersion };
}