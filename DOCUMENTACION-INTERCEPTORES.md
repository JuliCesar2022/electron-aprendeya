# 📋 Documentación de Interceptores - Electron Udemigo

## 🎯 Resumen General

Este documento detalla la ubicación exacta de todos los interceptores de botones y las comunicaciones entre componentes en la aplicación Electron Udemigo.

---

## 🎓 INTERCEPTORES DE BOTONES DE INSCRIPCIÓN

### 📁 Archivo Principal
**`src/renderer/udemy-interceptor-simple.js`**

### 🔍 Ubicación Exacta de las Funciones

#### 1. **Configuración del Interceptor**
- **Línea 372**: `this.setupEnrollButtonInterceptor();`
- **Línea 515**: `setupEnrollButtonInterceptor() {`

#### 2. **Detección de Botones**
- **Líneas 434-448**: Lista de selectores para detectar botones de inscripción
```javascript
const enrollSelectors = [
    'button[data-purpose="enroll-button-trigger"]',
    '[data-purpose="enroll-button"]',
    'button[data-purpose*="enroll"]',
    '.enroll-button',
];
```

#### 3. **Manejo de Clicks**
- **Línea 454**: `this.handleEnrollClick(event, enrollButton);`
- **Línea 1031**: `handleEnrollClick(event, enrollButton) {`
- **Línea 961**: `handleCourseEnrollment(courseTitle, courseUrl) {`

#### 4. **Reemplazo de Botones**
- **Línea 794**: `replaceEnrollButton(container) {`
- **Línea 887**: `createEnrollButton() {`
- **Línea 912**: Texto del botón: `'🎓 Inscribirme GRATIS y abrir en Brave'`

---

## 💾 INTERCEPTORES DE BOTONES DE GUARDAR/SAVE

### 📁 Archivo Principal
**`src/renderer/udemy-interceptor-simple.js`**

### 🔍 Ubicación Exacta de las Funciones

#### 1. **Configuración del Interceptor**
- **Línea 375**: `this.setupSaveButtonInterceptor();`
- **Línea 379**: `setupSaveButtonInterceptor() {`

#### 2. **Detección de Botones**
- **Líneas 385-399**: Lista de selectores para detectar botones de guardar
```javascript
const saveSelectors = [
    '[data-testid="save-to-list-button"]',
    '[data-purpose="save-to-list"]',
    '[data-purpose="save-button"]',
    '[aria-label*="Save"]',
    '[aria-label*="Guardar"]',
    '.save-button',
];
```

#### 3. **Manejo de Clicks**
- **Línea 410**: `this.handleSaveToListClick(event, saveButton);`
- **Línea 620**: `handleSaveToListClick(event, element) {`

#### 4. **Detección Dinámica**
- **Línea 481**: `setupDynamicSaveButtons() {`
- **Líneas 489-497**: Detección de nuevos botones agregados dinámicamente

---

## 🌐 ENVÍO AL BACKEND

### 📁 Archivo Principal
**`src/renderer/udemy-interceptor-simple.js`**

### 🔍 Ubicación Exacta de las Funciones

#### 1. **Configuración del Backend**
- **Línea 15**: `this.backendURL = 'https://aprendeya-backend.forif.co/api/v1/';`

#### 2. **Función Principal de Envío**
- **Línea 1095**: `saveCourseToBackend(payload, slug) {`
- **Línea 1109**: `fetch(`${this.backendURL}user-courses/`, {`

#### 3. **Llamadas desde Interceptores**
- **Línea 659**: `this.saveCourseToBackend(payload, courseInfo.slug);` (desde save button)
- **Línea 1017**: `this.saveCourseToBackend(payload, slug);` (desde enroll button)
- **Línea 1090**: `this.saveCourseToBackend(payload, slug);` (desde enroll click)

#### 4. **Procesamiento de Respuesta**
- **Línea 1124**: `console.log('✅ Respuesta del backend:', data);`
- **Líneas 1126-1170**: Manejo de respuestas exitosas y errores

---

## 🔔 SISTEMA DE NOTIFICACIONES A ELECTRON

### 📁 Archivos Involucrados
- **Renderer**: `src/renderer/udemy-interceptor-simple.js`
- **Main**: `src/main/main.js`
- **Preload**: `src/preload/preload.js`

### 🔍 Ubicación Exacta - ENVÍO (Renderer)

#### 1. **Funciones de Notificación**
- **Línea 1242**: `showErrorNotification(message) {`
- **Línea 1256**: `showNotification(message, color = '#4CAF50') {`
- **Línea 1083**: `window.electronAPI.send('webview-notification', {`

#### 2. **Envíos Específicos**
- **Línea 1130**: Notificación de éxito al guardar
- **Línea 1135**: Notificación de curso duplicado
- **Línea 1145**: Notificación de error al guardar
- **Línea 1159**: Notificación de éxito al inscribirse
- **Línea 1181**: Notificación de error al inscribirse

### 🔍 Ubicación Exacta - RECEPCIÓN (Main Process)

#### 1. **Configuración del Handler**
- **Archivo**: `src/main/main.js`
- **Línea 943**: `// Handler for WebView page ready notification`

#### 2. **Ventana de Notificaciones**
- **Línea 310**: `let notificationWindow = null;`
- **Línea 507**: `function createNotificationWindow() {`
- **Línea 583**: `function closeNotificationWindow() {`

#### 3. **Preload de Notificaciones**
- **Archivo**: `src/preload/notification-preload.js`
- **Línea 7**: `closeNotification: () => {`

---

## 🌐 APERTURA DE BRAVE BROWSER

### 📁 Archivos Involucrados
- **Renderer**: `src/renderer/udemy-interceptor-simple.js`
- **Main**: `src/main/main.js` y `src/main/brave-controller.js`

### 🔍 Ubicación Exacta - ENVÍO (Renderer)

#### 1. **Solicitud de Apertura**
- **Línea 1151**: `window.electronAPI.invoke('chrome-launch-course', {`
- **Línea 1196**: `window.electronAPI.invoke('chrome-launch-course', {`
- **Línea 1315**: `if (window.electronAPI && window.electronAPI.invoke) {`
- **Línea 1317**: `const result = await window.electronAPI.invoke('chrome-launch-course', normalizedUrl);`

#### 2. **Métodos Alternativos**
- **Línea 1346**: `if (window.electronAPI && window.electronAPI.send) {`
- **Línea 1348**: `window.electronAPI.send('chrome-launch-course', normalizedUrl);`

#### 3. **Función Principal de Apertura**
- **Línea 1308**: `async openCourseInBrave(courseUrl) {`
- **Línea 1221**: `openCourseAfterSave(slug) {`

### 🔍 Ubicación Exacta - RECEPCIÓN (Main Process)

#### 1. **Handler Principal**
- **Archivo**: `src/main/main.js`
- Buscar handler de `'chrome-launch-course'` en los ipcMain.handle

#### 2. **Controlador de Brave**
- **Archivo**: `src/main/brave-controller.js`
- **Línea 1**: Clase BraveController que maneja toda la lógica de apertura
- **Líneas 1738-1848**: Funciones de notificación de progreso
- **Línea 1974**: `showKioskNotification('Enlace abierto en navegador externo');`

---

## 🔄 FLUJO COMPLETO DE COMUNICACIÓN

### 1. **Interceptación de Botón**
```
Usuario hace click → Interceptor detecta → Función handle* ejecuta
```

### 2. **Envío al Backend**
```
handle* → saveCourseToBackend() → fetch() → Respuesta procesada
```

### 3. **Notificación a Electron**
```
Respuesta → showNotification() → electronAPI.send() → Main process → Ventana notificación
```

### 4. **Apertura en Brave**
```
Éxito backend → openCourseInBrave() → electronAPI.invoke() → BraveController → Brave Browser
```

---

## 📊 Resumen de Archivos Clave

| Componente | Archivo | Líneas Principales |
|------------|---------|-------------------|
| **Interceptores** | `udemy-interceptor-simple.js` | 372, 375, 515, 379 |
| **Backend** | `udemy-interceptor-simple.js` | 15, 1095, 1109 |
| **Notificaciones** | `udemy-interceptor-simple.js` | 1242, 1256 |
| **Brave** | `udemy-interceptor-simple.js` | 1308, 1315, 1317 |
| **Main Process** | `main.js` | 310, 507, handlers IPC |
| **Brave Controller** | `brave-controller.js` | 1-100, 1738-1848 |

---

*Documentación generada para proyecto Electron Udemigo*