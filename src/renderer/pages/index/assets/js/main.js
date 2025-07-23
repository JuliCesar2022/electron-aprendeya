/**
 * Main script for index page
 */

// Initialize socket manager, app initializer and update manager
let socketManager;
let appInitializer;
let updateManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando página index...');
    
    // Initialize socket manager
    socketManager = new SocketManager();
    window.socketManager = socketManager;
    
    // Initialize global UpdateManager
    updateManager = UpdateManager.createGlobalInstance();
    console.log('✅ UpdateManager global inicializado');
    
    // Load version
    if (window.IndexUtils) {
        window.IndexUtils.loadVersion();
        window.IndexUtils.printCurrentRoute();
        window.IndexUtils.preventRedirections();
    }
    
    // Create global instance of AppInitializer
    appInitializer = new AppInitializer();
    window.appInitializer = appInitializer;
    
    // Socket disconnect handler for app closing
    if (window.electronAPI) {
        window.electronAPI.receive('app-closing', () => {
            console.log('🔌 Aplicación cerrándose, socket se desconectará desde proceso principal');
        });
    }
    
    console.log('✅ Página index inicializada correctamente');
});