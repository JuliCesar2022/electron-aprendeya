@echo off
echo ====================================
echo    Udemy AprendeYa - Release Scripts
echo ====================================
echo.

:menu
echo Selecciona el tipo de release:
echo [1] Patch (1.0.0 → 1.0.1)
echo [2] Minor (1.0.0 → 1.1.0)
echo [3] Major (1.0.0 → 2.0.0)
echo [4] Solo build (sin publicar)
echo [5] Salir
echo.

set /p choice="Ingresa tu opción (1-5): "

if "%choice%"=="1" goto patch
if "%choice%"=="2" goto minor
if "%choice%"=="3" goto major
if "%choice%"=="4" goto build
if "%choice%"=="5" goto exit
goto menu

:patch
echo 📦 Creando release PATCH...
call npm version patch
if %errorlevel% neq 0 goto error
goto publish

:minor
echo 📦 Creando release MINOR...
call npm version minor
if %errorlevel% neq 0 goto error
goto publish

:major
echo 📦 Creando release MAJOR...
call npm version major
if %errorlevel% neq 0 goto error
goto publish

:build
echo 🔧 Solo generando build...
call npm run dist:win
if %errorlevel% neq 0 goto error
goto success

:publish
echo 🚀 Subiendo cambios a GitHub...
call git push origin main
call git push origin --tags
if %errorlevel% neq 0 goto error

echo 📤 Publicando release...
call npm run publish:win
if %errorlevel% neq 0 goto error

:success
echo.
echo ✅ ¡Proceso completado exitosamente!
echo Los archivos están en la carpeta 'dist'
echo.
goto menu

:error
echo.
echo ❌ Error en el proceso. Revisa los logs arriba.
echo.
goto menu

:exit
echo.
echo 👋 ¡Hasta luego!
pause