const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {
  // Funciones para enviar mensajes al proceso principal (unidireccional)
  send: (channel, data) => {
    const validSendChannels = [
      'show-notes',
      'go-to-udemy',
      'go-to-udemy-webview',
      'go-to-login',
      'go-to-home',
      'go-to-my-learning',
      'search-in-udemy',
      'webview-navigate',
      'webview-page-ready',
      'load-webview-page',
      'webview-notification',
      'course-action'
    ];
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
    }
  },

  // Funciones para invocar y esperar una respuesta del proceso principal (bidireccional)
  invoke: async (channel, data) => {
    const validInvokeChannels = [
      'take-screenshot',
      'add-bookmark',
      'set-cookies',
      'clear-cookies',
      'get-udemy-interceptor-code',
      'socket-connect',
      'socket-disconnect',
      'socket-send-message',
      'socket-status',
      'chrome-launch',
      'chrome-launch-course',
      'chrome-navigate',
      'chrome-back',
      'chrome-forward',
      'chrome-reload',
      'chrome-hide',
      'chrome-show',
      'chrome-position',
      'chrome-cleanup',
      'update-download',
      'update-restart',
      'check-for-updates',
      'check-pending-update-overlay',
      'extract-brave-background',
      'open-brave-debug',
      'get-brave-logging-info',
      'open-brave-logs-directory',
      'get-app-version',
      'fetch-user-courses'
    ];
    if (validInvokeChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    } else {
      return Promise.reject(new Error(`Canal no permitido: ${channel}`));
    }
  },

  // Funciones para escuchar mensajes del proceso principal
  receive: (channel, func) => {
    const validReceiveChannels = [
      'keyboard-shortcut',
      'app-closing',
      'socket-connected',
      'socket-disconnected',
      'socket-message',
      'socket-error',
      'update-available',
      'download-progress',
      'update-downloaded',
      'show-update-overlay',
      'update-download-progress',
      'update-downloaded-overlay',
      'webview-navigate',
      'perform-logout',
      'brave-extraction-started',
      'brave-extraction-completed',
      'webview-notification'
    ];
    if (validReceiveChannels.includes(channel)) {
      // Eliminar listeners anteriores para evitar duplicados
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    } else {
    }
  }
});


// Las cookies de cuenta óptima ahora se configuran desde index.html
// Este archivo se mantiene para otras funcionalidades del preload

// El resto de la lógica de UI/DOM se moverá a udemy-interceptor.js
// La inyección del interceptor se manejará en udemy-interceptor.js también,
// solicitando su propio código al main process a través de electronAPI.invoke('get-udemy-interceptor-code')


