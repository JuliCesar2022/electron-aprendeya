# 🔥 Hot Reload System - Electron Udemigo

Sistema de hot reload completo para desarrollo sin cerrar ventanas de Electron.

## 🚀 Scripts de Desarrollo

### Comandos Disponibles

```bash
# Desarrollo principal - Solo recarga main/preload process
npm run dev

# Desarrollo completo - Recarga toda la aplicación
npm run dev:full

# Desarrollo legacy - Usa nodemon clásico
npm run dev:legacy

# Desarrollo verbose - Con logs detallados
npm run dev:verbose
```

## 📋 ¿Qué hace cada script?

### `npm run dev` (Recomendado)
- **Usa**: `electronmon` 
- **Observa**: `src/main/` y `src/preload/`
- **Ignora**: `src/renderer/` (se maneja con hot reload interno)
- **Ventaja**: No cierra ventanas al cambiar archivos renderer

### `npm run dev:full`
- **Usa**: `electronmon`
- **Observa**: Todo el proyecto
- **Ventaja**: Recarga todo automáticamente

### `npm run dev:legacy`
- **Usa**: `nodemon` clásico
- **Comportamiento**: Cierra y abre ventanas

## 🎯 Funcionalidades del Hot Reload

### ✅ Lo que funciona SIN cerrar ventanas:

1. **Cambios en renderer** (`src/renderer/**`)
   - Recarga automática de WebViews
   - Mantiene ventanas abiertas
   - Preserva estado de navegación

2. **Cambios en interceptores** (`src/renderer/udemy-interceptor*`)
   - Recarga específica del WebView de Udemy
   - Reinicializa interceptor automáticamente
   - Limpia estado anterior

3. **Cambios en CSS** (`src/renderer/**/*.css`)
   - Recarga solo estilos
   - No recarga página completa
   - Actualización instantánea

### ⚠️ Lo que CIERRA ventanas:

1. **Cambios en main process** (`src/main/**`)
2. **Cambios en preload** (`src/preload/**`)
3. **Cambios en package.json**

## 🏗️ Arquitectura del Sistema

```
📦 Hot Reload System
├── 🔧 src/main/hot-reload.js          # Manager principal 
├── 🎨 src/renderer/hot-reload-client.js # Cliente renderer
├── 📱 Integration en main.js           # Configuración main
├── 🌐 Integration en script.js         # WebView setup
└── 📄 Integration en package.json     # Scripts npm
```

## 📝 Archivos Observados

### Main Process (electronmon)
```
src/main/**/*.js
src/preload/**/*.js
```

### Renderer Process (chokidar)
```
src/renderer/**/*.js      # Scripts renderer
src/renderer/**/*.html    # Páginas HTML  
src/renderer/**/*.css     # Estilos CSS
src/renderer/udemy-interceptor*  # Interceptores especiales
```

## 🛠️ Configuración

### Variables de Entorno

El sistema se activa automáticamente cuando:
```bash
NODE_ENV=development
```

### Registro de WebViews

```javascript
// En tu página renderer:
if (window.hotReloadClient) {
    window.hotReloadClient.registerWebView(webviewElement, 'nombre');
}
```

## 🔍 Debugging

### Logs en Consola

```bash
🔥 Hot Reload activado para desarrollo
📝 Ventana registrada para hot reload: main
🚀 Hot Reload iniciado - Watching files...
🔄 Archivo renderer cambiado: src/renderer/...
🎯 Interceptor cambiado: src/renderer/udemy-interceptor-simple.js
🎨 CSS cambiado: src/renderer/assets/css/...
```

### Acceso Global

```javascript
// En DevTools del renderer:
window.hotReloadClient          // Cliente hot reload
window.hotReloadClient.webviews // WebViews registrados
```

## 🎮 Eventos IPC

El sistema usa estos eventos para comunicación:

```javascript
// Main → Renderer
'hot-reload-trigger'      // Recarga general
'hot-reload-interceptor'  // Recarga interceptor específico  
'hot-reload-styles'       // Recarga solo estilos

// Data enviada:
{
  source: 'renderer|preload|interceptor',
  action: 'reload-udemy-webview',
  filePath: 'path/to/changed/file.css',
  timestamp: Date.now()
}
```

## 🚨 Solución de Problemas

### WebView no se recarga
```javascript
// Verificar registro en DevTools
console.log(window.hotReloadClient?.webviews);
```

### Hot reload no detecta cambios
```bash
# Verificar que NODE_ENV está configurado
echo $NODE_ENV

# O usar script que incluye la variable
npm run dev
```

### Interceptor no se reinicializa
- El sistema limpia automáticamente el interceptor anterior
- Logs en consola muestran el proceso
- WebView se recarga específicamente para interceptores

## 📊 Ventajas vs Desventajas

### ✅ Ventajas
- **No cierra ventanas** al cambiar renderer
- **Preserva estado** de navegación en WebViews
- **Recarga específica** de interceptores
- **Actualización instantánea** de CSS
- **Logs detallados** para debugging

### ⚠️ Limitaciones
- Main process cambios aún requieren restart
- Primera carga puede ser más lenta
- Requiere configuración específica por WebView

## 🎯 Casos de Uso Perfectos

1. **Desarrollo de interceptores**
   - Cambias `udemy-interceptor-simple.js`
   - WebView se recarga automáticamente
   - Interceptor se reinicializa

2. **Ajustes de UI**
   - Cambias CSS
   - Estilos se actualizan al instante
   - No pierdes navegación

3. **Debugging de renderer**
   - Cambias lógica de componentes
   - WebViews se recargan
   - DevTools permanecen abiertos

---

*Sistema implementado para proyecto Electron Udemigo*