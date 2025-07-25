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
            
            
            // Limpiar archivos antiguos
            this.cleanOldLogFiles();
            
        } catch (error) {
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
                } catch (error) {
                }
            }
            
            if (files.length > 0) {
            }
            
        } catch (error) {
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
            
            
            // Limpiar archivos antiguos después de rotar
            this.cleanOldLogFiles();
            
        } catch (error) {
        }
    }
    
    // 📝 Logger personalizado que envía a ventana de depuración Y ARCHIVO
    debugLog(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const fullMessage = args.length > 0 ? `${message} ${args.join(' ')}` : message;
        
        // Log normal a consola
        switch(level) {
            case 'error':
                break;
            case 'warn':
                break;
            case 'info':
            default:
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
                        return widePath;
                    }
                }
                
                // Fallback path para Windows
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
                        return widePath;
                    }
                }
                
                // Fallback path para Linux
                return '/opt/google/chrome/WidevineCdm/_platform_specific/linux_x64/libwidevinecdm.so';
            }
        } catch (error) {
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
                    
                    
                    return this.forcedBravePath;
                } else {
                }
            } catch (error) {
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
        const isEmbedded = this.isBraveEmbedded();
        
        if (!isEmbedded) {
            
            // Primero verificar si ya está extraído
            const existingExtracted = this.findExistingExtracted();
            if (existingExtracted) {
                return existingExtracted;
            }
            
            // Si no está extraído, buscar archivo .7z
            const sevenZipPath = this.findBrave7z();
            
            if (sevenZipPath) {
                try {
                    const extractedBrave = await this.extractBrave7z(sevenZipPath);
                    
                    if (extractedBrave) {
                        return extractedBrave;
                    } else {
                    }
                } catch (error) {
                }
            } else {
            }
        } else {
        }
        
        for (let i = 0; i < paths.length; i++) {
            const bravePath = paths[i];
            try {
                
                // Verificar si el directorio padre existe
                const parentDir = path.dirname(bravePath);
                const parentExists = fs.existsSync(parentDir);
                
                if (fs.existsSync(bravePath)) {
                    // Verificar si es ejecutable
                    const stats = fs.statSync(bravePath);
                    const isFile = stats.isFile();
                    const fileSize = stats.size;
                    
                    
                    // Determinar si es versión empaquetada o del sistema
                    const isBundled = bravePath.includes('bundled-browsers') || bravePath.includes('resourcesPath');
                    const braveType = isBundled ? '📦 EMPAQUETADO' : '💻 SISTEMA';
                    
                    
                    if (isBundled) {
                    } else {
                    }
                    
                    return bravePath;
                } else {
                }
            } catch (error) {
                continue;
            }
        }
        
        
        throw new Error('🚫 BRAVE EMPAQUETADO REQUERIDO - No se usarán navegadores del sistema en producción');
    }

    // Buscar Brave ya extraído
    findExistingExtracted() {
        const possibleDirs = [
            path.join(__dirname, '../../bundled-browsers/brave/brave-extracted/'),
            path.join(__dirname, '../../bundled-browsers/brave-extracted/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/brave/brave-extracted/'),
            path.join(process.resourcesPath || '', 'bundled-browsers/brave-extracted/')
        ];


        for (let i = 0; i < possibleDirs.length; i++) {
            const dir = possibleDirs[i];
            
            try {
                if (!fs.existsSync(dir)) {
                    continue;
                }
                
                
                // Listar contenido del directorio para diagnóstico
                const dirContents = fs.readdirSync(dir);
                dirContents.forEach((item, idx) => {
                    const itemPath = path.join(dir, item);
                    const itemStats = fs.statSync(itemPath);
                    const type = itemStats.isDirectory() ? '📁' : '📄';
                    const size = itemStats.isFile() ? ` (${Math.round(itemStats.size / 1024)} KB)` : '';
                });
                
                // Buscar el ejecutable en el directorio extraído
                const braveExecutable = this.findBraveExecutableInDirSync(dir);
                if (braveExecutable) {
                    
                    // Verificar detalles del ejecutable
                    const execStats = fs.statSync(braveExecutable);
                    
                    return braveExecutable;
                } else {
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


        for (let i = 0; i < possibleDirs.length; i++) {
            const dir = possibleDirs[i];
            
            try {
                if (!fs.existsSync(dir)) {
                    continue;
                }
                
                const files = fs.readdirSync(dir);
                
                // Mostrar todos los archivos para diagnóstico
                files.forEach((file, idx) => {
                    const filePath = path.join(dir, file);
                    const fileStats = fs.statSync(filePath);
                    const type = fileStats.isDirectory() ? '📁' : '📄';
                    const size = fileStats.isFile() ? ` (${Math.round(fileStats.size / 1024 / 1024)} MB)` : '';
                    const extension = path.extname(file).toLowerCase();
                    const is7z = extension === '.7z' ? ' ⭐ 7Z' : '';
                });
                
                const sevenZipFiles = files.filter(file => {
                    const isSevenZip = file.toLowerCase().endsWith('.7z');
                    const containsBrave = file.toLowerCase().includes('brave');
                    return isSevenZip && containsBrave;
                });
                
                
                if (sevenZipFiles.length > 0) {
                    const sevenZipPath = path.join(dir, sevenZipFiles[0]);
                    
                    // Verificar detalles del archivo .7z
                    const sevenZipStats = fs.statSync(sevenZipPath);
                    
                    return sevenZipPath;
                } else {
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }

    // Extraer Brave desde archivo .7z
    async extractBrave7z(sevenZipPath) {
        
        // Verificar que el archivo .7z existe y obtener información
        if (!fs.existsSync(sevenZipPath)) {
            throw new Error(`Archivo .7z no existe: ${sevenZipPath}`);
        }
        
        const sevenZipStats = fs.statSync(sevenZipPath);
        
        const extractDir = path.dirname(sevenZipPath);
        const braveDir = path.join(extractDir, 'brave-extracted');
        
        
        try {
            // Crear directorio de destino si no existe
            if (!fs.existsSync(braveDir)) {
                fs.mkdirSync(braveDir, { recursive: true });
            } else {
            }

            // Verificar permisos del directorio
            try {
                fs.accessSync(braveDir, fs.constants.W_OK);
            } catch (error) {
                throw new Error(`Sin permisos de escritura en directorio: ${braveDir}`);
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
                let found7zPath = null;
                
                for (let i = 0; i < possible7zPaths.length; i++) {
                    const sevenZipExe = possible7zPaths[i];
                    try {
                        await execAsync(`"${sevenZipExe}" > nul 2>&1`);
                        command = `"${sevenZipExe}" x "${sevenZipPath}" -o"${braveDir}" -y`;
                        found7zPath = sevenZipExe;
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!command) {
                    throw new Error('7z.exe no encontrado. Instala 7-Zip desde https://www.7-zip.org/');
                }
                
                
                const startTime = Date.now();
                const result = await execAsync(command);
                const endTime = Date.now();
                const duration = Math.round((endTime - startTime) / 1000);
                
                if (result.stderr) {
                }
            } else {
                // Usar 7z en Linux (requiere p7zip-full)
                
                // Primero verificar si 7z está disponible
                try {
                    await execAsync('which 7z');
                } catch (error) {
                    throw new Error('7z no encontrado. Instala con: sudo apt install p7zip-full');
                }
                
                const command = `7z x "${sevenZipPath}" -o"${braveDir}" -y`;
                
                try {
                    const startTime = Date.now();
                    const result = await execAsync(command);
                    const endTime = Date.now();
                    const duration = Math.round((endTime - startTime) / 1000);
                    
                    if (result.stderr) {
                    }
                } catch (error) {
                    if (error.message.includes('7z: command not found')) {
                        throw new Error('7z no encontrado. Instala con: sudo apt install p7zip-full');
                    }
                    throw error;
                }
            }

            
            // Verificar qué se extrajo
            if (fs.existsSync(braveDir)) {
                const extractedItems = fs.readdirSync(braveDir);
                extractedItems.forEach((item, i) => {
                    const itemPath = path.join(braveDir, item);
                    const itemStats = fs.statSync(itemPath);
                    const type = itemStats.isDirectory() ? '📁' : '📄';
                    const size = itemStats.isFile() ? ` (${Math.round(itemStats.size / 1024)} KB)` : '';
                });
            }
            
            // Buscar el ejecutable en la estructura extraída
            const braveExecutable = await this.findBraveExecutableInDir(braveDir);
            
            if (braveExecutable) {
                
                // Verificar detalles del ejecutable
                const execStats = fs.statSync(braveExecutable);
                
                // Hacer ejecutable en Linux
                if (process.platform !== 'win32') {
                    try {
                        await execAsync(`chmod +x "${braveExecutable}"`);
                        
                        // Verificar permisos
                        const result = await execAsync(`ls -la "${braveExecutable}"`);
                    } catch (chmodError) {
                    }
                } else {
                }
                
                return braveExecutable;
            } else {
                
                // Mostrar estructura completa para diagnóstico
                const showDirStructure = (dir, level = 0) => {
                    const indent = '  '.repeat(level);
                    try {
                        const items = fs.readdirSync(dir);
                        items.forEach(item => {
                            const itemPath = path.join(dir, item);
                            const itemStats = fs.statSync(itemPath);
                            const type = itemStats.isDirectory() ? '📁' : '📄';
                            
                            // Mostrar solo 2 niveles de profundidad
                            if (itemStats.isDirectory() && level < 2) {
                                showDirStructure(itemPath, level + 1);
                            }
                        });
                    } catch (error) {
                    }
                };
                
                showDirStructure(braveDir);
                
                throw new Error('No se encontró el ejecutable de Brave después de la extracción. Revisa la estructura de archivos arriba.');
            }
            
        } catch (error) {
            
            // Sugerir soluciones según el error
            if (error.message.includes('7z') || error.message.includes('7-Zip')) {
                if (process.platform === 'win32') {
                } else {
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
        } else {
            // Verificar si hay un .7z
            const has7z = this.findBrave7z() !== null;
            
            if (has7z) {
            } else {
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
                
                // Crear archivo de configuración inicial
                this.setupProfileSecurity(profilePath);
            } else {
            }
            
            this.persistentProfilePath = profilePath;
            return profilePath;
            
        } catch (error) {
            
            // Fallback a perfil temporal si falla
            const os = require('os');
            const fallbackPath = path.join(os.tmpdir(), 'udemigo-brave-fallback-' + Date.now());
            fs.mkdirSync(fallbackPath, { recursive: true });
            this.persistentProfilePath = fallbackPath;
            
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
            
        } catch (error) {
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
        } else {
        }
    }

    // Crear página de carga
    async createLoadingPage(cookies, profilePath, targetUrl = 'https://www.udemy.com') {
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
            
        }
        
        function completeTransfer() {
            if (transferComplete) return;
            transferComplete = true;
            
            
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
                    
                    // Mostrar en la página también
                    document.getElementById('statusMessage').innerHTML = 
                        'Redirigiendo a:<br><small style="font-size:10px;word-break:break-all;">${targetUrl}</small>';
                    
                    setTimeout(() => {
                        window.location.href = '${targetUrl}';
                    }, 1000);
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
                completeTransfer();
            }
        }, 8000);
    </script>
</body>
</html>`;

        const loadingPath = path.join(profilePath, 'loading.html');
        fs.writeFileSync(loadingPath, loadingHtml);
        return loadingPath;
    }

    // Crear extensión para transferir cookies
    async createCookieExtension(cookies, profilePath, loadingPath) {
        
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
}

// Función para establecer cookies usando Chrome API
async function setCookies() {
    // Evitar ejecución múltiple
    if (cookiesAlreadySet || isSettingCookies) {
        return;
    }
    
    isSettingCookies = true;
    
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
            successCount++;
            
            // Notificar progreso simplificado
            notifyProgress(successCount, 'Cargando curso...');
            
            // Pequeño delay para mostrar el progreso
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            notifyProgress(successCount, 'Cargando curso...');
        }
    }
    
    
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
    
}

// Verificar si las cookies ya fueron establecidas
chrome.storage.local.get(['udemigo_cookies_set', 'udemigo_cookies_timestamp'], function(result) {
    const wasSet = result.udemigo_cookies_set;
    const timestamp = result.udemigo_cookies_timestamp || 0;
    const hoursSinceSet = (Date.now() - timestamp) / (1000 * 60 * 60);
    
    if (wasSet && hoursSinceSet < 1) {
        cookiesAlreadySet = true;
        // Si ya están establecidas, notificar completado inmediatamente
        setTimeout(() => {
            notifyComplete();
        }, 2000);
    } else {
        setTimeout(setCookies, 1000);
    }
});

// Solo establecer cookies en la instalación inicial
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        setTimeout(setCookies, 1000);
    }
});

// Escuchar mensajes para abrir enlaces externos
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'OPEN_EXTERNAL') {
        
        // Usar chrome.tabs.create con una nueva ventana para abrir en navegador por defecto
        chrome.tabs.create({
            url: request.url,
            active: true
        }, function(tab) {
            if (chrome.runtime.lastError) {
            } else {
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

// Verificar si es la página de carga
if (window.location.href.includes('loading.html')) {
    
    // Escuchar mensajes del background script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        
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
    

} else if (window.location.href.includes('udemy.com')) {
    // Solo en páginas de Udemy
    
    // URL del curso específico (se pasa desde la extensión)
    const targetCourseUrl = '${this.targetCourseUrl || ''}';
    
    // MODO KIOSKO: Bloquear navegación fuera del curso
    function setupKioskMode() {
        
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
                return false;
            }
        }
        
        // Función para abrir URL externa en navegador por defecto
        function openExternalUrl(url) {
            
            // Usar fetch para notificar al background script
            chrome.runtime.sendMessage({
                type: 'OPEN_EXTERNAL',
                url: url
            }, function(response) {
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
                        e.preventDefault();
                        e.stopPropagation();
                        openExternalUrl(href);
                        return false;
                    }
                    // Si es de Udemy pero no válido para el curso, bloquearlo
                    else if (!isValidCourseUrl(href)) {
                        e.preventDefault();
                        e.stopPropagation();
                        showKioskNotification('Solo puedes navegar dentro de este curso');
                        return false;
                    }
                    // Si es válido para el curso, permitir navegación normal
                    else {
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
                    openExternalUrl(url);
                    return null;
                }
                // Si es de Udemy pero no válido para el curso, bloquearlo
                else if (!isValidCourseUrl(url)) {
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
                        openExternalUrl(url);
                        return;
                    }
                    // Si es de Udemy pero no válido para el curso, bloquearlo
                    else if (!isValidCourseUrl(url)) {
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
                    showKioskNotification('Solo puedes navegar dentro de este curso');
                    return;
                }
            }
            return originalReplaceState.call(this, state, title, url);
        };
        
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
        setupKioskMode();
    } else {
        // Marcar como procesado inmediatamente
        window.udemigoCookiesProcessed = true;
        
        // Datos de cookies
        const cookiesData = ${JSON.stringify(cookies)};

        // Función para establecer cookies via document.cookie (fallback)
        function setCookiesViaDocument() {
            
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
                        successCount++;
                    } else {
                    }
                    
                } catch (error) {
                }
            }
            
            
            // Después de establecer cookies, configurar modo kiosko
            setupKioskMode();
        }

        // Solo ejecutar fallback si es necesario, luego configurar kiosko
        setTimeout(setCookiesViaDocument, 1000);
    }
}
`;

        fs.writeFileSync(path.join(extensionDir, 'content.js'), contentScript);

        this.extensionPath = extensionDir;
        return extensionDir;
    }

    normalizeUrlString(url) {
        // Si ya es string, verificar que es válido
        if (typeof url === 'string') {
            if (url.startsWith('http')) {
                return url;
            }
            // Si es string pero no es URL completa, intentar construir
            if (url.startsWith('/')) {
                return 'https://www.udemy.com' + url;
            }
            return url;
        }
        
        // Si es objeto, intentar extraer URL
        if (typeof url === 'object' && url !== null) {
            // Opciones de propiedades donde puede estar la URL
            if (url.url && typeof url.url === 'string') return url.url;
            if (url.courseUrl && typeof url.courseUrl === 'string') return url.courseUrl;
            if (url.href && typeof url.href === 'string') return url.href;
            if (url.toString && typeof url.toString === 'function') {
                const stringified = url.toString();
                if (stringified !== '[object Object]') return stringified;
            }
        }
        
        // Fallback
        return 'https://www.udemy.com';
    }

    getBraveErrorDetails(error) {
        const details = {
            type: 'unknown',
            userMessage: 'Error desconocido al abrir Brave',
            suggestion: 'Intenta nuevamente más tarde'
        };
        
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('enoent') || errorMsg.includes('not found')) {
            details.type = 'brave_not_found';
            details.userMessage = 'Brave browser no encontrado';
            details.suggestion = 'Instala Brave browser o verifica la ruta de instalación';
        } else if (errorMsg.includes('eacces') || errorMsg.includes('permission')) {
            details.type = 'permission_denied';
            details.userMessage = 'Sin permisos para ejecutar Brave';
            details.suggestion = 'Verifica los permisos del archivo o ejecuta como administrador';
        } else if (errorMsg.includes('emfile') || errorMsg.includes('too many files')) {
            details.type = 'too_many_files';
            details.userMessage = 'Demasiados archivos abiertos';
            details.suggestion = 'Cierra otras aplicaciones e intenta nuevamente';
        } else if (errorMsg.includes('spawn') || errorMsg.includes('exec')) {
            details.type = 'spawn_failed';
            details.userMessage = 'Error al ejecutar Brave';
            details.suggestion = 'Verifica que Brave esté instalado correctamente';
        }
        
        return details;
    }

    // Lanzar Brave con URL específica (para cursos)
    async launchWithUrl(courseUrl, cookies = null) {
        
        // Normalizar URL usando lógica simplificada
        const normalizedUrl = this.normalizeUrlString(courseUrl);
        
        try {
            const bravePath = await this.findBrave();
            
            // Guardar URL del curso para modo kiosko
            this.targetCourseUrl = normalizedUrl;
            
            // Usar perfil persistente protegido
            const profilePath = this.createPersistentProfile();
            
            // Verificar si es primera vez y mostrar información de Widevine
            const isFirstTime = this.isFirstTimeProfile(profilePath);
            this.showWidevineInfo(isFirstTime);

            let startUrl = normalizedUrl || 'https://www.udemy.com';

            // Si tenemos cookies, crear página de carga y extensión
            if (cookies && cookies.length > 0) {
                const loadingPath = await this.createLoadingPage(cookies, profilePath, normalizedUrl);
                
                await this.createCookieExtension(cookies, profilePath, loadingPath);
                
                // Arreglar la construcción de la URL para evitar [object Object]
                const normalizedPath = loadingPath.replace(/\\/g, '/');
                startUrl = `file:///${normalizedPath}`;
                
            } else {
            }

            
            // Obtener path de Widevine
            const widevinePath = this.getWidevinePath(bravePath);
            
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
            } else {
            }

            args.forEach((arg, i) => {
                // Ocultar rutas muy largas para mejor legibilidad
                const displayArg = arg.length > 80 ? arg.substring(0, 80) + '...' : arg;
            });


            const startTime = Date.now();
            
            this.braveProcess = spawn(bravePath, args, {
                detached: false,
                stdio: 'ignore'
            });
            
            const processStartTime = Date.now() - startTime;

            this.braveProcess.on('close', (code) => {
                const endTime = Date.now();
                const sessionDuration = Math.round((endTime - startTime) / 1000);
                
                this.isActive = false;
                this.braveProcess = null;
                this.cleanup();
                
            });

            this.braveProcess.on('error', (error) => {
                
                this.isActive = false;
                
                // Sugerencias basadas en el tipo de error
                if (error.code === 'ENOENT') {
                } else if (error.code === 'EACCES') {
                } else {
                }
            });

            this.braveProcess.on('spawn', () => {
            });

            this.isActive = true;
            
            if (cookies && cookies.length > 0) {
            } else {
            }
            

            return true;

        } catch (error) {
            
            // Reset del estado en caso de error
            this.isActive = false;
            this.braveProcess = null;
            
            // Propagar error con información específica
            const errorInfo = {
                success: false,
                error: error.message,
                details: this.getBraveErrorDetails(error)
            };
            
            return errorInfo;
        }
    }

    // Actualizar destino de la página de carga
    updateLoadingPageTarget(loadingPath, targetUrl) {
        try {
            
            let content = fs.readFileSync(loadingPath, 'utf8');
            
            // Buscar la línea original
            const originalLine = "window.location.href = 'https://www.udemy.com';";
            if (content.includes(originalLine)) {
                content = content.replace(originalLine, `window.location.href = '${targetUrl}';`);
                fs.writeFileSync(loadingPath, content);
            } else {
            }
        } catch (error) {
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
                const loadingPath = await this.createLoadingPage(cookies, profilePath, 'https://www.udemy.com');
                await this.createCookieExtension(cookies, profilePath, loadingPath);
                
                // Cambiar URL inicial a la página de carga
                startUrl = 'file:///' + loadingPath.replace(/\\/g, '/');
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
            }

            // NOTA: La URL ya está incluida en --app=startUrl, no agregar de nuevo


            this.braveProcess = spawn(bravePath, args, {
                detached: false,
                stdio: 'ignore'
            });

            this.braveProcess.on('close', (code) => {
                this.isActive = false;
                this.braveProcess = null;
                this.cleanup();
            });

            this.braveProcess.on('error', (error) => {
                this.isActive = false;
            });

            this.isActive = true;
            
            if (cookies && cookies.length > 0) {
            }

            return true;

        } catch (error) {
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
            } catch (error) {
            }
        }
        this.cleanup();
        return true;
    }

    // Limpiar datos sensibles pero mantener configuraciones de plugins
    cleanup() {
        try {
            if (this.persistentProfilePath && fs.existsSync(this.persistentProfilePath)) {
                
                // Limpiar solo datos sensibles, mantener configuraciones
                this.cleanSensitiveData(this.persistentProfilePath);
                
            }
            
            // Limpiar extensión temporal si existe
            if (this.extensionPath && fs.existsSync(this.extensionPath)) {
                const { exec } = require('child_process');
                if (process.platform === 'win32') {
                    exec(`rmdir /s /q "${this.extensionPath}"`, () => {});
                } else {
                    exec(`rm -rf "${this.extensionPath}"`, () => {});
                }
            }
        } catch (error) {
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
                    } catch (err) {
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
                    } catch (err) {
                    }
                }
            });

            // IMPORTANTE: Mantener 'Preferences' y 'Local State' que contienen configuraciones de plugins
            
        } catch (error) {
        }
    }

    // Método para resetear completamente el perfil (usar con cuidado)
    resetProfile() {
        try {
            if (this.persistentProfilePath && fs.existsSync(this.persistentProfilePath)) {
                
                const { exec } = require('child_process');
                if (process.platform === 'win32') {
                    exec(`rmdir /s /q "${this.persistentProfilePath}"`, () => {
                    });
                } else {
                    exec(`rm -rf "${this.persistentProfilePath}"`, () => {
                    });
                }
                
                this.persistentProfilePath = null;
                return true;
            } else {
                return false;
            }
        } catch (error) {
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
    
    // Crear extensión simple para transferir cookies sin página de carga
    async createCookieExtensionDirect(cookies, profilePath, targetUrl) {
        const extensionPath = path.join(profilePath, 'CookieExtension');
        
        // Crear directório de extensión
        if (!fs.existsSync(extensionPath)) {
            fs.mkdirSync(extensionPath, { recursive: true });
        }
        
        // Manifest para la extensión
        const manifest = {
            manifest_version: 3,
            name: "Udemigo Cookie Transfer",
            version: "1.0",
            permissions: ["cookies", "storage", "webNavigation"],
            host_permissions: ["https://*.udemy.com/*"],
            background: {
                service_worker: "background.js"
            }
        };
        
        fs.writeFileSync(path.join(extensionPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
        
        // Background script que transfiere cookies
        const backgroundScript = `

// Datos de cookies
const cookiesData = ${JSON.stringify(cookies)};
const targetUrl = '${targetUrl}';

// Transferir cookies cuando la extensión se carga
chrome.runtime.onStartup.addListener(setCookies);
chrome.runtime.onInstalled.addListener(setCookies);

// También transferir al navegar a Udemy
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
    if (details.url.includes('udemy.com') && details.frameId === 0) {
        setCookies();
    }
}, {url: [{hostContains: 'udemy.com'}]});

async function setCookies() {
    
    for (const cookieData of cookiesData) {
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
            
        } catch (error) {
        }
    }
    
}
`;
        
        fs.writeFileSync(path.join(extensionPath, 'background.js'), backgroundScript);
        
        this.extensionPath = extensionPath;
        
        return extensionPath;
    }
}

module.exports = BraveController;