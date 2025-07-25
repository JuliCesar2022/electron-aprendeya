const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class SimpleChromeController {
    constructor() {
        this.chromeProcess = null;
        this.isActive = false;
    }

    // Encontrar Chrome
    async findChrome() {
        const paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
            '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
        ];

        for (const chromePath of paths) {
            try {
                if (fs.existsSync(chromePath)) {
                    return chromePath;
                }
            } catch (error) {
                continue;
            }
        }
        throw new Error('Chrome no encontrado');
    }

    // Crear perfil con cookies
    async createProfileWithCookies(cookies) {
        const os = require('os');
        const profilePath = path.join(os.tmpdir(), 'chrome-udemy-' + Date.now());
        
        // Crear directorio del perfil
        fs.mkdirSync(profilePath, { recursive: true });
        
        if (cookies && cookies.length > 0) {
            
            // Crear archivo de cookies en formato Chrome
            const cookiesPath = path.join(profilePath, 'Default');
            fs.mkdirSync(cookiesPath, { recursive: true });
            
            // Crear script de startup que inyecte cookies
            const startupScript = this.generateCookieScript(cookies);
            const scriptPath = path.join(profilePath, 'startup.js');
            fs.writeFileSync(scriptPath, startupScript);
            
        }
        
        return profilePath;
    }

    // Generar script simple para cookies
    generateCookieScript(cookies) {
        
        for (const cookie of cookies) {
            const name = cookie.name || '';
            const value = cookie.value || '';
            const domain = cookie.domain || '.udemy.com';
            
            script += `
try {
    document.cookie = "${name}=${value}; domain=${domain}; path=/; expires=" + new Date(Date.now() + 365*24*60*60*1000).toUTCString();
} catch(e) {
}
`;
        }
        
        script += `
setTimeout(() => {
    if (window.location.hostname !== "www.udemy.com") {
        window.location.href = "https://www.udemy.com";
    }
}, 1000);
`;
        
        return script;
    }

    // Lanzar Chrome SIMPLE
    async launch(cookies = null) {
        try {
            const chromePath = await this.findChrome();
            const profilePath = await this.createProfileWithCookies(cookies);
            
            const args = [
                '--user-data-dir=' + profilePath,
                '--no-first-run',
                '--no-default-browser-check',
             
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor',
                'https://www.udemy.com'
            ];


            this.chromeProcess = spawn(chromePath, args, {
                detached: false,
                stdio: 'ignore'
            });

            this.chromeProcess.on('close', (code) => {
                this.isActive = false;
                this.chromeProcess = null;
            });

            this.chromeProcess.on('error', (error) => {
                this.isActive = false;
            });

            this.isActive = true;

            // Después de 5 segundos, inyectar cookies via JavaScript
            if (cookies && cookies.length > 0) {
                setTimeout(() => {
                    this.injectCookiesSimple(cookies);
                }, 5000);
            }

            return true;

        } catch (error) {
            return false;
        }
    }

    // Método simple para inyectar cookies
    async injectCookiesSimple(cookies) {
        
        // Crear HTML temporal con las cookies
        const os = require('os');
        const htmlPath = path.join(os.tmpdir(), 'cookies-injector-' + Date.now() + '.html');
        
        let cookieCode = '';
        for (const cookie of cookies) {
            cookieCode += `
                document.cookie = "${cookie.name}=${cookie.value}; domain=${cookie.domain || '.udemy.com'}; path=/; expires=" + new Date(Date.now() + 365*24*60*60*1000).toUTCString();
            `;
        }

        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Transferindo cookies...</title>
</head>
<body>
    <h1>Transferindo cookies a Chrome...</h1>
    <p>Esto debería tomar solo unos segundos...</p>
    <script>
        ${cookieCode}
        
        setTimeout(() => {
            window.location.href = "https://www.udemy.com";
        }, 2000);
    </script>
</body>
</html>`;

        fs.writeFileSync(htmlPath, html);
        
        // Abrir el HTML en Chrome existente (si es posible)
        // Esto es un fallback simple
        return true;
    }

    // Cerrar Chrome
    async close() {
        if (this.chromeProcess && this.isActive) {
            try {
                this.chromeProcess.kill();
                this.chromeProcess = null;
                this.isActive = false;
                return true;
            } catch (error) {
                return false;
            }
        }
        return true;
    }

    // Estado
    getStatus() {
        return {
            isActive: this.isActive,
            hasProcess: !!this.chromeProcess
        };
    }
}

module.exports = SimpleChromeController;