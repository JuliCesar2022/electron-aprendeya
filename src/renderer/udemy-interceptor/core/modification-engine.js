/**
 * Modification Engine - Motor de modificaciones de texto
 * 
 * Maneja todas las transformaciones de texto en la página de Udemy,
 * incluyendo patrones, reglas de modificación y aplicación de cambios.
 */

/**
 * Clase que maneja el motor de modificaciones de texto
 */
export class ModificationEngine {
    constructor() {
        this.modifications = new Map();
        this.lastCacheUpdate = null;
        this.isEnabled = true;
        
        this.initializeDefaultModifications();
    }
    
    /**
     * Inicializa las modificaciones por defecto
     */
    initializeDefaultModifications() {
        // Detectar usuario y configurar modificaciones personalizadas
        this.checkAndSetupUser();
        
        // Modificación de saludo principal
        this.addModification({
            id: 'greeting-main',
            selector: 'h1, h2, h3, h4, h5, h6',
            type: 'text',
            originalPattern: /^Hola de nuevo, (.+)$/i,
            newContent: (match, name) => `Hola de nuevo, ${name}`,
            description: 'Saludo principal del usuario'
        });
        
        // Modificación de saludo en dropdown
        this.addModification({
            id: 'greeting-dropdown',
            selector: '[data-purpose*="greeting"], [class*="user"] h3, .user-occupation-header-module--user-details--kJD-k h3',
            type: 'text',
            originalPattern: /^Hola (.+)$/i,
            newContent: (match, name) => `Hola ${name}`,
            description: 'Saludo en menú desplegable'
        });
        
        // Modificación de elementos con "Hello" en inglés
        this.addModification({
            id: 'hello-english',
            selector: 'h1, h2, h3, h4, h5, h6, span, div',
            type: 'text',
            originalPattern: /^Hello,?\s+(.+)$/i,
            newContent: (match, name) => `Hola ${name}`,
            description: 'Convertir Hello a Hola'
        });
    }
    
    /**
     * Añade una nueva modificación
     * @param {Object} config - Configuración de la modificación
     */
    addModification(config) {
        const requiredFields = ['id', 'selector', 'type', 'originalPattern', 'newContent'];
        
        // Validar campos requeridos
        for (const field of requiredFields) {
            if (!config[field]) {
                return false;
            }
        }
        
        // Convertir pattern a RegExp si es string
        if (typeof config.originalPattern === 'string') {
            config.originalPattern = new RegExp(config.originalPattern, 'i');
        }
        
        // Añadir timestamp
        config.createdAt = Date.now();
        config.enabled = config.enabled !== false; // Default true
        
        this.modifications.set(config.id, config);
        
        return true;
    }
    
    /**
     * Elimina una modificación
     * @param {string} id - ID de la modificación
     */
    removeModification(id) {
        if (this.modifications.has(id)) {
            this.modifications.delete(id);
            return true;
        }
        return false;
    }
    
    /**
     * Habilita o deshabilita una modificación
     * @param {string} id - ID de la modificación
     * @param {boolean} enabled - Estado habilitado
     */
    toggleModification(id, enabled) {
        const config = this.modifications.get(id);
        if (config) {
            config.enabled = enabled;
            return true;
        }
        return false;
    }
    
    /**
     * Aplica una modificación específica a elementos que coincidan
     * @param {Object} config - Configuración de la modificación
     * @returns {number} Número de elementos modificados
     */
    applyModification(config) {
        if (!config.enabled || !this.isEnabled) {
            return 0;
        }
        
        try {
            const elements = document.querySelectorAll(config.selector);
            let modified = 0;
            
            elements.forEach((element, index) => {
                if (this.shouldSkipElement(element)) {
                    return;
                }
                
                const currentText = this.getElementText(element);
                if (!currentText || currentText.length === 0) {
                    return;
                }
                
                // Verificar si el texto coincide con el patrón
                const match = currentText.match(config.originalPattern);
                if (!match) {
                    return;
                }
                
                // Generar nuevo contenido
                let newContent;
                if (typeof config.newContent === 'function') {
                    newContent = config.newContent.apply(null, match);
                } else {
                    newContent = config.newContent;
                }
                
                // Aplicar cambio si es diferente
                if (newContent && newContent !== currentText) {
                    this.setElementText(element, newContent);
                    this.markElementAsModified(element, config.id);
                    modified++;
                    
                }
            });
            
            return modified;
            
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Aplica todas las modificaciones habilitadas
     * @returns {number} Total de elementos modificados
     */
    applyAllModifications() {
        if (!this.isEnabled) {
            return 0;
        }
        
        let totalModified = 0;
        
        // Verificar si necesita actualizar cache
        this.checkAndUpdateCourseModifications();
        
        // Aplicar cada modificación
        for (const [id, config] of this.modifications) {
            const modified = this.applyModification(config);
            totalModified += modified;
        }
        
        if (totalModified > 0) {
        }
        
        return totalModified;
    }
    
    /**
     * Verifica y actualiza modificaciones de cursos si es necesario
     */
    checkAndUpdateCourseModifications() {
        if (window.lastCacheUpdate && (Date.now() - window.lastCacheUpdate) > 120000) {
            // Esta función se podría expandir para actualizar modificaciones dinámicas
        }
    }
    
    /**
     * Obtiene el texto de un elemento de forma segura
     * @param {Element} element - Elemento DOM
     * @returns {string} Texto del elemento
     */
    getElementText(element) {
        try {
            return element.textContent || element.innerText || '';
        } catch (error) {
            return '';
        }
    }
    
    /**
     * Establece el texto de un elemento de forma segura
     * @param {Element} element - Elemento DOM
     * @param {string} text - Nuevo texto
     */
    setElementText(element, text) {
        try {
            if (element.textContent !== undefined) {
                element.textContent = text;
            } else if (element.innerText !== undefined) {
                element.innerText = text;
            }
        } catch (error) {
        }
    }
    
    /**
     * Verifica si un elemento debe ser omitido
     * @param {Element} element - Elemento DOM
     * @returns {boolean} True si debe omitirse
     */
    shouldSkipElement(element) {
        if (!element || !element.tagName) {
            return true;
        }
        
        // Omitir elementos ya modificados recientemente
        const lastModified = element.dataset.udemyInterceptorModified;
        if (lastModified && (Date.now() - parseInt(lastModified)) < 1000) {
            return true;
        }
        
        // Omitir elementos ocultos
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return true;
        }
        
        // Omitir elementos de script, style, etc.
        const skipTags = ['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE'];
        if (skipTags.includes(element.tagName)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Marca un elemento como modificado
     * @param {Element} element - Elemento DOM
     * @param {string} modificationId - ID de la modificación aplicada
     */
    markElementAsModified(element, modificationId) {
        try {
            element.dataset.udemyInterceptorModified = Date.now().toString();
            element.dataset.udemyInterceptorModificationid = modificationId;
        } catch (error) {
            // Ignorar errores de dataset en elementos que no lo soportan
        }
    }
    
    /**
     * Lista todas las modificaciones y su estado
     */
    listModifications() {
        console.group('📝 Modificaciones Registradas');
        
        if (this.modifications.size === 0) {
        } else {
            for (const [id, config] of this.modifications) {
            }
        }
        
        console.groupEnd();
    }
    
    /**
     * Habilita o deshabilita todo el motor
     * @param {boolean} enabled - Estado habilitado
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    
    /**
     * Obtiene estadísticas del motor
     * @returns {Object} Estadísticas
     */
    getStats() {
        const enabledCount = Array.from(this.modifications.values())
            .filter(config => config.enabled).length;
            
        return {
            totalModifications: this.modifications.size,
            enabledModifications: enabledCount,
            disabledModifications: this.modifications.size - enabledCount,
            isEngineEnabled: this.isEnabled,
            lastCacheUpdate: this.lastCacheUpdate
        };
    }
    
    /**
     * Obtiene el valor de una cookie
     * @param {string} name - Nombre de la cookie
     * @returns {string|null} Valor de la cookie o null si no existe
     */
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
    
    /**
     * Detecta y configura modificaciones para el usuario actual
     */
    checkAndSetupUser() {
        // Verificar si hay información de usuario en cookies
        const fullname = this.getCookieValue('user_fullname');
        
        if (fullname && fullname !== 'null' && fullname !== '') {
            this.setupUserModifications(fullname);
            return true;
        }
        
        // Verificar también el localStorage como backup
        try {
            const localFullname = localStorage.getItem('user_fullname');
            if (localFullname && localFullname !== 'null' && localFullname !== '') {
                this.setupUserModifications(localFullname);
                return true;
            }
        } catch (error) {
        }
        
        return false;
    }
    
    /**
     * Configura modificaciones específicas para un usuario
     * @param {string} fullname - Nombre completo del usuario
     */
    setupUserModifications(fullname) {
        
        // Saludo principal en header de usuario
        this.addModification({
            id: 'greeting-modification',
            selector: '.user-occupation-header-module--user-details--kJD-k h3.ud-heading-xl, .user-occupation-header-module--user-details--kJD-k h3',
            type: 'text',
            originalPattern: /Hola de nuevo, .+/,
            newContent: `Hola de nuevo, ${fullname}`,
            description: `Cambiar saludo personal por "Hola de nuevo, ${fullname}"`,
            priority: 'high'
        });
        
        // Variaciones del saludo
        this.addModification({
            id: 'greeting-variations',
            selector: 'h1, h2, h3, h4',
            type: 'text',
            originalPattern: /Hola(?:\s+de\s+nuevo)?,?\s+\w+/,
            newContent: `Hola de nuevo, ${fullname}`,
            description: `Cambiar variaciones del saludo a "Hola de nuevo, ${fullname}"`,
            priority: 'high'
        });
        
        // Saludo en header de usuario con diferentes selectores
        this.addModification({
            id: 'user-header-greeting',
            selector: '[class*="user-occupation-header"] h3, [class*="user-details"] h3, [data-purpose*="greeting"] h3',
            type: 'text',
            originalPattern: /Hola\s+(de\s+nuevo,?\s*)?[^,\n]+/,
            newContent: `Hola de nuevo, ${fullname}`,
            description: 'Saludo en header de usuario',
            priority: 'high'
        });
        
        // Nombre en navbar/dropdown
        this.addModification({
            id: 'navbar-name',
            selector: '[data-purpose="user-dropdown"] span, .header-user-menu span, [class*="user-name"]',
            type: 'text',
            originalPattern: /^[A-Za-z\s]+$/,
            newContent: fullname,
            description: 'Cambiar nombre en navbar',
            priority: 'medium'
        });
        
        // Avatar inicial
        const initial = fullname?.trim()?.charAt(0)?.toUpperCase() || 'U';
        this.addModification({
            id: 'avatar-initial',
            selector: '[data-purpose="display-initials"]',
            type: 'text',
            originalPattern: /^[A-Z]$/,
            newContent: initial,
            description: `Cambiar inicial del avatar por "${initial}"`,
            priority: 'high'
        });
        
    }
}