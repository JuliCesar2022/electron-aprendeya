const { app, BrowserWindow, Menu, dialog, shell, ipcMain, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

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
    // Cuando se encuentra una actualización
    autoUpdater.on('update-available', (info) => {
      console.log('📦 Actualización disponible:', info.version);
      
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        const response = dialog.showMessageBoxSync(windows[0], {
          type: 'info',
          buttons: ['Descargar ahora', 'Más tarde'],
          defaultId: 0,
          title: 'Actualización disponible',
          message: `Nueva versión ${info.version} disponible`,
          detail: 'Se ha encontrado una nueva versión de Udemigo. ¿Quieres descargarla ahora?'
        });

        if (response === 0) {
          autoUpdater.downloadUpdate();
        }
      }
    });

    // Cuando no hay actualizaciones
    autoUpdater.on('update-not-available', (info) => {
      console.log('✅ La aplicación está actualizada:', info.version);
    });

    // Progreso de descarga
    autoUpdater.on('download-progress', (progressObj) => {
      let logMessage = `Descargando: ${Math.round(progressObj.percent)}%`;
      logMessage += ` (${Math.round(progressObj.bytesPerSecond / 1024)} KB/s)`;
      console.log(logMessage);
      
      // Enviar progreso a todas las ventanas
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        window.webContents.send('download-progress', progressObj);
      });
    });

    // Cuando la descarga está completa
    autoUpdater.on('update-downloaded', (info) => {
      console.log('✅ Actualización descargada:', info.version);
      
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        const response = dialog.showMessageBoxSync(windows[0], {
          type: 'info',
          buttons: ['Reiniciar ahora', 'Más tarde'],
          defaultId: 0,
          title: 'Actualización lista',
          message: 'La actualización se ha descargado correctamente',
          detail: 'La aplicación se reiniciará para aplicar la actualización.'
        });

        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      }
    });

    // Manejo de errores
    autoUpdater.on('error', (error) => {
      console.error('❌ Error en auto-updater:', error);
      
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        dialog.showErrorBox('Error de actualización', 
          'Hubo un problema al buscar actualizaciones: ' + error.message);
      }
    });
  }

  // Verificar actualizaciones manualmente
  checkForUpdates() {
    console.log('🔍 Verificando actualizaciones...');
    autoUpdater.checkForUpdatesAndNotify();
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

app.whenReady().then(() => {
  createWindow();
  
  // Inicializar el socket manager
  mainSocketManager.initializeSocketIO();

  // Verificar actualizaciones al iniciar (después de 3 segundos)
  setTimeout(() => {
    if (!app.isPackaged) {
      console.log('🔧 Modo desarrollo - auto-updater deshabilitado');
    } else {
      console.log('🔍 Verificando actualizaciones automáticamente...');
      appUpdater.checkForUpdates();
    }
  }, 3000);

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
  
  // Notificar a todas las ventanas que la aplicación se va a cerrar
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    window.webContents.send('app-closing');
  });
});