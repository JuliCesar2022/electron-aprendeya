# 🔄 Configuración del Servidor de Actualizaciones

## 📋 Opciones de Servidor

### 1. **GitHub Releases (Recomendado) - GRATIS**

**Ventajas:**
- ✅ Gratis e ilimitado
- ✅ CDN global automático
- ✅ Soporte nativo en electron-updater
- ✅ Control de versiones automático
- ✅ Estadísticas de descarga

**Configuración:**
```json
{
  "publish": {
    "provider": "github",
    "owner": "tu-usuario-github",
    "repo": "udemy-aprendeya",
    "private": false
  }
}
```

**Pasos:**
1. Crear repositorio en GitHub
2. Generar Personal Access Token
3. Configurar GitHub Actions para builds automáticos
4. Publicar releases con `npm run publish:win`

### 2. **Servidor Propio (Tu Backend)**

**Configuración para tu servidor:**
```json
{
  "publish": {
    "provider": "generic",
    "url": "https://aprendeya-backend.forif.co/api/v1/updates/"
  }
}
```

**Estructura de archivos en tu servidor:**
```
https://aprendeya-backend.forif.co/api/v1/updates/
├── latest.yml          # Información de la última versión
├── latest-mac.yml      # Para macOS
├── latest-linux.yml    # Para Linux
└── releases/
    ├── UdemyAprendeYa-Setup-1.0.0.exe
    ├── UdemyAprendeYa-Setup-1.0.1.exe
    └── ...
```

### 3. **Amazon S3 + CloudFront**

**Configuración:**
```json
{
  "publish": {
    "provider": "s3",
    "bucket": "udemy-aprendeya-updates",
    "region": "us-east-1",
    "acl": "public-read"
  }
}
```

## 🛠️ Implementación en tu Backend

### API Endpoints necesarios:

**1. Información de versión:**
```
GET /api/v1/updates/latest.yml
```

**2. Descarga de instalador:**
```
GET /api/v1/updates/releases/UdemyAprendeYa-Setup-{version}.exe
```

### Estructura del latest.yml:
```yaml
version: 1.0.1
files:
  - url: UdemyAprendeYa-Setup-1.0.1.exe
    sha512: [hash del archivo]
    size: 92160000
    blockMapSize: 96879
path: UdemyAprendeYa-Setup-1.0.1.exe
sha512: [hash del archivo]
releaseDate: '2024-01-15T10:30:00.000Z'
```

### Ejemplo de Controller (Node.js):
```javascript
// UpdateController.js
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

class UpdateController {
  // GET /api/v1/updates/latest.yml
  async getLatestVersion(req, res) {
    try {
      const latestFile = path.join(__dirname, '../../public/updates/latest.yml');
      
      if (fs.existsSync(latestFile)) {
        const content = fs.readFileSync(latestFile, 'utf8');
        res.set('Content-Type', 'text/yaml');
        res.send(content);
      } else {
        res.status(404).json({ error: 'No updates available' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error checking updates' });
    }
  }

  // GET /api/v1/updates/releases/:filename
  async downloadRelease(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../../public/updates/releases/', filename);
      
      if (fs.existsSync(filePath)) {
        res.download(filePath);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error downloading file' });
    }
  }

  // POST /api/v1/updates/upload (Para subir nuevas versiones)
  async uploadNewVersion(req, res) {
    try {
      const { version, file } = req.body;
      
      // Generar SHA512
      const sha512 = crypto.createHash('sha512').update(file).digest('base64');
      
      // Crear latest.yml
      const latestYml = `version: ${version}
files:
  - url: UdemyAprendeYa-Setup-${version}.exe
    sha512: ${sha512}
    size: ${file.length}
path: UdemyAprendeYa-Setup-${version}.exe
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'`;

      // Guardar archivos
      fs.writeFileSync(path.join(__dirname, '../../public/updates/latest.yml'), latestYml);
      fs.writeFileSync(path.join(__dirname, '../../public/updates/releases/', `UdemyAprendeYa-Setup-${version}.exe`), file);
      
      res.json({ success: true, message: 'Version uploaded successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error uploading version' });
    }
  }
}

module.exports = new UpdateController();
```

### Rutas (Express.js):
```javascript
// routes/updates.js
const express = require('express');
const router = express.Router();
const UpdateController = require('../controllers/UpdateController');

router.get('/latest.yml', UpdateController.getLatestVersion);
router.get('/releases/:filename', UpdateController.downloadRelease);
router.post('/upload', UpdateController.uploadNewVersion);

module.exports = router;
```

## 🔐 Firma Digital

### ¿Tiene firma digital tu EXE?

**Verificar:**
- Click derecho en el .exe → Propiedades → Firmas digitales
- Si no hay pestaña "Firmas digitales" = **NO tiene firma**

### Obtener Certificado de Firma:

**Opciones:**
1. **DigiCert** (~$300-500/año)
2. **Comodo/Sectigo** (~$200-400/año)
3. **GlobalSign** (~$250-450/año)

**Configuración con certificado:**
```json
{
  "win": {
    "certificateFile": "path/to/certificate.p12",
    "certificatePassword": "your-password",
    "signingAlgorithm": "sha256",
    "verifyUpdateCodeSignature": true
  }
}
```

## 📊 Comparación de Tamaños

| Método | Tamaño Típico | Incluye Runtime |
|--------|---------------|-----------------|
| **Electron-builder** | 80-120MB | ✅ Todo incluido |
| **Tu método VS** | 0.5-2MB | ❌ Requiere instalación separada |
| **Electron Forge** | 85-130MB | ✅ Todo incluido |
| **Tauri** | 10-20MB | ✅ Usa WebView del sistema |

## 🚀 Recomendaciones

### Para Producción:
1. **Usar GitHub Releases** (más fácil)
2. **Obtener certificado de firma** (profesional)
3. **Configurar auto-updates** (mejor UX)
4. **Optimizar tamaño** (configuraciones que agregué)

### Para Desarrollo:
1. **Usar servidor propio** (más control)
2. **Testing extensivo** (diferentes versiones Windows)
3. **Backup en múltiples lugares** (redundancia)

## 🔧 Comandos Útiles

```bash
# Generar instalador optimizado
npm run dist:win

# Publicar a GitHub
npm run publish:win

# Solo empaquetar (sin instalador)
npm run pack:win

# Limpiar y rebuild
npm run clean && npm run dist:win
```

El tamaño de 88MB es **completamente normal** para Electron. Si necesitas algo más ligero, considera **Tauri** o **Neutralinojs**, pero perderás algunas funcionalidades.