@echo off
echo ================================================
echo       DESCARGA DE BRAVE PARA WINDOWS
echo ================================================
echo.
echo Este script descargara Brave Browser para incluir
echo en la aplicacion Udemigo.
echo.
echo Presiona cualquier tecla para continuar o Ctrl+C para cancelar...
pause > nul

set BRAVE_URL=https://laptop-updates.brave.com/latest/winx64
set TEMP_DIR=%TEMP%\brave_download
set BRAVE_DIR=..\brave

echo.
echo 📥 Preparando descarga...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

echo.
echo 📥 Descargando Brave Browser...
echo URL: %BRAVE_URL%
curl -L "%BRAVE_URL%" -o "%TEMP_DIR%\BraveBrowserStandaloneSetup.exe"

if not exist "%TEMP_DIR%\BraveBrowserStandaloneSetup.exe" (
    echo ❌ Error: No se pudo descargar Brave
    echo.
    echo Alternativa manual:
    echo 1. Ir a: https://brave.com/download/
    echo 2. Descargar Brave Browser
    echo 3. Instalar temporalmente
    echo 4. Copiar archivos desde: C:\Program Files\BraveSoftware\Brave-Browser\Application\
    echo 5. Pegar en: bundled-browsers\brave\
    pause
    exit /b 1
)

echo.
echo 📦 Extrayendo Brave Browser...
"%TEMP_DIR%\BraveBrowserStandaloneSetup.exe" /S /extract:"%TEMP_DIR%\extracted"

timeout /t 5 > nul

echo.
echo 📂 Copiando archivos...
if exist "%BRAVE_DIR%" rmdir /s /q "%BRAVE_DIR%"
mkdir "%BRAVE_DIR%"

if exist "%TEMP_DIR%\extracted" (
    xcopy "%TEMP_DIR%\extracted\*" "%BRAVE_DIR%\" /E /I /H /Y
) else (
    echo ⚠️ Extraccion automatica fallo. Intentando metodo alternativo...
    echo.
    echo INSTRUCCIONES MANUALES:
    echo 1. Ejecutar: %TEMP_DIR%\BraveBrowserStandaloneSetup.exe
    echo 2. Instalar Brave temporalmente
    echo 3. Copiar archivos desde: C:\Program Files\BraveSoftware\Brave-Browser\Application\
    echo 4. Pegar en: %BRAVE_DIR%\
    echo 5. Desinstalar Brave si no lo necesitas en el sistema
    pause
    exit /b 1
)

echo.
echo 🧹 Limpiando archivos temporales...
rmdir /s /q "%TEMP_DIR%"

echo.
echo ✅ ¡Brave Browser empaquetado exitosamente!
echo 📍 Ubicacion: %BRAVE_DIR%\
echo.
echo Para verificar, ejecuta tu aplicacion y busca el mensaje:
echo "✅ Brave encontrado (📦 EMPAQUETADO)"
echo.
echo Presiona cualquier tecla para salir...
pause > nul