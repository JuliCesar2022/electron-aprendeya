# Navegadores Empaquetados

Esta carpeta contiene navegadores distribuidos junto con la aplicación para que los usuarios no necesiten instalarlos por separado.

## Estructura

```
bundled-browsers/
├── README.md (este archivo)
├── brave/
│   ├── brave.exe (Windows)
│   ├── brave (Linux)
│   ├── locales/ (archivos de idioma)
│   ├── swiftshader/ (renderización de software)
│   └── [otros archivos de Brave]
└── download-scripts/
    ├── download-brave-windows.bat
    └── download-brave-linux.sh
```

## Cómo Incluir Brave Preinstalado

### Opción 1: Download Automático (Recomendado)

Ejecuta los scripts de descarga para obtener la versión más reciente:

**Windows:**
```bash
cd bundled-browsers/download-scripts
./download-brave-windows.bat
```

**Linux:**
```bash
cd bundled-browsers/download-scripts
./download-brave-linux.sh
```

### Opción 2: Copia Manual

1. **Descargar Brave Browser:**
   - Ir a: https://brave.com/download/
   - Descargar la versión para tu plataforma

2. **Instalar temporalmente en otra ubicación:**
   - Windows: Usar instalador y encontrar archivos en `C:\Program Files\BraveSoftware\Brave-Browser\Application\`
   - Linux: Extraer el paquete .deb/.rpm

3. **Copiar archivos a esta carpeta:**
   - Crear carpeta `brave/`
   - Copiar TODOS los archivos del directorio de instalación de Brave
   - Asegurar que `brave.exe` (Windows) o `brave` (Linux) esté en la raíz de `brave/`

## Verificación

Para verificar que Brave está correctamente empaquetado:

1. Ejecutar la aplicación
2. Buscar en los logs el mensaje: `✅ Brave encontrado (📦 EMPAQUETADO)`
3. Si ves `✅ Brave encontrado (💻 SISTEMA)`, significa que está usando la instalación del sistema

## Tamaño del Paquete

- **Brave completo**: ~300-400MB
- **Solo ejecutables esenciales**: ~150-200MB

## Distribución

Cuando empaques tu aplicación con electron-builder, asegúrate de incluir la carpeta `bundled-browsers/` en los recursos:

```json
"build": {
  "extraResources": [
    "bundled-browsers/**"
  ]
}
```

## Notas Importantes

- ⚠️ El tamaño de tu aplicación aumentará considerablemente
- ✅ Los usuarios no necesitarán instalar Brave por separado
- ✅ Tendrás control total sobre la versión de Brave utilizada
- ✅ Funcionará offline sin dependencias externas