const { contextBridge, ipcRenderer } = require('electron');

console.log('🔧 Preload script ejecutándose...');

contextBridge.exposeInMainWorld('electronAPI', {
  // Funciones para enviar mensajes al proceso principal (unidireccional)
  send: (channel, data) => {
    const validSendChannels = [
      'show-notes',
      'go-to-udemy',
      'go-to-login',
      'go-to-home',
      'go-to-dashboard',
      'go-to-my-learning',
      'search-in-udemy'
    ];
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`Intento de enviar a canal no permitido: ${channel}`);
    }
  },

  // Funciones para invocar y esperar una respuesta del proceso principal (bidireccional)
  invoke: async (channel, data) => {
    const validInvokeChannels = [
      'take-screenshot',
      'add-bookmark',
      'set-cookies',
      'clear-cookies',
      'get-udemy-interceptor-code'
    ];
    if (validInvokeChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    } else {
      console.warn(`Intento de invocar canal no permitido: ${channel}`);
      return Promise.reject(new Error(`Canal no permitido: ${channel}`));
    }
  },

  // Funciones para escuchar mensajes del proceso principal
  receive: (channel, func) => {
    const validReceiveChannels = [
      'keyboard-shortcut'
    ];
    if (validReceiveChannels.includes(channel)) {
      // Eliminar listeners anteriores para evitar duplicados
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    } else {
      console.warn(`Intento de escuchar canal no permitido: ${channel}`);
    }
  }
});

console.log('✅ electronAPI expuesto al main world');

// El resto de la lógica de UI/DOM se moverá a udemy-interceptor.js
// La inyección del interceptor se manejará en udemy-interceptor.js también,
// solicitando su propio código al main process a través de electronAPI.invoke('get-udemy-interceptor-code')


