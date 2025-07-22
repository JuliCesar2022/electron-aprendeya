# 📦 Guía de Instalador y Auto-Actualización

## 🚀 Generar Instalador .exe

### Método Rápido:
```bash
# Ejecutar el script automático
build-installer.bat
```

### Método Manual:
```bash
# 1. Instalar dependencias
npm install

# 2. Generar instalador para Windows
npm run dist:win

# 3. Los archivos estarán en la carpeta 'dist/'
```

## 📁 Archivos Generados

Después del build encontrarás en la carpeta `dist/`:

- **UdemyAprendeYa-Setup-1.0.0.exe** → Instalador completo
- **UdemyAprendeYa-1.0.0-portable.exe** → Versión portable
- **latest.yml** → Archivo de configuración para auto-actualizaciones

## 🔄 Sistema de Auto-Actualización

### Configuración:

1. **Cambiar configuración en package.json:**
   ```json
   "publish": {
     "provider": "github",
     "owner": "TU-USUARIO-GITHUB",
     "repo": "udemy-aprendeya",
     "private": false
   }
   ```

2. **Crear repositorio en GitHub:**
   - Subir el código al repositorio
   - Habilitar GitHub Releases

### Publicar Nueva Versión:

1. **Incrementar versión:**
   ```bash
   npm version patch  # 1.0.0 → 1.0.1
   npm version minor  # 1.0.0 → 1.1.0
   npm version major  # 1.0.0 → 2.0.0
   ```

2. **Generar y publicar:**
   ```bash
   npm run publish:win
   ```

3. **O usar GitHub Actions:**
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

## 🎯 Funciones del Auto-Updater

### Para el Usuario:
- ✅ **Verificación automática** al iniciar la app (después de 3 segundos)
- ✅ **Notificación visual** cuando hay actualizaciones
- ✅ **Descarga opcional** ("Descargar ahora" / "Más tarde")
- ✅ **Instalación automática** al cerrar la app
- ✅ **Verificación manual** desde menú "Extensiones > Verificar actualizaciones"

### Características:
- 🔍 Solo verifica actualizaciones en versión empaquetada (no en desarrollo)
- 📦 Descarga incremental (solo diferencias)
- 🔐 Verificación de firmas (si está configurado)
- 📊 Progreso de descarga en tiempo real
- 🔄 Instalación silenciosa al reiniciar

## 🛠️ Configuraciones Avanzadas

### Personalizar el Instalador:

El archivo `build/installer.nsh` permite personalizar:
- Mensajes en español
- Asociaciones de archivos
- Registros del sistema
- Páginas personalizadas

### Configurar Firma Digital:

Para un instalador profesional, agrega en `package.json`:
```json
"win": {
  "certificateFile": "path/to/certificate.p12",
  "certificatePassword": "password",
  "signingAlgorithm": "sha256"
}
```

## 📋 Checklist de Distribución

Antes de distribuir tu aplicación:

- [ ] ✅ Configurar información del autor en `package.json`
- [ ] ✅ Cambiar URLs de GitHub en configuración
- [ ] ✅ Crear icono .ico de alta calidad
- [ ] ✅ Probar instalador en máquina limpia
- [ ] ✅ Verificar que auto-updater funciona
- [ ] ✅ Configurar certificado de firma (opcional pero recomendado)
- [ ] ✅ Crear release notes para cada versión

## 🚨 Solución de Problemas

### Error: "publisher not found"
- Verificar configuración `publish` en package.json
- Asegurar que el repositorio existe y es público

### Auto-updater no funciona:
- Verificar que `latest.yml` esté en el mismo directorio que el .exe
- Comprobar permisos de red/firewall
- Ver logs en DevTools para errores específicos

### Instalador no se ejecuta:
- Windows puede bloquear ejecutables sin firma
- Agregar excepción en Windows Defender
- Considerar obtener certificado de firma digital

## 📈 Distribución

### Recomendaciones:
1. **Subir a GitHub Releases** para auto-actualizaciones
2. **Hosting adicional** para respaldo (Google Drive, Dropbox, etc.)
3. **Firma digital** para mayor confianza de usuarios
4. **Testing** en diferentes versiones de Windows

### Archivos a Distribuir:
- `UdemyAprendeYa-Setup-X.X.X.exe` → Para usuarios finales
- `latest.yml` → Para sistema de actualizaciones (automático en GitHub)