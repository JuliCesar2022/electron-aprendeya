# 🚀 Generar Instalador en Windows

## ⚠️ IMPORTANTE: Ejecutar en Windows (no WSL)

Para generar el instalador .exe correctamente, debes ejecutar estos comandos **directamente en Windows**, no en WSL.

## 📋 Pasos para generar el instalador:

### 1. Abrir PowerShell o CMD como Administrador en Windows

### 2. Navegar al directorio del proyecto:
```cmd
cd "C:\Users\julio\Documents\forif\repos\udemy\electron-aprendeya"
```

### 3. Ejecutar uno de estos métodos:

#### Método A - Script automático:
```cmd
build-installer.bat
```

#### Método B - Comandos manuales:
```cmd
npm install
npm run dist:win
```

#### Método C - Solo empaquetado (sin instalador):
```cmd
npm install
npm run pack:win
```

## 📁 Archivos que se generarán:

### Con instalador (`npm run dist:win`):
- `dist/UdemyAprendeYa-Setup-1.0.0.exe` → **Instalador completo**
- `dist/UdemyAprendeYa-1.0.0-portable.exe` → **Versión portable**
- `dist/latest.yml` → **Para auto-actualizaciones**

### Solo empaquetado (`npm run pack:win`):
- `dist/win-unpacked/Udemy AprendeYa.exe` → **Ejecutable directo**
- `dist/win-unpacked/` → **Carpeta con todos los archivos**

## 🔧 Si hay errores:

### Error de permisos:
- Ejecutar PowerShell como Administrador
- O usar: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Error de Node.js:
- Verificar que Node.js esté instalado en Windows
- Reinstalar si es necesario: https://nodejs.org

### Error de iconos:
- Los iconos se configurarán automáticamente
- Si hay problemas, se usará el icono por defecto de Electron

## ✅ Resultado final:

Tendrás un instalador profesional `.exe` que:
- Se instala en "Archivos de programa"
- Crea accesos directos en escritorio y menú inicio
- Incluye desinstalador automático
- Tiene sistema de auto-actualización integrado
- Funciona como cualquier aplicación de Windows

## 🚀 Para distribuir:
- Subir el archivo `.exe` a tu servidor o GitHub
- Los usuarios solo necesitan descargar y ejecutar el instalador
- Las actualizaciones futuras se instalarán automáticamente