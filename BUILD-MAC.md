# 🍎 Guía para Distribución en macOS - Udemigo

Esta guía detalla todos los cambios necesarios para distribuir Udemigo en macOS usando electron-builder.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Configuración del Package.json](#configuración-del-packagejson)
- [Iconos para macOS](#iconos-para-macos)
- [Firma de Código (Code Signing)](#firma-de-código-code-signing)
- [Notarización](#notarización)
- [Auto-updater para macOS](#auto-updater-para-macos)
- [Scripts de Build](#scripts-de-build)
- [Testing](#testing)
- [Distribución](#distribución)

## 🔧 Requisitos Previos

### Hardware y Software
- **macOS 10.15+** (para desarrollo)
- **Xcode Command Line Tools** instalado
- **Apple Developer Account** ($99/año para firma y notarización)
- **Node.js 16+** y **npm**

### Instalación de dependencias
```bash
# Instalar Xcode Command Line Tools
xcode-select --install

# Verificar instalación
xcode-select -p
```

## ⚙️ Configuración del Package.json

Agrega la configuración para macOS en el `package.json`:

```json
{
  "build": {
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": [
            "x64",
            "arm64"
          ]
        },
        {
          "target": "zip",
          "arch": [
            "x64", 
            "arm64"
          ]
        }
      ],
      "icon": "assets/icon.icns",
      "category": "public.app-category.education",
      "artifactName": "Udemigo-${version}-${arch}.${ext}",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "dmg": {
      "title": "Udemigo ${version}",
      "artifactName": "Udemigo-${version}.${ext}",
      "background": "assets/dmg-background.png",
      "contents": [
        {
          "x": 130,
          "y": 220
        },
        {
          "x": 410,
          "y": 220,
          "type": "link",
          "path": "/Applications"
        }
      ],
      "window": {
        "width": 540,
        "height": 380
      }
    },
    "mas": {
      "type": "distribution",
      "category": "public.app-category.education",
      "provisioningProfile": "build/embedded.provisionprofile"
    }
  }
}
```

## 🎨 Iconos para macOS

### 1. Crear archivo .icns

Necesitas crear un archivo `icon.icns` con múltiples resoluciones:

```bash
# Crear carpeta temporal para iconos
mkdir icon.iconset

# Generar todas las resoluciones desde tu PNG de 1024x1024
sips -z 16 16     icon-1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png

# Crear el archivo .icns
iconutil -c icns icon.iconset

# Mover a assets
mv icon.icns assets/

# Limpiar
rm -rf icon.iconset
```

### 2. Background para DMG (opcional)

Crea un archivo `dmg-background.png` de 540x380 pixels y colócalo en `assets/`.

## 🔐 Firma de Código (Code Signing)

### 1. Configurar certificados

```bash
# Listar certificados disponibles
security find-identity -v -p codesigning

# Variables de entorno (agrega a .env o export)
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"

# O usar desde Keychain
export CSC_NAME="Developer ID Application: Tu Nombre (TEAM_ID)"
```

### 2. Crear archivo de entitlements

Crea `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
</dict>
</plist>
```

## 📝 Notarización

### 1. Configurar credenciales

```bash
# Crear App-Specific Password en appleid.apple.com
export APPLE_ID="tu@email.com"
export APPLE_ID_PASS="app-specific-password"
export APPLE_TEAM_ID="TEAM_ID"
```

### 2. Actualizar package.json

```json
{
  "build": {
    "afterSign": "build/notarize.js",
    "mac": {
      "hardenedRuntime": true,
      "gatekeeperAssess": false
    }
  }
}
```

### 3. Crear script de notarización

Crea `build/notarize.js`:

```javascript
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'co.forif.udemigo',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASS,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
```

## 🔄 Auto-updater para macOS

Actualiza la configuración del auto-updater en `src/main/main.js`:

```javascript
// Configurar el servidor de actualizaciones
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'JuliCesar2022',
  repo: 'electron-aprendeya',
  private: false,
  releaseType: 'release'
});

// Detección de plataforma
const platform = process.platform;
if (platform === 'darwin') {
  // macOS usa .zip para actualizaciones
  console.log('🍎 Configurado para macOS');
} else if (platform === 'win32') {
  // Windows usa .exe
  console.log('🪟 Configurado para Windows');
}
```

## 🛠️ Scripts de Build

### 1. Actualizar package.json scripts

```json
{
  "scripts": {
    "build:mac": "electron-builder --mac",
    "build:mac:universal": "electron-builder --mac --universal",
    "build:mac:arm64": "electron-builder --mac --arm64",
    "build:mac:x64": "electron-builder --mac --x64",
    "publish:mac": "electron-builder --mac --publish=always",
    "dist:mac": "npm run build && electron-builder --mac"
  }
}
```

### 2. Crear script de build

Crea `build-mac.sh`:

```bash
#!/bin/bash
echo "🍎 Construyendo aplicación Udemigo para macOS..."

# Verificar que estamos en macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Este script debe ejecutarse en macOS"
    exit 1
fi

# Verificar certificados
if [ -z "$CSC_NAME" ] && [ -z "$CSC_LINK" ]; then
    echo "⚠️ No se encontraron certificados de firma. La app no estará firmada."
fi

# Build
npm run build:mac

echo "✅ Build completado. Archivos en dist/"
ls -la dist/
```

### 3. Hacer ejecutable

```bash
chmod +x build-mac.sh
```

## 🧪 Testing

### 1. Test local (sin firma)

```bash
# Build sin firma para testing
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:mac
```

### 2. Test con firma

```bash
# Build con firma completa
npm run build:mac
```

### 3. Verificar firma

```bash
# Verificar que la app está firmada
codesign -dv --verbose=4 dist/mac/Udemigo.app

# Verificar que puede ejecutarse
spctl -a -t exec -vv dist/mac/Udemigo.app
```

## 📦 Distribución

### 1. Archivos generados

Después del build, encontrarás en `dist/`:

```
dist/
├── Udemigo-2.0.1.dmg              # Instalador DMG
├── Udemigo-2.0.1-mac.zip          # Archivo ZIP para auto-updates
├── Udemigo-2.0.1-arm64-mac.zip    # Versión ARM64
├── Udemigo-2.0.1-x64-mac.zip      # Versión Intel x64
└── latest-mac.yml                 # Metadata para auto-updater
```

### 2. URLs de descarga

Una vez publicado en GitHub Releases:

- **DMG Universal:** `https://github.com/JuliCesar2022/electron-aprendeya/releases/latest/download/Udemigo-2.0.1.dmg`
- **ZIP para updates:** `https://github.com/JuliCesar2022/electron-aprendeya/releases/latest/download/Udemigo-2.0.1-mac.zip`
- **ARM64:** `https://github.com/JuliCesar2022/electron-aprendeya/releases/latest/download/Udemigo-2.0.1-arm64-mac.zip`
- **Intel x64:** `https://github.com/JuliCesar2022/electron-aprendeya/releases/latest/download/Udemigo-2.0.1-x64-mac.zip`

## 🔍 Solución de Problemas

### Error: "App is damaged and can't be opened"
```bash
# Remover quarantine attribute
sudo xattr -r -d com.apple.quarantine /Applications/Udemigo.app
```

### Error de notarización
```bash
# Verificar status de notarización
xcrun altool --notarization-info [RequestUUID] \
  --username "$APPLE_ID" \
  --password "$APPLE_ID_PASS"
```

### Auto-updater no funciona
- Verificar que `latest-mac.yml` está publicado
- Confirmar que el archivo ZIP está disponible
- Revisar logs de electron-updater

## 📝 Notas Importantes

1. **Firma obligatoria:** macOS Catalina+ requiere que todas las apps estén firmadas
2. **Notarización:** Requerida para distribución fuera del Mac App Store
3. **Arquitecturas:** Considera builds separados para Intel (x64) y Apple Silicon (arm64)
4. **Gatekeeper:** Los usuarios pueden necesitar autorizar la primera ejecución
5. **Auto-updates:** macOS usa archivos .zip, no .dmg para actualizaciones

## 🚀 Comando Completo

Para build y publicación completa:

```bash
# Configurar variables de entorno
export CSC_NAME="Developer ID Application: Tu Nombre (TEAM_ID)"
export APPLE_ID="tu@email.com"
export APPLE_ID_PASS="app-specific-password"
export APPLE_TEAM_ID="TEAM_ID"

# Build y publicar
npm run publish:mac
```

---

**Documentación creada para Udemigo v2.0.1**  
**Última actualización:** $(date +%Y-%m-%d)

> **Nota:** Esta guía asume que ya tienes configurado el entorno de desarrollo para Windows. Para un setup completo multiplataforma, considera usar servicios de CI/CD como GitHub Actions.