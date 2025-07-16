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