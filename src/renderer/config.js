// Configuraciones de la aplicación
const AppConfig = {
    // Información de la aplicación
    app: {
        name: 'Udemigo',
        version: '2.1.4',
        description: 'Tu plataforma de aprendizaje mejorada',
        author: 'ForIf',
        homepage: 'https://forif.co'
    },
    
    // URLs del backend
    backend: {
        baseUrl: 'https://aprendeya-backend.forif.co',
        apiVersion: 'v1'
    },
    
    // Configuraciones de UI
    ui: {
        splash: {
            minDisplayTime: 2000, // milisegundos
            fadeOutTime: 500
        },
        notifications: {
            duration: 3000,
            fadeTime: 300
        }
    },
    
    // Configuraciones de debugging
    debug: {
        enabled: true,
        logLevel: 'info' // 'debug', 'info', 'warn', 'error'
    }
};

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
} else {
    window.AppConfig = AppConfig;
}