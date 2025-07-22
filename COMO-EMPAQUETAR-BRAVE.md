# 📦 Cómo Empaquetar Brave con Tu Aplicación

## 🎯 Objetivo
Incluir Brave Browser dentro de tu aplicación para que tus usuarios no tengan que instalarlo por separado.

## ⚡ Método Rápido (Recomendado)

### Windows
```bash
cd bundled-browsers/download-scripts
download-brave-windows.bat
```

### Linux
```bash
cd bundled-browsers/download-scripts
chmod +x download-brave-linux.sh
./download-brave-linux.sh
```

## 📋 Verificación

Después de ejecutar el script, verifica que tienes:

```
bundled-browsers/
└── brave/
    ├── brave.exe (Windows) o brave (Linux)
    ├── locales/
    ├── swiftshader/
    └── [otros archivos de Brave]
```

## 🏗️ Construir la Aplicación

```bash
npm run build:win    # Para Windows
npm run build:linux  # Para Linux
```

## ✅ Confirmación

Cuando ejecutes tu aplicación empaquetada, deberías ver en los logs:

```
✅ Brave encontrado (📦 EMPAQUETADO): [ruta]
🎉 Usando Brave distribuido con la aplicación
```

## 📏 Consideraciones de Tamaño

- **Sin Brave empaquetado**: ~50-100MB
- **Con Brave empaquetado**: ~350-450MB

## 🤔 ¿Vale la Pena?

**✅ Ventajas:**
- Usuarios no necesitan instalar Brave
- Control total sobre la versión
- Funciona en cualquier sistema
- Configuración de Widevine garantizada

**❌ Desventajas:**
- Aplicación más grande
- Más tiempo de descarga inicial
- Actualizaciones de Brave requieren nueva build

## 🆘 Problemas Comunes

**Script falla en Windows:**
```
Solución manual:
1. Descargar Brave desde: https://brave.com/download/
2. Instalar temporalmente
3. Copiar archivos desde: C:\Program Files\BraveSoftware\Brave-Browser\Application\
4. Pegar en: bundled-browsers\brave\
5. Desinstalar Brave del sistema si no lo necesitas
```

**Script falla en Linux:**
```bash
# Método alternativo
sudo apt update
sudo apt install brave-browser
cp -r /opt/brave.com/brave/* bundled-browsers/brave/
chmod +x bundled-browsers/brave/brave
sudo apt remove brave-browser  # Opcional
```

## 🎉 Resultado Final

Tus usuarios podrán usar todas las funciones de Brave (Widevine, kiosko, etc.) sin instalar nada adicional.