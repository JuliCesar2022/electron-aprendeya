/**
 * Main script for index page
 */

// Import hot reload client for development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    const script = document.createElement('script');
    script.src = '../../../../hot-reload-client.js';
    script.type = 'module';
    document.head.appendChild(script);
}

// Initialize socket manager, app initializer and update manager
let socketManager;
let appInitializer;
let updateManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize socket manager
    socketManager = new SocketManager();
    window.socketManager = socketManager;
    
    // Initialize global UpdateManager
    updateManager = UpdateManager.createGlobalInstance();
    
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
        });
    }
    
});