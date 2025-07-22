const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { exec } = require('child_process');
const { app } = require('electron');
const execAsync = promisify(exec);

class BraveController {
    constructor() {
        this.braveProcess = null;
        this.isActive = false;
        this.persistentProfilePath = null;
        this.extensionPath = null;
        this.targetCourseUrl = null; // URL del curso para modo kiosko
        
        // ✅ RUTA FORZADA - CAMBIAR AQUÍ TU RUTA DE BRAVE
        this.forcedBravePath = null; // Ejemplo: 'C:\\MiCarpeta\\brave.exe' o '/mi/ruta/brave'
        
        // 🔍 SISTEMA DE LOGGING PARA VENTANA DE DEPURACIÓN Y ARCHIVO
        this.debugWindow = null;
        this.debugLogs = [];
        this.maxLogs = 1000; // Limitar logs para evitar memoria excesiva
        
        // 📁 SISTEMA DE LOGGING A ARCHIVO
        this.logFile = null;
        this.logDirectory = null;
        this.maxLogFiles = 5; // Mantener solo los últimos 5 archivos
        this.maxLogSizeMB = 10; // Rotar cuando el archivo supere 10MB
        this.setupFileLogging();
        
        // Auto-detectar tu ruta específica basada en lo que veo en tu proyecto
        // CAMBIAR ESTA RUTA por la tuya exacta:
        this.detectUserBravePath();
    }
    
    // 📁 Configurar logging a archivo
    setupFileLogging() {
        try {
            const os = require('os');
            
            // Determinar directorio de logs según el entorno
            let logsPath;
            
            if (app.isPackaged) {
                // PRODUCCIÓN: Usar carpeta de datos de la aplicación
                const appDataPath = process.env.APPDATA || 
                                   process.env.LOCALAPPDATA || 
                                   path.join(os.homedir(), '.config');
                logsPath = path.join(appDataPath, 'Udemigo', 'logs');
            } else {
                // DESARROLLO: Usar carpeta del proyecto
                logsPath = path.join(__dirname, '../../logs');
            }
            
            // Crear directorio si no existe
            if (!fs.existsSync(logsPath)) {
                fs.mkdirSync(logsPath, { recursive: true });
            }
            
            this.logDirectory = logsPath;
            
            // Crear archivo de log con timestamp
            const now = new Date();
            const dateString = now.toISOString().slice(0, 19).replace(/:/g, '-');
            const logFileName = `brave-debug-${dateString}.txt`;
            this.logFile = path.join(logsPath, logFileName);
            
            // Escribir header inicial
            const headerInfo = [
                '='.repeat(80),
                `UDEMIGO - BRAVE CONTROLLER DEBUG LOG`,
                `Fecha: ${now.toISOString()}`,
                `Versión: ${app.getVersion()}`,
                `Plataforma: ${process.platform} ${process.arch}`,
                `Empaquetado: ${app.isPackaged ? 'SÍ' : 'NO'}`,
                `Directorio de logs: ${logsPath}`,
                `PID: ${process.pid}`,
                '='.repeat(80),
                ''
            ].join('\n');
            
            fs.writeFileSync(this.logFile, headerInfo);
            
            console.log('📁 Sistema de logging a archivo configurado:');
            console.log('  📂 Directorio:', logsPath);
            console.log('  📄 Archivo actual:', logFileName);
            console.log('  📦 Modo:', app.isPackaged ? 'PRODUCCIÓN' : 'DESARROLLO');
            
            // Limpiar archivos antiguos
            this.cleanOldLogFiles();
            
        } catch (error) {
            console.error('❌ Error configurando logging a archivo:', error);
            this.logFile = null;
            this.logDirectory = null;
        }
    }
    
    // 🧹 Limpiar archivos de log antiguos
    cleanOldLogFiles() {
        try {
            if (!this.logDirectory || !fs.existsSync(this.logDirectory)) return;
            
            const files = fs.readdirSync(this.logDirectory)
                .filter(file => file.startsWith('brave-debug-') && file.endsWith('.txt'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logDirectory, file),
                    stats: fs.statSync(path.join(this.logDirectory, file))
                }))
                .sort((a, b) => b.stats.mtime - a.stats.mtime); // Más recientes primero
            
            // Eliminar archivos que excedan el límite
            const filesToDelete = files.slice(this.maxLogFiles);
            
            for (const file of filesToDelete) {
                try {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ Log antiguo eliminado: ${file.name}`);
                } catch (error) {
                    console.warn(`⚠️ No se pudo eliminar log: ${file.name}`, error.message);
                }
            }
            
            if (files.length > 0) {
                console.log(`📊 Archivos de log: ${files.length - filesToDelete.length} mantenidos, ${filesToDelete.length} eliminados`);
            }
            
        } catch (error) {
            console.error('❌ Error limpiando logs antiguos:', error);
        }
    }
    
    // 💾 Escribir log a archivo
    writeToLogFile(level, message) {
        try {
            if (!this.logFile) return;
            
            // Verificar tamaño del archivo para rotación
            if (fs.existsSync(this.logFile)) {
                const stats = fs.statSync(this.logFile);
                const sizeMB = stats.size / (1024 * 1024);
                
                if (sizeMB > this.maxLogSizeMB) {
                    // Rotar archivo
                    this.rotateLogFile();
                }
            }
            
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${message}\n`;
            
            fs.appendFileSync(this.logFile, logEntry);
            
        } catch (error) {
            // No usar console.error aquí para evitar loops
            console.warn('❌ Error escribiendo a archivo de log:', error.message);
        }
    }
    
    // 🔄 Rotar archivo de log cuando se vuelve muy grande
    rotateLogFile() {
        try {
            const now = new Date();
            const dateString = now.toISOString().slice(0, 19).replace(/:/g, '-');
            const newLogFileName = `brave-debug-${dateString}.txt`;
            const newLogFile = path.join(this.logDirectory, newLogFileName);
            
            // Escribir mensaje de rotación en el archivo actual
            const rotationMsg = `\n${'='.repeat(50)}\nARCHIVO ROTADO - Continuando en: ${newLogFileName}\n${'='.repeat(50)}\n`;
            fs.appendFileSync(this.logFile, rotationMsg);
            
            // Cambiar a nuevo archivo
            this.logFile = newLogFile;
            
            // Escribir header en nuevo archivo
            const headerInfo = [
                '='.repeat(80),
                `UDEMIGO - BRAVE CONTROLLER DEBUG LOG (CONTINUACIÓN)`,
                `Fecha: ${now.toISOString()}`,
                `Archivo rotado automáticamente por tamaño`,
                '='.repeat(80),
                ''
            ].join('\n');
            
            fs.writeFileSync(this.logFile, headerInfo);
            
            console.log('🔄 Archivo de log rotado:', path.basename(newLogFile));
            
            // Limpiar archivos antiguos después de rotar
            this.cleanOldLogFiles();
            
        } catch (error) {
            console.error('❌ Error rotando archivo de log:', error);
        }
    }
    
    // 📝 Logger personalizado que envía a ventana de depuración Y ARCHIVO
    debugLog(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const fullMessage = args.length > 0 ? `${message} ${args.join(' ')}` : message;
        
        // Log normal a consola
        switch(level) {
            case 'error':
                console.error(message, ...args);
                break;
            case 'warn':
                console.warn(message, ...args);
                break;
            case 'info':
            default:
                console.log(message, ...args);
                break;
        }
        
        // ✅ ESCRIBIR A ARCHIVO TXT (SIEMPRE, incluso en producción)
        this.writeToLogFile(level, fullMessage);
        
        // Agregar a logs de depuración en memoria
        const logEntry = {
            timestamp,
            level,
            message: fullMessage
        };
        
        this.debugLogs.push(logEntry);
        
        // Mantener solo los últimos N logs en memoria
        if (this.debugLogs.length > this.maxLogs) {
            this.debugLogs = this.debugLogs.slice(-this.maxLogs);
        }
        
        // Enviar a ventana de depuración si existe
        if (this.debugWindow && !this.debugWindow.isDestroyed()) {
            this.debugWindow.webContents.send('brave-debug-log', logEntry);
        }
    }
    
    // 🪟 Crear ventana de depuración
    createDebugWindow() {
        if (this.debugWindow && !this.debugWindow.isDestroyed()) {
            this.debugWindow.focus();
            return this.debugWindow;
        }
        
        const { BrowserWindow } = require('electron');
        
        this.debugWindow = new BrowserWindow({
            width: 1000,
            height: 700,
            title: 'Brave Controller - Debug Console',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, '../preload/preload.js')
            },
            icon: path.join(__dirname, '../../assets', 'icon.png'),
            show: false
        });
        
        // Crear HTML de depuración
        const debugHtml = this.createDebugHTML();
        this.debugWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(debugHtml)}`);
        
        this.debugWindow.once('ready-to-show', () => {
            this.debugWindow.show();
            
            // Enviar logs existentes
            this.debugLogs.forEach(log => {
                this.debugWindow.webContents.send('brave-debug-log', log);
            });
        });
        
        this.debugWindow.on('closed', () => {
            this.debugWindow = null;
        });
        
        return this.debugWindow;
    }
    
    // 📄 HTML para ventana de depuración
    createDebugHTML() {
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brave Controller Debug</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Consolas', 'Monaco', monospace;
            background: #1a1a1a;
            color: #ffffff;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #333;
        }
        
        .title {
            font-size: 18px;
            font-weight: bold;
        }
        
        .controls {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 15px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            transition: all 0.2s;
        }
        
        .btn-clear {
            background: #ff6b6b;
            color: white;
        }
        
        .btn-clear:hover {
            background: #ff5252;
        }
        
        .btn-save {
            background: #51cf66;
            color: white;
        }
        
        .btn-save:hover {
            background: #40c057;
        }
        
        .logs-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            background: #222;
        }
        
        .log-entry {
            margin: 2px 0;
            padding: 5px 8px;
            border-radius: 3px;
            border-left: 4px solid;
            font-size: 13px;
            line-height: 1.4;
            word-wrap: break-word;
        }
        
        .log-info {
            background: rgba(33, 150, 243, 0.1);
            border-left-color: #2196F3;
        }
        
        .log-warn {
            background: rgba(255, 152, 0, 0.1);
            border-left-color: #FF9800;
        }
        
        .log-error {
            background: rgba(244, 67, 54, 0.1);
            border-left-color: #F44336;
        }
        
        .timestamp {
            color: #888;
            font-size: 11px;
            margin-right: 8px;
        }
        
        .level {
            font-weight: bold;
            margin-right: 8px;
            text-transform: uppercase;
            font-size: 11px;
        }
        
        .level-info {
            color: #2196F3;
        }
        
        .level-warn {
            color: #FF9800;
        }
        
        .level-error {
            color: #F44336;
        }
        
        .message {
            flex: 1;
        }
        
        .footer {
            background: #333;
            padding: 10px 20px;
            font-size: 12px;
            color: #888;
            border-top: 1px solid #444;
        }
        
        .status {
            display: flex;
            justify-content: space-between;
        }
        
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #333;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #666;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #888;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">🔍 Brave Controller Debug Console</div>
        <div class="controls">
            <button class="btn btn-clear" onclick="clearLogs()">🗑️ Limpiar</button>
            <button class="btn btn-save" onclick="saveLogs()">💾 Guardar</button>
            <button class="btn btn-save" onclick="openLogsFolder()">📁 Ver Logs</button>
        </div>
    </div>
    
    <div class="logs-container" id="logsContainer">
        <div class="log-entry log-info">
            <span class="timestamp">${new Date().toISOString()}</span>
            <span class="level level-info">INFO</span>
            <span class="message">🔍 Debug Console iniciada - Esperando logs de Brave Controller...</span>
        </div>
    </div>
    
    <div class="footer">
        <div class="status">
            <span>Logs en pantalla: <span id="logCount">0</span></span>
            <span>Estado: <span id="status">Esperando...</span></span>
            <span>Archivo: <span id="logFileInfo">Cargando...</span></span>
            <span>Última actualización: <span id="lastUpdate">-</span></span>
        </div>
    </div>
    
    <script>
        let logCount = 0;
        const logsContainer = document.getElementById('logsContainer');
        const logCountElement = document.getElementById('logCount');
        const statusElement = document.getElementById('status');
        const lastUpdateElement = document.getElementById('lastUpdate');
        
        // Recibir logs desde el proceso principal
        window.electronAPI?.ipcRenderer?.on('brave-debug-log', (event, logData) => {
            addLogEntry(logData);
        });
        
        function addLogEntry(logData) {
            const logEntry = document.createElement('div');
            logEntry.className = \`log-entry log-\${logData.level}\`;
            
            const timestamp = new Date(logData.timestamp).toLocaleTimeString();
            
            logEntry.innerHTML = \`
                <span class="timestamp">\${timestamp}</span>
                <span class="level level-\${logData.level}">\${logData.level.toUpperCase()}</span>
                <span class="message">\${escapeHtml(logData.message)}</span>
            \`;
            
            logsContainer.appendChild(logEntry);
            
            // Auto scroll al final
            logsContainer.scrollTop = logsContainer.scrollHeight;
            
            // Actualizar contadores
            logCount++;
            logCountElement.textContent = logCount;
            statusElement.textContent = 'Activo';
            lastUpdateElement.textContent = timestamp;
            
            // Limitar logs en DOM (mantener solo los últimos 500)
            const maxLogsInDOM = 500;
            while (logsContainer.children.length > maxLogsInDOM) {
                logsContainer.removeChild(logsContainer.firstChild);
            }
        }
        
        function clearLogs() {
            logsContainer.innerHTML = '';
            logCount = 0;
            logCountElement.textContent = '0';
            statusElement.textContent = 'Limpiado';
            lastUpdateElement.textContent = new Date().toLocaleTimeString();
            
            addLogEntry({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: '🧹 Logs limpiados por el usuario'
            });
        }
        
        function saveLogs() {
            const logs = Array.from(logsContainer.children).map(entry => entry.textContent).join('\\n');
            const blob = new Blob([logs], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = \`brave-debug-\${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            statusElement.textContent = 'Guardado';
            setTimeout(() => {
                statusElement.textContent = 'Activo';
            }, 2000);
        }
        
        function openLogsFolder() {
            window.electronAPI?.invoke('open-brave-logs-directory').then(result => {
                if (result.success) {
                    statusElement.textContent = 'Carpeta abierta';
                    setTimeout(() => {
                        statusElement.textContent = 'Activo';
                    }, 2000);
                } else {
                    alert('Error abriendo carpeta: ' + result.error);
                }
            });
        }
        
        function updateLogFileInfo() {
            window.electronAPI?.invoke('get-brave-logging-info').then(result => {
                if (result.success) {
                    const data = result.data;
                    const fileSize = data.currentLogSize ? data.currentLogSize + ' MB' : '0 MB';
                    const fileName = data.logFile ? data.logFile.split(/[\\\\/]/).pop() : 'No disponible';
                    document.getElementById('logFileInfo').textContent = fileName + ' (' + fileSize + ')';
                } else {
                    document.getElementById('logFileInfo').textContent = 'Error obteniendo info';
                }
            });
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Actualizar información del archivo cada 5 segundos
        setInterval(updateLogFileInfo, 5000);
        
        // Cargar información inicial
        setTimeout(updateLogFileInfo, 1000);
    </script>
</body>
</html>`;
    }
    
    // Detectar la ruta específica del usuario - SOLO BRAVE EMPAQUETADO
    detectUserBravePath() {
        // ✅ SOLO USAR BRAVE EMPAQUETADO - NUNCA SISTEMA NI CHROME
        // 🎯 PRIORIZAR process.resourcesPath (fuera del .asar) para producción
        const resourcesPath = process.resourcesPath || __dirname + '/../../';
        
        const onlyPackagedBravePaths = [
            // 🏆 PRIMERA PRIORIDAD: process.resourcesPath (FUERA del .asar)
            path.join(resourcesPath, 'bundled-browsers/brave/brave/brave/brave.exe'), // Windows empaquetado
            path.join(resourcesPath, 'bundled-browsers/brave/brave'), // Linux empaquetado
            path.join(resourcesPath, 'bundled-browsers/brave/brave-extracted/brave/brave.exe'), // Windows extraído
            path.join(resourcesPath, 'bundled-browsers/brave/brave-extracted/brave'), // Linux extraído
            
            // 📁 FALLBACK: Rutas de desarrollo (si no está empaquetado)
            path.join(__dirname, '../../bundled-browsers/brave/brave/brave/brave.exe'), // Windows desarrollo
            path.join(__dirname, '../../bundled-browsers/brave/brave'), // Linux desarrollo  
            path.join(__dirname, '../../bundled-browsers/brave/brave-extracted/brave/brave.exe'), // Windows desarrollo extraído
            path.join(__dirname, '../../bundled-browsers/brave/brave-extracted/brave'), // Linux desarrollo extraído
        ];
        
        this.debugLog('info', '🎯 MODO PRODUCCIÓN: Solo buscando Brave empaquetado (' + onlyPackagedBravePaths.length + ' rutas)');
        
        for (let i = 0; i < onlyPackagedBravePaths.length; i++) {
            const userPath = onlyPackagedBravePaths[i];
            this.debugLog('info', `🔍 [${i + 1}/${onlyPackagedBravePaths.length}] Verificando: ${userPath}`);
            
            if (fs.existsSync(userPath)) {
                this.forcedBravePath = userPath;
                const stats = fs.statSync(userPath);
                this.debugLog('info', '🎯 ✅ BRAVE EMPAQUETADO ENCONTRADO:', userPath);
                this.debugLog('info', '  📏 Tamaño:', Math.round(stats.size / 1024 / 1024), 'MB');
                this.debugLog('info', '  📅 Modificado:', stats.mtime.toISOString());
                return;
            } else {
                this.debugLog('warn', `  ❌ No existe: ${userPath}`);
            }
        }
        
        this.debugLog('warn', '⚠️ NO SE ENCONTRÓ Brave empaquetado en ninguna de las rutas especificadas');
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
        this.debugLog('info', '🔍 ==================== INICIANDO BÚSQUEDA DE BRAVE ====================');
        this.debugLog('info', '🖥️ Plataforma detectada:', process.platform);
        this.debugLog('info', '📁 Directorio actual:', __dirname);
        this.debugLog('info', '📦 Empaquetado:', app.isPackaged ? 'SÍ' : 'NO');
        this.debugLog('info', '🔧 Resources path:', process.resourcesPath || 'NO DEFINIDO');
        this.debugLog('info', '👤 Usuario actual:', process.env.USER || process.env.USERNAME || 'DESCONOCIDO');
        this.debugLog('info', '🏠 LocalAppData:', process.env.LOCALAPPDATA || 'NO DEFINIDO');
        
        // ✅ PASO 0: VERIFICAR RUTA FORZADA PRIMERO
        if (this.forcedBravePath) {
            this.debugLog('info', '🎯 ================= USANDO RUTA FORZADA =================');
            this.debugLog('info', '📍 Ruta forzada configurada:', this.forcedBravePath);
            
            try {
                if (fs.existsSync(this.forcedBravePath)) {
                    // Verificar detalles del ejecutable
                    const stats = fs.statSync(this.forcedBravePath);
                    const isFile = stats.isFile();
                    const fileSize = stats.size;
                    
                    console.log('✅ BRAVE ENCONTRADO EN RUTA FORZADA:');
                    console.log('  📄 Es archivo:', isFile ? 'SÍ' : 'NO');
                    console.log('  📏 Tamaño:', Math.round(fileSize / 1024 / 1024), 'MB');
                    console.log('  📅 Modificado:', stats.mtime.toISOString());
                    console.log('  📁 Directorio:', path.dirname(this.forcedBravePath));
                    
                    console.log('🎯 USANDO RUTA FORZADA - SALTANDO BÚSQUEDA AUTOMÁTICA');
                    return this.forcedBravePath;
                } else {
                    console.warn('⚠️ RUTA FORZADA NO EXISTE:', this.forcedBravePath);
                    console.log('📝 Continuando con búsqueda automática...');
                }
            } catch (error) {
                console.error('❌ ERROR VERIFICANDO RUTA FORZADA:', error.message);
                console.log('📝 Continuando con búsqueda automática...');
            }
        } else {
            this.debugLog('info', 'ℹ️ No hay ruta forzada configurada, usando SOLO búsqueda de Brave empaquetado');
        }
        
        // ✅ SOLO ESTAS RUTAS ESPECÍFICAS - NUNCA CHROME NI SISTEMA
        // 🎯 PRIORIZAR process.resourcesPath (fuera del .asar) para producción
        const resourcesPath = process.resourcesPath || __dirname + '/../../';
        
        const paths = [
            // 🏆 PRIMERA PRIORIDAD: process.resourcesPath (FUERA del .asar)
            path.join(resourcesPath, 'bundled-browsers/brave/brave/brave/brave.exe'), // Windows empaquetado
            path.join(resourcesPath, 'bundled-browsers/brave/brave'), // Linux empaquetado
            path.join(resourcesPath, 'bundled-browsers/brave/brave-extracted/brave/brave.exe'), // Windows extraído
            path.join(resourcesPath, 'bundled-browsers/brave/brave-extracted/brave'), // Linux extraído
            
            // 📁 FALLBACK: Rutas de desarrollo (si no está empaquetado)
            path.join(__dirname, '../../bundled-browsers/brave/brave/brave/brave.exe'), // Windows desarrollo
            path.join(__dirname, '../../bundled-browsers/brave/brave'), // Linux desarrollo
        ];

        this.debugLog('info', '🎯 MODO PRODUCCIÓN: Solo verificando las ' + paths.length + ' rutas específicas de Brave empaquetado:');
        paths.forEach((p, i) => this.debugLog('info', `  ${i + 1}. ${p}`));
        
        // Mostrar información sobre Brave empaquetado
        this.showEmbeddedBraveInfo();
        
        // Verificar si ya existe Brave extraído o necesita extracción
        console.log('🔍 PASO 1: Verificando si Brave está empaquetado...');
        const isEmbedded = this.isBraveEmbedded();
        console.log('📦 Resultado isBraveEmbedded():', isEmbedded ? 'SÍ EMPAQUETADO' : 'NO EMPAQUETADO');
        
        if (!isEmbedded) {
            console.log('📦 PASO 2: Buscando Brave extraído o archivo .7z...');
            
            // Primero verificar si ya está extraído
            console.log('🔍 PASO 2a: Verificando si ya existe Brave extraído...');
            const existingExtracted = this.findExistingExtracted();
            if (existingExtracted) {
                console.log('✅ ÉXITO: Brave ya está extraído, usando:', existingExtracted);
                console.log('🎯 TERMINANDO BÚSQUEDA - Brave encontrado extraído');
                return existingExtracted;
            }
            console.log('❌ No se encontró Brave extraído previamente');
            
            // Si no está extraído, buscar archivo .7z
            console.log('🔍 PASO 2b: Buscando archivo .7z para extraer...');
            const sevenZipPath = this.findBrave7z();
            
            if (sevenZipPath) {
                console.log('📦 ARCHIVO .7Z ENCONTRADO:', sevenZipPath);
                try {
                    console.log('🚀 INICIANDO EXTRACCIÓN automática desde .7z...');
                    const extractedBrave = await this.extractBrave7z(sevenZipPath);
                    
                    if (extractedBrave) {
                        console.log('✅ ÉXITO: Brave extraído y listo para usar:', extractedBrave);
                        console.log('🎯 TERMINANDO BÚSQUEDA - Brave extraído exitosamente');
                        return extractedBrave;
                    } else {
                        console.error('❌ FALLO: extractBrave7z() devolvió null/undefined');
                    }
                } catch (error) {
                    console.error('❌ EXCEPCIÓN durante extracción de .7z:', error.message);
                    console.error('📊 Stack trace:', error.stack);
                    console.log('⚠️ CONTINUANDO con búsqueda de instalaciones del sistema...');
                }
            } else {
                console.log('❌ NO SE ENCONTRÓ archivo .7z de Brave');
            }
        } else {
            console.log('✅ Brave está empaquetado, saltando extracción');
        }
        
        console.log('🔍 PASO 3: Verificando rutas de instalación directa...');
        for (let i = 0; i < paths.length; i++) {
            const bravePath = paths[i];
            try {
                console.log(`🔎 [${i + 1}/${paths.length}] Verificando: ${bravePath}`);
                
                // Verificar si el directorio padre existe
                const parentDir = path.dirname(bravePath);
                const parentExists = fs.existsSync(parentDir);
                console.log(`  📁 Directorio padre existe: ${parentExists ? 'SÍ' : 'NO'} (${parentDir})`);
                
                if (fs.existsSync(bravePath)) {
                    // Verificar si es ejecutable
                    const stats = fs.statSync(bravePath);
                    const isFile = stats.isFile();
                    const fileSize = stats.size;
                    
                    console.log(`  ✅ ARCHIVO ENCONTRADO:`);
                    console.log(`    📄 Es archivo: ${isFile ? 'SÍ' : 'NO'}`);
                    console.log(`    📏 Tamaño: ${Math.round(fileSize / 1024 / 1024)} MB`);
                    console.log(`    📅 Modificado: ${stats.mtime.toISOString()}`);
                    
                    // Determinar si es versión empaquetada o del sistema
                    const isBundled = bravePath.includes('bundled-browsers') || bravePath.includes('resourcesPath');
                    const braveType = isBundled ? '📦 EMPAQUETADO' : '💻 SISTEMA';
                    
                    console.log(`✅ BRAVE ENCONTRADO (${braveType}): ${bravePath}`);
                    
                    if (isBundled) {
                        console.log('🎉 Usando Brave distribuido con la aplicación');
                    } else {
                        console.log('ℹ️ Usando Brave instalado en el sistema');
                    }
                    
                    console.log('🎯 TERMINANDO BÚSQUEDA - Brave encontrado en instalación');
                    return bravePath;
                } else {
                    console.log(`  ❌ No existe: ${bravePath}`);
                }
            } catch (error) {
                console.log(`  ❌ Error verificando ${bravePath}:`, error.message);
                continue;
            }
        }
        
        console.error('❌❌❌ BRAVE EMPAQUETADO NO ENCONTRADO');
        console.error('🚫 MODO PRODUCCIÓN: NO SE BUSCARÁ Chrome ni instalaciones del sistema');
        console.log('💡 SOLUCIONES PARA PRODUCCIÓN:');
        console.log('  1. Colocar Brave en: bundled-browsers/brave/brave/brave/brave.exe (Windows)');
        console.log('  2. O colocar Brave en: bundled-browsers/brave/brave (Linux)');
        console.log('  3. O extraer Brave de archivo .7z en bundled-browsers/');
        console.log('  4. Verificar que el archivo tenga permisos de ejecución');
        console.log('');
        console.log('📁 Rutas verificadas sin éxito:');
        paths.forEach((p, i) => console.log(`  ❌ ${i + 1}. ${p}`));
        
        throw new Error('🚫 BRAVE EMPAQUETADO REQUERIDO - No se usarán navegadores del sistema en producción');
    }

    // Buscar Brave ya extraído
    findExistingExtracted() {
        console.log('🔍 ===== BUSCANDO BRAVE YA EXTRAÍDO =====');
        const possibleDirs = [
            path.join(__dirname, '../../bundled-browsers/brave/brave-extracted/'),
            path.join(__dirname, '../../bundled-browsers/brave-extracted/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/brave/brave-extracted/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/brave-extracted/')
        ];

        console.log('📋 Directorios de Brave extraído a verificar (' + possibleDirs.length + ' total):');
        possibleDirs.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

        for (let i = 0; i < possibleDirs.length; i++) {
            const dir = possibleDirs[i];
            console.log(`🔎 [${i + 1}/${possibleDirs.length}] Verificando directorio: ${dir}`);
            
            try {
                if (!fs.existsSync(dir)) {
                    console.log('  ❌ Directorio no existe');
                    continue;
                }
                
                console.log('  ✅ Directorio existe, listando contenido...');
                
                // Listar contenido del directorio para diagnóstico
                const dirContents = fs.readdirSync(dir);
                console.log('  📁 Contenido (' + dirContents.length + ' items):');
                dirContents.forEach((item, idx) => {
                    const itemPath = path.join(dir, item);
                    const itemStats = fs.statSync(itemPath);
                    const type = itemStats.isDirectory() ? '📁' : '📄';
                    const size = itemStats.isFile() ? ` (${Math.round(itemStats.size / 1024)} KB)` : '';
                    console.log(`    ${idx + 1}. ${type} ${item}${size}`);
                });
                
                // Buscar el ejecutable en el directorio extraído
                console.log('  🔍 Buscando ejecutable en este directorio...');
                const braveExecutable = this.findBraveExecutableInDirSync(dir);
                if (braveExecutable) {
                    console.log('  ✅ EJECUTABLE ENCONTRADO:', braveExecutable);
                    
                    // Verificar detalles del ejecutable
                    const execStats = fs.statSync(braveExecutable);
                    console.log('  📊 Info del ejecutable:');
                    console.log('    📏 Tamaño:', Math.round(execStats.size / 1024 / 1024), 'MB');
                    console.log('    📅 Modificado:', execStats.mtime.toISOString());
                    
                    console.log('🎯 BRAVE EXTRAÍDO ENCONTRADO - Usando versión existente');
                    return braveExecutable;
                } else {
                    console.log('  ❌ No se encontró ejecutable en este directorio');
                }
            } catch (error) {
                console.log(`  ❌ Error accediendo directorio: ${error.message}`);
                continue;
            }
        }
        
        console.log('❌ No se encontró Brave extraído en ningún directorio');
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
        console.log('🔍 ===== BUSCANDO ARCHIVO .7Z DE BRAVE =====');
        const possibleDirs = [
            path.join(__dirname, '../../bundled-browsers/brave/'),
            path.join(__dirname, '../../bundled-browsers/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/brave/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/')
        ];

        console.log('📋 Directorios donde buscar .7z (' + possibleDirs.length + ' total):');
        possibleDirs.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

        for (let i = 0; i < possibleDirs.length; i++) {
            const dir = possibleDirs[i];
            console.log(`🔎 [${i + 1}/${possibleDirs.length}] Verificando directorio: ${dir}`);
            
            try {
                if (!fs.existsSync(dir)) {
                    console.log('  ❌ Directorio no existe');
                    continue;
                }
                
                console.log('  ✅ Directorio existe, listando archivos...');
                const files = fs.readdirSync(dir);
                console.log('  📁 Archivos en directorio (' + files.length + ' total):');
                
                // Mostrar todos los archivos para diagnóstico
                files.forEach((file, idx) => {
                    const filePath = path.join(dir, file);
                    const fileStats = fs.statSync(filePath);
                    const type = fileStats.isDirectory() ? '📁' : '📄';
                    const size = fileStats.isFile() ? ` (${Math.round(fileStats.size / 1024 / 1024)} MB)` : '';
                    const extension = path.extname(file).toLowerCase();
                    const is7z = extension === '.7z' ? ' ⭐ 7Z' : '';
                    console.log(`    ${idx + 1}. ${type} ${file}${size}${is7z}`);
                });
                
                console.log('  🔍 Filtrando archivos .7z que contengan "brave"...');
                const sevenZipFiles = files.filter(file => {
                    const isSevenZip = file.toLowerCase().endsWith('.7z');
                    const containsBrave = file.toLowerCase().includes('brave');
                    console.log(`    📄 ${file}: 7z=${isSevenZip ? '✅' : '❌'}, brave=${containsBrave ? '✅' : '❌'}`);
                    return isSevenZip && containsBrave;
                });
                
                console.log('  📦 Archivos .7z encontrados:', sevenZipFiles.length);
                
                if (sevenZipFiles.length > 0) {
                    const sevenZipPath = path.join(dir, sevenZipFiles[0]);
                    
                    // Verificar detalles del archivo .7z
                    const sevenZipStats = fs.statSync(sevenZipPath);
                    console.log('  ✅ ARCHIVO .7Z ENCONTRADO:', sevenZipFiles[0]);
                    console.log('  📊 Info del archivo:');
                    console.log('    📏 Tamaño:', Math.round(sevenZipStats.size / 1024 / 1024), 'MB');
                    console.log('    📅 Modificado:', sevenZipStats.mtime.toISOString());
                    
                    console.log('🎯 ARCHIVO .7Z ENCONTRADO:', sevenZipPath);
                    return sevenZipPath;
                } else {
                    console.log('  ❌ No se encontraron archivos .7z que contengan "brave"');
                }
            } catch (error) {
                console.log(`  ❌ Error accediendo directorio: ${error.message}`);
                continue;
            }
        }
        
        console.log('❌ No se encontró archivo .7z de Brave en ningún directorio');
        return null;
    }

    // Extraer Brave desde archivo .7z
    async extractBrave7z(sevenZipPath) {
        console.log('📦 ==================== INICIANDO EXTRACCIÓN 7Z ====================');
        console.log('📁 Archivo .7z:', sevenZipPath);
        console.log('🖥️ Plataforma:', process.platform);
        
        // Verificar que el archivo .7z existe y obtener información
        if (!fs.existsSync(sevenZipPath)) {
            throw new Error(`Archivo .7z no existe: ${sevenZipPath}`);
        }
        
        const sevenZipStats = fs.statSync(sevenZipPath);
        console.log('📊 Información del archivo .7z:');
        console.log('  📏 Tamaño:', Math.round(sevenZipStats.size / 1024 / 1024), 'MB');
        console.log('  📅 Modificado:', sevenZipStats.mtime.toISOString());
        console.log('  📄 Es archivo:', sevenZipStats.isFile() ? 'SÍ' : 'NO');
        
        const extractDir = path.dirname(sevenZipPath);
        const braveDir = path.join(extractDir, 'brave-extracted');
        
        console.log('📂 Directorios:');
        console.log('  📁 Directorio base:', extractDir);
        console.log('  📁 Directorio destino:', braveDir);
        
        try {
            // Crear directorio de destino si no existe
            console.log('📁 PASO 1: Verificando/creando directorio destino...');
            if (!fs.existsSync(braveDir)) {
                console.log('📁 Creando directorio:', braveDir);
                fs.mkdirSync(braveDir, { recursive: true });
                console.log('✅ Directorio creado exitosamente');
            } else {
                console.log('✅ Directorio ya existe:', braveDir);
            }

            // Verificar permisos del directorio
            try {
                fs.accessSync(braveDir, fs.constants.W_OK);
                console.log('✅ Permisos de escritura verificados');
            } catch (error) {
                console.error('❌ Sin permisos de escritura en:', braveDir);
                throw new Error(`Sin permisos de escritura en directorio: ${braveDir}`);
            }

            // Usar diferentes métodos de extracción según el sistema
            if (process.platform === 'win32') {
                console.log('🔧 PASO 2: Buscando 7-Zip en Windows...');
                // Intentar usar 7z.exe incluido o del sistema en Windows
                const possible7zPaths = [
                    'C:\\Program Files\\7-Zip\\7z.exe',
                    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
                    '7z' // Si está en PATH
                ];
                
                console.log('📋 Rutas de 7-Zip a verificar:');
                possible7zPaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
                
                let command = null;
                let found7zPath = null;
                
                for (let i = 0; i < possible7zPaths.length; i++) {
                    const sevenZipExe = possible7zPaths[i];
                    console.log(`🔎 [${i + 1}/${possible7zPaths.length}] Probando: ${sevenZipExe}`);
                    try {
                        await execAsync(`"${sevenZipExe}" > nul 2>&1`);
                        console.log(`  ✅ ENCONTRADO y funcional: ${sevenZipExe}`);
                        command = `"${sevenZipExe}" x "${sevenZipPath}" -o"${braveDir}" -y`;
                        found7zPath = sevenZipExe;
                        break;
                    } catch (e) {
                        console.log(`  ❌ No disponible: ${sevenZipExe} (${e.message})`);
                        continue;
                    }
                }
                
                if (!command) {
                    console.error('❌ 7z.exe NO ENCONTRADO en ninguna ubicación');
                    console.log('💡 SOLUCIONES:');
                    console.log('  1. Instalar 7-Zip desde: https://www.7-zip.org/');
                    console.log('  2. O agregar 7z.exe al PATH del sistema');
                    throw new Error('7z.exe no encontrado. Instala 7-Zip desde https://www.7-zip.org/');
                }
                
                console.log('✅ Usando 7-Zip encontrado:', found7zPath);
                console.log('🚀 PASO 3: Ejecutando extracción...');
                console.log('🔧 Comando completo:', command);
                
                const startTime = Date.now();
                const result = await execAsync(command);
                const endTime = Date.now();
                const duration = Math.round((endTime - startTime) / 1000);
                
                console.log('✅ Extracción completada en', duration, 'segundos');
                console.log('📤 Salida del comando:', result.stdout || 'Sin salida');
                if (result.stderr) {
                    console.log('⚠️ Errores/advertencias:', result.stderr);
                }
            } else {
                console.log('🔧 PASO 2: Verificando 7-Zip en Linux/WSL...');
                // Usar 7z en Linux (requiere p7zip-full)
                
                // Primero verificar si 7z está disponible
                try {
                    await execAsync('which 7z');
                    console.log('✅ 7z encontrado en PATH');
                } catch (error) {
                    console.error('❌ 7z NO encontrado en PATH');
                    console.log('💡 SOLUCIONES:');
                    console.log('  1. Instalar p7zip-full: sudo apt install p7zip-full');
                    console.log('  2. O instalar 7zip: sudo apt install 7zip');
                    throw new Error('7z no encontrado. Instala con: sudo apt install p7zip-full');
                }
                
                const command = `7z x "${sevenZipPath}" -o"${braveDir}" -y`;
                console.log('🚀 PASO 3: Ejecutando extracción en Linux...');
                console.log('🔧 Comando completo:', command);
                
                try {
                    const startTime = Date.now();
                    const result = await execAsync(command);
                    const endTime = Date.now();
                    const duration = Math.round((endTime - startTime) / 1000);
                    
                    console.log('✅ Extracción completada en', duration, 'segundos');
                    console.log('📤 Salida del comando:', result.stdout || 'Sin salida');
                    if (result.stderr) {
                        console.log('⚠️ Errores/advertencias:', result.stderr);
                    }
                } catch (error) {
                    console.error('❌ Error durante extracción:', error.message);
                    if (error.message.includes('7z: command not found')) {
                        console.log('💡 SOLUCIÓN: sudo apt install p7zip-full');
                        throw new Error('7z no encontrado. Instala con: sudo apt install p7zip-full');
                    }
                    throw error;
                }
            }

            console.log('✅ EXTRACCIÓN COMPLETADA exitosamente desde .7z');
            
            // Verificar qué se extrajo
            console.log('🔍 PASO 4: Verificando contenido extraído...');
            if (fs.existsSync(braveDir)) {
                const extractedItems = fs.readdirSync(braveDir);
                console.log('📁 Items extraídos (' + extractedItems.length + ' total):');
                extractedItems.forEach((item, i) => {
                    const itemPath = path.join(braveDir, item);
                    const itemStats = fs.statSync(itemPath);
                    const type = itemStats.isDirectory() ? '📁' : '📄';
                    const size = itemStats.isFile() ? ` (${Math.round(itemStats.size / 1024)} KB)` : '';
                    console.log(`  ${i + 1}. ${type} ${item}${size}`);
                });
            }
            
            // Buscar el ejecutable en la estructura extraída
            console.log('🔍 PASO 5: Buscando ejecutable de Brave en estructura extraída...');
            const braveExecutable = await this.findBraveExecutableInDir(braveDir);
            
            if (braveExecutable) {
                console.log('✅ EJECUTABLE DE BRAVE ENCONTRADO:', braveExecutable);
                
                // Verificar detalles del ejecutable
                const execStats = fs.statSync(braveExecutable);
                console.log('📊 Información del ejecutable:');
                console.log('  📏 Tamaño:', Math.round(execStats.size / 1024 / 1024), 'MB');
                console.log('  📅 Modificado:', execStats.mtime.toISOString());
                console.log('  📄 Es archivo:', execStats.isFile() ? 'SÍ' : 'NO');
                
                // Hacer ejecutable en Linux
                if (process.platform !== 'win32') {
                    console.log('🔧 PASO 6: Estableciendo permisos de ejecución (Linux)...');
                    try {
                        await execAsync(`chmod +x "${braveExecutable}"`);
                        console.log('✅ Permisos de ejecución establecidos');
                        
                        // Verificar permisos
                        const result = await execAsync(`ls -la "${braveExecutable}"`);
                        console.log('📋 Permisos actuales:', result.stdout.trim());
                    } catch (chmodError) {
                        console.warn('⚠️ Error estableciendo permisos:', chmodError.message);
                        console.log('💡 Puede seguir funcionando sin permisos especiales');
                    }
                } else {
                    console.log('ℹ️ Windows detectado - no se requieren permisos chmod');
                }
                
                console.log('🎯 EXTRACCIÓN COMPLETADA - Ejecutable listo para usar');
                return braveExecutable;
            } else {
                console.error('❌ NO SE ENCONTRÓ ejecutable de Brave después de la extracción');
                console.log('📁 Contenido del directorio extraído para diagnóstico:');
                
                // Mostrar estructura completa para diagnóstico
                const showDirStructure = (dir, level = 0) => {
                    const indent = '  '.repeat(level);
                    try {
                        const items = fs.readdirSync(dir);
                        items.forEach(item => {
                            const itemPath = path.join(dir, item);
                            const itemStats = fs.statSync(itemPath);
                            const type = itemStats.isDirectory() ? '📁' : '📄';
                            console.log(`${indent}${type} ${item}`);
                            
                            // Mostrar solo 2 niveles de profundidad
                            if (itemStats.isDirectory() && level < 2) {
                                showDirStructure(itemPath, level + 1);
                            }
                        });
                    } catch (error) {
                        console.log(`${indent}❌ Error leyendo: ${error.message}`);
                    }
                };
                
                showDirStructure(braveDir);
                
                throw new Error('No se encontró el ejecutable de Brave después de la extracción. Revisa la estructura de archivos arriba.');
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
        console.log('🚀 ================ INICIANDO BRAVE PARA CURSO ================');
        console.log('🎓 URL del curso:', courseUrl);
        console.log('🍪 Cookies recibidas:', cookies ? cookies.length : 0);
        
        if (cookies && cookies.length > 0) {
            console.log('📋 Lista de cookies:');
            cookies.forEach((cookie, i) => {
                const valuePreview = cookie.value ? cookie.value.substring(0, 20) + '...' : 'vacía';
                console.log(`  ${i + 1}. ${cookie.name}: ${valuePreview} (${cookie.domain || 'sin dominio'})`);
            });
        }
        
        try {
            console.log('🔍 PASO 1: Buscando navegador Brave...');
            const bravePath = await this.findBrave();
            console.log('✅ Navegador encontrado:', bravePath);
            
            // Guardar URL del curso para modo kiosko
            this.targetCourseUrl = courseUrl;
            console.log('🔒 Configurando modo kiosko para curso:', courseUrl);
            
            // Usar perfil persistente protegido
            console.log('🔍 PASO 2: Creando perfil persistente...');
            const profilePath = this.createPersistentProfile();
            console.log('✅ Perfil creado/verificado:', profilePath);
            
            // Verificar si es primera vez y mostrar información de Widevine
            console.log('🔍 PASO 3: Verificando configuración de perfil...');
            const isFirstTime = this.isFirstTimeProfile(profilePath);
            console.log('🆕 Es primera vez usando este perfil:', isFirstTime ? 'SÍ' : 'NO');
            this.showWidevineInfo(isFirstTime);

            let startUrl = courseUrl || 'https://www.udemy.com';
            console.log('🌐 URL inicial prevista:', startUrl);

            // Si tenemos cookies, crear página de carga y extensión
            if (cookies && cookies.length > 0) {
                console.log('🔍 PASO 4: Preparando transferencia de cookies...');
                console.log('📄 Creando página de carga...');
                const loadingPath = await this.createLoadingPage(cookies, profilePath);
                console.log('✅ Página de carga creada:', loadingPath);
                
                console.log('🔧 Creando extensión de cookies...');
                await this.createCookieExtension(cookies, profilePath, loadingPath);
                console.log('✅ Extensión de cookies creada');
                
                // Cambiar URL inicial a la página de carga
                startUrl = 'file:///' + loadingPath.replace(/\\/g, '/');
                console.log('📄 URL inicial cambiada a página de carga:', startUrl);
                console.log('🎯 Después redirigirá automáticamente a:', courseUrl);
                
                // Modificar la página de carga para ir a la URL del curso
                console.log('📝 Configurando redirección automática...');
                this.updateLoadingPageTarget(loadingPath, courseUrl);
                console.log('✅ Redirección configurada');
            } else {
                console.log('ℹ️ No hay cookies para transferir, iniciando directamente');
            }

            console.log('🔍 PASO 5: Preparando argumentos de lanzamiento...');
            
            // Obtener path de Widevine
            const widevinePath = this.getWidevinePath(bravePath);
            console.log('🔐 Path de Widevine CDM:', widevinePath);
            
            const args = [
                '--user-data-dir=' + profilePath,
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-features=TranslateUI',
                '--allow-running-insecure-content',
                // Configuración de Widevine CDM - Auto-habilitar sin preguntar
                '--widevine-cdm-path=' + widevinePath,
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
                console.log('🔧 Extensión agregada a argumentos:', this.extensionPath);
            } else {
                console.log('ℹ️ No hay extensión para cargar');
            }

            console.log('📋 Argumentos completos de lanzamiento (' + args.length + ' total):');
            args.forEach((arg, i) => {
                // Ocultar rutas muy largas para mejor legibilidad
                const displayArg = arg.length > 80 ? arg.substring(0, 80) + '...' : arg;
                console.log(`  ${i + 1}. ${displayArg}`);
            });

            console.log('🔐 Perfil persistente protegido - Widevine se mantiene habilitado');
            console.log('🚀 PASO 6: EJECUTANDO BRAVE...');
            console.log('📄 Comando:', bravePath);
            console.log('🎯 URL objetivo final:', courseUrl);

            const startTime = Date.now();
            
            this.braveProcess = spawn(bravePath, args, {
                detached: false,
                stdio: 'ignore'
            });
            
            const processStartTime = Date.now() - startTime;
            console.log('⚡ Proceso spawn ejecutado en', processStartTime, 'ms');

            this.braveProcess.on('close', (code) => {
                const endTime = Date.now();
                const sessionDuration = Math.round((endTime - startTime) / 1000);
                console.log('🔚 BRAVE CERRADO:');
                console.log('  📊 Código de salida:', code);
                console.log('  ⏱️ Duración de la sesión:', sessionDuration, 'segundos');
                console.log('  🧹 Iniciando limpieza...');
                
                this.isActive = false;
                this.braveProcess = null;
                this.cleanup();
                
                console.log('✅ Limpieza completada');
            });

            this.braveProcess.on('error', (error) => {
                console.error('❌ ERROR DE PROCESO BRAVE:');
                console.error('  📄 Mensaje:', error.message);
                console.error('  📄 Código:', error.code || 'Sin código');
                console.error('  📄 Stack:', error.stack || 'Sin stack trace');
                
                this.isActive = false;
                
                // Sugerencias basadas en el tipo de error
                if (error.code === 'ENOENT') {
                    console.log('💡 SUGERENCIA: El archivo ejecutable no existe o no tiene permisos');
                } else if (error.code === 'EACCES') {
                    console.log('💡 SUGERENCIA: Sin permisos de ejecución');
                } else {
                    console.log('💡 SUGERENCIA: Verificar instalación de Brave/Chrome');
                }
            });

            this.braveProcess.on('spawn', () => {
                console.log('✅ PROCESO BRAVE INICIADO EXITOSAMENTE');
                console.log('  🆔 PID:', this.braveProcess.pid);
                console.log('  📁 Directorio de trabajo:', process.cwd());
            });

            this.isActive = true;
            console.log('✅ LANZAMIENTO COMPLETADO');
            
            if (cookies && cookies.length > 0) {
                console.log('🍪 El navegador transferirá', cookies.length, 'cookies automáticamente');
                console.log('⏳ Después de la transferencia se abrirá:', courseUrl);
            } else {
                console.log('🌐 Navegador abrirá directamente:', courseUrl);
            }
            
            console.log('🎯 ================ BRAVE EJECUTÁNDOSE ================');

            return true;

        } catch (error) {
            console.error('❌❌❌ ERROR CRÍTICO LANZANDO BRAVE:');
            console.error('  📄 Mensaje:', error.message);
            console.error('  📄 Stack:', error.stack || 'Sin stack trace');
            console.error('  📊 Tipo:', error.constructor.name);
            
            // Reset del estado en caso de error
            this.isActive = false;
            this.braveProcess = null;
            
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
            extensionPath: this.extensionPath,
            logFile: this.logFile,
            logDirectory: this.logDirectory
        };
    }
    
    // 📁 Obtener información de logging
    getLoggingInfo() {
        return {
            logFile: this.logFile,
            logDirectory: this.logDirectory,
            maxLogFiles: this.maxLogFiles,
            maxLogSizeMB: this.maxLogSizeMB,
            currentLogSize: this.logFile && fs.existsSync(this.logFile) ? 
                Math.round(fs.statSync(this.logFile).size / (1024 * 1024) * 100) / 100 : 0,
            logCount: this.debugLogs.length,
            isPackaged: app.isPackaged
        };
    }
    
    // 📂 Abrir directorio de logs en el explorador
    openLogDirectory() {
        try {
            if (this.logDirectory && fs.existsSync(this.logDirectory)) {
                const { shell } = require('electron');
                shell.openPath(this.logDirectory);
                return { success: true, path: this.logDirectory };
            } else {
                return { success: false, error: 'Directorio de logs no existe' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = BraveController;