const { app, BrowserWindow, Menu, dialog, shell, ipcMain, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const os = require('os');
const BraveController = require('./brave-controller');
const HotReloadManager = require('./hot-reload');

// === SISTEMA INTELIGENTE DE CONFIGURACIÓN SEGÚN RAM ===
class SmartMemoryManager {
    constructor() {
        this.totalRAM = 0;
        this.freeRAM = 0;
        this.usedRAM = 0;
        this.profile = 'ultra-low';
        this.detectSystemMemory();
        this.applyConfiguration();
    }

    detectSystemMemory() {
        // Obtener información de memoria del sistema
        this.totalRAM = Math.round(os.totalmem() / (1024 * 1024 * 1024)); // GB
        this.freeRAM = Math.round(os.freemem() / (1024 * 1024 * 1024)); // GB
        this.usedRAM = this.totalRAM - this.freeRAM;
        
        console.log(`🖥️ Sistema detectado: ${this.totalRAM}GB total | ${this.freeRAM}GB libre | ${this.usedRAM}GB usado`);
        
        // Determinar perfil según RAM disponible
        if (this.freeRAM >= 6) {
            this.profile = 'high-performance';
        } else if (this.freeRAM >= 4) {
            this.profile = 'balanced';
        } else if (this.freeRAM >= 2) {
            this.profile = 'low-memory';
        } else {
            this.profile = 'ultra-low';
        }
        
        console.log(`🎯 Perfil seleccionado: ${this.profile} (${this.freeRAM}GB RAM libre)`);
    }

    applyConfiguration() {
        switch (this.profile) {
            case 'high-performance':
                this.applyHighPerformanceConfig();
                break;
            case 'balanced':
                this.applyBalancedConfig();
                break;    
            case 'low-memory':
                this.applyLowMemoryConfig();
                break;
            case 'ultra-low':
                this.applyUltraLowConfig();
                break;
        }
    }

    applyHighPerformanceConfig() {
        console.log('🚀 Configurando modo HIGH PERFORMANCE (6GB+ libre) - Renderizado como ultra-low');
        
        // Usar la misma configuración de renderizado que ultra-low para sombras consistentes
        app.commandLine.appendSwitch('--max-old-space-size', '512'); // Mayor memoria pero mismo renderizado
        app.commandLine.appendSwitch('--renderer-process-limit', '8'); // Más procesos
        app.commandLine.appendSwitch('--disable-gpu'); // Igual que ultra-low
        app.commandLine.appendSwitch('--disable-software-rasterizer'); // Igual que ultra-low
        app.commandLine.appendSwitch('--memory-pressure-off');
        app.commandLine.appendSwitch('--optimize-for-size');
        app.commandLine.appendSwitch('--enable-low-end-device-mode'); // Igual que ultra-low
        app.commandLine.appendSwitch('--disable-background-timer-throttling');
        app.commandLine.appendSwitch('--disk-cache-size', '200000000'); // 200MB cache
        
        this.appMemoryLimit = 800; // 800MB para la app
        this.webviewMemoryLimit = 400; // 400MB para webview
    }

    applyBalancedConfig() {
        console.log('⚖️ Configurando modo BALANCED (4-6GB libre) - Renderizado como ultra-low');
        
        // Usar la misma configuración de renderizado que ultra-low para sombras consistentes
        app.commandLine.appendSwitch('--max-old-space-size', '128'); // 128MB por proceso
        app.commandLine.appendSwitch('--renderer-process-limit', '4'); // 4 procesos
        app.commandLine.appendSwitch('--disable-gpu'); // Igual que ultra-low
        app.commandLine.appendSwitch('--disable-software-rasterizer'); // Igual que ultra-low
        app.commandLine.appendSwitch('--memory-pressure-off');
        app.commandLine.appendSwitch('--optimize-for-size');
        app.commandLine.appendSwitch('--enable-low-end-device-mode'); // Igual que ultra-low
        app.commandLine.appendSwitch('--disable-background-timer-throttling');
        app.commandLine.appendSwitch('--disk-cache-size', '100000000'); // 100MB cache
        
        this.appMemoryLimit = 400; // 400MB para la app
        this.webviewMemoryLimit = 200; // 200MB para webview
    }

    applyLowMemoryConfig() {
        console.log('🔋 Configurando modo LOW MEMORY (2-4GB libre) - Renderizado como ultra-low');
        
        // Usar la misma configuración de renderizado que ultra-low para sombras consistentes
        app.commandLine.appendSwitch('--max-old-space-size', '64'); // 64MB por proceso
        app.commandLine.appendSwitch('--renderer-process-limit', '2'); // 2 procesos
        app.commandLine.appendSwitch('--disable-gpu'); // Igual que ultra-low
        app.commandLine.appendSwitch('--disable-software-rasterizer'); // Igual que ultra-low
        app.commandLine.appendSwitch('--memory-pressure-off');
        app.commandLine.appendSwitch('--optimize-for-size');
        app.commandLine.appendSwitch('--enable-low-end-device-mode'); // Igual que ultra-low
        app.commandLine.appendSwitch('--disk-cache-size', '50000000'); // 50MB cache
        app.commandLine.appendSwitch('--aggressive-cache-discard');
        
        this.appMemoryLimit = 200; // 200MB para la app
        this.webviewMemoryLimit = 120; // 120MB para webview
    }

    applyUltraLowConfig() {
        console.log('🆘 Configurando modo ULTRA LOW (<2GB libre)');
        
        // Configuración ultra-agresiva para sistemas con muy poca RAM
        app.commandLine.appendSwitch('--max-old-space-size', '30'); // 30MB por proceso
        app.commandLine.appendSwitch('--renderer-process-limit', '1'); // 1 proceso
        app.commandLine.appendSwitch('--disable-gpu'); // Sin GPU
        app.commandLine.appendSwitch('--disable-software-rasterizer');
        app.commandLine.appendSwitch('--disable-features', 'site-per-process,AudioServiceOutOfProcess');
        app.commandLine.appendSwitch('--disable-extensions');
        app.commandLine.appendSwitch('--disable-plugins');
        app.commandLine.appendSwitch('--disable-web-security');
        app.commandLine.appendSwitch('--disable-site-isolation-trials');
        app.commandLine.appendSwitch('--no-zygote');
        app.commandLine.appendSwitch('--memory-pressure-off');
        app.commandLine.appendSwitch('--optimize-for-size');
        app.commandLine.appendSwitch('--enable-low-end-device-mode');
        app.commandLine.appendSwitch('--disable-background-networking');
        app.commandLine.appendSwitch('--disable-background-timer-throttling');
        app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
        app.commandLine.appendSwitch('--disable-renderer-backgrounding');
        app.commandLine.appendSwitch('--disable-features', 'TranslateUI,BlinkGenPropertyTrees');
        app.commandLine.appendSwitch('--aggressive-cache-discard');
        app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
        app.commandLine.appendSwitch('--disk-cache-size', '20000000'); // 20MB cache
        
        this.appMemoryLimit = 120; // 120MB para la app
        this.webviewMemoryLimit = 80; // 80MB para webview
    }

    getMemoryLimits() {
        return {
            app: this.appMemoryLimit,
            webview: this.webviewMemoryLimit,
            profile: this.profile,
            totalRAM: this.totalRAM,
            freeRAM: this.freeRAM
        };
    }

    // Monitorear cambios en RAM cada 30 segundos
    startMemoryMonitoring() {
        setInterval(() => {
            const currentFreeRAM = Math.round(os.freemem() / (1024 * 1024 * 1024));
            const ramChange = Math.abs(currentFreeRAM - this.freeRAM);
            
            // Si la RAM cambió significativamente (>1GB), log para información
            if (ramChange >= 1) {
                console.log(`📊 RAM actualizada: ${currentFreeRAM}GB libre (era ${this.freeRAM}GB)`);
                
                // Determinar si cambiaría de perfil
                let newProfile = 'ultra-low';
                if (currentFreeRAM >= 6) {
                    newProfile = 'high-performance';
                } else if (currentFreeRAM >= 4) {
                    newProfile = 'balanced';
                } else if (currentFreeRAM >= 2) {
                    newProfile = 'low-memory';
                }
                
                if (newProfile !== this.profile) {
                    console.log(`🔄 Perfil cambiaría de ${this.profile} a ${newProfile} (requiere reinicio)`);
                }
                
                this.freeRAM = currentFreeRAM;
            }
        }, 30000); // 30 segundos
    }
}

// Inicializar sistema inteligente de memoria
const smartMemoryManager = new SmartMemoryManager();

// Iniciar monitoreo dinámico de memoria
smartMemoryManager.startMemoryMonitoring();

// Mostrar configuración aplicada
const memoryLimits = smartMemoryManager.getMemoryLimits();
console.log(`✅ Configuración aplicada: ${memoryLimits.profile.toUpperCase()}`);
console.log(`🎯 Límites: App ${memoryLimits.app}MB | WebView ${memoryLimits.webview}MB`);
console.log(`🖥️ Sistema: ${memoryLimits.totalRAM}GB total | ${memoryLimits.freeRAM}GB libre`);
console.log(`📊 Monitoreo de RAM activado cada 30 segundos`);

// Clase para manejar el socket en el proceso principal
class MainSocketManager {
  constructor() {
    this.io = null;
    this.socket = null;
    this.isConnected = false;
    this.backendURL = 'https://aprendeya-backend.forif.co';
    this.currentUdemyId = null;
  }

  initializeSocketIO() {
    try {
      // Importar socket.io-client
      this.io = require('socket.io-client');
    } catch (error) {
      // Instalar socket.io-client si no está disponible
      const { exec } = require('child_process');
      exec('npm install socket.io-client', (error, stdout, stderr) => {
        if (error) {
        } else {
          this.io = require('socket.io-client');
        }
      });
    }
  }

  async conectarSocket(udemyId) {
    try {
      if (!this.io) {
        return;
      }

      if (!udemyId) {
        return;
      }

      // Si ya está conectado con el mismo ID, no hacer nada
      if (this.socket && this.isConnected && this.currentUdemyId === udemyId) {
        return;
      }

      // Desconectar socket anterior si existe
      if (this.socket) {
        this.socket.disconnect();
      }


      // Crear nueva conexión
      this.socket = this.io(this.backendURL, {
        transports: ['websocket'],
        query: {
          udemyId: udemyId
        }
      });

      this.currentUdemyId = udemyId;

      this.socket.on('connect', () => {
        this.isConnected = true;
        
        // Notificar a todas las ventanas que el socket está conectado
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send('socket-connected', { udemyId });
        });
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        
        // Notificar a todas las ventanas que el socket está desconectado
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send('socket-disconnected');
        });
      });

      this.socket.on('mensaje', (data) => {
        
        // Enviar mensaje a todas las ventanas
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send('socket-message', data);
        });
      });

      this.socket.on('error', (error) => {
        
        // Notificar error a todas las ventanas
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send('socket-error', error);
        });
      });

    } catch (error) {
    }
  }

  desconectarSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentUdemyId = null;
    }
  }

  enviarMensaje(evento, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(evento, data);
    } else {
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      udemyId: this.currentUdemyId
    };
  }
}

// Instancia global del socket manager
const mainSocketManager = new MainSocketManager();

// --- Configuración del Auto-Updater ---
class AppUpdater {
  constructor() {
    this.setupAutoUpdater();
  }

  setupAutoUpdater() {
    // Configurar auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // FORZAR actualizaciones en desarrollo para testing
    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
    }
    
    // Configurar el servidor de actualizaciones (GitHub Releases)
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'JuliCesar2022',
      repo: 'electron-aprendeya',
      private: false,
      releaseType: 'release'
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Cuando inicia la verificación
    autoUpdater.on('checking-for-update', () => {
    });

    // Cuando se encuentra una actualización
    autoUpdater.on('update-available', (info) => {
      
      // Actualizar estado global de actualización
      updateStatus.available = true;
      updateStatus.version = info.version;
      updateStatus.downloaded = false;
      
      // Guardar info de actualización pendiente
      pendingUpdateInfo = {
        version: info.version,
        releaseNotes: info.releaseNotes || ''
      };
      
      // Esperar un poco para asegurar que la ventana esté lista
      setTimeout(() => {
        const windows = BrowserWindow.getAllWindows();
        
        if (windows.length > 0) {
          windows.forEach((window, index) => {
            
            // Enviar evento al renderer para que use su propio sistema de overlay
            window.webContents.send('show-update-overlay', {
              version: info.version,
              releaseNotes: info.releaseNotes || ''
            });
          });
        } else {
        }
      }, 1000); // Esperar 1 segundo
    });

    // Cuando no hay actualizaciones
    autoUpdater.on('update-not-available', (info) => {
      
      // Actualizar estado global
      updateStatus.available = false;
      updateStatus.version = null;
      
      // Solo para testing en desarrollo - mostrar overlay de prueba
      if (!app.isPackaged) {
        setTimeout(() => {
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows.forEach(window => {
              window.webContents.send('show-update-overlay', {
                version: '2.1.2',
                releaseNotes: 'Versión de prueba - desarrollo'
              });
            });
          }
        }, 3000);
      }
    });

    // Progreso de descarga
    autoUpdater.on('download-progress', (progressObj) => {
      let logMessage = `Descargando: ${Math.round(progressObj.percent)}%`;
      logMessage += ` (${Math.round(progressObj.bytesPerSecond / 1024)} KB/s)`;
      
      // Actualizar estado global
      updateStatus.downloadProgress = Math.round(progressObj.percent);
      
      // Enviar progreso a TODAS las ventanas
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows.forEach(window => {
          window.webContents.send('update-download-progress', progressObj);
        });
      }
    });

    // Cuando la descarga está completa
    autoUpdater.on('update-downloaded', (info) => {
      
      // Actualizar estado global
      updateStatus.downloaded = true;
      updateStatus.downloadProgress = 100;
      
      // Limpiar info pendiente ya que la descarga terminó
      pendingUpdateInfo = null;
      
      // Enviar evento de descarga completa a la ventana principal
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows.forEach(window => {
          window.webContents.send('update-downloaded-overlay', {
            version: info.version
          });
        });
      }
    });

    // Manejo de errores
    autoUpdater.on('error', (error) => {
    });
  }

  // Verificar actualizaciones manualmente
  checkForUpdates() {
    return autoUpdater.checkForUpdates();
  }

  // Forzar descarga de actualización
  downloadUpdate() {
    autoUpdater.downloadUpdate();
  }
}

// Instancia global del updater
const appUpdater = new AppUpdater();

// Read the interceptor code once when the main process starts
let udemyInterceptorCode = '';
try {
  udemyInterceptorCode = fs.readFileSync(path.join(__dirname, '../renderer/udemy-interceptor-simple.js'), 'utf8');
} catch (error) {
}

// Global Chrome Controller instance (Singleton)
let chromeController = null;

// Función para obtener instancia singleton de BraveController
function getBraveController() {
  if (!chromeController) {
    chromeController = new BraveController();
    
    // Cleanup automático cuando se cierra la app
    app.on('will-quit', async () => {
      if (chromeController) {
        await chromeController.close();
        chromeController = null;
      }
    });
  }
  return chromeController;
}

// Global notification window
let notificationWindow = null;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false,
      webviewTag: true, // Enable webview tag
      preload: path.join(__dirname, '../preload/preload.js'),
      
      // === CONFIGURACIÓN INTELIGENTE SEGÚN RAM ===
      backgroundThrottling: false,
      offscreen: false,
      sandbox: false,
      spellcheck: false,
      enableWebSQL: false,
      v8CacheOptions: 'none',
      
      // === LÍMITES DINÁMICOS SEGÚN SISTEMA ===
      additionalArguments: [
        `--max-old-space-size=${Math.round(memoryLimits.app * 0.7)}`, // 70% del límite de app
        '--memory-pressure-off',
        '--optimize-for-size'
      ]
    },
    icon: path.join(__dirname, '../../assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Abrir DevTools automáticamente en desarrollo
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/pages/index/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Register window for hot reload
    if (hotReloadManager) {
      hotReloadManager.registerWindow(mainWindow, 'main');
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Todos los enlaces se abren externamente
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // WebView handles navigation and interceptor injection now

  createMenu(mainWindow);

  // Initialize Brave Controller (singleton)
  chromeController = getBraveController();

  return mainWindow;
}

function createMenu(mainWindow) {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Nuevo',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            createWindow();
          }
        },
        {
          label: 'Recargar',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Ir a Inicio',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.loadFile(path.join(__dirname, '../renderer/pages/udemy-webview/index.html'));
          }
        },
        {
          label: 'Ir a Login',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.loadFile(path.join(__dirname, '../renderer/pages/login/index.html'));
          }
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectall', label: 'Seleccionar todo' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollador' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' }
      ]
    },
    {
      label: 'Extensiones',
      submenu: [
        {
          label: 'Verificar actualizaciones',
          click: () => {
            appUpdater.checkForUpdates();
          }
        },
        { type: 'separator' },
        {
          label: 'Cerrar sesión',
          click: () => {
            logout(mainWindow);
          }
        },
        { type: 'separator' },
        {
          label: 'Configurar Interceptor',
          click: () => {
            openInterceptorConfig();
          }
        },
        { type: 'separator' },
        {
          label: '🔍 Debug Console de Brave',
          click: () => {
            if (chromeController) {
              chromeController.createDebugWindow();
            }
          }
        },
        {
          label: '📁 Abrir Carpeta de Logs',
          click: () => {
            if (chromeController) {
              const result = chromeController.openLogDirectory();
              if (!result.success) {
                dialog.showErrorBox('Error', `No se pudo abrir la carpeta de logs: ${result.error}`);
              }
            }
          }
        }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'close', label: 'Cerrar' }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'Acerca de' },
        { type: 'separator' },
        { role: 'services', label: 'Servicios' },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar' },
        { role: 'hideothers', label: 'Ocultar otros' },
        { role: 'unhide', label: 'Mostrar todo' },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' }
      ]
    });
  }

  // Eliminar menú completamente
  Menu.setApplicationMenu(null);
}

// ===== SISTEMA DE VENTANAS DE NOTIFICACIÓN NATIVAS =====

function createNotificationWindow() {
  if (notificationWindow) {
    notificationWindow.close();
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  notificationWindow = new BrowserWindow({
    width: 380,
    height: 200,
    x: width - 400, // 20px desde el borde derecho
    y: 20, // 20px desde arriba
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    show: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '../preload/notification-preload.js')
    }
  });

  // Cargar el HTML de notificación
  const notificationHTML = createNotificationHTML();
  notificationWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(notificationHTML)}`);

  notificationWindow.once('ready-to-show', () => {
    notificationWindow.show();
    
    // Animar entrada
    const currentBounds = notificationWindow.getBounds();
    notificationWindow.setBounds({
      ...currentBounds,
      x: width + 100 // Fuera de pantalla
    });
    
    // Animar hacia la posición final
    let currentX = width + 100;
    const targetX = width - 400;
    const animate = () => {
      currentX -= 15;
      if (currentX <= targetX) {
        currentX = targetX;
        notificationWindow.setBounds({
          ...currentBounds,
          x: currentX
        });
        return;
      }
      notificationWindow.setBounds({
        ...currentBounds,
        x: currentX
      });
      setTimeout(animate, 16); // ~60fps
    };
    animate();
  });

  notificationWindow.on('closed', () => {
    notificationWindow = null;
  });

  return notificationWindow;
}

function closeNotificationWindow() {
  if (notificationWindow) {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    
    // Animar salida
    const currentBounds = notificationWindow.getBounds();
    let currentX = currentBounds.x;
    const targetX = width + 100;
    const animate = () => {
      currentX += 15;
      if (currentX >= targetX) {
        notificationWindow.close();
        return;
      }
      notificationWindow.setBounds({
        ...currentBounds,
        x: currentX
      });
      setTimeout(animate, 16);
    };
    animate();
  }
}

function showUpdateAvailableNative(info) {
  const window = createNotificationWindow();
  window.webContents.once('dom-ready', () => {
    window.webContents.send('show-update-available', info);
  });
}

function showDownloadProgressNative() {
  if (notificationWindow) {
    notificationWindow.webContents.send('show-download-progress');
  }
}

function updateDownloadProgressNative(progress) {
  if (notificationWindow) {
    notificationWindow.webContents.send('update-progress', progress);
  }
}

function showUpdateDownloadedNative(info) {
  if (notificationWindow) {
    notificationWindow.webContents.send('show-update-downloaded', info);
  }
}

function createNotificationHTML() {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificación</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: transparent;
            overflow: hidden;
            user-select: none;
            -webkit-user-select: none;
        }
        
        .notification {
            width: 360px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transform: translateX(400px);
            transition: transform 0.3s ease;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .icon {
            font-size: 24px;
            margin-right: 10px;
        }
        
        .title {
            font-weight: bold;
            font-size: 16px;
            flex: 1;
        }
        
        .version {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .close-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 10px;
        }
        
        .close-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .message {
            margin-bottom: 15px;
            font-size: 14px;
            opacity: 0.9;
            line-height: 1.4;
        }
        
        .progress-container {
            margin: 15px 0;
            display: none;
        }
        
        .progress-bar {
            background: rgba(255,255,255,0.2);
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 10px;
        }
        
        .progress-fill {
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 4px;
        }
        
        .progress-info {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            opacity: 0.8;
        }
        
        .buttons {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            flex: 1;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
            border: none;
            font-size: 14px;
        }
        
        .btn-primary {
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
        }
        
        .btn-primary:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .btn-secondary {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
        }
        
        .btn-secondary:hover {
            background: rgba(255,255,255,0.1);
        }
        
        .btn-restart {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            border: none;
        }
        
        .btn-restart:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        }
    </style>
</head>
<body>
    <div class="notification" id="notification">
        <div class="header">
            <div class="icon" id="icon">📦</div>
            <div>
                <div class="title" id="title">Nueva actualización disponible</div>
                <div class="version" id="version">Versión 2.1.2</div>
            </div>
            <button class="close-btn" onclick="closeNotification()">×</button>
        </div>
        
        <div class="message" id="message">
            Se ha encontrado una nueva versión de Udemigo. ¿Quieres descargarla ahora?
        </div>
        
        <div class="progress-container" id="progressContainer">
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-info">
                <span id="progressPercent">0%</span>
                <span id="progressSpeed">0 KB/s</span>
            </div>
        </div>
        
        <div class="buttons" id="buttons">
            <button class="btn btn-primary" onclick="downloadUpdate()">Descargar ahora</button>
            <button class="btn btn-secondary" onclick="closeNotification()">Más tarde</button>
        </div>
    </div>
    
    <script>
        // Mostrar notificación con animación
        setTimeout(() => {
            document.getElementById('notification').classList.add('show');
        }, 100);
        
        function closeNotification() {
            window.electronAPI.closeNotification();
        }
        
        function downloadUpdate() {
            window.electronAPI.downloadUpdate();
        }
        
        function restartApp() {
            window.electronAPI.restartApp();
        }
    </script>
</body>
</html>
  `;
}



async function logout(mainWindow) {
  const response = dialog.showMessageBoxSync(mainWindow, {
    type: 'question',
    buttons: ['Cerrar sesión', 'Cancelar'],
    defaultId: 0,
    title: 'Cerrar sesión',
    message: '¿Estás seguro que deseas cerrar sesión?'
  });

  if (response === 0) {
    try {
      // Enviar evento de logout a la ventana actual para que maneje la limpieza
      mainWindow.webContents.send('perform-logout');
      
      // Limpiar cookies del backend
      await session.defaultSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'sessionstorage'],
        quotas: ['temporary', 'persistent', 'syncable']
      });
      
      
      // Recargar página principal
      mainWindow.loadFile(path.join(__dirname, '../renderer/pages/index/index.html'));
      
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Sesión cerrada',
        message: 'Has cerrado sesión exitosamente. Todas las cookies y datos han sido eliminados.'
      });
      
    } catch (error) {
      dialog.showErrorBox('Error', 'Hubo un problema al cerrar la sesión: ' + error.message);
    }
  }
}

function openInterceptorConfig() {
  const configWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Configuración del Interceptor',
    autoHideMenuBar: true
  });

  configWindow.loadFile(path.join(__dirname, '../renderer/interceptor-config.html'));
}

// --- IPC Main Handlers ---

// Handlers para llamadas unidireccionales (send)


ipcMain.on('go-to-udemy', (event, url) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) { 
    // Load WebView page instead of navigating directly
    window.loadFile(path.join(__dirname, '../renderer/pages/udemy-webview/index.html'));
  }
});

ipcMain.on('go-to-udemy-webview', (event, url) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) { 
    window.loadFile(path.join(__dirname, '../renderer/pages/udemy-webview/index.html'));
  }
});

// Handler for direct WebView page loading
ipcMain.on('load-webview-page', (event) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) { 
    window.loadFile(path.join(__dirname, '../renderer/pages/udemy-webview/index.html'));
  }
});

// Handler for WebView page ready notification
ipcMain.on('webview-page-ready', (event) => {
});

ipcMain.on('go-to-login', (event) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) {
    window.loadFile(path.join(__dirname, '../renderer/pages/login/index.html'));
  }
});

ipcMain.on('go-to-home', (event) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) {
    window.loadFile(path.join(__dirname, '../renderer/pages/index/index.html'));
  }
});


ipcMain.on('go-to-my-learning', (event) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) {
    // OPTIMIZACIÓN: Solo cargar my-learning cuando se necesite
    window.loadFile(path.join(__dirname, '../renderer/my-learning.html'));
  }
});

ipcMain.on('search-in-udemy', (event, query) => {
  const webContents = event.sender;
  
  if (query) {
    const searchUrl = `https://www.udemy.com/courses/search/?src=ukw&q=${encodeURIComponent(query)}`;
    
    // Send to renderer to navigate WebView
    webContents.send('webview-navigate', searchUrl);
  } else {
  }
});

// Handler for WebView notifications
ipcMain.on('webview-notification', (event, data) => {
  
  try {
    // Crear ventana de notificación si no existe
    if (!notificationWindow) {
      createNotificationWindow();
    }
    
    // Enviar datos de notificación a la ventana
    if (notificationWindow && notificationWindow.webContents) {
      notificationWindow.webContents.send('show-notification', {
        message: data.message || 'Notificación',
        type: data.type || 'info',
        color: data.color || '#4CAF50'
      });
      
      // Mostrar ventana si está oculta
      if (!notificationWindow.isVisible()) {
        notificationWindow.show();
      }
    }
  } catch (error) {
  }
});

// New handler for WebView navigation
ipcMain.on('webview-navigate', (event, url) => {
  const webContents = event.sender;
  
  if (url) {
    // Send to renderer to navigate WebView
    webContents.send('webview-navigate', url);
  }
});

// Handlers para llamadas bidireccionales (invoke)
ipcMain.handle('get-udemy-interceptor-code', () => {
  return udemyInterceptorCode;
});

// Handler para abrir ventana de debug de Brave
ipcMain.handle('open-brave-debug', () => {
  try {
    if (chromeController) {
      const debugWindow = chromeController.createDebugWindow();
      return { success: true, message: 'Ventana de debug abierta' };
    } else {
      return { success: false, error: 'BraveController no inicializado' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para obtener información de logging
ipcMain.handle('get-brave-logging-info', () => {
  try {
    if (chromeController) {
      return { success: true, data: chromeController.getLoggingInfo() };
    } else {
      return { success: false, error: 'BraveController no inicializado' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para abrir directorio de logs
ipcMain.handle('open-brave-logs-directory', () => {
  try {
    if (chromeController) {
      return chromeController.openLogDirectory();
    } else {
      return { success: false, error: 'BraveController no inicializado' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para obtener la versión de la app
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Handler para obtener información de memoria del sistema
ipcMain.handle('get-memory-info', () => {
  return {
    ...smartMemoryManager.getMemoryLimits(),
    currentFreeRAM: Math.round(os.freemem() / (1024 * 1024 * 1024)),
    currentUsedRAM: Math.round((os.totalmem() - os.freemem()) / (1024 * 1024 * 1024))
  };
});

// Variable global para almacenar el estado de actualización
let updateStatus = {
  available: false,
  version: null,
  downloadProgress: 0,
  downloaded: false
};

// Handler para verificar el estado de actualizaciones
ipcMain.handle('check-update-status', () => {
  return updateStatus;
});

// Handler para triggear verificación de actualizaciones
ipcMain.handle('trigger-update-check', async () => {
  try {
    console.log('🔄 Verificando actualizaciones manualmente...');
    const result = await autoUpdater.checkForUpdatesAndNotify();
    
    if (result && result.updateInfo) {
      updateStatus.available = true;
      updateStatus.version = result.updateInfo.version;
      console.log(`✅ Actualización encontrada: v${result.updateInfo.version}`);
      
      // Enviar notificación a todas las ventanas
      if (mainWindow) {
        mainWindow.webContents.send('update-available', result.updateInfo);
      }
      
      return { success: true, updateInfo: result.updateInfo };
    } else {
      updateStatus.available = false;
      console.log('ℹ️ No hay actualizaciones disponibles');
      return { success: true, message: 'No hay actualizaciones disponibles' };
    }
  } catch (error) {
    console.error('❌ Error al verificar actualizaciones:', error);
    return { success: false, error: error.message };
  }
});

// Brave Controller IPC Handlers
ipcMain.handle('chrome-launch', async (event, url) => {
  if (!chromeController) {
    return false;
  }
  
  
  try {
    // Obtener cookies de Electron
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents);
    const allCookies = await window.webContents.session.cookies.get({});
    
    // Filtrar SOLO las 3 cookies esenciales para máxima velocidad
    const udemyCookies = allCookies.filter(cookie => {
      const name = cookie.name || '';
      
      return (
        name === 'client_id' ||
        name === 'access_token' ||
        name === 'dj_session_id'
      );
    });
    
    udemyCookies.forEach(c => {
    });
    
    return await chromeController.launch(udemyCookies);
    
  } catch (error) {
    return await chromeController.launch();
  }
});

ipcMain.handle('chrome-launch-course', async (event, courseUrl) => {
  if (!chromeController) {
    return {
      success: false,
      error: 'Brave Controller no inicializado',
      details: {
        type: 'controller_not_initialized',
        userMessage: 'Error interno de la aplicación',
        suggestion: 'Reinicia la aplicación'
      }
    };
  }
  
  
  try {
    // Obtener cookies de Electron
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents);
    const allCookies = await window.webContents.session.cookies.get({});
    
    // Filtrar SOLO las 3 cookies esenciales para máxima velocidad
    const udemyCookies = allCookies.filter(cookie => {
      const name = cookie.name || '';
      
      return (
        name === 'client_id' ||
        name === 'access_token' ||
        name === 'dj_session_id'
      );
    });
    
    
    const result = await chromeController.launchWithUrl(courseUrl, udemyCookies);
    
    // Si el resultado es un booleano (compatibilidad con código anterior)
    if (typeof result === 'boolean') {
      return result ? { success: true } : { 
        success: false, 
        error: 'Error desconocido', 
        details: {
          type: 'unknown',
          userMessage: 'Error al abrir Brave',
          suggestion: 'Intenta nuevamente'
        }
      };
    }
    
    // Si ya es un objeto con información de error
    return result;
    
  } catch (error) {
    
    // Intentar sin cookies como fallback
    try {
      const fallbackResult = await chromeController.launchWithUrl(courseUrl);
      
      if (typeof fallbackResult === 'boolean') {
        return fallbackResult ? { success: true } : { 
          success: false, 
          error: 'Error al abrir Brave (sin cookies)', 
          details: {
            type: 'fallback_failed',
            userMessage: 'No se pudo abrir Brave',
            suggestion: 'Verifica que Brave esté instalado'
          }
        };
      }
      
      return fallbackResult;
      
    } catch (fallbackError) {
      return {
        success: false,
        error: fallbackError.message,
        details: {
          type: 'complete_failure',
          userMessage: 'Error crítico al abrir Brave',
          suggestion: 'Reinstala Brave browser'
        }
      };
    }
  }
});

ipcMain.handle('chrome-cleanup', async (event) => {
  if (!chromeController) return false;
  return await chromeController.close();
});

// Otros handlers simplificados para compatibilidad
ipcMain.handle('chrome-navigate', async (event, url) => {
  return false;
});

ipcMain.handle('chrome-back', async (event) => {
  return false;
});

ipcMain.handle('chrome-forward', async (event) => {
  return false;
});

ipcMain.handle('chrome-reload', async (event) => {
  return false;
});

ipcMain.handle('chrome-hide', async (event) => {
  return false;
});

ipcMain.handle('chrome-show', async (event) => {
  return false;
});

ipcMain.handle('chrome-position', async (event, x, y, width, height) => {
  return false;
});

// Handler para abrir enlaces externos
ipcMain.on('open-external', (event, url) => {
  require('electron').shell.openExternal(url);
});





ipcMain.handle('set-cookies', async (event, cookies) => {
  try {
    
    const promises = cookies.map(async (cookie) => {
      const cookieDetails = {
        url: `https://${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}`,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 año
      };

      
      try {
        await session.defaultSession.cookies.set(cookieDetails);
      } catch (error) {
        throw error;
      }
    });

    await Promise.all(promises);
    
    return { success: true, message: 'Cookies configuradas exitosamente' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-cookies', async (event) => {
  try {
    
    // Paso 1: Obtener TODAS las cookies existentes
    const allCookies = await session.defaultSession.cookies.get({});

    // Paso 2: Eliminar TODAS las cookies una por una
    const deletePromises = allCookies.map(async (cookie) => {
      const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}`;
      
      try {
        await session.defaultSession.cookies.remove(url, cookie.name);
      } catch (error) {
      }
    });

    await Promise.all(deletePromises);
    
    // Paso 3: Limpiar TODOS los datos de almacenamiento (cookies, localStorage, sessionStorage, etc.)
    await session.defaultSession.clearStorageData({
      storages: ['cookies', 'localstorage', 'sessionstorage', 'indexdb', 'websql', 'filesystem', 'cachestorage'],
      quotas: ['temporary', 'persistent', 'syncable']
    });

    // Paso 4: Limpiar cache también
    await session.defaultSession.clearCache();

    return { success: true, message: 'TODAS las cookies y datos eliminados exitosamente' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handlers IPC para el socket
ipcMain.handle('socket-connect', async (event, udemyId) => {
  try {
    // Inicializar socket manager solo cuando se use por primera vez
    if (!mainSocketManager.io) {
      mainSocketManager.initializeSocketIO();
    }
    await mainSocketManager.conectarSocket(udemyId);
    return { success: true, message: 'Socket conectado' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('socket-disconnect', async (event) => {
  try {
    mainSocketManager.desconectarSocket();
    return { success: true, message: 'Socket desconectado' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('socket-send-message', async (event, evento, data) => {
  try {
    mainSocketManager.enviarMensaje(evento, data);
    return { success: true, message: 'Mensaje enviado' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('socket-status', async (event) => {
  try {
    return { success: true, status: mainSocketManager.getStatus() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Variable global para trackear si hay una actualización pendiente
let pendingUpdateInfo = null;

// Handlers para autoupdater
ipcMain.handle('update-download', async (event) => {
  try {
    autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-pending-update-overlay', async (event) => {
  try {
    if (pendingUpdateInfo) {
      return { showOverlay: true, updateInfo: pendingUpdateInfo };
    } else {
      return { showOverlay: false };
    }
  } catch (error) {
    return { showOverlay: false, error: error.message };
  }
});

ipcMain.handle('update-restart', async (event) => {
  try {
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


ipcMain.handle('check-for-updates', async (event) => {
  try {
    const result = await appUpdater.checkForUpdates();
    return { success: true, updateAvailable: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para descomprimir Brave en segundo plano (LAZY LOADING)
ipcMain.handle('extract-brave-background', async (event) => {
  try {
    console.log('🔧 Extrayendo Brave bajo demanda...');
    
    if (!chromeController) {
      chromeController = getBraveController();
    }
    
    // Verificar si hay archivo .7z disponible
    const sevenZipPath = chromeController.findBrave7z();
    
    if (!sevenZipPath) {
      return { success: true, message: 'No hay archivo .7z para extraer', skipped: true };
    }
    
    // Verificar si ya está extraído
    const extractDir = path.dirname(sevenZipPath);
    const braveExtractedDir = path.join(extractDir, 'brave-extracted');
    
    if (fs.existsSync(braveExtractedDir)) {
      return { success: true, message: 'Brave ya está extraído', skipped: true };
    }
    
    // Extraer el archivo .7z
    const extractedBrave = await chromeController.extractBrave7z(sevenZipPath);
    
    if (extractedBrave) {
      return { success: true, message: 'Brave extraído exitosamente', path: extractedBrave };
    } else {
      throw new Error('No se pudo extraer el navegador');
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para obtener cursos del usuario
ipcMain.handle('fetch-user-courses', async (event, { authToken, forceRefresh }) => {
  try {
    
    if (!authToken) {
      throw new Error('No auth token provided');
    }
    
    // Make API call to backend
    const response = await fetch('https://aprendeya-backend.forif.co/api/v1/user-courses/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const coursesData = await response.json();
    
    return { 
      success: true, 
      data: coursesData,
      message: 'Courses fetched successfully'
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      data: []
    };
  }
});

// Initialize hot reload manager
let hotReloadManager = null;

app.whenReady().then(async () => {
  createWindow();
  
  // Initialize hot reload system for development (SOLO SI ES NECESARIO)
  // DESHABILITADO TEMPORALMENTE PARA REDUCIR CONSUMO DE MEMORIA
  // if (process.env.NODE_ENV === 'development') {
  //   hotReloadManager = new HotReloadManager();
  //   hotReloadManager.start();
  // }
  
  // Inicializar el socket manager SOLO cuando sea necesario
  // mainSocketManager.initializeSocketIO();

  // OPTIMIZACIÓN: Inicialización pesada movida a lazy loading
  // La extracción de Brave ahora se hace solo cuando se necesita abrir una ventana de curso

  // OPTIMIZACIÓN: Verificar actualizaciones solo si es necesario
  // En desarrollo, deshabilitar chequeo automático de actualizaciones
  if (app.isPackaged) {
    setTimeout(async () => {
      try {
        await appUpdater.checkForUpdates();
      } catch (error) {
        console.log('Error verificando actualizaciones:', error.message);
      }
    }, 5000); // Aumentar delay para evitar carga inicial
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Stop hot reload system
  if (hotReloadManager) {
    hotReloadManager.stop();
  }
  
  // Desconectar socket antes de cerrar
  mainSocketManager.desconectarSocket();
  
  // Cleanup Brave Controller
  if (chromeController) {
    await chromeController.close();
    chromeController = null;
  }
  
  // Notificar a todas las ventanas que la aplicación se va a cerrar
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    window.webContents.send('app-closing');
  });
});