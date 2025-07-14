const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Función para obtener el código del interceptor
function getUdemyInterceptorCode() {
  try {
    const interceptorPath = path.join(__dirname, 'udemy-interceptor.js');
    return fs.readFileSync(interceptorPath, 'utf8');
  } catch (error) {
    console.error('❌ Error cargando interceptor:', error);
    return ''; 
  }
}

console.log('🔧 Preload script ejecutándose...');

contextBridge.exposeInMainWorld('electronAPI', {
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  showNotes: () => {
    ipcRenderer.send('show-notes');
  },
  addBookmark: (url, title) => ipcRenderer.invoke('add-bookmark', url, title),
  goToUdemy: () => {
    ipcRenderer.send('go-to-udemy');
  },
  goToLogin: () => {
    ipcRenderer.send('go-to-login');
  },
  goToHome: () => {
    ipcRenderer.send('go-to-home');
  },
  goToDashboard: () => {
    ipcRenderer.send('go-to-dashboard');
  },
  searchInUdemy: (query) => {
    console.log('🔧 searchInUdemy llamado con:', query);
    ipcRenderer.send('go-to-udemy');
  },
  setCookies: (cookies) => {
    return ipcRenderer.invoke('set-cookies', cookies);
  },
  clearCookies: () => {
    return ipcRenderer.invoke('clear-cookies');
  },
  
  onKeyboardShortcut: (callback) => {
    ipcRenderer.on('keyboard-shortcut', callback);
  }
});

console.log('✅ electronAPI expuesto al main world');

window.addEventListener('DOMContentLoaded', () => {
  // Cargar interceptor de Udemy si estamos en Udemy
  if (window.location.hostname.includes('udemy.com')) {
    console.log('🎯 Detectado dominio de Udemy, cargando interceptor...');
    
    // Crear y agregar el script del interceptor
    const script = document.createElement('script');
    script.textContent = `
      // Inyectar interceptor directamente
      ${getUdemyInterceptorCode()}
    `;
    document.head.appendChild(script);
  }

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
      switch(event.key) {
        case 's':
          if (event.shiftKey) {
            event.preventDefault();
            window.electronAPI.takeScreenshot();
          }
          break;
        case 'n':
          if (event.shiftKey) {
            event.preventDefault();
            window.electronAPI.showNotes();
          }
          break;
        case 'd':
          event.preventDefault();
          window.electronAPI.addBookmark(window.location.href, document.title);
          break;
        case 'i':
          // Activar/desactivar interceptor con Ctrl+I
          if (window.udemyInterceptor) {
            event.preventDefault();
            window.udemyInterceptor.toggle();
          }
          break;
        case 'm':
          // Mostrar modificaciones con Ctrl+M
          if (window.interceptorHelpers) {
            event.preventDefault();
            window.interceptorHelpers.list();
          }
          break;
      }
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    .udemy-extension-toolbar {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.8);
      padding: 10px;
      border-radius: 5px;
      display: flex;
      gap: 10px;
    }
    
    .udemy-extension-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .udemy-extension-btn:hover {
      background: #0056b3;
    }

    #dashboard-btn {
      background: linear-gradient(45deg, #667eea, #764ba2);
      font-weight: bold;
    }

    #dashboard-btn:hover {
      background: linear-gradient(45deg, #764ba2, #667eea);
    }
  `;
  document.head.appendChild(style);

  const toolbar = document.createElement('div');
  toolbar.className = 'udemy-extension-toolbar';
  
  // Mostrar botón de dashboard solo si estamos en Udemy
  const dashboardBtn = window.location.hostname.includes('udemy.com') 
    ? '<button class="udemy-extension-btn" id="dashboard-btn">🏠 Dashboard</button>' 
    : '';
  
  toolbar.innerHTML = `
    ${dashboardBtn}
    <button class="udemy-extension-btn" id="screenshot-btn">📸 Captura</button>
    <button class="udemy-extension-btn" id="notes-btn">📝 Notas</button>
    <button class="udemy-extension-btn" id="bookmark-btn">🔖 Marcar</button>
  `;
  
  document.body.appendChild(toolbar);

  document.getElementById('screenshot-btn').addEventListener('click', () => {
    window.electronAPI.takeScreenshot();
  });

  document.getElementById('notes-btn').addEventListener('click', () => {
    window.electronAPI.showNotes();
  });

  document.getElementById('bookmark-btn').addEventListener('click', () => {
    window.electronAPI.addBookmark(window.location.href, document.title);
  });

  // Agregar event listener para el botón de dashboard si existe
  const dashboardButton = document.getElementById('dashboard-btn');
  if (dashboardButton) {
    dashboardButton.addEventListener('click', () => {
      window.electronAPI.goToDashboard();
    });
  }
});