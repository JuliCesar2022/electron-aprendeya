/**
 * SocketManager - Maneja la conexión con el socket del proceso principal
 */
class SocketManager {
    constructor() {
        this.isConnected = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (window.electronAPI) {
            // Escuchar eventos del proceso principal
            window.electronAPI.receive('socket-connected', (data) => {
                this.isConnected = true;
            });

            window.electronAPI.receive('socket-disconnected', () => {
                this.isConnected = false;
            });

            window.electronAPI.receive('socket-message', (data) => {
                // Aquí puedes manejar mensajes del servidor
            });

            window.electronAPI.receive('socket-error', (error) => {
            });
        }
    }

    async conectarSocket(udemyId) {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.invoke('socket-connect', udemyId);
                return result;
            } else {
                return { success: false, error: 'electronAPI no disponible' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async desconectarSocket() {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.invoke('socket-disconnect');
                return result;
            } else {
                return { success: false, error: 'electronAPI no disponible' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async enviarMensaje(evento, data) {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.invoke('socket-send-message', evento, data);
                return result;
            } else {
                return { success: false, error: 'electronAPI no disponible' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getStatus() {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.invoke('socket-status');
                return result;
            } else {
                return { success: false, error: 'electronAPI no disponible' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocketManager;
} else {
    window.SocketManager = SocketManager;
}