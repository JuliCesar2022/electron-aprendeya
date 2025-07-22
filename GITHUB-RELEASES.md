# 🚀 Configuración de GitHub Releases - Paso a Paso

## 📋 Preparación Inicial

### 1. **Crear Repositorio en GitHub**

1. Ve a [GitHub.com](https://github.com)
2. Click en **"New repository"**
3. Completa la información:
   ```
   Repository name: udemy-aprendeya
   Description: Aplicación Electron para mejorar la experiencia de Udemy
   ✅ Public (necesario para releases gratuitos)
   ✅ Add README file
   ✅ Add .gitignore (Node)
   ✅ Add license (MIT)
   ```
4. Click **"Create repository"**

### 2. **Subir tu Código Local**

```bash
# En tu carpeta local del proyecto
git init
git add .
git commit -m "Initial commit: Udemy AprendeYa v1.0.0"

# Conectar con GitHub (cambiar por tu usuario)
git remote add origin https://github.com/TU-USUARIO/udemy-aprendeya.git
git branch -M main
git push -u origin main
```

### 3. **Configurar package.json**

Actualiza la configuración de publicación:

```json
{
  "name": "udemy-aprendeya",
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/TU-USUARIO/udemy-aprendeya.git"
  },
  "publish": {
    "provider": "github",
    "owner": "TU-USUARIO",
    "repo": "udemy-aprendeya",
    "private": false,
    "releaseType": "release"
  }
}
```

## 🔑 Configuración de Token de Acceso

### 1. **Crear Personal Access Token**

1. Ve a **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **"Generate new token (classic)"**
3. Configurar token:
   ```
   Note: "Udemy AprendeYa Releases"
   Expiration: No expiration (o 1 año)
   
   Scopes necesarios:
   ✅ repo (acceso completo a repositorios)
   ✅ write:packages (para subir releases)
   ✅ read:org (si usas organizaciones)
   ```
4. Click **"Generate token"**
5. **¡IMPORTANTE!** Copia el token y guárdalo seguro (no lo podrás ver de nuevo)

### 2. **Configurar Token en tu Sistema**

**Windows:**
```cmd
# Opción 1: Variable de entorno permanente
setx GH_TOKEN "tu-token-aquí"

# Opción 2: Para la sesión actual
set GH_TOKEN=tu-token-aquí

# Opción 3: En archivo .env (crear en la raíz del proyecto)
# .env
GH_TOKEN=tu-token-aquí
```

**Linux/macOS:**
```bash
# Agregar al final de ~/.bashrc o ~/.zshrc
export GH_TOKEN="tu-token-aquí"

# Recargar configuración
source ~/.bashrc
```

## 🛠️ Configuración de Electron-Builder

### 1. **Actualizar package.json**

```json
{
  "build": {
    "appId": "com.forif.udemy-aprendeya",
    "productName": "Udemy AprendeYa",
    "copyright": "Copyright © 2024 AprendeYa - ForIf",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": [
      "src/**/*",
      "node_modules/**/*",
      "package.json",
      "!node_modules/.cache/**/*",
      "!node_modules/**/*.md",
      "!node_modules/**/README*",
      "!node_modules/**/LICENSE*",
      "!node_modules/**/test/**/*",
      "!node_modules/**/tests/**/*"
    ],
    "publish": {
      "provider": "github",
      "owner": "TU-USUARIO",
      "repo": "udemy-aprendeya",
      "private": false,
      "releaseType": "release"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/Udemy-Emblem-_1_.ico",
      "publisherName": "ForIf - AprendeYa"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": "always",
      "shortcutName": "Udemy AprendeYa",
      "runAfterFinish": true
    }
  }
}
```

### 2. **Actualizar main.js**

Busca esta línea y actualiza con tu información:

```javascript
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'TU-USUARIO',          // ← Cambiar aquí
  repo: 'udemy-aprendeya',      // ← Cambiar aquí
  private: false,
  releaseType: 'release'
});
```

## 🚀 Crear y Publicar tu Primera Release

### 1. **Método Manual - Primera Release**

```bash
# 1. Asegúrate de tener todo commiteado
git add .
git commit -m "Preparado para primera release"
git push origin main

# 2. Instalar dependencias
npm install

# 3. Generar y publicar automáticamente
npm run publish:win
```

### 2. **Método con Tags - Más Profesional**

```bash
# 1. Crear tag de versión
git tag v1.0.0
git push origin v1.0.0

# 2. Generar release
npm run publish:win
```

### 3. **Verificar que funcionó**

1. Ve a tu repositorio en GitHub
2. Click en **"Releases"**
3. Deberías ver:
   - **v1.0.0** como release
   - **UdemyAprendeYa-Setup-1.0.0.exe** como asset
   - **latest.yml** como asset
   - **Release notes** generadas automáticamente

## 🔄 Workflow de Actualizaciones

### 1. **Para Nuevas Versiones**

```bash
# 1. Hacer cambios en tu código
# ... desarrollar nuevas funcionalidades ...

# 2. Actualizar versión
npm version patch    # 1.0.0 → 1.0.1
# o
npm version minor    # 1.0.0 → 1.1.0
# o
npm version major    # 1.0.0 → 2.0.0

# 3. Commit y push
git push origin main
git push origin --tags

# 4. Publicar nueva versión
npm run publish:win
```

### 2. **Scripts Útiles**

Agrega estos scripts a tu **package.json**:

```json
{
  "scripts": {
    "release:patch": "npm version patch && git push origin main && git push origin --tags && npm run publish:win",
    "release:minor": "npm version minor && git push origin main && git push origin --tags && npm run publish:win",
    "release:major": "npm version major && git push origin main && git push origin --tags && npm run publish:win"
  }
}
```

Uso:
```bash
# Release automático patch
npm run release:patch

# Release automático minor
npm run release:minor
```

## 🤖 Automatización con GitHub Actions

### 1. **Crear Workflow Automático**

Crea el archivo `.github/workflows/release.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    
    steps:
    - name: Checkout código
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Instalar dependencias
      run: npm ci
      
    - name: Build y publicar
      run: npm run publish:win
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. **Configurar Secrets**

1. Ve a tu repositorio → **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Crear:
   ```
   Name: GH_TOKEN
   Secret: [tu-personal-access-token]
   ```

### 3. **Usar Workflow Automático**

```bash
# Crear nueva versión (dispara el workflow automáticamente)
git tag v1.0.1
git push origin v1.0.1

# GitHub Actions se encarga del resto:
# - Instala dependencias
# - Genera el instalador
# - Crea la release
# - Sube los archivos
```

## 🧪 Testing del Sistema de Actualizaciones

### 1. **Probar Manualmente**

```bash
# 1. Generar versión 1.0.0
npm version 1.0.0
npm run publish:win

# 2. Instalar en máquina de prueba
# Descargar e instalar UdemyAprendeYa-Setup-1.0.0.exe

# 3. Generar versión 1.0.1 con cambios
npm version 1.0.1
npm run publish:win

# 4. Abrir app instalada
# Debería mostrar notificación de actualización
```

### 2. **Verificar Logs**

En la aplicación, abre **DevTools (F12)** y verifica:

```javascript
// Logs esperados:
"🔍 Verificando actualizaciones..."
"📦 Actualización disponible: 1.0.1"
"✅ Actualización descargada: 1.0.1"
```

## 🚨 Solución de Problemas

### Error: "Invalid token"
```bash
# Verificar token
echo $GH_TOKEN

# Regenerar token en GitHub
# Settings → Developer settings → Personal access tokens
```

### Error: "Repository not found"
```bash
# Verificar configuración
git remote -v

# Debe mostrar:
# origin  https://github.com/TU-USUARIO/udemy-aprendeya.git (fetch)
# origin  https://github.com/TU-USUARIO/udemy-aprendeya.git (push)
```

### Error: "Rate limit exceeded"
```bash
# Esperar 1 hora o usar token con más permisos
```

### Auto-updater no funciona
1. Verificar que `latest.yml` esté en GitHub releases
2. Verificar permisos de firewall
3. Verificar logs en DevTools

## 📊 Verificar Configuración

### ✅ Checklist Final

- [ ] Repositorio público en GitHub creado
- [ ] Código subido a GitHub
- [ ] Personal Access Token creado y configurado
- [ ] package.json actualizado con tu usuario
- [ ] main.js actualizado con tu información
- [ ] Primera release publicada exitosamente
- [ ] latest.yml visible en GitHub releases
- [ ] Auto-updater probado y funcionando

### 🔍 URLs de Verificación

Reemplaza `TU-USUARIO` con tu usuario real:

- **Repositorio:** `https://github.com/TU-USUARIO/udemy-aprendeya`
- **Releases:** `https://github.com/TU-USUARIO/udemy-aprendeya/releases`
- **latest.yml:** `https://github.com/TU-USUARIO/udemy-aprendeya/releases/download/v1.0.0/latest.yml`
- **Instalador:** `https://github.com/TU-USUARIO/udemy-aprendeya/releases/download/v1.0.0/UdemyAprendeYa-Setup-1.0.0.exe`

¡Listo! Tu aplicación ahora tiene un sistema de actualizaciones automáticas profesional usando GitHub Releases.