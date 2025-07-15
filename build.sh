#!/bin/bash

echo "🚀 Construyendo aplicación Udemy AprendeYa..."
echo

echo "📦 Instalando dependencias..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias"
    exit 1
fi

echo "🔨 Construyendo ejecutable..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error en el build"
    exit 1
fi

echo "✅ Build completado exitosamente!"
echo "📁 Los archivos generados están en la carpeta 'dist'"
echo

echo "Archivos generados:"
ls -la dist/ 2>/dev/null || echo "No se encontraron archivos en dist/"
echo