/**
 * Utility functions for the index page
 */

// Función para imprimir ruta actual (solo en consola)
function printCurrentRoute() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
}

// Función para interceptar y prevenir redirecciones (DESACTIVADA)
function preventRedirections() {
}

// Función para cargar la versión desde configuración
function loadVersion() {
    try {
        if (window.AppConfig && window.AppConfig.app.version) {
            document.getElementById('version-display').textContent = `v${window.AppConfig.app.version}`;
        } else {
            document.getElementById('version-display').textContent = 'v?.?.?';
        }
    } catch (error) {
        document.getElementById('version-display').textContent = 'v?.?.?';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { printCurrentRoute, preventRedirections, loadVersion };
} else {
    window.IndexUtils = { printCurrentRoute, preventRedirections, loadVersion };
}