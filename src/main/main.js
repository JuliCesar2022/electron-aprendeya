const { app, BrowserWindow, Menu, dialog, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

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
    icon: path.join(__dirname, 'assets', 'icon.png'),
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
    // Todos los enlaces se abren externamente excepto si estamos navegando intencionalmente
    shell.openExternal(url);
    return { action: 'deny' };
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
            mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
          }
        },
        {
          label: 'Ir a Login',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.loadFile(path.join(__dirname, '../renderer/login.html'));
          }
        },
        {
          label: 'Ir a Dashboard',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            mainWindow.loadFile(path.join(__dirname, '../renderer/dashboard.html'));
          }
        },
        {
          label: 'Ir a Dashboard',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            mainWindow.loadFile(path.join(__dirname, '../renderer/dashboard.html'));
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
          label: 'Tomar captura',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            takeScreenshot(mainWindow);
          }
        },
        {
          label: 'Notas rápidas',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            showQuickNotes();
          }
        },
        {
          label: 'Marcador rápido',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            addQuickBookmark(mainWindow);
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

async function takeScreenshot(mainWindow) {
  try {
    const image = await mainWindow.webContents.capturePage();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `udemy-screenshot-${timestamp}.png`;
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [
        { name: 'PNG Images', extensions: ['png'] }
      ]
    });

    if (filePath) {
      require('fs').writeFileSync(filePath, image.toPNG());
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Captura guardada',
        message: `Captura guardada en: ${filePath}`
      });
    }
  } catch (error) {
    dialog.showErrorBox('Error', 'No se pudo tomar la captura: ' + error.message);
  }
}

function showQuickNotes() {
  const notesWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Notas rápidas'
  });

  notesWindow.loadFile(path.join(__dirname, '../renderer/notes.html'));
}

async function addQuickBookmark(mainWindow) {
  const currentURL = mainWindow.webContents.getURL();
  const title = await mainWindow.webContents.executeJavaScript('document.title');
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Marcador agregado',
    message: `Página marcada: ${title}\nURL: ${currentURL}`
  });
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
ipcMain.on('show-notes', () => {
  showQuickNotes();
});

ipcMain.on('go-to-udemy', (event, url) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) { 
    window.loadURL(url);
    // Inject the interceptor code once the page has loaded
    window.webContents.once('did-finish-load', () => {
      if (url.includes('udemy.com')) {
        window.webContents.executeJavaScript(udemyInterceptorCode)
          .then(() => console.log('✅ Udemy Interceptor Injected'))
          .catch(error => console.error('❌ Error injecting Udemy Interceptor:', error));
      }
    });
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

ipcMain.on('go-to-dashboard', (event) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) {
    window.loadFile(path.join(__dirname, '../renderer/dashboard.html'));
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

ipcMain.handle('take-screenshot', async (event) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) {
    return await takeScreenshot(window);
  }
  return null;
});

ipcMain.handle('add-bookmark', async (event, url, title) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) {
    return await addQuickBookmark(window, url, title);
  }
  return null;
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
    console.log('🧹 Limpiando cookies de Udemy...');
    
    const filter = {
      domain: '.udemy.com'
    };

    const cookies = await session.defaultSession.cookies.get(filter);
    console.log(`🔍 Encontradas ${cookies.length} cookies de Udemy para eliminar`);

    const deletePromises = cookies.map(async (cookie) => {
      const url = `https://${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}`;
      
      try {
        await session.defaultSession.cookies.remove(url, cookie.name);
        console.log(`  ✅ Cookie eliminada: ${cookie.name}`);
      } catch (error) {
        console.error(`  ❌ Error al eliminar cookie ${cookie.name}:`, error.message);
      }
    });

    await Promise.all(deletePromises);
    
    // También limpiar cookies de sesión general
    await session.defaultSession.clearStorageData({
      storages: ['cookies'],
      quotas: ['temporary', 'persistent', 'syncable']
    });

    console.log('✅ Limpieza de cookies completada');
    return { success: true, message: 'Cookies eliminadas exitosamente' };
    
  } catch (error) {
    console.error('❌ Error al limpiar cookies:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

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