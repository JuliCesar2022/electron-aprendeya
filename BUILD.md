# 🚀 Build Guide - Udemy AprendeYa

Esta guía te ayudará a generar ejecutables e instaladores de la aplicación Udemy AprendeYa.

## 📋 Requisitos Previos

1. **Node.js** (versión 16 o superior)
2. **npm** (incluido con Node.js)
3. **Git** (opcional, para clonar el repositorio)

## 🛠️ Preparación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Agregar iconos (opcional)
Coloca tus iconos en la carpeta `assets/`:
- `icon.png` (512x512 para Linux)
- `icon.ico` (256x256 para Windows)
- `icon.icns` (512x512 para macOS)

## 🎯 Comandos de Build

### Para Windows (.exe + instalador)
```bash
npm run build:win
```
Genera:
- `UdemyAprendeYa-1.0.0-portable.exe` (ejecutable portable)
- `UdemyAprendeYa Setup 1.0.0.exe` (instalador NSIS)

### Para Linux (.AppImage + .deb)
```bash
npm run build:linux
```

### Para macOS (.dmg)
```bash
npm run build:mac
```

### Build para todas las plataformas
```bash
npm run build
```

### Solo empaquetado (sin instalador)
```bash
npm run pack
```

## 📁 Salida

Los archivos generados se encuentran en la carpeta `dist/`:
```
dist/
├── UdemyAprendeYa-1.0.0-portable.exe    # Ejecutable portable
├── UdemyAprendeYa Setup 1.0.0.exe       # Instalador Windows
├── UdemyAprendeYa-1.0.0.AppImage         # Linux AppImage
├── UdemyAprendeYa_1.0.0_amd64.deb        # Paquete Debian
└── UdemyAprendeYa-1.0.0.dmg              # Instalador macOS
```

## 🚀 Scripts Rápidos

### Windows
Ejecutar `build.bat` para build automático

### Linux/macOS
```bash
./build.sh
```

## 🔧 Configuración Avanzada

Puedes modificar la configuración en `package.json` sección `build`:

- **Iconos**: Cambiar rutas en `win.icon`, `linux.icon`, `mac.icon`
- **Nombre**: Modificar `productName`
- **Versión**: Cambiar `version`
- **Targets**: Agregar/quitar formatos de salida

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
npm install --force
```

### Error: "Icon file not found"
Asegúrate de que los archivos de icono existen en `assets/`

### Error: "Permission denied"
En Linux/macOS:
```bash
chmod +x build.sh
```

## 📦 Distribución

1. **Ejecutable portable**: No requiere instalación
2. **Instalador NSIS**: Instalación completa con shortcuts
3. **AppImage**: Ejecutable autocontenido para Linux
4. **DEB**: Paquete para sistemas Debian/Ubuntu
5. **DMG**: Instalador para macOS

## 🎉 ¡Listo!

Tu aplicación Udemy AprendeYa está lista para distribuir.