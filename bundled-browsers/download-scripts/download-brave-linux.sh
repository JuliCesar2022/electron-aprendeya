#!/bin/bash

echo "================================================"
echo "       DESCARGA DE BRAVE PARA LINUX"
echo "================================================"
echo
echo "Este script descargará Brave Browser para incluir"
echo "en la aplicación Udemigo."
echo
read -p "Presiona Enter para continuar o Ctrl+C para cancelar..."

BRAVE_URL="https://laptop-updates.brave.com/latest/linux"
TEMP_DIR="/tmp/brave_download"
BRAVE_DIR="../brave"

echo
echo "📥 Preparando descarga..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo
echo "📥 Descargando Brave Browser..."
echo "URL: $BRAVE_URL"

# Descargar el paquete .deb
curl -L "$BRAVE_URL" -o "$TEMP_DIR/brave-browser.deb"

if [ ! -f "$TEMP_DIR/brave-browser.deb" ]; then
    echo "❌ Error: No se pudo descargar Brave"
    echo
    echo "Alternativa manual:"
    echo "1. Ir a: https://brave.com/download/"
    echo "2. Descargar Brave Browser para Linux"
    echo "3. Instalar temporalmente: sudo dpkg -i brave-browser.deb"
    echo "4. Copiar archivos desde: /opt/brave.com/brave/"
    echo "5. Pegar en: bundled-browsers/brave/"
    echo "6. Desinstalar si no lo necesitas: sudo apt remove brave-browser"
    exit 1
fi

echo
echo "📦 Extrayendo Brave Browser..."
cd "$TEMP_DIR"

# Extraer el paquete .deb
ar x brave-browser.deb
tar -xf data.tar.xz

echo
echo "📂 Copiando archivos..."
rm -rf "$BRAVE_DIR"
mkdir -p "$BRAVE_DIR"

# Copiar archivos de Brave
if [ -d "opt/brave.com/brave" ]; then
    cp -r opt/brave.com/brave/* "$BRAVE_DIR/"
    
    # Hacer el ejecutable ejecutable
    chmod +x "$BRAVE_DIR/brave"
    
    echo
    echo "🧹 Limpiando archivos temporales..."
    rm -rf "$TEMP_DIR"
    
    echo
    echo "✅ ¡Brave Browser empaquetado exitosamente!"
    echo "📍 Ubicación: $BRAVE_DIR/"
    echo
    echo "Para verificar, ejecuta tu aplicación y busca el mensaje:"
    echo '✅ Brave encontrado (📦 EMPAQUETADO)'
    
else
    echo "❌ Error: No se encontraron archivos de Brave en el paquete"
    echo
    echo "INSTRUCCIONES MANUALES:"
    echo "1. sudo wget -qO- https://brave-browser-apt-release.s3.brave.com/brave-core.asc | sudo apt-key add -"
    echo "2. echo 'deb [arch=amd64] https://brave-browser-apt-release.s3.brave.com/ stable main' | sudo tee /etc/apt/sources.list.d/brave-browser-release.list"
    echo "3. sudo apt update && sudo apt install brave-browser"
    echo "4. cp -r /opt/brave.com/brave/* $BRAVE_DIR/"
    echo "5. chmod +x $BRAVE_DIR/brave"
    echo "6. sudo apt remove brave-browser (si no lo necesitas en el sistema)"
    exit 1
fi