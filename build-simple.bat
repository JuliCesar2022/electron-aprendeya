@echo off
echo ====================================
echo    Udemy AprendeYa - Build Simple
echo ====================================
echo.

echo 📦 Instalando dependencias...
call npm install

echo.
echo 🔧 Empaquetando aplicacion (sin instalador)...
call npm run pack:win

echo.
echo ✅ Empaquetado completado!
echo La aplicacion esta en la carpeta 'dist/win-unpacked'
echo Puedes ejecutar directamente "Udemy AprendeYa.exe"
echo.

pause