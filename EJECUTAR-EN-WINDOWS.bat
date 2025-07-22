@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                    Udemy AprendeYa                        ║
echo ║                 Generador de Instalador                   ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 🚨 IMPORTANTE: Este script debe ejecutarse en WINDOWS, no en WSL
echo.
echo ¿Estás ejecutando esto en Windows? (S/N)
set /p respuesta="> "

if /i "%respuesta%" NEQ "S" (
    echo.
    echo ❌ Por favor ejecuta este script en Windows (PowerShell o CMD)
    echo    NO funciona desde WSL o Linux
    pause
    exit /b 1
)

echo.
echo ✅ Perfecto! Generando instalador para Windows...
echo.

echo 📦 Paso 1: Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias
    pause
    exit /b 1
)

echo.
echo 🔧 Paso 2: Generando instalador .exe...
call npm run dist:win
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Error generando instalador. Intentando empaquetado simple...
    call npm run pack:win
    if %errorlevel% neq 0 (
        echo ❌ Error en empaquetado
        pause
        exit /b 1
    )
    echo.
    echo ✅ Empaquetado completado (sin instalador)
    echo 📁 Ejecutable en: dist\win-unpacked\Udemy AprendeYa.exe
) else (
    echo.
    echo ✅ Instalador generado exitosamente!
    echo 📁 Archivos en carpeta 'dist':
    dir dist\*.exe /b 2>nul
)

echo.
echo 🎉 ¡Build completado!
echo.
echo 📋 Próximos pasos:
echo    1. Revisar carpeta 'dist' para tus archivos
echo    2. Probar el instalador en una máquina limpia
echo    3. Distribuir a usuarios finales
echo.
pause