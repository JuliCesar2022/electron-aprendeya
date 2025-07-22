@echo off
echo 🚀 Construyendo aplicación Udemy AprendeYa...
echo.

echo 📦 Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias
    pause
    exit /b 1
)

echo 🔨 Construyendo ejecutable para Windows...
call npm run build:win
if %errorlevel% neq 0 (
    echo ❌ Error en el build
    pause
    exit /b 1
)

echo ✅ Build completado exitosamente!
echo 📁 Los archivos generados están en la carpeta 'dist'
echo.
echo Archivos generados:
dir /b dist\*.exe 2>nul
dir /b dist\*.msi 2>nul
echo.
pause