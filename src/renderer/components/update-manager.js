/**
 * UpdateManager - Sistema global para manejar actualizaciones usando DialogManager
 * Mantiene el diálogo visible en todas las rutas hasta completar el proceso
 */
class UpdateManager {
    constructor() {
        this.dialogManager = null;
        this.updateState = 'idle'; // idle, checking, available, downloading, downloaded, installing
        this.updateInfo = null;
        this.downloadProgress = 0;
        this.listenersSetup = false;
        
        // Claves para localStorage
        this.storageKeys = {
            state: 'udemigo_update_state',
            info: 'udemigo_update_info',
            progress: 'udemigo_update_progress'
        };
        
        this.init();
    }

    init() {
        // Crear instancia global de DialogManager si no existe
        if (!window.dialogManager) {
            window.dialogManager = new DialogManager();
        }
        this.dialogManager = window.dialogManager;
        
        // Restaurar estado persistente
        this.restoreState();
        
        // Configurar listeners de eventos del proceso principal
        this.setupUpdateListeners();
        
        // Restaurar diálogo si hay una actualización en curso
        this.restoreDialog();
        
    }

    // Métodos de persistencia
    saveState() {
        try {
            localStorage.setItem(this.storageKeys.state, this.updateState);
            localStorage.setItem(this.storageKeys.info, JSON.stringify(this.updateInfo));
            localStorage.setItem(this.storageKeys.progress, this.downloadProgress.toString());
        } catch (error) {
        }
    }

    restoreState() {
        try {
            const savedState = localStorage.getItem(this.storageKeys.state);
            const savedInfo = localStorage.getItem(this.storageKeys.info);
            const savedProgress = localStorage.getItem(this.storageKeys.progress);

            if (savedState && savedState !== 'idle') {
                this.updateState = savedState;
                this.updateInfo = savedInfo ? JSON.parse(savedInfo) : null;
                this.downloadProgress = savedProgress ? parseFloat(savedProgress) : 0;
            }
        } catch (error) {
            this.clearState();
        }
    }

    restoreDialog() {
        // Solo restaurar si hay una actualización en curso
        if (this.updateState === 'idle') return;


        switch (this.updateState) {
            case 'available':
                this.showUpdateAvailable();
                break;
            case 'downloading':
                this.showDownloadingDialog();
                break;
            case 'downloaded':
                this.showUpdateDownloaded();
                break;
        }
    }

    clearState() {
        try {
            localStorage.removeItem(this.storageKeys.state);
            localStorage.removeItem(this.storageKeys.info);
            localStorage.removeItem(this.storageKeys.progress);
            this.updateState = 'idle';
            this.updateInfo = null;
            this.downloadProgress = 0;
        } catch (error) {
        }
    }

    setupUpdateListeners() {
        if (!window.electronAPI) {
            return;
        }

        // Evitar configurar listeners múltiples veces
        if (this.listenersSetup) {
            return;
        }

        // Evento: Actualización disponible
        window.electronAPI.receive('show-update-overlay', (info) => {
            this.updateInfo = info;
            this.updateState = 'available';
            this.saveState();
            this.showUpdateAvailable();
        });

        // Evento: Progreso de descarga
        window.electronAPI.receive('update-download-progress', (progress) => {
            this.downloadProgress = progress.percent;
            this.saveState();
            this.updateDownloadProgress(progress);
        });

        // Evento: Descarga completada
        window.electronAPI.receive('update-downloaded-overlay', (info) => {
            this.updateState = 'downloaded';
            this.saveState();
            this.showUpdateDownloaded();
        });

        // Evento: Logout (cerrar diálogos)
        window.electronAPI.receive('perform-logout', () => {
            this.clearState();
            this.hideUpdateDialog();
        });

        this.listenersSetup = true;
    }

    showUpdateAvailable() {
        const version = this.updateInfo?.version || 'nueva versión';
        
        this.dialogManager.show({
            type: 'info',
            title: 'Nueva actualización disponible',
            message: `La versión ${version} está disponible. ¿Quieres descargarla ahora?`,
            animation: 'slide-right',
            position: 'top-right',
            persistent: true, // No se puede cerrar con ESC o click fuera
            buttons: [
                {
                    text: 'Descargar',
                    type: 'primary',
                    action: () => this.startDownload()
                },
                {
                    text: 'Más tarde',
                    type: 'secondary',
                    action: () => this.postponeUpdate()
                }
            ]
        });
    }

    startDownload() {
        this.updateState = 'downloading';
        this.downloadProgress = 0;
        this.saveState();
        
        // Actualizar el diálogo para mostrar progreso
        this.dialogManager.updateTitle('Descargando actualización');
        this.dialogManager.updateMessage('Preparando descarga...');
        
        // Mostrar el diálogo con barra de progreso
        this.dialogManager.show({
            type: 'info',
            title: 'Descargando actualización',
            message: 'Iniciando descarga... 0%',
            animation: 'slide-right',
            position: 'top-right',
            persistent: true,
            showProgress: true,
            progress: 0,
            buttons: [
                {
                    text: 'Ocultar',
                    type: 'secondary',
                    action: () => this.hideUpdateDialog()
                }
            ]
        });

        // Iniciar descarga a través del proceso principal
        if (window.electronAPI) {
            window.electronAPI.invoke('update-download');
        }
    }

    showDownloadingDialog() {
        // Mostrar el diálogo con el progreso actual
        this.dialogManager.show({
            type: 'info',
            title: 'Descargando actualización',
            message: `Descargando... ${Math.round(this.downloadProgress)}%`,
            animation: 'slide-right',
            position: 'top-right',
            persistent: true,
            showProgress: true,
            progress: this.downloadProgress,
            buttons: [
                {
                    text: 'Ocultar',
                    type: 'secondary',
                    action: () => this.hideUpdateDialog()
                }
            ]
        });
    }

    updateDownloadProgress(progress) {
        if (this.updateState !== 'downloading') return;
        
        const percent = Math.round(progress.percent);
        const speed = Math.round(progress.bytesPerSecond / 1024);
        
        // Actualizar mensaje y progreso
        this.dialogManager.updateMessage(`Descargando... ${percent}% (${speed} KB/s)`);
        this.dialogManager.updateProgress(percent, `${percent}%`);
    }

    showUpdateDownloaded() {
        const version = this.updateInfo?.version || 'nueva versión';
        
        this.dialogManager.show({
            type: 'success',
            title: 'Actualización descargada',
            message: `La versión ${version} se descargó correctamente. ¿Reiniciar la aplicación ahora?`,
            animation: 'slide-right',
            position: 'top-right',
            persistent: true,
            showProgress: false,
            buttons: [
                {
                    text: 'Reiniciar ahora',
                    type: 'primary',
                    action: () => this.restartApp()
                },
                {
                    text: 'Más tarde',
                    type: 'secondary',
                    action: () => this.postponeRestart()
                }
            ]
        });
    }

    restartApp() {
        
        // Limpiar estado antes de reiniciar
        this.clearState();
        
        if (window.electronAPI) {
            window.electronAPI.invoke('update-restart');
        }
        
        // Mostrar mensaje de reinicio
        this.dialogManager.show({
            type: 'info',
            title: 'Reiniciando aplicación',
            message: 'La aplicación se reiniciará en unos segundos...',
            animation: 'slide-right',
            position: 'top-right',
            persistent: true,
            buttons: []
        });
    }

    postponeUpdate() {
        this.clearState();
        this.hideUpdateDialog();
        
        // Mostrar notificación temporal
        this.dialogManager.toast({
            type: 'info',
            title: 'Actualización postponed',
            message: 'Puedes actualizar más tarde desde el menú',
            autoClose: 3000
        });
    }

    postponeRestart() {
        this.hideUpdateDialog();
        
        // Mostrar notificación temporal
        this.dialogManager.toast({
            type: 'success',
            title: 'Actualización lista',
            message: 'La actualización se aplicará en el próximo reinicio',
            autoClose: 3000
        });
    }

    hideUpdateDialog() {
        if (this.dialogManager) {
            this.dialogManager.hide();
        }
    }

    // Método para verificar actualizaciones manualmente
    checkForUpdates() {
        if (this.updateState !== 'idle') {
            return;
        }

        this.updateState = 'checking';
        this.saveState();
        
        this.dialogManager.show({
            type: 'info',
            title: 'Verificando actualizaciones',
            message: 'Buscando nuevas versiones...',
            animation: 'slide-right',
            position: 'top-right',
            persistent: true,
            buttons: []
        });

        if (window.electronAPI) {
            window.electronAPI.invoke('check-for-updates')
                .then((result) => {
                    if (!result?.updateAvailable) {
                        this.clearState();
                        this.dialogManager.show({
                            type: 'success',
                            title: 'Aplicación actualizada',
                            message: 'Ya tienes la versión más reciente',
                            animation: 'slide-right',
                            position: 'top-right',
                            autoClose: 2000,
                            buttons: []
                        });
                    }
                })
                .catch((error) => {
                    this.clearState();
                    this.dialogManager.show({
                        type: 'error',
                        title: 'Error de actualización',
                        message: 'No se pudo verificar si hay actualizaciones disponibles',
                        animation: 'slide-right',
                        position: 'top-right',
                        buttons: [
                            { text: 'Cerrar', type: 'primary', action: () => this.dialogManager.hide() }
                        ]
                    });
                });
        }
    }

    // Getters para estado actual
    get isUpdateInProgress() {
        return this.updateState !== 'idle';
    }

    get currentState() {
        return this.updateState;
    }

    get currentProgress() {
        return this.downloadProgress;
    }

    // Método estático para crear instancia global
    static createGlobalInstance() {
        if (!window.updateManager) {
            window.updateManager = new UpdateManager();
        } else {
            // Si ya existe, solo restaurar diálogo si es necesario
            window.updateManager.restoreDialog();
        }
        return window.updateManager;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpdateManager;
} else {
    // Browser environment - attach to window
    window.UpdateManager = UpdateManager;
}