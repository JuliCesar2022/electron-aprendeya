const { app, BrowserWindow, Menu, dialog, shell, ipcMain, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const BraveController = require('./brave-controller');

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
      console.log('✅ Socket.IO inicializado en el proceso principal');
    } catch (error) {
      console.error('❌ Error inicializando Socket.IO:', error);
      // Instalar socket.io-client si no está disponible
      console.log('📦 Instalando socket.io-client...');
      const { exec } = require('child_process');
      exec('npm install socket.io-client', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Error instalando socket.io-client:', error);
        } else {
          console.log('✅ socket.io-client instalado correctamente');
          this.io = require('socket.io-client');
        }
      });
    }
  }

  async conectarSocket(udemyId) {
    try {
      if (!this.io) {
        console.warn('⚠️ Socket.IO no está inicializado');
        return;
      }

      if (!udemyId) {
        console.warn('⚠️ No se encontró udemyId para conectar socket');
        return;
      }

      // Si ya está conectado con el mismo ID, no hacer nada
      if (this.socket && this.isConnected && this.currentUdemyId === udemyId) {
        console.log('⚠️ Ya estás conectado al socket con el mismo udemyId');
        return;
      }

      // Desconectar socket anterior si existe
      if (this.socket) {
        this.socket.disconnect();
      }

      console.log('🔌 Conectando al socket con udemyId:', udemyId);

      // Crear nueva conexión
      this.socket = this.io(this.backendURL, {
        transports: ['websocket'],
        query: {
          udemyId: udemyId
        }
      });

      this.currentUdemyId = udemyId;

      this.socket.on('connect', () => {
        console.log('✅ Socket conectado en proceso principal con udemyId:', udemyId);
        this.isConnected = true;
        
        // Notificar a todas las ventanas que el socket está conectado
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send('socket-connected', { udemyId });
        });
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket desconectado del servidor');
        this.isConnected = false;
        
        // Notificar a todas las ventanas que el socket está desconectado
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send('socket-disconnected');
        });
      });

      this.socket.on('mensaje', (data) => {
        console.log('📩 Mensaje recibido del servidor:', data);
        
        // Enviar mensaje a todas las ventanas
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send('socket-message', data);
        });
      });

      this.socket.on('error', (error) => {
        console.error('❌ Error en socket:', error);
        
        // Notificar error a todas las ventanas
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          window.webContents.send('socket-error', error);
        });
      });

    } catch (error) {
      console.error('❌ Error conectando socket:', error);
    }
  }

  desconectarSocket() {
    if (this.socket) {
      console.log('🔌 Desconectando socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentUdemyId = null;
    }
  }

  enviarMensaje(evento, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(evento, data);
      console.log('📤 Mensaje enviado:', evento, data);
    } else {
      console.warn('⚠️ Socket no conectado, no se puede enviar mensaje');
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
      console.log('🧪 Modo desarrollo: forzando configuración de actualizaciones');
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
      console.log('🔄 Iniciando verificación de actualizaciones...');
    });

    // Cuando se encuentra una actualización
    autoUpdater.on('update-available', (info) => {
      console.log('📦 Actualización disponible:', info.version);
      
      // Esperar un poco para asegurar que la ventana esté lista
      setTimeout(() => {
        const windows = BrowserWindow.getAllWindows();
        console.log('🔍 Ventanas disponibles:', windows.length);
        
        if (windows.length > 0) {
          windows.forEach((window, index) => {
            console.log(`📨 Enviando evento show-update-overlay a ventana ${index + 1}`);
            
            // Inyectar directamente el overlay
            console.log(`📨 Inyectando overlay directamente en ventana ${index + 1}`);
            const overlayCode = `
              if (typeof createUpdateOverlay === 'function') {
                console.log('📦 [RENDERER] Creando overlay automáticamente');
                createUpdateOverlay({
                  version: '${info.version}',
                  releaseNotes: '${(info.releaseNotes || '').replace(/'/g, "\\'")}'
                });
              } else {
                console.log('❌ [RENDERER] createUpdateOverlay no está disponible, creando overlay completo');
                // Crear overlay completo con diseño original
                if (!document.getElementById('udemigo-update-overlay')) {
                  const overlay = document.createElement('div');
                  overlay.id = 'udemigo-update-overlay';
                  overlay.style.cssText = \`
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                    z-index: 2147483647;
                    pointer-events: auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  \`;
                  
                  const notification = document.createElement('div');
                  notification.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 380px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 16px;
                    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
                    color: white;
                    padding: 25px;
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transform: translateX(420px);
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    overflow: hidden;
                  \`;
                  
                  notification.innerHTML = \`
                    <style>
                      @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                      }
                      .notification-header {
                        padding: 20px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                      }
                      .notification-body {
                        padding: 20px;
                      }
                      .notification-actions {
                        padding: 0 20px 20px 20px;
                        display: flex;
                        gap: 10px;
                      }
                      .btn {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                      }
                      .btn-primary {
                        background: white;
                        color: #667eea;
                      }
                      .btn-primary:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
                      }
                      .btn-secondary {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                      }
                      .btn-secondary:hover {
                        background: rgba(255, 255, 255, 0.2);
                      }
                      .close-btn {
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 20px;
                        cursor: pointer;
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background 0.2s;
                      }
                      .close-btn:hover {
                        background: rgba(255, 255, 255, 0.1);
                      }
                    </style>
                    <div class="notification-header">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 24px;">📦</div>
                        <div>
                          <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Nueva actualización disponible</h3>
                          <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">Versión ${info.version}</p>
                        </div>
                      </div>
                    </div>
                    <div class="notification-body">
                      <p style="margin: 0; line-height: 1.5; font-size: 15px; text-align: center;">
                        Se ha encontrado una nueva versión de Udemigo.<br>
                        <strong>Debes tomar una decisión para continuar.</strong>
                      </p>
                    </div>
                    <div class="notification-actions">
                      <button class="btn btn-primary" onclick="
                        window.electronAPI?.invoke('update-download').then(() => {
                          this.textContent = 'Descargando...';
                          this.disabled = true;
                        });
                      ">Descargar ahora</button>
                      <button class="btn btn-secondary" onclick="this.closest('#udemigo-update-overlay').remove()">Más tarde</button>
                    </div>
                  \`;
                  
                  overlay.appendChild(notification);
                  document.body.appendChild(overlay);
                  
                  // Animar entrada
                  setTimeout(() => {
                    notification.style.transform = 'translateX(0)';
                  }, 100);
                }
              }
            `;
            
            window.webContents.executeJavaScript(overlayCode)
              .then(() => console.log(`✅ Overlay inyectado en ventana ${index + 1}`))
              .catch(err => console.log(`❌ Error inyectando overlay en ventana ${index + 1}:`, err.message));
          });
        } else {
          console.warn('❌ No hay ventanas disponibles para mostrar el overlay');
        }
      }, 1000); // Esperar 1 segundo
    });

    // Cuando no hay actualizaciones
    autoUpdater.on('update-not-available', (info) => {
      console.log('✅ La aplicación está actualizada:', info.version);
      console.log('📋 Información de versión actual:', info);
      
      // Solo para testing en desarrollo - mostrar overlay de prueba
      if (!app.isPackaged) {
        console.log('🧪 Modo desarrollo: mostrando overlay de prueba después de 3 segundos...');
        setTimeout(() => {
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows.forEach(window => {
              const overlayCode = `
                if (typeof createUpdateOverlay === 'function') {
                  createUpdateOverlay({
                    version: '2.1.2',
                    releaseNotes: 'Versión de prueba - desarrollo'
                  });
                }
              `;
              window.webContents.executeJavaScript(overlayCode);
            });
          }
        }, 3000);
      }
    });

    // Progreso de descarga
    autoUpdater.on('download-progress', (progressObj) => {
      let logMessage = `Descargando: ${Math.round(progressObj.percent)}%`;
      logMessage += ` (${Math.round(progressObj.bytesPerSecond / 1024)} KB/s)`;
      console.log(logMessage);
      
      // Enviar progreso a la ventana principal
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows.forEach(window => {
          window.webContents.send('update-download-progress', progressObj);
        });
      }
    });

    // Cuando la descarga está completa
    autoUpdater.on('update-downloaded', (info) => {
      console.log('✅ Actualización descargada:', info.version);
      
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
      console.error('❌ Error en auto-updater:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Error completo:', JSON.stringify(error, null, 2));
    });
  }

  // Verificar actualizaciones manualmente
  checkForUpdates() {
    console.log('🔍 Verificando actualizaciones...');
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
  udemyInterceptorCode = fs.readFileSync(path.join(__dirname, '../renderer/udemy-interceptor.js'), 'utf8');
} catch (error) {
  console.error('Error reading udemy-interceptor.js:', error);
}

// Global Chrome Controller instance
let chromeController = null;

// Global notification window
let notificationWindow = null;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false,
      preload: path.join(__dirname, '../preload/preload.js')
    },
    icon: path.join(__dirname, '../../assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Abrir DevTools automáticamente en desarrollo
  if (isDev) {
    mainWindow.webContents.openDevTools();
    console.log('🔧 Modo desarrollo activado - DevTools abierto');
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Solo mantener enlaces de Udemy dentro de la app
    if (url.includes('udemy.com')) {
      // Navegar internamente a Udemy
      mainWindow.loadURL(url);
      return { action: 'deny' };
    } else {
      // Otros enlaces se abren externamente
      shell.openExternal(url);
      return { action: 'deny' };
    }
  });

  // Inject Udemy Interceptor on navigation to Udemy domains
  mainWindow.webContents.on('did-navigate', (event, url) => {
    if (url.includes('udemy.com')) {
      mainWindow.webContents.executeJavaScript(udemyInterceptorCode)
        .then(() => console.log('✅ Udemy Interceptor Injected on navigation'))
        .catch(error => console.error('❌ Error injecting Udemy Interceptor on navigation:', error));
    }
  });

  createMenu(mainWindow);

  // Initialize Brave Controller
  chromeController = new BraveController();

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
            mainWindow.loadURL('https://www.udemy.com/');
          }
        },
        {
          label: 'Ir a Login',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.loadFile(path.join(__dirname, '../renderer/login.html'));
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

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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
      // Limpiar datos en el frontend
      mainWindow.webContents.executeJavaScript(`
        if (window.authManager) {
          window.authManager.logout();
        }
      `);
      
      // Limpiar cookies del backend
      await session.defaultSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'sessionstorage'],
        quotas: ['temporary', 'persistent', 'syncable']
      });
      
      console.log('🧹 Datos de sesión limpiados completamente');
      
      // Recargar página principal
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Sesión cerrada',
        message: 'Has cerrado sesión exitosamente. Todas las cookies y datos han sido eliminados.'
      });
      
    } catch (error) {
      console.error('❌ Error durante logout:', error);
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
    window.loadURL(url);
  }
});

ipcMain.on('go-to-login', (event) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) {
    window.loadFile(path.join(__dirname, '../renderer/login.html'));
  }
});

ipcMain.on('go-to-home', (event) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) {
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
});


ipcMain.on('go-to-my-learning', (event) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) {
    window.loadFile(path.join(__dirname, '../renderer/my-learning.html'));
  }
});

ipcMain.on('search-in-udemy', (event, query) => {
  console.log('📡 IPC recibido: search-in-udemy con query:', query);
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  
  if (window && query) {
    const searchUrl = `https://www.udemy.com/courses/search/?src=ukw&q=${encodeURIComponent(query)}`;
    console.log(`🔍 Cargando URL en ventana principal: ${searchUrl}`);
    window.loadURL(searchUrl);
    console.log('✅ URL cargada exitosamente');
  } else {
    console.log('❌ Error: ventana o query no disponibles');
  }
});

// Handlers para llamadas bidireccionales (invoke)
ipcMain.handle('get-udemy-interceptor-code', () => {
  return udemyInterceptorCode;
});

// Handler para obtener la versión de la app
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Brave Controller IPC Handlers
ipcMain.handle('chrome-launch', async (event, url) => {
  if (!chromeController) {
    console.error('Brave Controller not initialized');
    return false;
  }
  
  console.log('🚀 Lanzando Brave con extensión de cookies...');
  
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
    
    console.log('🍪 Preparando extensión con', udemyCookies.length, 'cookies esenciales:');
    udemyCookies.forEach(c => {
      console.log(`  - ${c.name}: ${c.value ? c.value.substring(0, 20) + '...' : 'empty'} (${c.domain})`);
    });
    
    return await chromeController.launch(udemyCookies);
    
  } catch (error) {
    console.error('❌ Error obteniendo cookies:', error);
    return await chromeController.launch();
  }
});

ipcMain.handle('chrome-launch-course', async (event, courseUrl) => {
  if (!chromeController) {
    console.error('Brave Controller not initialized');
    return false;
  }
  
  console.log('🎓 Lanzando Brave para curso:', courseUrl);
  
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
    
    console.log('🍪 Preparando', udemyCookies.length, 'cookies esenciales para el curso');
    
    return await chromeController.launchWithUrl(courseUrl, udemyCookies);
    
  } catch (error) {
    console.error('❌ Error obteniendo cookies para curso:', error);
    return await chromeController.launchWithUrl(courseUrl);
  }
});

ipcMain.handle('chrome-cleanup', async (event) => {
  if (!chromeController) return false;
  return await chromeController.close();
});

// Otros handlers simplificados para compatibilidad
ipcMain.handle('chrome-navigate', async (event, url) => {
  console.log('Brave no soporta navegación directa, relanzando...');
  return false;
});

ipcMain.handle('chrome-back', async (event) => {
  console.log('Usar controles nativos de Brave');
  return false;
});

ipcMain.handle('chrome-forward', async (event) => {
  console.log('Usar controles nativos de Brave');
  return false;
});

ipcMain.handle('chrome-reload', async (event) => {
  console.log('Usar F5 en Brave');
  return false;
});

ipcMain.handle('chrome-hide', async (event) => {
  console.log('Usar minimizar ventana de Brave');
  return false;
});

ipcMain.handle('chrome-show', async (event) => {
  console.log('Usar maximizar ventana de Brave');
  return false;
});

ipcMain.handle('chrome-position', async (event, x, y, width, height) => {
  console.log('Brave maneja su propia posición');
  return false;
});





ipcMain.handle('set-cookies', async (event, cookies) => {
  try {
    console.log('🍪 Configurando cookies para Udemy:', cookies);
    
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

      console.log(`  - Configurando cookie: ${cookie.name}=${cookie.value}`);
      
      try {
        await session.defaultSession.cookies.set(cookieDetails);
        console.log(`  ✅ Cookie ${cookie.name} configurada exitosamente`);
      } catch (error) {
        console.error(`  ❌ Error al configurar cookie ${cookie.name}:`, error.message);
        throw error;
      }
    });

    await Promise.all(promises);
    console.log('✅ Todas las cookies configuradas exitosamente');
    
    return { success: true, message: 'Cookies configuradas exitosamente' };
    
  } catch (error) {
    console.error('❌ Error al configurar cookies:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-cookies', async (event) => {
  try {
    console.log('🧹 Iniciando limpieza COMPLETA de todas las cookies y datos...');
    
    // Paso 1: Obtener TODAS las cookies existentes
    const allCookies = await session.defaultSession.cookies.get({});
    console.log(`🔍 Encontradas ${allCookies.length} cookies en total para eliminar`);

    // Paso 2: Eliminar TODAS las cookies una por una
    const deletePromises = allCookies.map(async (cookie) => {
      const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}`;
      
      try {
        await session.defaultSession.cookies.remove(url, cookie.name);
        console.log(`  ✅ Cookie eliminada: ${cookie.name} (${cookie.domain})`);
      } catch (error) {
        console.error(`  ❌ Error al eliminar cookie ${cookie.name}:`, error.message);
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

    console.log('✅ Limpieza COMPLETA de cookies y datos terminada');
    return { success: true, message: 'TODAS las cookies y datos eliminados exitosamente' };
    
  } catch (error) {
    console.error('❌ Error al limpiar cookies y datos:', error);
    return { success: false, error: error.message };
  }
});

// Handlers IPC para el socket
ipcMain.handle('socket-connect', async (event, udemyId) => {
  try {
    await mainSocketManager.conectarSocket(udemyId);
    return { success: true, message: 'Socket conectado' };
  } catch (error) {
    console.error('❌ Error conectando socket:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('socket-disconnect', async (event) => {
  try {
    mainSocketManager.desconectarSocket();
    return { success: true, message: 'Socket desconectado' };
  } catch (error) {
    console.error('❌ Error desconectando socket:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('socket-send-message', async (event, evento, data) => {
  try {
    mainSocketManager.enviarMensaje(evento, data);
    return { success: true, message: 'Mensaje enviado' };
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('socket-status', async (event) => {
  try {
    return { success: true, status: mainSocketManager.getStatus() };
  } catch (error) {
    console.error('❌ Error obteniendo status del socket:', error);
    return { success: false, error: error.message };
  }
});

// Handlers para autoupdater
ipcMain.handle('update-download', async (event) => {
  try {
    console.log('📥 Iniciando descarga de actualización...');
    autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('❌ Error descargando actualización:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-restart', async (event) => {
  try {
    console.log('🔄 Reiniciando para aplicar actualización...');
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    console.error('❌ Error reiniciando aplicación:', error);
    return { success: false, error: error.message };
  }
});


ipcMain.handle('check-for-updates', async (event) => {
  try {
    console.log('🔍 Verificando actualizaciones desde renderer...');
    const result = await appUpdater.checkForUpdates();
    return { success: true, updateAvailable: result };
  } catch (error) {
    console.error('❌ Error verificando actualizaciones:', error);
    return { success: false, error: error.message };
  }
});

// Handler para descomprimir Brave en segundo plano
ipcMain.handle('extract-brave-background', async (event) => {
  try {
    console.log('📦 Iniciando extracción de Brave en segundo plano...');
    
    if (!chromeController) {
      console.log('⚠️ BraveController no inicializado, creando instancia...');
      chromeController = new BraveController();
    }
    
    // Verificar si hay archivo .7z disponible
    const sevenZipPath = chromeController.findBrave7z();
    
    if (!sevenZipPath) {
      console.log('ℹ️ No se encontró archivo .7z de Brave para extraer');
      return { success: true, message: 'No hay archivo .7z para extraer', skipped: true };
    }
    
    // Verificar si ya está extraído
    const extractDir = path.dirname(sevenZipPath);
    const braveExtractedDir = path.join(extractDir, 'brave-extracted');
    
    if (fs.existsSync(braveExtractedDir)) {
      console.log('✅ Brave ya está extraído, saltando extracción');
      return { success: true, message: 'Brave ya está extraído', skipped: true };
    }
    
    // Extraer el archivo .7z
    console.log('🚀 Extrayendo Brave automáticamente...');
    const extractedBrave = await chromeController.extractBrave7z(sevenZipPath);
    
    if (extractedBrave) {
      console.log('✅ Brave extraído exitosamente en segundo plano:', extractedBrave);
      return { success: true, message: 'Brave extraído exitosamente', path: extractedBrave };
    } else {
      throw new Error('No se pudo extraer el navegador');
    }
    
  } catch (error) {
    console.error('❌ Error extrayendo Brave en segundo plano:', error.message);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  createWindow();
  
  // Inicializar el socket manager
  mainSocketManager.initializeSocketIO();

  // PRIMERO: Extraer Brave automáticamente al iniciar la aplicación
  setTimeout(async () => {
    console.log('📦 [STARTUP] Iniciando extracción automática de Brave...');
    try {
      if (!chromeController) {
        console.log('⚠️ [STARTUP] BraveController no inicializado, creando instancia...');
        chromeController = new BraveController();
      }
      
      // Verificar si hay archivo .7z disponible
      const sevenZipPath = chromeController.findBrave7z();
      
      if (!sevenZipPath) {
        console.log('ℹ️ [STARTUP] No se encontró archivo .7z de Brave para extraer');
      } else {
        // Verificar si ya está extraído
        const extractDir = path.dirname(sevenZipPath);
        const braveExtractedDir = path.join(extractDir, 'brave-extracted');
        
        if (fs.existsSync(braveExtractedDir)) {
          console.log('✅ [STARTUP] Brave ya está extraído, saltando extracción');
        } else {
          // Extraer el archivo .7z
          console.log('🚀 [STARTUP] Extrayendo Brave automáticamente desde:', sevenZipPath);
          
          // Notificar a las ventanas que la extracción ha comenzado
          const windows = BrowserWindow.getAllWindows();
          windows.forEach(window => {
            window.webContents.send('brave-extraction-started');
          });
          
          const extractedBrave = await chromeController.extractBrave7z(sevenZipPath);
          
          if (extractedBrave) {
            console.log('✅ [STARTUP] Brave extraído exitosamente:', extractedBrave);
            
            // Notificar a las ventanas que la extracción terminó
            windows.forEach(window => {
              window.webContents.send('brave-extraction-completed', { success: true, path: extractedBrave });
            });
          } else {
            console.error('❌ [STARTUP] Error extrayendo Brave');
            
            // Notificar error a las ventanas
            windows.forEach(window => {
              window.webContents.send('brave-extraction-completed', { success: false });
            });
          }
        }
      }
      
    } catch (error) {
      console.error('❌ [STARTUP] Error en extracción automática:', error.message);
      
      // Notificar error a las ventanas
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        window.webContents.send('brave-extraction-completed', { success: false, error: error.message });
      });
    }
  }, 1000); // Esperar 1 segundo para que la ventana esté lista

  // Verificar actualizaciones al iniciar (después de 3 segundos)
  setTimeout(async () => {
    console.log('🔍 Verificando actualizaciones automáticamente...');
    console.log('📦 Configuración del autoupdater:');
    console.log('  - autoDownload:', autoUpdater.autoDownload);
    console.log('  - autoInstallOnAppQuit:', autoUpdater.autoInstallOnAppQuit);
    console.log('  - currentVersion:', app.getVersion());
    console.log('  - isPackaged:', app.isPackaged);
    
    try {
      const result = await appUpdater.checkForUpdates();
      console.log('✅ Verificación de actualizaciones completada:', result);
      
      // Si estamos en desarrollo y no hay actualizaciones reales, mostrar prueba
      if (!app.isPackaged && (!result || result === null)) {
        console.log('🧪 Modo desarrollo: no hay actualizaciones reales, mostrando overlay de prueba...');
        setTimeout(() => {
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows.forEach(window => {
              const overlayCode = `
                if (typeof createUpdateOverlay === 'function') {
                  createUpdateOverlay({
                    version: '2.1.2',
                    releaseNotes: 'Versión de prueba - desarrollo'
                  });
                }
              `;
              window.webContents.executeJavaScript(overlayCode);
            });
          }
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error en verificación automática:', error);
      
      // Si hay error en desarrollo, también mostrar prueba
      if (!app.isPackaged) {
        console.log('🧪 Error en desarrollo: mostrando overlay de prueba como fallback...');
        setTimeout(() => {
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows.forEach(window => {
              const overlayCode = `
                if (typeof createUpdateOverlay === 'function') {
                  createUpdateOverlay({
                    version: '2.1.2',
                    releaseNotes: 'Versión de prueba - desarrollo (fallback)'
                  });
                }
              `;
              window.webContents.executeJavaScript(overlayCode);
            });
          }
        }, 2000);
      }
    }
  }, 2000);

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

app.on('before-quit', () => {
  // Desconectar socket antes de cerrar
  mainSocketManager.desconectarSocket();
  
  // Cleanup Brave Controller
  if (chromeController) {
    chromeController.close();
  }
  
  // Notificar a todas las ventanas que la aplicación se va a cerrar
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    window.webContents.send('app-closing');
  });
});