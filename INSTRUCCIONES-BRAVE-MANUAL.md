# 🔧 Instrucciones Simples - Incluir Brave en Tu Aplicación

## ⚡ MÉTODO FÁCIL - Archivo .ZIP (Recomendado)

**1. Comprimir Brave en .zip:**
   - Encontrar la carpeta de Brave (ver ubicaciones abajo)
   - Seleccionar TODOS los archivos dentro
   - Crear archivo .zip (Ej: `brave-browser.zip`)

**2. Colocar .zip:**
   - Poner el archivo .zip en: `bundled-browsers/`
   - ¡Eso es todo! La aplicación lo extraerá automáticamente

## 📍 Dónde Poner Brave (Método Alternativo)

Si prefieres copiar archivos sueltos:

```
📂 tu-proyecto/
└── 📂 bundled-browsers/
    └── 📂 brave/          ← AQUÍ pega todos los archivos
        ├── brave.exe      ← Archivo principal (Windows)
        ├── brave          ← Archivo principal (Linux)
        ├── 📂 locales/
        ├── 📂 swiftshader/
        └── [...otros archivos]
```

## 🔍 Dónde Encontrar Brave en Tu Sistema

### Windows:
```
C:\Program Files\BraveSoftware\Brave-Browser\Application\
```

### Linux:
```
/opt/brave.com/brave/
```

## 📋 Pasos Exactos

### Para Windows:
1. **Descargar Brave**: https://brave.com/download/ (si no lo tienes)
2. **Instalar Brave** normalmente
3. **Ir a**: `C:\Program Files\BraveSoftware\Brave-Browser\Application\`
4. **Seleccionar TODO** dentro de esa carpeta (Ctrl+A)
5. **Copiar** (Ctrl+C)
6. **Ir a tu proyecto**: `bundled-browsers/brave/`
7. **Pegar** (Ctrl+V)

### Para Linux:
1. **Instalar Brave**:
   ```bash
   sudo apt update
   sudo apt install brave-browser
   ```
2. **Copiar archivos**:
   ```bash
   cp -r /opt/brave.com/brave/* bundled-browsers/brave/
   chmod +x bundled-browsers/brave/brave
   ```

## ✅ Verificación

Después de copiar, deberías tener:

```
bundled-browsers/brave/
├── brave.exe (Windows) o brave (Linux)  ← MUY IMPORTANTE
├── chrome_100_percent.pak
├── chrome_200_percent.pak  
├── resources.pak
├── locales/
├── swiftshader/
└── [muchos otros archivos...]
```

## 🎯 Archivo Más Importante

**El archivo MÁS CRÍTICO** es:
- Windows: `brave.exe` 
- Linux: `brave` (sin extensión)

Si ese archivo existe en `bundled-browsers/brave/`, la aplicación lo detectará automáticamente.

## 🧪 Probar que Funciona

1. **Ejecutar tu aplicación**: `npm start`
2. **Buscar en logs**: `✅ Brave encontrado (📦 EMPAQUETADO)`
3. **Si ves**: `🎉 Usando Brave distribuido con la aplicación` = ¡ÉXITO!

## 📦 Construir la App Final

Una vez que tengas Brave copiado:

```bash
npm run build:win    # Para Windows
npm run build:linux  # Para Linux
```

## 🎉 ¡Listo!

Tu aplicación ahora incluirá Brave y tus usuarios no necesitarán instalarlo por separado.

---

**💡 Tip**: Si quieres ahorrar espacio, solo necesitas los archivos esenciales, pero es más fácil copiar todo para estar seguro.