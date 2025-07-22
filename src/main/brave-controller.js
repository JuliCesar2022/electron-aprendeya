const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

class BraveController {
    constructor() {
        this.braveProcess = null;
        this.isActive = false;
        this.persistentProfilePath = null;
        this.extensionPath = null;
        this.targetCourseUrl = null; // URL del curso para modo kiosko
    }

    // Obtener ruta de Widevine CDM basada en la instalación de Brave
    getWidevinePath(bravePath) {
        try {
            // Obtener directorio de Brave desde la ruta del ejecutable
            const braveDir = path.dirname(bravePath);
            
            if (process.platform === 'win32') {
                // Windows paths
                const possiblePaths = [
                    path.join(braveDir, 'widevine_cdm', '_platform_specific', 'win_x64', 'widevinecdm.dll'),
                    path.join(braveDir, 'WidevineCdm', '_platform_specific', 'win_x64', 'widevinecdm.dll'),
                    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\widevine_cdm\\_platform_specific\\win_x64\\widevinecdm.dll',
                    'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\widevine_cdm\\_platform_specific\\win_x64\\widevinecdm.dll'
                ];
                
                for (const widePath of possiblePaths) {
                    if (fs.existsSync(widePath)) {
                        console.log('✅ Widevine CDM encontrado:', widePath);
                        return widePath;
                    }
                }
                
                // Fallback path para Windows
                console.log('⚠️ Usando path por defecto de Widevine para Windows');
                return 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\widevine_cdm\\_platform_specific\\win_x64\\widevinecdm.dll';
            } else {
                // Linux/WSL paths
                const possiblePaths = [
                    path.join(braveDir, 'widevine_cdm', '_platform_specific', 'linux_x64', 'libwidevinecdm.so'),
                    path.join(braveDir, 'WidevineCdm', '_platform_specific', 'linux_x64', 'libwidevinecdm.so'),
                    '/opt/google/chrome/WidevineCdm/_platform_specific/linux_x64/libwidevinecdm.so',
                    '/usr/lib/chromium-browser/libwidevinecdm.so'
                ];
                
                for (const widePath of possiblePaths) {
                    if (fs.existsSync(widePath)) {
                        console.log('✅ Widevine CDM encontrado:', widePath);
                        return widePath;
                    }
                }
                
                // Fallback path para Linux
                console.log('⚠️ Usando path por defecto de Widevine para Linux');
                return '/opt/google/chrome/WidevineCdm/_platform_specific/linux_x64/libwidevinecdm.so';
            }
        } catch (error) {
            console.error('❌ Error detectando Widevine:', error);
            return null;
        }
    }

    // Encontrar Brave Browser (incluyendo versión empaquetada)
    async findBrave() {
        const paths = [
            // ✅ PRIMERA PRIORIDAD: Brave empaquetado con la aplicación
            path.join(__dirname, '../../bundled-browsers/brave/brave/brave/brave.exe'), // Windows
            path.join(__dirname, '../../bundled-browsers/brave/brave'), // Linux
            path.join(process.resourcesPath, 'bundled-browsers/brave/brave.exe'), // Empaquetado Windows
            path.join(process.resourcesPath, 'bundled-browsers/brave/brave'), // Empaquetado Linux
            
            // Rutas de instalaciones normales del sistema (como fallback)
            'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            process.env.LOCALAPPDATA + '\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            // WSL paths
            '/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
            '/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe',
            '/mnt/c/Users/' + (process.env.USER || 'usuario') + '/AppData/Local/BraveSoftware/Brave-Browser/Application/brave.exe'
        ];

        console.log('🔍 Buscando Brave Browser...');
        
        // Mostrar información sobre Brave empaquetado
        this.showEmbeddedBraveInfo();
        
        // Verificar si ya existe Brave extraído o necesita extracción
        if (!this.isBraveEmbedded()) {
            console.log('📦 Buscando Brave extraído o archivo .7z...');
            
            // Primero verificar si ya está extraído
            const existingExtracted = this.findExistingExtracted();
            if (existingExtracted) {
                console.log('✅ Brave ya está extraído, usando:', existingExtracted);
                return existingExtracted;
            }
            
            // Si no está extraído, buscar archivo .7z
            const sevenZipPath = this.findBrave7z();
            
            if (sevenZipPath) {
                try {
                    console.log('🚀 Extrayendo Brave automáticamente desde .7z...');
                    const extractedBrave = await this.extractBrave7z(sevenZipPath);
                    
                    if (extractedBrave) {
                        console.log('✅ Brave extraído y listo para usar:', extractedBrave);
                        return extractedBrave;
                    }
                } catch (error) {
                    console.error('❌ Error extrayendo .7z de Brave:', error.message);
                    console.log('⚠️ Continuando con búsqueda normal...');
                }
            }
        }
        
        for (const bravePath of paths) {
            try {
                console.log('  - Verificando:', bravePath);
                if (fs.existsSync(bravePath)) {
                    // Determinar si es versión empaquetada o del sistema
                    const isBundled = bravePath.includes('bundled-browsers') || bravePath.includes('resourcesPath');
                    const braveType = isBundled ? '📦 EMPAQUETADO' : '💻 SISTEMA';
                    
                    console.log(`✅ Brave encontrado (${braveType}):`, bravePath);
                    
                    if (isBundled) {
                        console.log('🎉 Usando Brave distribuido con la aplicación');
                    } else {
                        console.log('ℹ️ Usando Brave instalado en el sistema');
                    }
                    
                    return bravePath;
                }
            } catch (error) {
                continue;
            }
        }
        
        console.warn('❌ Brave no encontrado, intentando con Chrome...');
        // Fallback a Chrome si Brave no está disponible
        const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
            '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
        ];
        
        for (const chromePath of chromePaths) {
            try {
                if (fs.existsSync(chromePath)) {
                    console.log('✅ Chrome encontrado como fallback:', chromePath);
                    return chromePath;
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Ni Brave ni Chrome encontrados en el sistema');
    }

    // Buscar Brave ya extraído
    findExistingExtracted() {
        const possibleDirs = [
            path.join(__dirname, '../../bundled-browsers/brave/brave-extracted/'),
            path.join(__dirname, '../../bundled-browsers/brave-extracted/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/brave/brave-extracted/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/brave-extracted/')
        ];

        for (const dir of possibleDirs) {
            try {
                if (!fs.existsSync(dir)) continue;
                
                // Buscar el ejecutable en el directorio extraído
                const braveExecutable = this.findBraveExecutableInDirSync(dir);
                if (braveExecutable) {
                    console.log('✅ Brave extraído encontrado:', braveExecutable);
                    return braveExecutable;
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }

    // Versión síncrona de findBraveExecutableInDir para búsquedas rápidas
    findBraveExecutableInDirSync(dir) {
        try {
            if (!fs.existsSync(dir)) return null;
            
            const files = fs.readdirSync(dir, { withFileTypes: true });
            
            // Buscar directamente el ejecutable
            for (const file of files) {
                if (file.isFile()) {
                    const fileName = file.name.toLowerCase();
                    if ((process.platform === 'win32' && fileName === 'brave.exe') ||
                        (process.platform !== 'win32' && fileName === 'brave')) {
                        return path.join(dir, file.name);
                    }
                }
            }
            
            // Buscar en subdirectorios (estructura anidada) - solo un nivel
            for (const file of files) {
                if (file.isDirectory()) {
                    const subDir = path.join(dir, file.name);
                    const found = this.findBraveExecutableInDirSync(subDir);
                    if (found) return found;
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    // Detectar archivos .7z de Brave en la carpeta
    findBrave7z() {
        const possibleDirs = [
            path.join(__dirname, '../../bundled-browsers/brave/'),
            path.join(__dirname, '../../bundled-browsers/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/brave/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/')
        ];

        for (const dir of possibleDirs) {
            try {
                if (!fs.existsSync(dir)) continue;
                
                const files = fs.readdirSync(dir);
                const sevenZipFiles = files.filter(file => 
                    file.toLowerCase().includes('brave') && 
                    file.toLowerCase().endsWith('.7z')
                );
                
                if (sevenZipFiles.length > 0) {
                    const sevenZipPath = path.join(dir, sevenZipFiles[0]);
                    console.log('📦 Archivo .7z de Brave encontrado:', sevenZipPath);
                    return sevenZipPath;
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }

    // Extraer Brave desde archivo .7z
    async extractBrave7z(sevenZipPath) {
        console.log('📦 Extrayendo Brave desde .7z...');
        
        const extractDir = path.dirname(sevenZipPath);
        const braveDir = path.join(extractDir, 'brave-extracted');
        
        try {
            // Crear directorio de destino si no existe
            if (!fs.existsSync(braveDir)) {
                fs.mkdirSync(braveDir, { recursive: true });
            }

            // Usar diferentes métodos de extracción según el sistema
            if (process.platform === 'win32') {
                // Intentar usar 7z.exe incluido o del sistema en Windows
                const possible7zPaths = [
                    'C:\\Program Files\\7-Zip\\7z.exe',
                    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
                    '7z' // Si está en PATH
                ];
                
                let command = null;
                for (const sevenZipExe of possible7zPaths) {
                    try {
                        await execAsync(`"${sevenZipExe}" > nul 2>&1`);
                        command = `"${sevenZipExe}" x "${sevenZipPath}" -o"${braveDir}" -y`;
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!command) {
                    throw new Error('7z.exe no encontrado. Instala 7-Zip desde https://www.7-zip.org/');
                }
                
                console.log('🔧 Extrayendo con comando:', command);
                await execAsync(command);
            } else {
                // Usar 7z en Linux (requiere p7zip-full)
                const command = `7z x "${sevenZipPath}" -o"${braveDir}" -y`;
                console.log('🔧 Extrayendo con comando:', command);
                
                try {
                    await execAsync(command);
                } catch (error) {
                    if (error.message.includes('7z: command not found')) {
                        throw new Error('7z no encontrado. Instala con: sudo apt install p7zip-full');
                    }
                    throw error;
                }
            }

            console.log('✅ Brave extraído exitosamente desde .7z');
            
            // Buscar el ejecutable en la estructura extraída
            const braveExecutable = await this.findBraveExecutableInDir(braveDir);
            
            if (braveExecutable) {
                console.log('✅ Ejecutable de Brave encontrado:', braveExecutable);
                
                // Hacer ejecutable en Linux
                if (process.platform !== 'win32') {
                    try {
                        await execAsync(`chmod +x "${braveExecutable}"`);
                        console.log('✅ Permisos de ejecución establecidos');
                    } catch (chmodError) {
                        console.warn('⚠️ No se pudieron establecer permisos:', chmodError.message);
                    }
                }
                
                return braveExecutable;
            } else {
                throw new Error('No se encontró el ejecutable de Brave después de la extracción');
            }
            
        } catch (error) {
            console.error('❌ Error extrayendo Brave desde .7z:', error.message);
            
            // Sugerir soluciones según el error
            if (error.message.includes('7z') || error.message.includes('7-Zip')) {
                console.error('💡 Sugerencia: Instala 7-Zip:');
                if (process.platform === 'win32') {
                    console.error('   Windows: https://www.7-zip.org/');
                } else {
                    console.error('   Linux: sudo apt install p7zip-full');
                }
            }
            
            throw error;
        }
    }

    // Buscar ejecutable de Brave en un directorio
    async findBraveExecutableInDir(dir) {
        try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            
            // Buscar directamente el ejecutable
            for (const file of files) {
                if (file.isFile()) {
                    const fileName = file.name.toLowerCase();
                    if ((process.platform === 'win32' && fileName === 'brave.exe') ||
                        (process.platform !== 'win32' && fileName === 'brave')) {
                        return path.join(dir, file.name);
                    }
                }
            }
            
            // Buscar en subdirectorios (estructura anidada)
            for (const file of files) {
                if (file.isDirectory()) {
                    const subDir = path.join(dir, file.name);
                    const found = await this.findBraveExecutableInDir(subDir);
                    if (found) return found;
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error buscando ejecutable:', error.message);
            return null;
        }
    }

    // Verificar si Brave está empaquetado
    isBraveEmbedded() {
        const embedPaths = [
            path.join(__dirname, '../../bundled-browsers/brave/brave.exe'),
            path.join(__dirname, '../../bundled-browsers/brave/brave'),
            path.join(process.resourcesPath, 'bundled-browsers/brave/brave.exe'),
            path.join(process.resourcesPath, 'bundled-browsers/brave/brave')
        ];

        return embedPaths.some(p => {
            try {
                return fs.existsSync(p);
            } catch (e) {
                return false;
            }
        });
    }

    // Mostrar mensaje informativo sobre Brave empaquetado
    showEmbeddedBraveInfo() {
        if (this.isBraveEmbedded()) {
            console.log('📦 =====================================');
            console.log('🎉 BRAVE EMPAQUETADO DETECTADO');
            console.log('📦 =====================================');
            console.log('✅ No es necesario instalar Brave por separado');
            console.log('✅ La aplicación incluye su propia versión');
            console.log('📦 =====================================');
        } else {
            // Verificar si hay un .7z
            const has7z = this.findBrave7z() !== null;
            
            if (has7z) {
                console.log('📦 =====================================');
                console.log('🔄 ARCHIVO .7Z DE BRAVE DETECTADO');
                console.log('📦 =====================================');
                console.log('✅ Se extraerá automáticamente en la primera ejecución');
                console.log('⏳ Procesando archivo .7z...');
                console.log('📦 =====================================');
            } else {
                console.log('⚠️ =====================================');
                console.log('📥 BRAVE NO EMPAQUETADO');
                console.log('⚠️ =====================================');
                console.log('💡 Para incluir Brave en la aplicación:');
                console.log('   📖 Ver: INSTRUCCIONES-BRAVE-MANUAL.md');
                console.log('   📂 Copiar archivos a: bundled-browsers/brave/');
                console.log('   📦 O colocar .7z en: bundled-browsers/');
                console.log('⚠️ Buscando Brave del sistema como fallback...');
                console.log('⚠️ =====================================');
            }
        }
    }

    // Crear o obtener perfil persistente protegido
    createPersistentProfile() {
        try {
            const os = require('os');
            
            // Crear perfil en una ubicación segura pero persistente
            const appDataPath = process.env.APPDATA || 
                               process.env.LOCALAPPDATA || 
                               path.join(os.homedir(), '.config');
            
            const profilePath = path.join(appDataPath, 'Udemigo', 'BraveProfile');
            
            // Crear directorio si no existe
            if (!fs.existsSync(profilePath)) {
                fs.mkdirSync(profilePath, { recursive: true });
                console.log('✅ Perfil persistente creado:', profilePath);
                
                // Crear archivo de configuración inicial
                this.setupProfileSecurity(profilePath);
            } else {
                console.log('✅ Usando perfil persistente existente:', profilePath);
            }
            
            this.persistentProfilePath = profilePath;
            return profilePath;
            
        } catch (error) {
            console.error('❌ Error creando perfil persistente:', error);
            
            // Fallback a perfil temporal si falla
            const os = require('os');
            const fallbackPath = path.join(os.tmpdir(), 'udemigo-brave-fallback-' + Date.now());
            fs.mkdirSync(fallbackPath, { recursive: true });
            this.persistentProfilePath = fallbackPath;
            
            console.log('⚠️ Usando perfil temporal como fallback:', fallbackPath);
            return fallbackPath;
        }
    }

    // Configurar seguridad del perfil
    setupProfileSecurity(profilePath) {
        try {
            // Crear preferences básicas del perfil
            const prefsPath = path.join(profilePath, 'Default', 'Preferences');
            const defaultPath = path.dirname(prefsPath);
            
            if (!fs.existsSync(defaultPath)) {
                fs.mkdirSync(defaultPath, { recursive: true });
            }

            const preferences = {
                "profile": {
                    "name": "Udemigo Learning Profile",
                    "is_supervised": false,
                    "content_settings": {
                        "exceptions": {
                            "plugins": {
                                "https://www.udemy.com,*": {
                                    "setting": 1
                                }
                            }
                        }
                    }
                },
                "browser": {
                    "clear_data_on_exit": true, // Limpiar datos al cerrar EXCEPTO configuraciones de plugins
                    "clear_plugins_data_on_exit": false, // Mantener configuración de plugins
                },
                "plugins": {
                    "always_authorize": true,
                    "plugins_list": [
                        {
                            "enabled": true,
                            "name": "Widevine Content Decryption Module"
                        }
                    ]
                },
                "security": {
                    "disable_password_manager": true,
                    "disable_autofill": true,
                    "disable_bookmark_sync": true
                },
                "privacy": {
                    "clear_on_exit": {
                        "cookies": true,
                        "cache": true, 
                        "browsing_history": true,
                        "download_history": true,
                        "form_data": true,
                        "passwords": true,
                        "site_settings": false // Mantener configuraciones de sitios (incluyendo plugins)
                    }
                }
            };

            fs.writeFileSync(prefsPath, JSON.stringify(preferences, null, 2));
            console.log('🔒 Configuración de seguridad del perfil establecida');
            
        } catch (error) {
            console.error('❌ Error configurando seguridad del perfil:', error);
        }
    }

    // Verificar si es la primera vez usando el perfil
    isFirstTimeProfile(profilePath) {
        const prefsPath = path.join(profilePath, 'Default', 'Preferences');
        const localStatePath = path.join(profilePath, 'Local State');
        
        // Si no existen archivos de configuración básicos, es primera vez
        return !fs.existsSync(prefsPath) && !fs.existsSync(localStatePath);
    }

    // Mostrar información sobre configuración de Widevine
    showWidevineInfo(isFirstTime) {
        if (isFirstTime) {
            console.log('📢 ==========================================');
            console.log('🔐 PRIMERA VEZ - CONFIGURACIÓN DE WIDEVINE');
            console.log('📢 ==========================================');
            console.log('📝 En Brave, cuando reproduzca el primer video:');
            console.log('   1️⃣ Aparecerá un mensaje sobre contenido protegido');
            console.log('   2️⃣ Haga clic en "Instalar y Habilitar" Widevine');
            console.log('   3️⃣ ¡Eso es todo! Se recordará para futuras sesiones');
            console.log('🎯 Esto solo sucede UNA VEZ - después será automático');
            console.log('📢 ==========================================');
        } else {
            console.log('✅ Perfil existente - Widevine ya debería estar configurado');
        }
    }

    // Crear página de carga
    async createLoadingPage(cookies, profilePath) {
        const loadingHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Udemigo - Cargando Curso</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: white;
        }
        
        .loading-container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
        }
        
        .logo {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .subtitle {
            font-size: 1.2em;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        
        .progress-container {
            margin: 30px 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 15px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            border-radius: 4px;
            transition: width 0.3s ease;
            width: 0%;
        }
        
        .progress-text {
            font-size: 1.1em;
            margin-bottom: 10px;
        }
        
        .cookie-counter {
            font-size: 1.3em;
            font-weight: bold;
            color: #4CAF50;
        }
        
        .status-message {
            font-size: 1em;
            margin-top: 20px;
            opacity: 0.8;
            min-height: 20px;
        }
        
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .success-icon {
            font-size: 3em;
            color: #4CAF50;
            margin-bottom: 15px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="loading-container">
        <div class="logo">📚 Udemigo</div>
        <div class="subtitle">Cargando curso</div>
        
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-text">Preparando curso...</div>
        </div>
        
        <div class="spinner" id="spinner"></div>
        <div class="success-icon" id="successIcon">✅</div>
        <div class="status-message" id="statusMessage">Iniciando...</div>
        <span id="currentCount" style="display: none;"></span>
    </div>
    
    <script>
        let currentCount = 0;
        const totalCount = ${cookies.length};
        let transferComplete = false;
        
        function updateProgress(count, message) {
            currentCount = count;
            const percentage = Math.round((count / totalCount) * 100);
            
            document.getElementById('currentCount').textContent = count;
            document.getElementById('progressFill').style.width = percentage + '%';
            document.getElementById('statusMessage').textContent = message;
            
            console.log('🔄 Progreso:', count, 'de', totalCount, '-', message);
        }
        
        function completeTransfer() {
            if (transferComplete) return;
            transferComplete = true;
            
            console.log('✅ Transferencia completada');
            
            document.getElementById('progressFill').style.width = '100%';
            document.getElementById('currentCount').textContent = totalCount;
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('successIcon').style.display = 'block';
            document.getElementById('statusMessage').textContent = '¡Sesión transferida exitosamente!';
            
            // Countdown y redirección
            let countdown = 3;
            const countdownInterval = setInterval(() => {
                document.getElementById('statusMessage').textContent = 
                    'Redirigiendo a Udemy en ' + countdown + ' segundos...';
                countdown--;
                
                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    console.log('🔄 Redirigiendo a Udemy...');
                    window.location.href = 'https://www.udemy.com';
                }
            }, 1000);
        }
        
        // Simular progreso inicial
        setTimeout(() => updateProgress(0, 'Extensión cargada, iniciando transferencia...'), 500);
        
        // Escuchar mensajes de la extensión
        window.addEventListener('message', function(event) {
            if (event.data.type === 'COOKIE_PROGRESS') {
                updateProgress(event.data.count, event.data.message);
            } else if (event.data.type === 'TRANSFER_COMPLETE') {
                completeTransfer();
            }
        });
        
        // Timeout de seguridad (si no se completa en 15 segundos)
        setTimeout(() => {
            if (!transferComplete) {
                console.log('⏰ Timeout alcanzado, completando transferencia...');
                completeTransfer();
            }
        }, 8000);
    </script>
</body>
</html>`;

        const loadingPath = path.join(profilePath, 'loading.html');
        fs.writeFileSync(loadingPath, loadingHtml);
        console.log('📄 Página de carga creada:', loadingPath);
        return loadingPath;
    }

    // Crear extensión para transferir cookies
    async createCookieExtension(cookies, profilePath, loadingPath) {
        console.log('🔧 Creando extensión para transferir', cookies.length, 'cookies...');
        
        const extensionDir = path.join(profilePath, 'cookie-extension');
        if (!fs.existsSync(extensionDir)) {
            fs.mkdirSync(extensionDir, { recursive: true });
        }

        // Crear manifest.json
        const manifest = {
            "manifest_version": 3,
            "name": "Udemigo Cookie Transfer",
            "version": "1.0",
            "description": "Transferir cookies de Electron a Brave/Chrome",
            "permissions": [
                "cookies",
                "storage",
                "activeTab",
                "tabs"
            ],
            "host_permissions": [
                "*://*.udemy.com/*",
                "*://udemy.com/*"
            ],
            "content_scripts": [{
                "matches": [
                    "*://*.udemy.com/*",
                    "*://udemy.com/*"
                ],
                "js": ["content.js"],
                "run_at": "document_start"
            }],
            "background": {
                "service_worker": "background.js"
            }
        };

        fs.writeFileSync(
            path.join(extensionDir, 'manifest.json'), 
            JSON.stringify(manifest, null, 2)
        );

        // Crear background.js (service worker)
        const backgroundScript = `
console.log('🍪 Udemigo Cookie Extension - Background iniciado');

// Datos de cookies desde Electron
const cookiesData = ${JSON.stringify(cookies)};

// Flag para evitar ejecución múltiple
let cookiesAlreadySet = false;
let isSettingCookies = false;

// Función para notificar progreso a la página de carga
function notifyProgress(count, message) {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
            if (tab.url && tab.url.includes('loading.html')) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'COOKIE_PROGRESS',
                    count: count,
                    message: message
                }, function(response) {
                    // Ignorer errores si la página no está lista
                });
            }
        });
    });
    console.log('📡 Progreso enviado:', count, '-', message);
}

// Función para notificar que se completó
function notifyComplete() {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
            if (tab.url && tab.url.includes('loading.html')) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'TRANSFER_COMPLETE'
                }, function(response) {
                    // Ignore errors
                });
            }
        });
    });
    console.log('📡 Transferencia completada notificada');
}

// Función para establecer cookies usando Chrome API
async function setCookies() {
    // Evitar ejecución múltiple
    if (cookiesAlreadySet || isSettingCookies) {
        console.log('⏭️ Cookies ya establecidas o en proceso, omitiendo...');
        return;
    }
    
    isSettingCookies = true;
    console.log('🚀 Estableciendo', cookiesData.length, 'cookies (SOLO UNA VEZ)...');
    
    notifyProgress(0, 'Cargando curso...');
    
    let successCount = 0;
    
    for (let i = 0; i < cookiesData.length; i++) {
        const cookieData = cookiesData[i];
        try {
            const cookieDetails = {
                url: 'https://www.udemy.com',
                name: cookieData.name,
                value: cookieData.value,
                domain: cookieData.domain || '.udemy.com',
                path: cookieData.path || '/',
                secure: true,
                httpOnly: cookieData.httpOnly || false,
                expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
            };

            await chrome.cookies.set(cookieDetails);
            console.log('✅ Cookie establecida:', cookieData.name);
            successCount++;
            
            // Notificar progreso simplificado
            notifyProgress(successCount, 'Cargando curso...');
            
            // Pequeño delay para mostrar el progreso
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error('❌ Error estableciendo cookie', cookieData.name, ':', error);
            notifyProgress(successCount, 'Cargando curso...');
        }
    }
    
    console.log('🎯 FINAL: ' + successCount + ' de ' + cookiesData.length + ' cookies establecidas');
    
    // Marcar como completado
    cookiesAlreadySet = true;
    isSettingCookies = false;
    
    // Guardar estado en storage para persistir entre recargas
    chrome.storage.local.set({
        'udemigo_cookies_set': true,
        'udemigo_cookies_timestamp': Date.now()
    });
    
    // Notificar que terminó
    notifyProgress(successCount, '¡Listo! Abriendo curso...');
    setTimeout(() => {
        notifyComplete();
    }, 1000);
    
    console.log('✅ Transferencia de cookies COMPLETADA - No se ejecutará de nuevo');
}

// Verificar si las cookies ya fueron establecidas
chrome.storage.local.get(['udemigo_cookies_set', 'udemigo_cookies_timestamp'], function(result) {
    const wasSet = result.udemigo_cookies_set;
    const timestamp = result.udemigo_cookies_timestamp || 0;
    const hoursSinceSet = (Date.now() - timestamp) / (1000 * 60 * 60);
    
    if (wasSet && hoursSinceSet < 1) {
        console.log('⏭️ Cookies ya fueron establecidas hace', Math.round(hoursSinceSet * 60), 'minutos');
        cookiesAlreadySet = true;
        // Si ya están establecidas, notificar completado inmediatamente
        setTimeout(() => {
            notifyComplete();
        }, 2000);
    } else {
        console.log('🔄 Procediendo con establecimiento inicial de cookies');
        setTimeout(setCookies, 1000);
    }
});

// Solo establecer cookies en la instalación inicial
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        console.log('📦 Extensión instalada por primera vez');
        setTimeout(setCookies, 1000);
    }
});

// Escuchar mensajes para abrir enlaces externos
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'OPEN_EXTERNAL') {
        console.log('🌐 Abriendo enlace externo:', request.url);
        
        // Usar chrome.tabs.create con una nueva ventana para abrir en navegador por defecto
        chrome.tabs.create({
            url: request.url,
            active: true
        }, function(tab) {
            if (chrome.runtime.lastError) {
                console.error('❌ Error abriendo enlace externo:', chrome.runtime.lastError);
            } else {
                console.log('✅ Enlace externo abierto en nueva pestaña:', tab.id);
            }
            sendResponse({success: true});
        });
        
        return true; // Indica que la respuesta será asíncrona
    }
});
`;

        fs.writeFileSync(path.join(extensionDir, 'background.js'), backgroundScript);

        // Crear content.js con modo kiosko
        const contentScript = `
console.log('🍪 Udemigo Cookie Extension - Content script cargado');

// Verificar si es la página de carga
if (window.location.href.includes('loading.html')) {
    console.log('📄 En página de carga - Configurando listeners de progreso');
    
    // Escuchar mensajes del background script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log('📡 Mensaje recibido:', request);
        
        if (request.type === 'COOKIE_PROGRESS') {
            // Actualizar progreso en la página
            window.postMessage({
                type: 'COOKIE_PROGRESS',
                count: request.count,
                message: request.message
            }, '*');
            sendResponse({received: true});
            
        } else if (request.type === 'TRANSFER_COMPLETE') {
            // Notificar que se completó
            window.postMessage({
                type: 'TRANSFER_COMPLETE'
            }, '*');
            sendResponse({received: true});
        }
    });
    
    console.log('✅ Listeners de progreso configurados');

} else if (window.location.href.includes('udemy.com')) {
    // Solo en páginas de Udemy
    console.log('🌐 En página de Udemy - Modo kiosko activado');
    
    // URL del curso específico (se pasa desde la extensión)
    const targetCourseUrl = '${this.targetCourseUrl || ''}';
    
    // MODO KIOSKO: Bloquear navegación fuera del curso
    function setupKioskMode() {
        console.log('🔒 Configurando modo kiosko para:', targetCourseUrl);
        
        // Función para verificar si una URL es de Udemy
        function isUdemyUrl(url) {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname.includes('udemy.com');
            } catch (e) {
                return false;
            }
        }
        
        // Función para verificar si una URL es válida para el curso actual
        function isValidCourseUrl(url) {
            if (!targetCourseUrl) return true; // Si no hay URL específica, permitir todo
            
            try {
                const targetPath = new URL(targetCourseUrl).pathname;
                const coursePath = targetPath.split('/learn/')[0]; // Obtener ruta base del curso
                
                // Permitir URLs del mismo curso
                return url.includes(coursePath) || 
                       url.includes('/learn/') ||
                       url.includes('/quiz/') ||
                       url.includes('/practice/') ||
                       url.includes('/assignment/');
            } catch (e) {
                console.warn('Error validando URL:', e);
                return false;
            }
        }
        
        // Función para abrir URL externa en navegador por defecto
        function openExternalUrl(url) {
            console.log('🌐 Abriendo enlace externo en navegador por defecto:', url);
            
            // Usar fetch para notificar al background script
            chrome.runtime.sendMessage({
                type: 'OPEN_EXTERNAL',
                url: url
            }, function(response) {
                console.log('📤 Solicitud de enlace externo enviada');
            });
            
            showKioskNotification('Enlace abierto en navegador externo');
        }
        
        // Interceptar todos los clics en enlaces
        document.addEventListener('click', function(e) {
            let target = e.target;
            
            // Buscar el enlace padre si es necesario
            while (target && target.tagName !== 'A') {
                target = target.parentElement;
            }
            
            if (target && target.tagName === 'A') {
                const href = target.href;
                
                if (href) {
                    // Si es un enlace externo (no de Udemy), abrirlo en navegador por defecto
                    if (!isUdemyUrl(href)) {
                        console.log('🌐 Enlace externo detectado:', href);
                        e.preventDefault();
                        e.stopPropagation();
                        openExternalUrl(href);
                        return false;
                    }
                    // Si es de Udemy pero no válido para el curso, bloquearlo
                    else if (!isValidCourseUrl(href)) {
                        console.log('🚫 Bloqueando navegación a otra parte de Udemy:', href);
                        e.preventDefault();
                        e.stopPropagation();
                        showKioskNotification('Solo puedes navegar dentro de este curso');
                        return false;
                    }
                    // Si es válido para el curso, permitir navegación normal
                    else {
                        console.log('✅ Permitiendo navegación dentro del curso:', href);
                    }
                }
            }
        }, true);
        
        // Interceptar window.open
        const originalOpen = window.open;
        window.open = function(url, ...args) {
            if (url) {
                // Si es enlace externo, abrirlo en navegador por defecto
                if (!isUdemyUrl(url)) {
                    console.log('🌐 window.open externo detectado:', url);
                    openExternalUrl(url);
                    return null;
                }
                // Si es de Udemy pero no válido para el curso, bloquearlo
                else if (!isValidCourseUrl(url)) {
                    console.log('🚫 Bloqueando window.open a otra parte de Udemy:', url);
                    showKioskNotification('Solo puedes navegar dentro de este curso');
                    return null;
                }
            }
            return originalOpen.call(this, url, ...args);
        };
        
        // Interceptar window.location
        const originalLocation = window.location;
        Object.defineProperty(window, 'location', {
            get: function() {
                return originalLocation;
            },
            set: function(url) {
                if (url) {
                    // Si es enlace externo, abrirlo en navegador por defecto
                    if (!isUdemyUrl(url)) {
                        console.log('🌐 window.location externo detectado:', url);
                        openExternalUrl(url);
                        return;
                    }
                    // Si es de Udemy pero no válido para el curso, bloquearlo
                    else if (!isValidCourseUrl(url)) {
                        console.log('🚫 Bloqueando window.location a otra parte de Udemy:', url);
                        showKioskNotification('Solo puedes navegar dentro de este curso');
                        return;
                    }
                }
                originalLocation.href = url;
            }
        });
        
        // Interceptar history.pushState y replaceState
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(state, title, url) {
            if (url) {
                // Solo bloquear si es de Udemy pero no válido para el curso
                // Los enlaces externos no usan normalmente history API
                if (isUdemyUrl(url) && !isValidCourseUrl(url)) {
                    console.log('🚫 Bloqueando history.pushState a otra parte de Udemy:', url);
                    showKioskNotification('Solo puedes navegar dentro de este curso');
                    return;
                }
            }
            return originalPushState.call(this, state, title, url);
        };
        
        history.replaceState = function(state, title, url) {
            if (url) {
                // Solo bloquear si es de Udemy pero no válido para el curso
                if (isUdemyUrl(url) && !isValidCourseUrl(url)) {
                    console.log('🚫 Bloqueando history.replaceState a otra parte de Udemy:', url);
                    showKioskNotification('Solo puedes navegar dentro de este curso');
                    return;
                }
            }
            return originalReplaceState.call(this, state, title, url);
        };
        
        console.log('✅ Modo kiosko configurado correctamente');
    }
    
    // Función para mostrar notificaciones de kiosko
    function showKioskNotification(message) {
        // Remover notificación anterior si existe
        const existing = document.getElementById('kiosk-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.id = 'kiosk-notification';
        notification.style.cssText = \`
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff5722;
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease;
        \`;
        
        // Agregar animación CSS
        if (!document.getElementById('kiosk-styles')) {
            const style = document.createElement('style');
            style.id = 'kiosk-styles';
            style.textContent = \`
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-100%); }
                    to { transform: translateX(-50%) translateY(0); }
                }
            \`;
            document.head.appendChild(style);
        }
        
        notification.innerHTML = '🔒 ' + message;
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
    
    // Verificar si ya se ejecutó en esta página
    if (window.udemigoCookiesProcessed) {
        console.log('⏭️ Cookies ya procesadas, configurando solo modo kiosko...');
        setupKioskMode();
    } else {
        // Marcar como procesado inmediatamente
        window.udemigoCookiesProcessed = true;
        
        // Datos de cookies
        const cookiesData = ${JSON.stringify(cookies)};

        // Función para establecer cookies via document.cookie (fallback)
        function setCookiesViaDocument() {
            console.log('📋 Fallback: estableciendo cookies via document.cookie...');
            
            let successCount = 0;
            
            for (const cookie of cookiesData) {
                try {
                    const cookieString = cookie.name + '=' + cookie.value + 
                        '; Domain=' + (cookie.domain || '.udemy.com') +
                        '; Path=' + (cookie.path || '/') +
                        '; Expires=' + new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString() +
                        '; Secure; SameSite=Lax';
                    
                    document.cookie = cookieString;
                    
                    // Verificar si se estableció
                    if (document.cookie.includes(cookie.name + '=')) {
                        console.log('✅ Cookie fallback establecida:', cookie.name);
                        successCount++;
                    } else {
                        console.warn('❌ Cookie fallback NO establecida:', cookie.name);
                    }
                    
                } catch (error) {
                    console.error('Error estableciendo cookie fallback', cookie.name, ':', error);
                }
            }
            
            console.log('🎯 FINAL Fallback: ' + successCount + ' de ' + cookiesData.length + ' establecidas');
            
            // Después de establecer cookies, configurar modo kiosko
            setupKioskMode();
        }

        // Solo ejecutar fallback si es necesario, luego configurar kiosko
        setTimeout(setCookiesViaDocument, 1000);
    }
}
`;

        fs.writeFileSync(path.join(extensionDir, 'content.js'), contentScript);

        console.log('✅ Extensión creada en:', extensionDir);
        this.extensionPath = extensionDir;
        return extensionDir;
    }

    // Lanzar Brave con URL específica (para cursos)
    async launchWithUrl(courseUrl, cookies = null) {
        try {
            const bravePath = await this.findBrave();
            
            // Guardar URL del curso para modo kiosko
            this.targetCourseUrl = courseUrl;
            console.log('🔒 Configurando modo kiosko para curso:', courseUrl);
            
            // Usar perfil persistente protegido
            const profilePath = this.createPersistentProfile();
            
            // Verificar si es primera vez y mostrar información de Widevine
            const isFirstTime = this.isFirstTimeProfile(profilePath);
            this.showWidevineInfo(isFirstTime);

            let startUrl = courseUrl || 'https://www.udemy.com';

            // Si tenemos cookies, crear página de carga y extensión
            if (cookies && cookies.length > 0) {
                const loadingPath = await this.createLoadingPage(cookies, profilePath);
                await this.createCookieExtension(cookies, profilePath, loadingPath);
                
                // Cambiar URL inicial a la página de carga
                startUrl = 'file:///' + loadingPath.replace(/\\/g, '/');
                console.log('📄 Iniciando con página de carga, después irá a:', courseUrl);
                
                // Modificar la página de carga para ir a la URL del curso
                this.updateLoadingPageTarget(loadingPath, courseUrl);
            }

            const args = [
                '--user-data-dir=' + profilePath,
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-features=TranslateUI',
                '--allow-running-insecure-content',
                // Configuración de Widevine CDM - Auto-habilitar sin preguntar
                '--widevine-cdm-path=' + this.getWidevinePath(bravePath),
                '--widevine-cdm-version=4.10.2710.0', // Versión común
                '--enable-widevine-cdm',
                '--enable-plugins',
                '--enable-npapi',
                '--allow-outdated-plugins',
                '--always-authorize-plugins',
                '--disable-plugin-power-saver',
                '--enable-plugin-installation',
                // Configuración para parecer más como una app nativa
                '--app=' + startUrl, // Modo app sin barra de navegación
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                '--disable-plugins-discovery',
                '--hide-scrollbars',
                '--window-size=1200,800',
                '--window-position=100,100',
                // Flags adicionales para modo kiosko
                '--disable-new-tab-first-run',
                '--disable-default-apps',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-translate',
                '--disable-background-mode',
                '--disable-add-to-shelf',
                '--disable-first-run-ui'
            ];

            // Agregar extensión si existe
            if (this.extensionPath) {
                args.push('--load-extension=' + this.extensionPath);
                console.log('🔧 Cargando extensión desde:', this.extensionPath);
            }

            console.log('🔐 Perfil persistente protegido - Widevine se mantiene habilitado');
            console.log('🚀 Lanzando Brave para curso:', courseUrl);

            this.braveProcess = spawn(bravePath, args, {
                detached: false,
                stdio: 'ignore'
            });

            this.braveProcess.on('close', (code) => {
                console.log('Brave cerrado con código:', code);
                this.isActive = false;
                this.braveProcess = null;
                this.cleanup();
            });

            this.braveProcess.on('error', (error) => {
                console.error('Error Brave:', error);
                this.isActive = false;
            });

            this.isActive = true;
            console.log('✅ Brave lanzado para el curso');
            
            if (cookies && cookies.length > 0) {
                console.log('🍪 Transferir', cookies.length, 'cookies y luego abrir curso');
            }

            return true;

        } catch (error) {
            console.error('❌ Error lanzando Brave para curso:', error);
            return false;
        }
    }

    // Actualizar destino de la página de carga
    updateLoadingPageTarget(loadingPath, targetUrl) {
        try {
            let content = fs.readFileSync(loadingPath, 'utf8');
            // Cambiar la URL de destino en el JavaScript
            content = content.replace(
                "window.location.href = 'https://www.udemy.com';",
                `window.location.href = '${targetUrl}';`
            );
            fs.writeFileSync(loadingPath, content);
            console.log('📝 Página de carga actualizada para ir a:', targetUrl);
        } catch (error) {
            console.error('❌ Error actualizando página de carga:', error);
        }
    }

    // Lanzar Brave con extensión (método original)
    async launch(cookies = null) {
        try {
            const bravePath = await this.findBrave();
            
            // Usar perfil persistente protegido
            const profilePath = this.createPersistentProfile();
            
            // Verificar si es primera vez y mostrar información de Widevine
            const isFirstTime = this.isFirstTimeProfile(profilePath);
            this.showWidevineInfo(isFirstTime);

            let startUrl = 'https://www.udemy.com';

            // Si tenemos cookies, crear página de carga y extensión
            if (cookies && cookies.length > 0) {
                const loadingPath = await this.createLoadingPage(cookies, profilePath);
                await this.createCookieExtension(cookies, profilePath, loadingPath);
                
                // Cambiar URL inicial a la página de carga
                startUrl = 'file:///' + loadingPath.replace(/\\/g, '/');
                console.log('📄 Iniciando con página de carga:', startUrl);
            }

            const args = [
                '--user-data-dir=' + profilePath,
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-features=TranslateUI',
                '--allow-running-insecure-content',
                // Configuración de Widevine CDM - Auto-habilitar sin preguntar
                '--widevine-cdm-path=' + this.getWidevinePath(bravePath),
                '--widevine-cdm-version=4.10.2710.0', // Versión común
                '--enable-widevine-cdm',
                '--enable-plugins',
                '--enable-npapi',
                '--allow-outdated-plugins',
                '--always-authorize-plugins',
                '--disable-plugin-power-saver',
                '--enable-plugin-installation',
                // Configuración para parecer más como una app nativa
                '--app=' + startUrl, // Modo app sin barra de navegación
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                '--disable-plugins-discovery',
                '--hide-scrollbars',
                '--window-size=1200,800',
                '--window-position=100,100'
            ];

            // Agregar extensión si existe
            if (this.extensionPath) {
                args.push('--load-extension=' + this.extensionPath);
                console.log('🔧 Cargando extensión desde:', this.extensionPath);
            }

            // NOTA: La URL ya está incluida en --app=startUrl, no agregar de nuevo

            console.log('🔐 Perfil persistente protegido - Widevine se mantiene habilitado');
            console.log('🚀 Lanzando Brave con argumentos:', args);

            this.braveProcess = spawn(bravePath, args, {
                detached: false,
                stdio: 'ignore'
            });

            this.braveProcess.on('close', (code) => {
                console.log('Brave cerrado con código:', code);
                this.isActive = false;
                this.braveProcess = null;
                this.cleanup();
            });

            this.braveProcess.on('error', (error) => {
                console.error('Error Brave:', error);
                this.isActive = false;
            });

            this.isActive = true;
            console.log('✅ Brave lanzado exitosamente');
            
            if (cookies && cookies.length > 0) {
                console.log('🍪 Mostrando página de carga mientras se transfieren', cookies.length, 'cookies');
                console.log('⏱️ Después se redirigirá automáticamente a Udemy');
            }

            return true;

        } catch (error) {
            console.error('❌ Error lanzando Brave:', error);
            return false;
        }
    }

    // Cerrar Brave y limpiar
    async close() {
        if (this.braveProcess && this.isActive) {
            try {
                this.braveProcess.kill();
                this.braveProcess = null;
                this.isActive = false;
                console.log('✅ Brave cerrado');
            } catch (error) {
                console.error('❌ Error cerrando Brave:', error);
            }
        }
        this.cleanup();
        return true;
    }

    // Limpiar datos sensibles pero mantener configuraciones de plugins
    cleanup() {
        try {
            if (this.persistentProfilePath && fs.existsSync(this.persistentProfilePath)) {
                console.log('🧹 Limpiando datos sensibles del perfil persistente...');
                
                // Limpiar solo datos sensibles, mantener configuraciones
                this.cleanSensitiveData(this.persistentProfilePath);
                
                console.log('✅ Datos sensibles limpiados, configuraciones de plugins conservadas');
            }
            
            // Limpiar extensión temporal si existe
            if (this.extensionPath && fs.existsSync(this.extensionPath)) {
                const { exec } = require('child_process');
                if (process.platform === 'win32') {
                    exec(`rmdir /s /q "${this.extensionPath}"`, () => {});
                } else {
                    exec(`rm -rf "${this.extensionPath}"`, () => {});
                }
                console.log('🧹 Extensión temporal limpiada');
            }
        } catch (error) {
            console.warn('⚠️ Error durante limpieza:', error);
        }
    }

    // Limpiar solo datos sensibles del perfil
    cleanSensitiveData(profilePath) {
        try {
            const defaultPath = path.join(profilePath, 'Default');
            if (!fs.existsSync(defaultPath)) return;

            // Archivos a limpiar (datos sensibles)
            const filesToClean = [
                'History',
                'Cookies',
                'Web Data',
                'Login Data',
                'Top Sites',
                'Visited Links',
                'Current Session',
                'Last Session',
                'Current Tabs',
                'Last Tabs'
            ];

            // Directorios a limpiar
            const dirsToClean = [
                'Cache',
                'Code Cache',
                'GPUCache',
                'Session Storage',
                'Local Storage',
                'IndexedDB',
                'Service Worker'
            ];

            // Eliminar archivos sensibles
            filesToClean.forEach(file => {
                const filePath = path.join(defaultPath, file);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`  ✅ Eliminado: ${file}`);
                    } catch (err) {
                        console.log(`  ⚠️ No se pudo eliminar: ${file}`);
                    }
                }
            });

            // Eliminar directorios sensibles
            dirsToClean.forEach(dir => {
                const dirPath = path.join(defaultPath, dir);
                if (fs.existsSync(dirPath)) {
                    try {
                        const { exec } = require('child_process');
                        if (process.platform === 'win32') {
                            exec(`rmdir /s /q "${dirPath}"`, () => {});
                        } else {
                            exec(`rm -rf "${dirPath}"`, () => {});
                        }
                        console.log(`  ✅ Directorio eliminado: ${dir}`);
                    } catch (err) {
                        console.log(`  ⚠️ No se pudo eliminar directorio: ${dir}`);
                    }
                }
            });

            // IMPORTANTE: Mantener 'Preferences' y 'Local State' que contienen configuraciones de plugins
            console.log('🔒 Configuraciones de plugins y Widevine conservadas');
            
        } catch (error) {
            console.error('❌ Error limpiando datos sensibles:', error);
        }
    }

    // Método para resetear completamente el perfil (usar con cuidado)
    resetProfile() {
        try {
            if (this.persistentProfilePath && fs.existsSync(this.persistentProfilePath)) {
                console.log('🔄 Reseteando perfil persistente completamente...');
                
                const { exec } = require('child_process');
                if (process.platform === 'win32') {
                    exec(`rmdir /s /q "${this.persistentProfilePath}"`, () => {
                        console.log('✅ Perfil persistente eliminado completamente');
                    });
                } else {
                    exec(`rm -rf "${this.persistentProfilePath}"`, () => {
                        console.log('✅ Perfil persistente eliminado completamente');
                    });
                }
                
                this.persistentProfilePath = null;
                console.log('⚠️ En el próximo lanzamiento se creará un perfil nuevo');
                return true;
            } else {
                console.log('ℹ️ No hay perfil persistente para resetear');
                return false;
            }
        } catch (error) {
            console.error('❌ Error reseteando perfil:', error);
            return false;
        }
    }

    // Estado
    getStatus() {
        return {
            isActive: this.isActive,
            hasProcess: !!this.braveProcess,
            profilePath: this.persistentProfilePath,
            extensionPath: this.extensionPath
        };
    }
}

module.exports = BraveController;