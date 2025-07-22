const { spawn } = require('child_process');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class ChromeController {
    constructor() {
        this.chromeProcess = null;
        this.chromeWindow = null;
        this.isActive = false;
        this.targetUrl = 'https://www.udemy.com';
        this.electronWindow = null;
        this.tempProfilePath = null;
        this.cookieScriptPath = null;
        this.pendingCookies = null;
    }

    // Detectar instalación de Chrome
    async findChromePath() {
        // Paths for WSL/Linux environment accessing Windows Chrome
        const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
            // WSL paths
            '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
            '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
            '/mnt/c/Users/' + (process.env.USER || 'usuario') + '/AppData/Local/Google/Chrome/Application/chrome.exe'
        ];

        console.log('🔍 Buscando Chrome en las siguientes rutas...');
        
        for (const chromePath of possiblePaths) {
            try {
                console.log('  - Verificando:', chromePath);
                const fs = require('fs');
                if (fs.existsSync(chromePath)) {
                    console.log('✅ Chrome encontrado en:', chromePath);
                    return chromePath;
                }
            } catch (error) {
                console.log('  ❌ Error verificando ruta:', error.message);
                continue;
            }
        }
        console.warn('❌ Chrome no encontrado en ninguna ruta conocida');
        return null;
    }

    // Lanzar Chrome con flags específicos
    async launchChrome(url = this.targetUrl, cookies = null) {
        const chromePath = await this.findChromePath();
        if (!chromePath) {
            throw new Error('Chrome no encontrado en el sistema');
        }

        // Crear directorio temporal para el perfil
        const os = require('os');
        const tempDir = os.tmpdir();
        const profilePath = path.join(tempDir, 'udemigo-chrome-temp-' + Date.now());
        
        // Guardar la ruta del perfil temporal para limpieza posterior
        this.tempProfilePath = profilePath;

        // Crear directorio del perfil
        if (!fs.existsSync(profilePath)) {
            fs.mkdirSync(profilePath, { recursive: true });
        }

        // Guardar cookies para inyección posterior
        this.pendingCookies = null;
        if (cookies && cookies.length > 0) {
            console.log('🍪 Preparando', cookies.length, 'cookies para Chrome...');
            this.pendingCookies = cookies;
            
            // Chrome inicia directo en Udemy
            url = 'https://www.udemy.com';
            console.log('🔄 Iniciando Chrome directo en Udemy para inyección de cookies');
        }

        const chromeFlags = [
            `--app=${url}`, // Modo app SIN barra de navegación
            `--user-data-dir=${profilePath}`, // Perfil temporal
            '--remote-debugging-port=9222', // Habilitar DevTools Protocol
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-features=TranslateUI,BlinkGenPropertyTrees,TabHover',
            '--disable-extensions',
            '--disable-plugins-discovery',
            '--disable-site-isolation-trials',
            '--allow-running-insecure-content',
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--hide-scrollbars',
            '--disable-features=VizDisplayCompositor',
            '--disable-gpu-sandbox',
            '--force-device-scale-factor=1',
            `--window-size=800,600`,
            `--window-position=100,100`
        ];

        try {
            this.chromeProcess = spawn(chromePath, chromeFlags, {
                detached: false,
                stdio: 'ignore'
            });

            this.chromeProcess.on('error', (error) => {
                console.error('Error launching Chrome:', error);
                this.isActive = false;
            });

            this.chromeProcess.on('close', (code) => {
                console.log(`Chrome process closed with code: ${code}`);
                this.isActive = false;
                this.chromeProcess = null;
                this.chromeWindow = null;
            });

            this.isActive = true;
            
            // Esperar a que Chrome se abra y encontrar su ventana
            setTimeout(async () => {
                await this.findChromeWindow();
                // Aplicar estilo borderless después de encontrar la ventana
                if (this.chromeWindow) {
                    setTimeout(async () => {
                        await this.makeBorderless();
                        
                        // Inyectar cookies via DevTools Protocol si tenemos pendientes
                        if (this.pendingCookies && this.pendingCookies.length > 0) {
                            setTimeout(async () => {
                                await this.injectCookiesViaDevTools();
                            }, 3000);
                        }
                    }, 500);
                }
            }, 2000);

            return true;
        } catch (error) {
            console.error('Error al lanzar Chrome:', error);
            return false;
        }
    }

    // Encontrar handle de ventana Chrome usando PowerShell
    async findChromeWindow() {
        return new Promise((resolve) => {
            const psCommand = `
                Get-Process chrome -ErrorAction SilentlyContinue | 
                Where-Object { $_.MainWindowTitle -ne "" } | 
                Select-Object Id, MainWindowHandle, MainWindowTitle | 
                ConvertTo-Json
            `;

            exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error finding Chrome window:', error);
                    resolve(null);
                    return;
                }

                try {
                    const result = JSON.parse(stdout);
                    const chromeWindows = Array.isArray(result) ? result : [result];
                    
                    // Buscar la ventana más reciente o la que coincida con nuestro proceso
                    for (const window of chromeWindows) {
                        if (window.MainWindowHandle && window.MainWindowHandle !== "0") {
                            this.chromeWindow = {
                                handle: window.MainWindowHandle,
                                pid: window.Id,
                                title: window.MainWindowTitle
                            };
                            console.log('Chrome window found:', this.chromeWindow);
                            resolve(this.chromeWindow);
                            return;
                        }
                    }
                    resolve(null);
                } catch (parseError) {
                    console.error('Error parsing PowerShell output:', parseError);
                    resolve(null);
                }
            });
        });
    }

    // Crear extensión de Chrome para inyectar cookies
    async createCookieExtension(profilePath, cookies) {
        try {
            // Crear directorio para la extensión
            const extensionDir = path.join(profilePath, 'Extensions', 'cookie-injector');
            if (!fs.existsSync(extensionDir)) {
                fs.mkdirSync(extensionDir, { recursive: true });
            }

            // Crear manifest.json para la extensión
            const manifest = {
                "manifest_version": 3,
                "name": "Cookie Injector",
                "version": "1.0",
                "permissions": ["cookies", "storage"],
                "host_permissions": ["*://*.udemy.com/*", "*://udemy.com/*"],
                "content_scripts": [{
                    "matches": ["*://*.udemy.com/*", "*://udemy.com/*"],
                    "js": ["content.js"],
                    "run_at": "document_start"
                }]
            };
            
            fs.writeFileSync(
                path.join(extensionDir, 'manifest.json'), 
                JSON.stringify(manifest, null, 2)
            );

            // Crear content script que establezca las cookies
            const contentScript = this.generateContentScript(cookies);
            fs.writeFileSync(
                path.join(extensionDir, 'content.js'),
                contentScript
            );

            console.log('✅ Extensión de cookies creada en:', extensionDir);
            return extensionDir;
        } catch (error) {
            console.error('❌ Error creando extensión:', error);
            return false;
        }
    }

    // Generar script de startup para Chrome
    generateStartupScript(cookies) {
        console.log('🍪 Generando script para', cookies.length, 'cookies');
        
        let cookieSetters = '';
        let additionalSetters = '';
        
        // Generar setters para cada cookie
        for (const cookie of cookies) {
            const name = JSON.stringify(cookie.name || '');
            const value = JSON.stringify(cookie.value || '');
            const domain = JSON.stringify(cookie.domain || '.udemy.com');
            const path = JSON.stringify(cookie.path || '/');
            const secure = cookie.secure || false;
            const sameSite = JSON.stringify(cookie.sameSite || 'Lax');
            
            cookieSetters += `
            try {
                console.log('🔄 Estableciendo:', ${name});
                const success = setCookieAdvanced(${name}, ${value}, {
                    domain: ${domain},
                    path: ${path},
                    secure: ${secure},
                    sameSite: ${sameSite}
                });
                if (success) successCount++;
            } catch(e) {
                console.error('❌ Error con cookie', ${name}, ':', e);
            }
            `;
            
            // Agregar setter adicional para dominio exacto si es cookie de Udemy
            if (cookie.domain && cookie.domain.includes('udemy.com')) {
                additionalSetters += `
                try {
                    setCookieAdvanced(${name}, ${value}, {
                        domain: 'www.udemy.com',
                        path: '/'
                    });
                } catch(e) {
                    console.warn('Error con cookie para dominio exacto:', e);
                }
                `;
            }
        }
        
        // Script completo
        const script = `
            console.log('🍪 Iniciando transferencia de ${cookies.length} cookies de Electron...');
            
            // Función mejorada para establecer cookies
            function setCookieAdvanced(name, value, options = {}) {
                console.log('🔧 Estableciendo cookie:', name, 'con valor:', value ? value.substring(0, 20) + '...' : 'empty');
                
                const defaults = {
                    domain: '.udemy.com',
                    path: '/',
                    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
                };
                
                const opts = Object.assign({}, defaults, options);
                
                // Para cookies críticas, no codificar el valor
                const criticalCookies = ['client_id', 'access_token', 'dj_session_id'];
                const shouldEncode = !criticalCookies.includes(name);
                
                let cookieString = shouldEncode ? 
                    encodeURIComponent(name) + '=' + encodeURIComponent(value) :
                    name + '=' + value;
                
                if (opts.domain) cookieString += '; Domain=' + opts.domain;
                if (opts.path) cookieString += '; Path=' + opts.path;
                if (opts.expires) cookieString += '; Expires=' + opts.expires;
                if (opts.secure) cookieString += '; Secure';
                if (opts.httpOnly) cookieString += '; HttpOnly';  
                if (opts.sameSite) cookieString += '; SameSite=' + opts.sameSite;
                
                console.log('📝 Cookie string:', cookieString);
                document.cookie = cookieString;
                
                // Verificar que se estableció (buscar tanto encoded como no-encoded)
                const searchName = shouldEncode ? encodeURIComponent(name) : name;
                const verification = document.cookie.split(';')
                    .find(function(c) { 
                        return c.trim().startsWith(searchName + '=') || c.trim().startsWith(name + '='); 
                    });
                
                if (verification) {
                    console.log('✅ Cookie confirmada:', name, '-> encontrada como:', verification.trim().substring(0, 50) + '...');
                    return true;
                } else {
                    console.warn('❌ Cookie NO establecida:', name);
                    console.warn('📋 Cookies actuales:', document.cookie);
                    return false;
                }
            }
            
            // Establecer todas las cookies
            let successCount = 0;
            let totalCount = ${cookies.length};
            
            ${cookieSetters}
            
            console.log('🍪 Resumen:', successCount, 'de', totalCount, 'cookies establecidas');
            console.log('📋 Cookies actuales en documento:', document.cookie);
            
            // Mostrar información del contexto
            console.log('🌍 Contexto actual:');
            console.log('  - Hostname:', window.location.hostname);
            console.log('  - Origin:', window.location.origin);
            console.log('  - URL completa:', window.location.href);
            
            // Establecer cookies adicionales para dominio exacto
            console.log('🔄 Estableciendo cookies adicionales para dominio exacto...');
            ${additionalSetters}
            
            // Intentar establecer cookies críticas con múltiples dominios
            console.log('🎯 Estableciendo cookies críticas con múltiples dominios...');
            const criticalCookieNames = ['client_id', 'access_token', 'dj_session_id'];
            const domains = ['.udemy.com', 'udemy.com', 'www.udemy.com'];
            
            criticalCookieNames.forEach(function(cookieName) {
                // Buscar la cookie en nuestros datos
                const cookies = ${JSON.stringify(cookies.map(c => ({name: c.name, value: c.value})))};
                const cookieData = cookies.find(function(c) { return c.name === cookieName; });
                
                if (cookieData) {
                    console.log('🎯 Estableciendo cookie crítica:', cookieName);
                    domains.forEach(function(domain) {
                        try {
                            setCookieAdvanced(cookieName, cookieData.value, {
                                domain: domain,
                                path: '/',
                                secure: domain.includes('udemy.com') // Secure si es HTTPS
                            });
                        } catch(e) {
                            console.warn('Error estableciendo', cookieName, 'para', domain, ':', e);
                        }
                    });
                } else {
                    console.warn('❌ Cookie crítica no encontrada:', cookieName);
                }
            });
            
            // Verificación final
            console.log('🔍 Verificación final...');
            const finalCookies = document.cookie;
            console.log('📋 Cookies finales:', finalCookies);
            
            if (finalCookies.length > 0) {
                console.log('✅ Cookies detectadas, navegando a Udemy...');
            } else {
                console.warn('⚠️ No se detectaron cookies, navegando de todas formas...');
            }
            
            // Mostrar mensaje visual
            document.body.innerHTML = '<div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa;">' +
                '<h2 style="color: #333;">🍪 Transferencia de Cookies Completada</h2>' +
                '<p style="color: #666;">Se procesaron ' + totalCount + ' cookies</p>' +
                '<p style="color: #666;">Establecidas exitosamente: ' + successCount + '</p>' +
                '<p style="color: #666;">Navegando a Udemy en 3 segundos...</p>' +
                '<div style="margin-top: 20px; font-size: 12px; color: #999;">' +
                'Contexto: ' + window.location.hostname +
                '</div></div>';
            
            // Navegar a Udemy
            console.log('🔄 Navegando a Udemy en 1.5 segundos...');
            setTimeout(function() {
                window.location.href = 'https://www.udemy.com';
            }, 1500);
        `;
        
        return script;
    }

    // Generar content script para la extensión
    generateContentScript(cookies) {
        console.log('🍪 Generando content script para extensión con', cookies.length, 'cookies');
        
        const script = `
console.log('🍪 Cookie Injector Extension - Iniciando...');

// Datos de cookies desde Electron
const cookiesData = ${JSON.stringify(cookies)};

console.log('📋 Cookies a establecer:', cookiesData.length);

// Función para establecer cookies usando la API de extensiones
function setCookieViaAPI(cookieData) {
    return new Promise((resolve) => {
        // Preparar objeto cookie para Chrome API
        const cookieDetails = {
            url: 'https://www.udemy.com',
            name: cookieData.name,
            value: cookieData.value,
            domain: cookieData.domain || '.udemy.com',
            path: cookieData.path || '/',
            secure: cookieData.secure !== false, // Default true para HTTPS
            httpOnly: cookieData.httpOnly || false,
            expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 año
        };

        // Usar Chrome API para establecer cookie
        if (typeof chrome !== 'undefined' && chrome.cookies) {
            chrome.cookies.set(cookieDetails, (result) => {
                if (chrome.runtime.lastError) {
                    console.warn('❌ Error estableciendo cookie:', cookieData.name, chrome.runtime.lastError);
                    resolve(false);
                } else {
                    console.log('✅ Cookie establecida vía API:', cookieData.name);
                    resolve(true);
                }
            });
        } else {
            // Fallback: usar document.cookie
            console.log('🔄 Fallback: usando document.cookie para', cookieData.name);
            const cookieString = cookieData.name + '=' + cookieData.value + 
                '; Domain=' + (cookieData.domain || '.udemy.com') +
                '; Path=' + (cookieData.path || '/') +
                '; Expires=' + new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
            
            document.cookie = cookieString;
            
            // Verificar
            const verification = document.cookie.includes(cookieData.name + '=');
            if (verification) {
                console.log('✅ Cookie establecida vía document:', cookieData.name);
            } else {
                console.warn('❌ Cookie NO establecida:', cookieData.name);
            }
            resolve(verification);
        }
    });
}

// Establecer todas las cookies
async function establishCookies() {
    console.log('🚀 Iniciando establecimiento de cookies...');
    
    let successCount = 0;
    
    for (const cookieData of cookiesData) {
        try {
            const success = await setCookieViaAPI(cookieData);
            if (success) successCount++;
        } catch (error) {
            console.error('Error procesando cookie:', cookieData.name, error);
        }
    }
    
    console.log('🎯 Resumen:', successCount, 'de', cookiesData.length, 'cookies establecidas');
    
    // Verificar cookies críticas
    const criticalCookies = ['client_id', 'access_token', 'dj_session_id'];
    console.log('🔍 Verificando cookies críticas en documento:');
    
    criticalCookies.forEach(cookieName => {
        if (document.cookie.includes(cookieName + '=')) {
            console.log('✅', cookieName, 'encontrada en document.cookie');
        } else {
            console.warn('❌', cookieName, 'NO encontrada en document.cookie');
        }
    });
    
    // Recargar página después de establecer cookies
    if (successCount > 0) {
        console.log('🔄 Recargando página para aplicar cookies...');
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

// Ejecutar cuando el documento esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', establishCookies);
} else {
    establishCookies();
}

console.log('🍪 Cookie Injector Extension - Script cargado');
        `;
        
        return script;
    }

    // Inyectar cookies via Chrome DevTools Protocol
    async injectCookiesViaDevTools() {
        if (!this.pendingCookies || this.pendingCookies.length === 0) {
            console.warn('No hay cookies pendientes para inyectar');
            return false;
        }

        try {
            console.log('🔧 Inyectando', this.pendingCookies.length, 'cookies via DevTools Protocol...');

            // Usar fetch para comunicarse con Chrome DevTools Protocol
            const http = require('http');
            
            // Primero obtener las tabs disponibles
            const tabsResponse = await this.makeHttpRequest('http://localhost:9222/json');
            const tabs = JSON.parse(tabsResponse);
            
            if (!tabs || tabs.length === 0) {
                throw new Error('No se encontraron tabs de Chrome');
            }

            // Buscar la tab de Udemy
            const udemyTab = tabs.find(tab => 
                tab.url && tab.url.includes('udemy.com')
            );

            if (!udemyTab) {
                console.warn('No se encontró tab de Udemy, usando la primera tab');
                // Usar la primera tab disponible
                var targetTab = tabs[0];
            } else {
                var targetTab = udemyTab;
            }

            console.log('🎯 Usando tab:', targetTab.url);

            // Para cada cookie, usar Runtime.evaluate para establecerla
            let successCount = 0;
            for (const cookie of this.pendingCookies) {
                try {
                    const success = await this.setCookieViaDevTools(targetTab.webSocketDebuggerUrl, cookie);
                    if (success) successCount++;
                } catch (error) {
                    console.warn('❌ Error estableciendo cookie', cookie.name, ':', error.message);
                }
            }

            console.log('✅ Cookies inyectadas via DevTools:', successCount, 'de', this.pendingCookies.length);

            // Recargar la página para aplicar cookies
            if (successCount > 0) {
                setTimeout(() => {
                    this.reloadViaDevTools(targetTab.webSocketDebuggerUrl);
                }, 1000);
            }

            return successCount > 0;

        } catch (error) {
            console.error('❌ Error inyectando cookies via DevTools:', error);
            return false;
        }
    }

    // Helper para hacer peticiones HTTP
    makeHttpRequest(url) {
        return new Promise((resolve, reject) => {
            const request = require('http').get(url, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => resolve(data));
            });
            request.on('error', reject);
            request.setTimeout(5000, () => {
                request.destroy();
                reject(new Error('Timeout'));
            });
        });
    }

    // Establecer cookie individual via DevTools
    async setCookieViaDevTools(webSocketUrl, cookie) {
        return new Promise((resolve) => {
            const WebSocket = require('ws');
            const ws = new WebSocket(webSocketUrl);

            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    ws.close();
                    resolve(false);
                }
            }, 5000);

            ws.on('open', () => {
                // Escape cookie values properly to avoid JS injection issues
                const escapedName = JSON.stringify(cookie.name);
                const escapedValue = JSON.stringify(cookie.value || '');
                const escapedDomain = JSON.stringify(cookie.domain || '.udemy.com');
                const escapedPath = JSON.stringify(cookie.path || '/');
                
                // Comando para establecer cookie usando document.cookie
                const cookieScript = `
                try {
                    const cookieString = ${escapedName} + '=' + ${escapedValue} +
                        '; Domain=' + ${escapedDomain} +
                        '; Path=' + ${escapedPath} +
                        '; Expires=' + new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
                    
                    console.log('🍪 Estableciendo cookie:', ${escapedName}, 'con valor de longitud:', ${escapedValue}.length);
                    document.cookie = cookieString;
                    
                    // Verificar que se estableció
                    const verification = document.cookie.includes(${escapedName} + '=');
                    console.log('Cookie', ${escapedName}, ':', verification ? 'establecida ✅' : 'falló ❌');
                    verification;
                } catch(e) {
                    console.error('Error estableciendo cookie', ${escapedName}, ':', e);
                    false;
                }
                `;

                const command = {
                    id: 1,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: cookieScript,
                        returnByValue: true
                    }
                };

                ws.send(JSON.stringify(command));
            });

            ws.on('message', (data) => {
                if (!resolved) {
                    try {
                        const response = JSON.parse(data);
                        if (response.id === 1) {
                            resolved = true;
                            clearTimeout(timeout);
                            ws.close();
                            
                            const success = response.result && response.result.value === true;
                            if (success) {
                                console.log('✅ Cookie establecida via DevTools:', cookie.name);
                            } else {
                                console.warn('❌ Cookie NO establecida via DevTools:', cookie.name);
                            }
                            resolve(success);
                        }
                    } catch (error) {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeout);
                            ws.close();
                            resolve(false);
                        }
                    }
                }
            });

            ws.on('error', () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(false);
                }
            });
        });
    }

    // Recargar página via DevTools
    async reloadViaDevTools(webSocketUrl) {
        return new Promise((resolve) => {
            const WebSocket = require('ws');
            const ws = new WebSocket(webSocketUrl);

            ws.on('open', () => {
                const command = {
                    id: 2,
                    method: 'Page.reload'
                };
                ws.send(JSON.stringify(command));
                
                setTimeout(() => {
                    ws.close();
                    resolve(true);
                }, 1000);
            });

            ws.on('error', () => resolve(false));
        });
    }

    // Generar HTML que inyecte las cookies
    generateInjectorHTML(cookies) {
        const script = this.generateStartupScript(cookies);
        
        return `<!DOCTYPE html>
<html>
<head>
    <title>Cookie Injector</title>
    <meta charset="utf-8">
</head>
<body>
    <script>
        ${script}
    </script>
    <div style="display: none;">Cookie injection in progress...</div>
</body>
</html>`;
    }

    // Navegar primero al inyector de cookies y luego a Udemy
    async navigateToInjectorThenUdemy() {
        if (!this.chromeWindow) return false;
        
        try {
            // Obtener ruta del archivo HTML del inyector
            const htmlPath = path.join(path.dirname(this.cookieScriptPath), 'cookie_injector.html');
            const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
            
            console.log('🍪 Navegando a inyector de cookies...');
            
            // Navegar a la página del inyector usando Ctrl+L
            const psCommand = `
                Add-Type -AssemblyName System.Windows.Forms;
                $wshell = New-Object -ComObject wscript.shell;
                
                # Enfocar ventana de Chrome
                $wshell.AppActivate(${this.chromeWindow.pid});
                Start-Sleep -Milliseconds 500;
                
                # Abrir barra de direcciones
                $wshell.SendKeys("^l");
                Start-Sleep -Milliseconds 200;
                
                # Escribir URL del inyector
                $wshell.SendKeys("${fileUrl}");
                Start-Sleep -Milliseconds 200;
                
                # Presionar Enter
                $wshell.SendKeys("{ENTER}");
            `;
            
            await new Promise((resolve) => {
                exec(`powershell -Command "${psCommand}"`, (error) => {
                    if (!error) {
                        console.log('✅ Navegando al inyector de cookies');
                    }
                    resolve();
                });
            });
            
            // La navegación se maneja automáticamente desde el script de cookies
            console.log('✅ Inyector de cookies iniciado, navegación automática en 3 segundos...');
            
            return true;
            
        } catch (error) {
            console.error('❌ Error navegando al inyector:', error);
            return false;
        }
    }
    
    // Navegar a Udemy después de inyectar cookies
    async navigateToUdemyAfterCookies() {
        if (!this.chromeWindow) return false;
        
        console.log('🔄 Navegando a Udemy con cookies aplicadas...');
        
        const psCommand = `
            Add-Type -AssemblyName System.Windows.Forms;
            $wshell = New-Object -ComObject wscript.shell;
            
            # Enfocar ventana de Chrome
            $wshell.AppActivate(${this.chromeWindow.pid});
            Start-Sleep -Milliseconds 500;
            
            # Abrir barra de direcciones
            $wshell.SendKeys("^l");
            Start-Sleep -Milliseconds 200;
            
            # Escribir URL de Udemy
            $wshell.SendKeys("https://www.udemy.com");
            Start-Sleep -Milliseconds 200;
            
            # Presionar Enter
            $wshell.SendKeys("{ENTER}");
        `;
        
        return new Promise((resolve) => {
            exec(`powershell -Command "${psCommand}"`, (error) => {
                if (!error) {
                    console.log('✅ Navegado a Udemy con sesión transferida');
                }
                resolve(!error);
            });
        });
    }

    // Hacer que Chrome sea borderless (sin bordes ni barra de título)
    async makeBorderless() {
        if (!this.chromeWindow) {
            return false;
        }

        const psCommand = `
            Add-Type -TypeDefinition '
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                    [DllImport("user32.dll")]
                    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
                    [DllImport("user32.dll")]
                    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
                    [DllImport("user32.dll")]
                    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
                }
            ';
            
            $handle = [IntPtr]${this.chromeWindow.handle};
            
            # Obtener y modificar el estilo de ventana
            $GWL_STYLE = -16;
            $WS_BORDER = 0x00800000;
            $WS_DLGFRAME = 0x00400000;
            $WS_THICKFRAME = 0x00040000;
            $WS_MINIMIZE = 0x20000000;
            $WS_MAXIMIZE = 0x01000000;
            $WS_SYSMENU = 0x00080000;
            $WS_CAPTION = 0x00C00000;
            
            $currentStyle = [Win32]::GetWindowLong($handle, $GWL_STYLE);
            $newStyle = $currentStyle -band (-bnot ($WS_BORDER -bor $WS_DLGFRAME -bor $WS_THICKFRAME -bor $WS_MINIMIZE -bor $WS_MAXIMIZE -bor $WS_SYSMENU -bor $WS_CAPTION));
            [Win32]::SetWindowLong($handle, $GWL_STYLE, $newStyle);
            
            # Refresh ventana para aplicar cambios
            [Win32]::SetWindowPos($handle, [IntPtr]::Zero, 0, 0, 0, 0, 0x0027);
        `;

        return new Promise((resolve) => {
            exec(`powershell -Command "${psCommand}"`, (error) => {
                if (!error) {
                    console.log('✅ Chrome configurado como borderless');
                }
                resolve(!error);
            });
        });
    }

    // Posicionar ventana Chrome en coordenadas específicas
    async positionChromeWindow(x, y, width, height) {
        if (!this.chromeWindow) {
            console.error('Chrome window not found');
            return false;
        }

        const psCommand = `
            Add-Type -TypeDefinition '
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                    [DllImport("user32.dll")]
                    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
                    [DllImport("user32.dll")]
                    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                }
            ';
            
            $handle = [IntPtr]${this.chromeWindow.handle};
            
            # Posicionar y mostrar ventana
            [Win32]::SetWindowPos($handle, [IntPtr](-1), ${x}, ${y}, ${width}, ${height}, 0x0040);
            [Win32]::ShowWindow($handle, 1);
        `;

        return new Promise((resolve) => {
            exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error positioning Chrome window:', error);
                    resolve(false);
                } else {
                    console.log(`Chrome positioned at: ${x},${y} ${width}x${height}`);
                    resolve(true);
                }
            });
        });
    }

    // Navegar a nueva URL
    async navigateToUrl(url) {
        this.targetUrl = url;
        
        if (!this.isActive) {
            return await this.launchChrome(url);
        }

        // En modo --app, necesitamos cerrar y reabrir con nueva URL
        console.log('🔄 Navegando en modo app - reiniciando Chrome con nueva URL...');
        
        // Cerrar Chrome actual
        if (this.chromeProcess) {
            this.chromeProcess.kill();
            this.isActive = false;
        }
        
        // Esperar un momento y relanzar con nueva URL
        setTimeout(async () => {
            await this.launchChrome(url);
        }, 1000);
        
        return true;
    }

    // Controles de navegación
    async goBack() {
        if (!this.isActive) return false;
        
        const psCommand = `
            $wshell = New-Object -ComObject wscript.shell;
            $wshell.SendKeys("%{LEFT}");
        `;
        
        exec(`powershell -Command "${psCommand}"`);
        return true;
    }

    async goForward() {
        if (!this.isActive) return false;
        
        const psCommand = `
            $wshell = New-Object -ComObject wscript.shell;
            $wshell.SendKeys("%{RIGHT}");
        `;
        
        exec(`powershell -Command "${psCommand}"`);
        return true;
    }

    async reload() {
        if (!this.isActive) return false;
        
        const psCommand = `
            $wshell = New-Object -ComObject wscript.shell;
            $wshell.SendKeys("{F5}");
        `;
        
        exec(`powershell -Command "${psCommand}"`);
        return true;
    }

    // Ocultar/mostrar ventana Chrome
    async hideChrome() {
        if (!this.chromeWindow) return false;

        const psCommand = `
            Add-Type -TypeDefinition '
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                    [DllImport("user32.dll")]
                    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                }
            ';
            
            $handle = [IntPtr]${this.chromeWindow.handle};
            [Win32]::ShowWindow($handle, 0);
        `;

        exec(`powershell -Command "${psCommand}"`);
        return true;
    }

    async showChrome() {
        if (!this.chromeWindow) return false;

        const psCommand = `
            Add-Type -TypeDefinition '
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                    [DllImport("user32.dll")]
                    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                    [DllImport("user32.dll")]
                    public static extern bool SetForegroundWindow(IntPtr hWnd);
                }
            ';
            
            $handle = [IntPtr]${this.chromeWindow.handle};
            [Win32]::ShowWindow($handle, 1);
            [Win32]::SetForegroundWindow($handle);
        `;

        exec(`powershell -Command "${psCommand}"`);
        return true;
    }

    // Cleanup - cerrar Chrome cuando se cierre Electron
    async cleanup() {
        if (this.chromeProcess && this.isActive) {
            try {
                this.chromeProcess.kill();
                this.chromeProcess = null;
                this.chromeWindow = null;
                this.isActive = false;
                console.log('Chrome process cleaned up');
            } catch (error) {
                console.error('Error cleaning up Chrome process:', error);
            }
        }

        // Limpiar perfil temporal
        if (this.tempProfilePath && fs.existsSync(this.tempProfilePath)) {
            try {
                await this.deleteTempProfile(this.tempProfilePath);
                console.log('✅ Perfil temporal de Chrome eliminado:', this.tempProfilePath);
                this.tempProfilePath = null;
            } catch (error) {
                console.error('❌ Error eliminando perfil temporal:', error);
                // Intentar borrarlo con PowerShell como respaldo
                this.deleteTempProfileFallback(this.tempProfilePath);
            }
        }
    }

    // Función auxiliar para eliminar directorio recursivamente
    async deleteTempProfile(dirPath) {
        return new Promise((resolve, reject) => {
            // Usar PowerShell para forzar eliminación
            const psCommand = `Remove-Item -Path '${dirPath}' -Recurse -Force -ErrorAction SilentlyContinue`;
            
            exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    // Función de respaldo para eliminar perfil temporal
    deleteTempProfileFallback(dirPath) {
        // Intentar con rmdir de Windows
        exec(`rmdir /s /q "${dirPath}"`, (error) => {
            if (error) {
                console.warn('⚠️ No se pudo eliminar automáticamente el perfil temporal:', dirPath);
                console.warn('El directorio se limpiará automáticamente al reiniciar el sistema');
            } else {
                console.log('✅ Perfil temporal eliminado con rmdir');
            }
        });
    }

    // Sincronizar posición con ventana Electron
    syncWithElectron(electronWindow) {
        this.electronWindow = electronWindow;
        
        // Listener para cuando Electron se mueve
        electronWindow.on('move', () => {
            this.updateChromePosition();
        });

        // Listener para cuando Electron se redimensiona
        electronWindow.on('resize', () => {
            this.updateChromePosition();
        });

        // Listener para cuando Electron se minimiza/maximiza
        electronWindow.on('minimize', () => {
            this.hideChrome();
        });

        electronWindow.on('restore', () => {
            this.showChrome();
            setTimeout(() => this.updateChromePosition(), 100);
        });
    }

    async updateChromePosition() {
        if (!this.electronWindow || !this.chromeWindow) return;

        const bounds = this.electronWindow.getBounds();
        
        // Posicionar Chrome en la región donde debería estar el "embed"
        const chromeX = bounds.x + 20; // margen desde la izquierda
        const chromeY = bounds.y + 100; // debajo del header de Electron
        const chromeWidth = 400; // ancho del "embed"
        const chromeHeight = 300; // alto del "embed"

        await this.positionChromeWindow(chromeX, chromeY, chromeWidth, chromeHeight);
    }
}

module.exports = ChromeController;