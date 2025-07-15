@echo off
echo ====================================
echo    Udemy AprendeYa - Build Script
echo ====================================
echo.

echo 📦 Instalando dependencias...
call npm install

echo.
echo 🔧 Construyendo instalador para Windows...
call npm run dist:win

echo.
echo ✅ Build completado!
echo Los archivos del instalador están en la carpeta 'dist'
echo.

pause