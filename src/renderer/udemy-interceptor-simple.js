/**
 * Udemy Interceptor - Versión simple para WebView
 * Incluye toda la funcionalidad necesaria sin imports ES6
 */

console.log('🚀 Udemy Interceptor simple cargando...', window.location.href);

// === CLASE PRINCIPAL DEL INTERCEPTOR ===
class UdemyInterceptorSimple {
    constructor() {
        this.isActive = false;
        this.modifications = new Map();
        this.observer = null;
        this.lastExecution = 0;
        this.throttleDelay = 500;
        
        this.init();
    }
    
    async init() {
        // Verificar si estamos en Udemy
        if (!window.location.hostname.includes('udemy.com')) {
            return;
        }
        
        console.log('🎯 Inicializando interceptor en Udemy...');
        
        // Configurar modificaciones de usuario
        this.setupUserModifications();
        
        // Iniciar observador DOM
        this.startDOMObserver();
        
        // Activar interceptor
        this.isActive = true;
        
        // Aplicar modificaciones iniciales
        setTimeout(() => this.applyAllModifications(), 1000);
        
        console.log('✅ Interceptor simple inicializado');
    }
    
    setupUserModifications() {
        // Detectar usuario desde cookies
        const fullname = this.getCookieValue('user_fullname');
        
        if (fullname && fullname !== 'null' && fullname !== '') {
            console.log('👤 Usuario detectado:', fullname);
            this.configureUserModifications(fullname);
        } else {
            // Intentar desde localStorage
            try {
                const localFullname = localStorage.getItem('user_fullname');
                if (localFullname && localFullname !== 'null' && localFullname !== '') {
                    console.log('👤 Usuario detectado desde localStorage:', localFullname);
                    this.configureUserModifications(localFullname);
                }
            } catch (error) {
                console.warn('⚠️ No se pudo detectar usuario');
            }
        }
    }
    
    configureUserModifications(fullname) {
        console.log('🔧 Configurando modificaciones para:', fullname);
        
        // Saludo principal
        this.addModification({
            id: 'greeting-main',
            selector: '.user-occupation-header-module--user-details--kJD-k h3',
            pattern: /Hola de nuevo, .+/,
            replacement: `Hola de nuevo, ${fullname}`,
            description: 'Saludo principal'
        });
        
        // Variaciones del saludo
        this.addModification({
            id: 'greeting-variations',
            selector: 'h1, h2, h3, h4',
            pattern: /Hola(?:\s+de\s+nuevo)?,?\s+\w+/,
            replacement: `Hola de nuevo, ${fullname}`,
            description: 'Variaciones del saludo'
        });
        
        // Header con diferentes selectores
        this.addModification({
            id: 'user-header',
            selector: '[class*="user-occupation-header"] h3, [class*="user-details"] h3',
            pattern: /Hola\s+(de\s+nuevo,?\s*)?[^,\n]+/,
            replacement: `Hola de nuevo, ${fullname}`,
            description: 'Saludo en header'
        });
        
        // Avatar inicial
        const initial = fullname.trim().charAt(0).toUpperCase();
        this.addModification({
            id: 'avatar-initial',
            selector: '[data-purpose="display-initials"]',
            pattern: /^[A-Z]$/,
            replacement: initial,
            description: `Avatar inicial: ${initial}`
        });
        
        console.log(`✅ Configuradas ${this.modifications.size} modificaciones para ${fullname}`);
    }
    
    addModification(config) {
        // Validar configuración
        if (!config.id || !config.selector || !config.pattern || !config.replacement) {
            console.error('❌ Configuración de modificación inválida:', config);
            return false;
        }
        
        // Convertir patrón a RegExp si es string
        if (typeof config.pattern === 'string') {
            config.pattern = new RegExp(config.pattern, 'gi');
        }
        
        // Marcar como habilitado por defecto
        config.enabled = config.enabled !== false;
        
        this.modifications.set(config.id, config);
        console.log(`➕ Modificación agregada: ${config.id} - ${config.description}`);
        return true;
    }
    
    applyAllModifications() {
        if (!this.isActive) return 0;
        
        let totalModified = 0;
        
        // Reconfigurar usuario (por si cambió la página)
        this.setupUserModifications();
        
        for (const [id, config] of this.modifications) {
            if (config.enabled) {
                const modified = this.applyModification(config);
                totalModified += modified;
            }
        }
        
        if (totalModified > 0) {
            console.log(`✅ Aplicadas ${totalModified} modificaciones`);
        }
        
        return totalModified;
    }
    
    applyModification(config) {
        try {
            const elements = document.querySelectorAll(config.selector);
            let modified = 0;
            
            elements.forEach((element, index) => {
                if (this.shouldSkipElement(element, config.id)) {
                    return;
                }
                
                const currentText = element.textContent || element.innerText || '';
                
                if (config.pattern.test(currentText)) {
                    const newText = currentText.replace(config.pattern, config.replacement);
                    
                    if (newText !== currentText) {
                        element.textContent = newText;
                        this.markElementAsModified(element, config.id);
                        modified++;
                        console.log(`🔄 [${config.id}] "${currentText}" → "${newText}"`);
                    }
                }
            });
            
            return modified;
            
        } catch (error) {
            console.error(`❌ Error aplicando modificación ${config.id}:`, error);
            return 0;
        }
    }
    
    shouldSkipElement(element, modificationId) {
        // Elemento ya modificado
        if (element.dataset && element.dataset.udemyInterceptorModified === modificationId) {
            return true;
        }
        
        // Elemento oculto
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return true;
        }
        
        // Elementos de script, style, etc.
        const skipTags = ['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE'];
        if (skipTags.includes(element.tagName)) {
            return true;
        }
        
        return false;
    }
    
    markElementAsModified(element, modificationId) {
        try {
            element.dataset.udemyInterceptorModified = modificationId;
            element.dataset.udemyInterceptorTimestamp = Date.now().toString();
        } catch (error) {
            // Ignorar errores de dataset
        }
    }
    
    startDOMObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        console.log('👁️ DOM Observer iniciado');
    }
    
    handleMutations(mutations) {
        if (!this.isActive) return;
        
        // Throttling para evitar demasiadas ejecuciones
        const now = Date.now();
        if (now - this.lastExecution < this.throttleDelay) {
            return;
        }
        
        // Verificar si hay mutaciones relevantes
        const hasRelevantChanges = mutations.some(mutation => {
            return mutation.type === 'childList' || 
                   (mutation.type === 'characterData' && mutation.target.textContent);
        });
        
        if (hasRelevantChanges) {
            this.lastExecution = now;
            setTimeout(() => this.applyAllModifications(), 100);
        }
    }
    
    getCookieValue(name) {
        try {
            const cookies = document.cookie.split(';').map(c => c.trim());
            for (const cookie of cookies) {
                if (cookie.startsWith(name + '=')) {
                    return decodeURIComponent(cookie.split('=')[1]);
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    
    // Métodos públicos para control
    toggle() {
        this.isActive = !this.isActive;
        console.log(`🔄 Interceptor ${this.isActive ? 'activado' : 'desactivado'}`);
        
        if (this.isActive) {
            setTimeout(() => this.applyAllModifications(), 100);
        }
        
        return this.isActive;
    }
    
    forceModifications() {
        console.log('⚡ Forzando aplicación de modificaciones...');
        this.lastExecution = 0;
        return this.applyAllModifications();
    }
    
    getStatus() {
        return {
            isActive: this.isActive,
            totalModifications: this.modifications.size,
            enabledModifications: Array.from(this.modifications.values()).filter(m => m.enabled).length,
            lastExecution: this.lastExecution
        };
    }
    
    listModifications() {
        console.group('📝 Modificaciones Activas');
        for (const [id, config] of this.modifications) {
            console.log(`${config.enabled ? '✅' : '❌'} ${id}: ${config.description}`);
        }
        console.groupEnd();
    }
}

// === INICIALIZACIÓN ===
let interceptorInstance = null;

// Función de inicialización
function initializeInterceptor() {
    if (interceptorInstance) {
        console.log('⚠️ Interceptor ya inicializado');
        return interceptorInstance;
    }
    
    try {
        interceptorInstance = new UdemyInterceptorSimple();
        
        // Configurar funciones globales
        window.toggleInterceptor = () => interceptorInstance.toggle();
        window.forceModifications = () => interceptorInstance.forceModifications();
        window.getInterceptorStatus = () => interceptorInstance.getStatus();
        window.listModifications = () => interceptorInstance.listModifications();
        
        // Objeto global para compatibilidad
        window.UdemyInterceptor = {
            toggle: () => interceptorInstance.toggle(),
            force: () => interceptorInstance.forceModifications(),
            getStatus: () => interceptorInstance.getStatus(),
            instance: interceptorInstance
        };
        
        return interceptorInstance;
        
    } catch (error) {
        console.error('❌ Error inicializando interceptor:', error);
        return null;
    }
}

// === INICIO AUTOMÁTICO ===
// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeInterceptor, 1000);
    });
} else {
    setTimeout(initializeInterceptor, 1000);
}

// === FUNCIONES LEGACY PARA BRAVE ===
window.openCourseInBrave = async function(courseUrl) {
    console.log('🎓 Abriendo curso en Brave:', courseUrl);
    
    try {
        if (window.electronAPI) {
            const success = await window.electronAPI.invoke('chrome-launch-course', courseUrl);
            
            if (success) {
                console.log('✅ Curso abierto en Brave');
                return true;
            }
        }
        
        console.error('❌ Error abriendo curso en Brave');
        return false;
        
    } catch (error) {
        console.error('❌ Error:', error);
        return false;
    }
};

console.log('📦 Udemy Interceptor Simple cargado y listo');