const { contextBridge, ipcRenderer } = require('electron');

console.log('🔔 Notification preload script ejecutándose...');

contextBridge.exposeInMainWorld('electronAPI', {
  // Funciones para controlar la notificación
  closeNotification: () => {
    ipcRenderer.invoke('close-notification');
  },
  
  downloadUpdate: () => {
    ipcRenderer.invoke('update-download');
  },
  
  restartApp: () => {
    ipcRenderer.invoke('update-restart');
  },
  
  // Escuchar mensajes del proceso principal
  receive: (channel, func) => {
    const validChannels = [
      'show-update-available',
      'show-download-progress', 
      'update-progress',
      'show-update-downloaded'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});

// Listeners para eventos de actualización
ipcRenderer.on('show-update-available', (event, info) => {
  console.log('📦 Mostrando actualización disponible:', info);
  
  // Actualizar contenido de la notificación
  document.getElementById('icon').textContent = '📦';
  document.getElementById('title').textContent = 'Nueva actualización disponible';
  document.getElementById('version').textContent = `Versión ${info.version}`;
  document.getElementById('message').textContent = 'Se ha encontrado una nueva versión de Udemigo. ¿Quieres descargarla ahora?';
  
  // Mostrar botones de actualización
  document.getElementById('buttons').innerHTML = `
    <button class="btn btn-primary" onclick="downloadUpdate()">Descargar ahora</button>
    <button class="btn btn-secondary" onclick="closeNotification()">Más tarde</button>
  `;
  
  // Ocultar progreso
  document.getElementById('progressContainer').style.display = 'none';
});

ipcRenderer.on('show-download-progress', (event) => {
  console.log('📥 Mostrando progreso de descarga');
  
  // Actualizar contenido
  document.getElementById('icon').textContent = '📥';
  document.getElementById('title').textContent = 'Descargando actualización';
  document.getElementById('version').textContent = 'Por favor espera...';
  document.getElementById('message').textContent = 'La actualización se está descargando. Puedes seguir usando la aplicación.';
  
  // Mostrar progreso
  document.getElementById('progressContainer').style.display = 'block';
  
  // Ocultar botones
  document.getElementById('buttons').innerHTML = `
    <button class="btn btn-secondary" onclick="closeNotification()">Ocultar</button>
  `;
});

ipcRenderer.on('update-progress', (event, progress) => {
  const percent = Math.round(progress.percent);
  const speed = Math.round(progress.bytesPerSecond / 1024);
  
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressPercent').textContent = percent + '%';
  document.getElementById('progressSpeed').textContent = speed + ' KB/s';
  
  // Actualizar mensaje
  document.getElementById('message').textContent = `Descargando actualización... ${percent}%`;
});

ipcRenderer.on('show-update-downloaded', (event, info) => {
  console.log('✅ Mostrando actualización descargada:', info);
  
  // Actualizar contenido
  document.getElementById('icon').textContent = '✅';
  document.getElementById('title').textContent = 'Actualización descargada';
  document.getElementById('version').textContent = `Versión ${info.version}`;
  document.getElementById('message').textContent = 'La actualización se ha descargado correctamente. ¿Quieres reiniciar la aplicación ahora para aplicarla?';
  
  // Ocultar progreso
  document.getElementById('progressContainer').style.display = 'none';
  
  // Mostrar botones de reinicio
  document.getElementById('buttons').innerHTML = `
    <button class="btn btn-restart" onclick="restartApp()">Reiniciar ahora</button>
    <button class="btn btn-secondary" onclick="closeNotification()">Más tarde</button>
  `;
});

console.log('✅ Notification electronAPI expuesto');