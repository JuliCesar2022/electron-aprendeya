/**
 * Udemy Interceptor - Versión simple para WebView
 * Incluye toda la funcionalidad necesaria sin imports ES6
 */


// === CLASE PRINCIPAL DEL INTERCEPTOR ===
class UdemyInterceptorSimple {
    constructor() {

        this.isActive = false;
        this.modifications = new Map();
        this.observer = null;
        this.lastExecution = 0;
        this.throttleDelay = 500;
        this.backendURL = 'https://aprendeya-backend.forif.co/api/v1/';
        
        // Sin cola de acciones - comunicación directa con Electron
        
        // Cooldown para evitar clicks múltiples rápidos
        this.lastSaveTime = 0;
        this.saveCooldown = 0; // Sin cooldown entre saves
        
        // Flag para evitar duplicación de botones de inscripción
        this.enrollButtonReplaced = false;
        
        this.init();
    }
    
    async init() {
        // Verificar si estamos en Udemy
        if (!window.location.hostname.includes('udemy.com')) {
            return;
        }
        
        // Limpiar interceptor anterior si existe
        if (window.udemyInterceptorInstance && window.udemyInterceptorInstance.cleanup) {
            window.udemyInterceptorInstance.cleanup();
        }
        
        // Configurar modificaciones de usuario
        this.setupUserModifications();
        
        // Configurar interceptors de botones
        this.setupButtonInterceptors();
        
        // Iniciar observador DOM
        this.startDOMObserver();
        
        // Registrar instancia global para cleanup futuro
        window.udemyInterceptorInstance = this;
        
        // Activar interceptor
        this.isActive = true;
        
        // Aplicar modificaciones iniciales con más delay para asegurar carga
        setTimeout(() => {
            this.applyAllModifications();
        }, 2000);
        
    }
    
    setupUserModifications() {
        
        // Detectar usuario desde cookies
        const fullname = this.getCookieValue('user_fullname');
        
        if (fullname && fullname !== 'null' && fullname !== '') {
            this.configureUserModifications(fullname);
            return;
        }
        
        // Intentar desde localStorage
        try {
            const localFullname = localStorage.getItem('user_fullname');
            if (localFullname && localFullname !== 'null' && localFullname !== '') {
                this.configureUserModifications(localFullname);
                return;
            }
        } catch (error) {
        }
        
        // Agregar algunas modificaciones genéricas para probar
        this.addGenericModifications();
    }
    
    configureUserModifications(fullname) {
        
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
        
    }
    
    addGenericModifications() {
        
        // Modificación de prueba para cualquier h1
        this.addModification({
            id: 'test-h1',
            selector: 'h1',
            pattern: /^(.+)$/,
            replacement: '$1 [TEST]',
            description: 'Modificación de prueba para H1'
        });
        
        // Modificación de prueba para títulos de curso
        this.addModification({
            id: 'test-course-title',
            selector: '[data-purpose="course-title-url"] h3, .course-card-title',
            pattern: /^(.+)$/,
            replacement: '$1 ⭐',
            description: 'Modificación de prueba para títulos de cursos'
        });
    }
    
    addModification(config) {
        // Validar configuración
        if (!config.id || !config.selector || !config.pattern || !config.replacement) {
            return false;
        }
        
        // Convertir patrón a RegExp si es string
        if (typeof config.pattern === 'string') {
            config.pattern = new RegExp(config.pattern, 'gi');
        }
        
        // Marcar como habilitado por defecto
        config.enabled = config.enabled !== false;
        
        this.modifications.set(config.id, config);
        return true;
    }
    
    applyAllModifications() {
        if (!this.isActive) {
            return 0;
        }
        
        
        let totalModified = 0;
        
        // Reconfigurar usuario (por si cambió la página)
        this.setupUserModifications();
        
        for (const [id, config] of this.modifications) {
            if (config.enabled) {
                const modified = this.applyModification(config);
                totalModified += modified;
            } else {
            }
        }
        
        if (totalModified > 0) {
        } else {
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
                    }
                }
            });
            
            return modified;
            
        } catch (error) {
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
        
        // Observar solo las áreas relevantes para botones
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            // No observar atributos ni characterData para mejorar performance
            attributes: false,
            characterData: false
        });
        
        // Almacenar referencia para cleanup
        this.domObserver = this.observer;
    }
    
    handleMutations(mutations) {
        if (!this.isActive) return;
        
        // Throttling más agresivo para DOM observer
        const now = Date.now();
        if (now - this.lastExecution < 1000) { // Aumentado a 1 segundo
            return;
        }
        
        // Verificar si hay mutaciones relevantes para botones
        const hasRelevantChanges = mutations.some(mutation => {
            if (mutation.type !== 'childList') return false;
            
            // Solo procesar si se añadieron nodos que podrían contener botones
            return Array.from(mutation.addedNodes).some(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return false;
                
                // Verificar si el nodo añadido contiene elementos que nos interesan
                const element = node;
                return element.matches && (
                    element.matches('button, a, [data-purpose*="cta"], [data-purpose*="enroll"], [data-purpose*="purchase"]') ||
                    element.querySelector('button, a, [data-purpose*="cta"], [data-purpose*="enroll"], [data-purpose*="purchase"]')
                );
            });
        });
        
        if (hasRelevantChanges) {
            this.lastExecution = now;
            // Usar debounce para agrupar cambios rápidos
            clearTimeout(this.mutationTimeout);
            this.mutationTimeout = setTimeout(() => {
                this.applyAllModifications();
            }, 200);
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
        
        if (this.isActive) {
            setTimeout(() => this.applyAllModifications(), 100);
        }
        
        return this.isActive;
    }
    
    forceModifications() {
        this.lastExecution = 0;
        return this.applyAllModifications();
    }
    
    getStatus() {
        return {
            isActive: this.isActive,
            isInitialized: true, // Agregar esta propiedad que busca el script
            totalModifications: this.modifications.size,
            enabledModifications: Array.from(this.modifications.values()).filter(m => m.enabled).length,
            lastExecution: this.lastExecution
        };
    }
    
    listModifications() {
        console.group('📝 Modificaciones Activas');
        for (const [id, config] of this.modifications) {
        }
        console.groupEnd();
    }
    
    setupButtonInterceptors() {
        
        // Resetear flag de botón reemplazado para nueva página
        this.enrollButtonReplaced = false;
        
        // Detectar tipo de página
        const currentUrl = window.location.href;
        
        if (currentUrl.includes('/course/') && !currentUrl.includes('/learn')) {
            // Página de curso individual - interceptar botones de inscripción
            this.setupEnrollButtonInterceptor();
        } else {
            // Página de búsqueda o lista - interceptar botones de guardar
            this.setupSaveButtonInterceptor();
        }
    }
    
    setupSaveButtonInterceptor() {
        
        // Interceptar clicks en botones de guardar con múltiples selectores
        document.addEventListener('click', (event) => {
            // Lista de selectores para botones de guardar
            const saveSelectors = [
                '[data-testid="save-to-list-button"]',
                '[data-purpose="save-to-list"]',
                '[data-purpose="wishlist-icon"]',
                '[data-purpose="save-button"]',
                '[aria-label*="Save"]',
                '[aria-label*="Guardar"]',
                '[aria-label*="Add to wishlist"]',
                '[aria-label*="Agregar a lista"]',
                '.wishlist-icon',
                '.save-button',
                '.bookmark-icon',
                'button[title*="Save"]',
                'button[title*="Guardar"]',
                'button[title*="wishlist"]'
            ];
            
            // Verificar si el elemento clickeado coincide con algún selector
            let saveButton = null;
            for (const selector of saveSelectors) {
                saveButton = event.target.closest(selector);
                if (saveButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.handleSaveToListClick(event, saveButton);
                    return;
                }
            }
            
            // También verificar por texto del botón
            const clickedElement = event.target;
            const elementText = (clickedElement.textContent || clickedElement.innerText || '').trim().toLowerCase();
            
            if (elementText.includes('save') || 
                elementText.includes('guardar') || 
                elementText.includes('bookmark') ||
                elementText.includes('wishlist') ||
                elementText.includes('lista')) {
                
                event.preventDefault();
                event.stopPropagation();
                this.handleSaveToListClick(event, clickedElement);
                return;
            }

            // INTERCEPTAR BOTONES DE INSCRIPCIÓN
            // Lista de selectores para botones de inscripción/enroll
            const enrollSelectors = [
                '[data-purpose="buy-this-course-button"]',
                '[data-purpose="enroll-button"]',
                '[data-testid="add-to-cart"]',
                'button[data-purpose*="buy"]',
                'button[data-purpose*="enroll"]',
                'button[data-purpose*="purchase"]',
                '.buy-button',
                '.enroll-button',
                '.purchase-button'
            ];
            
            // Verificar si el elemento clickeado es un botón de inscripción
            let enrollButton = null;
            for (const selector of enrollSelectors) {
                enrollButton = event.target.closest(selector);
                if (enrollButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.handleEnrollClick(event, enrollButton);
                    return;
                }
            }
            
            // También verificar por texto del botón de inscripción
            if (elementText.includes('enroll') || 
                elementText.includes('inscribir') ||
                elementText.includes('buy') || 
                elementText.includes('comprar') ||
                elementText.includes('add to cart') ||
                elementText.includes('agregar al carrito') ||
                elementText.includes('free') ||
                elementText.includes('gratis')) {
                
                event.preventDefault();
                event.stopPropagation();
                this.handleEnrollClick(event, clickedElement);
                return;
            }
        }, true);
        
        // También configurar interceptor específico para elementos dinámicos
        this.setupDynamicSaveButtons();
    }
    
    setupDynamicSaveButtons() {
        // Interceptor para botones que se cargan dinámicamente
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Buscar botones de guardar en los nuevos nodos
                            const saveButtons = node.querySelectorAll([
                                '[data-testid="save-to-list-button"]',
                                '[data-purpose="save-to-list"]',
                                '[data-purpose="wishlist-icon"]',
                                '.wishlist-icon',
                                '.save-button'
                            ].join(', '));
                            
                            saveButtons.forEach(button => {
                                if (!button.dataset.interceptorAttached) {
                                    button.dataset.interceptorAttached = 'true';
                                }
                            });
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    setupEnrollButtonInterceptor() {
        
        
        // Limpiar intervalo anterior si existe
        if (this.enrollButtonInterval) {
            clearInterval(this.enrollButtonInterval);
        }
        
        // Buscar y reemplazar botones de suscripción/inscripción
        const checkForEnrollButtons = () => {
            // PASO 1: Buscar contenedores primero (más eficiente y evita duplicados)
            const containerSelectors = [
                '[data-purpose="course-cta-holder"]',
                '[data-purpose="enrollment-cta"]',
                '[data-purpose="buy-box"]',
                '.buy-box',
                '.course-cta-holder',
                '.enrollment-cta'
            ];
            
            let foundContainer = false;
            containerSelectors.forEach(selector => {
                const containers = document.querySelectorAll(selector);
                containers.forEach(container => {
                    if (container && !container.dataset.interceptorReplaced && !container.querySelector('.udemy-interceptor-enroll-btn')) {
                        this.replaceEnrollButton(container);
                        foundContainer = true;
                    }
                });
            });
            
            // PASO 2: Solo si no encontramos contenedores, buscar botones individuales
            if (!foundContainer) {
                let foundDirectButton = false;
                
                // PASO 2A: Buscar botones específicos por selector
                const buttonSelectors = [
                    '[data-purpose="subscription-redirect-button"]',
                    '[data-purpose="buy-this-course-button"]',
                    '[data-purpose="enroll-button"]',
                    '[data-testid="add-to-cart"]',
                    'button[data-purpose*="buy"]',
                    'button[data-purpose*="enroll"]',
                    'button[data-purpose*="purchase"]',
                    '.buy-button',
                    '.enroll-button',
                    '.purchase-button'
                ];
                
                for (const selector of buttonSelectors) {
                    const buttons = document.querySelectorAll(selector);
                    for (const button of buttons) {
                        if (button && !button.dataset.interceptorReplaced && button.style.display !== 'none') {
                            this.replaceDirectButton(button);
                            foundDirectButton = true;
                        }
                    }
                  
                }
                
                // PASO 2B: Solo si no encontramos botones por selector, buscar por texto
                if (!foundDirectButton) {
                    const enrollTexts = ['Inscríbete gratis', 'Enroll for free', 'Inscribirse gratis', 'Inscribirse ahora', 'Enroll now'];
                    this.findButtonsByText(enrollTexts);
                }
            }
        };
        
        // Ejecutar inmediatamente y luego cada 2 segundos
        checkForEnrollButtons();
        this.enrollButtonInterval = setInterval(checkForEnrollButtons, 2000);
    }

    findButtonsByText(textArray) {
        // Buscar todos los botones y enlaces en la página
        const allButtons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
        
        // Solo procesar el primer botón que coincida
        for (const button of allButtons) {
            if (button.dataset.interceptorReplaced) continue;
            
            const buttonText = (button.textContent || button.innerText || button.value || '').trim().toLowerCase();
            
            // Verificar si el texto del botón coincide con alguno de los textos buscados
            const matchesText = textArray.some(searchText => 
                buttonText.includes(searchText.toLowerCase()) ||
                buttonText === searchText.toLowerCase()
            );
            
            if (matchesText) {
                this.replaceDirectButton(button);
                return; // Salir después de procesar el primer botón encontrado
            }
        }
    }
    
    handleSaveToListClick(event, element) {
        
        // Sin cooldown - permitir saves inmediatos
        
        // Intentar múltiples estrategias para encontrar el contenedor del curso
        const courseCard = this.findCourseContainer(element);
                          
        if (!courseCard) {
            this.showErrorNotification('❌ No se pudo encontrar la información del curso');
            return;
        }
        
        // Extraer información del curso con múltiples estrategias
        const courseInfo = this.extractCourseInfo(courseCard);
        
        if (!courseInfo.slug) {
            this.showErrorNotification('❌ No se pudo extraer el identificador del curso');
            return;
        }
        
        
        // Preparar datos para enviar al backend
        const payload = {
            name: courseInfo.title,
            udemyId: courseInfo.slug,
            urlImage: courseInfo.image || null
        };
        
        // Procesar el guardado del curso (funcionalidad principal)
        this.saveCourseToBackend(payload, courseInfo.slug);
        
        // Notificación directa - sin cola
    }

    findCourseContainer(element) {
        // Lista de selectores para encontrar el contenedor del curso
        const containerSelectors = [
           
        ];
        
        // Intentar encontrar el contenedor más cercano
        for (const selector of containerSelectors) {
            const container = element.closest(selector);
            if (container) {
                return container;
            }
        }
        
        // Si no se encuentra un contenedor específico, buscar hacia arriba
        let currentElement = element;
        for (let i = 0; i < 10 && currentElement.parentElement; i++) {
            currentElement = currentElement.parentElement;
            
            // Verificar si este elemento contiene información de curso
            const hasLink = currentElement.querySelector('a[href*="/course/"]');
            const hasTitle = currentElement.querySelector('h1, h2, h3, h4, [data-purpose*="title"]');
            
            if (hasLink && hasTitle) {
                return currentElement;
            }
        }
        
        return null;
    }

    extractCourseInfo(courseCard) {
        // Múltiples selectores para título
        const titleSelectors = [
            'h3',
            'h2', 
            'h1',
            'h4',
            '[data-purpose="course-title-url"]',
            '[data-purpose*="title"]',
            '.course-card-title',
            '.course-title',
            'a[href*="/course/"]',
            '[class*="title"]'
        ];
        
        // Múltiples selectores para enlaces
        const linkSelectors = [
            'a[href*="/course/"]',
            '[data-purpose="course-title-url"]',
            'a[href*="/learn/"]'
        ];
        
        // Múltiples selectores para imágenes
        const imageSelectors = [
            'img',
            '[data-purpose="course-image"] img',
            '.course-image img',
            '[class*="image"] img'
        ];
        
        // Extraer título
        let titleElement = null;
        for (const selector of titleSelectors) {
            titleElement = courseCard.querySelector(selector);
            if (titleElement) break;
        }
        
        // Extraer enlace
        let linkElement = null;
        for (const selector of linkSelectors) {
            linkElement = courseCard.querySelector(selector);
            if (linkElement) break;
        }
        
        // Extraer imagen
        let imageElement = null;
        for (const selector of imageSelectors) {
            imageElement = courseCard.querySelector(selector);
            if (imageElement) break;
        }
        
        // Obtener valores
        const title = titleElement?.textContent?.trim() || titleElement?.title?.trim() || linkElement?.textContent?.trim() || 'Curso sin título';
        const courseUrl = linkElement?.href || window.location.href;
        const image = imageElement?.src || imageElement?.dataset?.src || '';
        
        // Extraer slug con múltiples patrones
        let slug = null;
        const slugPatterns = [
            /\/course\/([^/\?]+)/,
            /\/learn\/lecture\/([^/\?]+)/,
            /course_id=([^&]+)/,
            /course\/([^/\?#]+)/
        ];
        
        for (const pattern of slugPatterns) {
            const match = courseUrl.match(pattern);
            if (match && match[1]) {
                slug = match[1];
                break;
            }
        }
        
        return {
            title,
            courseUrl,
            image,
            slug
        };
    }
    
    replaceEnrollButton(container) {
        // Verificar si ya hemos reemplazado un botón en esta página
       
        // Verificar si ya existe un botón personalizado en la página
        
        
        // Marcar como procesado
     
        
        // Extraer información del curso (misma lógica que replaceDirectButton)
        const courseTitle = document.querySelector('h1[data-purpose="course-title"]')?.textContent ||
                           document.querySelector('h1')?.textContent ||
                           document.title ||
                           'Curso';
        
        const courseUrl = window.location.href;
        
        // Extraer imagen del curso con múltiples selectores
        const imageElement = document.querySelector('[data-purpose="introduction-asset"] img') ||
                           document.querySelector('.intro-asset--img-aspect--3gluH img') ||
                           document.querySelector('img[data-purpose="course-image"]') ||
                           document.querySelector('.course-landing-page__main-content img') ||
                           document.querySelector('meta[property="og:image"]');
        
        const imageUrl = imageElement ? (imageElement.src || imageElement.content) : null;
        
        // Extraer slug del curso para validación
        const slugMatch = courseUrl.match(/\/course\/([^/]+)/);
        const slug = slugMatch?.[1];
        
        // Crear nuevo botón personalizado
        const newButton = this.createEnrollButton();
        
        // Reemplazar contenido del contenedor
        container.innerHTML = '';
        container.appendChild(newButton);
        
        // Agregar eventos al botón - envío directo al backend
        newButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            // Validar que tenemos los datos necesarios
            if (!slug) {
                this.showErrorNotification('❌ No se pudo extraer el slug del curso');
                return;
            }
            
            // Preparar payload para el backend
            const payload = {
                name: courseTitle.trim(),
                udemyId: slug,
                urlImage: imageUrl
            };
            
            // Mostrar notificación inicial
            if (window.electronAPI && window.electronAPI.send) {
                window.electronAPI.send('webview-notification', {
                    type: 'info',
                    message: '🎓 Guardando curso...'
                });
            }
            
            // Enviar directamente al backend
            this.saveCourseToBackend(payload, slug);
        });
        
        // Marcar que ya hemos reemplazado un botón
        this.enrollButtonReplaced = true;
        
        return true;
    }
    
    replaceDirectButton(button) {
        // Verificar si ya hemos reemplazado un botón en esta página
       
        
        // Marcar como procesado
        button.dataset.interceptorReplaced = 'true';
        
        // Extraer información del curso (misma lógica que replaceEnrollButton)
        const courseTitle = document.querySelector('h1[data-purpose="course-title"]')?.textContent ||
                           document.querySelector('h1')?.textContent ||
                           document.title ||
                           'Curso';
        
        const courseUrl = window.location.href;
        
        // Extraer imagen del curso con múltiples selectores
        const imageElement = document.querySelector('[data-purpose="introduction-asset"] img') ||
                           document.querySelector('.intro-asset--img-aspect--3gluH img') ||
                           document.querySelector('img[data-purpose="course-image"]') ||
                           document.querySelector('.course-landing-page__main-content img') ||
                           document.querySelector('meta[property="og:image"]');
        
        const imageUrl = imageElement ? (imageElement.src || imageElement.content) : null;
        
        // Extraer slug del curso para validación
        const slugMatch = courseUrl.match(/\/course\/([^/]+)/);
        const slug = slugMatch?.[1];
        
        console.log('Reemplazando botón directo:', button, 'para curso:', courseTitle, 'slug:', slug, 'url:', courseUrl, 'imagen:', imageUrl);
        
        // Crear nuevo botón personalizado
        const newButton = this.createEnrollButton();
        
        // Copiar clases y estilos del botón original para mantener apariencia
        if (button.className) {
            newButton.className += ' ' + button.className;
        }
        
        // Reemplazar el botón original
        button.parentNode.insertBefore(newButton, button);
        button.style.display = 'none'; // Ocultar en lugar de eliminar para evitar errores
        
        // Agregar eventos al botón - envío directo al backend
        newButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log('Hola desde el nuevo botón de inscripción:', courseTitle, 'slug:', slug, 'url:', courseUrl, 'imagen:', imageUrl);
            
            // Validar que tenemos los datos necesarios
            if (!slug) {
                this.showErrorNotification('❌ No se pudo extraer el slug del curso');
                return;
            }
            
            // Preparar payload para el backend
            const payload = {
                name: courseTitle.trim(),
                udemyId: slug,
                urlImage: imageUrl
            };
            
            // Mostrar notificación inicial
            if (window.electronAPI && window.electronAPI.send) {
                window.electronAPI.send('webview-notification', {
                    type: 'info',
                    message: '🎓 Guardando curso...'
                });
            }
            
            // Enviar directamente al backend
            this.saveCourseToBackend(payload, slug);
        });
        
        // Marcar que ya hemos reemplazado un botón
        this.enrollButtonReplaced = true;
        
        return true;
    }
    
    createEnrollButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'udemy-interceptor-enroll-btn';
        
        // Estilos del botón
        button.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 16px 32px;
            font-size: 16px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-width: 200px;
            box-shadow: 0 4px 15px rgba(72, 52, 212, 0.4);
            transition: all 0.3s ease;
            text-transform: uppercase;
        `;
        
        button.innerHTML = '<span style="font-size: 18px;">🎓</span> Inscribirme ';
        
      
         
        // Agregar badge de "INTEGRADO" para mostrar que está conectado al sistema
        const integrationBadge = document.createElement('span');
        integrationBadge.style.cssText = `
            background: #2196F3;
            color: white;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 4px;
            position: relative;
            top: -1px;
        `;
        integrationBadge.textContent = '⚡';
        button.appendChild(integrationBadge);
        
        // Efectos hover
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px) scale(1.02)';
            button.style.filter = 'brightness(1.1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0) scale(1)';
            button.style.filter = 'brightness(1)';
        });
        
        return button;
    }

    
    handleCourseEnrollment(courseTitle, courseUrl) {
        
        // Sin cooldown - permitir inscripciones inmediatas
        
        // Extraer slug del curso de la URL actual (más confiable)
        const currentUrl = window.location.href;
        const slugMatch = currentUrl.match(/\/course\/([^/]+)/) || courseUrl.match(/\/course\/([^/]+)/);
        const slug = slugMatch?.[1];
        
        if (!slug) {
            this.showErrorNotification('❌ No se pudo extraer el slug del curso');
            return;
        }
        
        // Extraer información directamente de la página actual del curso
        const extractedTitle = document.querySelector('h1[data-purpose="course-title"]')?.textContent ||
                              document.querySelector('h1')?.textContent ||
                              document.title ||
                              courseTitle;
        
        const imageElement = document.querySelector('img[data-purpose="course-image"]') ||
                           document.querySelector('.course-landing-page__main-content img') ||
                           document.querySelector('meta[property="og:image"]');
        
        const imageUrl = imageElement ? (imageElement.src || imageElement.content) : null;
        
        if (!extractedTitle || !slug) {
            this.showErrorNotification('❌ No se pudo obtener información del curso');
            return;
        }
        
        // Preparar datos exactamente como los botones normales
        const payload = {
            name: extractedTitle.trim(),
            udemyId: slug,
            urlImage: imageUrl
        };
        
        
        // Mostrar notificación inicial
        if (window.electronAPI && window.electronAPI.send) {
            window.electronAPI.send('webview-notification', {
                type: 'info',
                message: '🎓 Iniciando inscripción gratuita...'
            });
        }
        
        // Enviar al backend usando la función correcta
        this.saveCourseToBackend(payload, slug);
        
        // Notificación directa - sin cola
        
    }

    handleEnrollClick(event, enrollButton) {
        
        // Sin cooldown - permitir inscripciones inmediatas
        
        // Extraer slug del curso de la URL actual
        const currentUrl = window.location.href;
        const slugMatch = currentUrl.match(/\/course\/([^/]+)/);
        const slug = slugMatch?.[1];
        
        if (!slug) {
            this.showErrorNotification('❌ No se pudo extraer el slug del curso');
            return;
        }
        
        // Extraer información directamente de la página actual del curso
        const extractedTitle = document.querySelector('h1[data-purpose="course-title"]')?.textContent ||
                              document.querySelector('h1')?.textContent ||
                              document.title ||
                              'Curso sin título';
        
        const imageElement = document.querySelector('img[data-purpose="course-image"]') ||
                           document.querySelector('.course-landing-page__main-content img') ||
                           document.querySelector('meta[property="og:image"]');
        
        const imageUrl = imageElement ? (imageElement.src || imageElement.content) : null;
        
        if (!extractedTitle || !slug) {
            this.showErrorNotification('❌ No se pudo obtener información del curso');
            return;
        }
        
        // Preparar datos exactamente como los botones normales
        const payload = {
            name: extractedTitle.trim(),
            udemyId: slug,
            urlImage: imageUrl
        };
        
        
        // Mostrar notificación inicial directamente a Electron
        if (window.electronAPI && window.electronAPI.send) {
            window.electronAPI.send('webview-notification', {
                type: 'info',
                message: '🎓 Iniciando inscripción gratuita...'
            });
        }
        
        // Enviar al backend usando la función correcta
        this.saveCourseToBackend(payload, slug);
        
    }
    
    saveCourseToBackend(payload, slug) {
        
        
        // Obtener token de las cookies
        const token = this.getCookieValue('auth_token');
        


        if (!token) {
            this.showErrorNotification('❌ Token no encontrado. Inicia sesión primero.');
            return;
        }
        console.log('paso el token:', token);
        
        // Mostrar indicador de carga usando ipcRenderer para WebView
        try {
            const messageData = {
                source: 'udemy-interceptor',
                event: 'show-notification',
                data: {
                    type: 'info',
                    message: '⏳ Guardando curso...'
                }
            };
            
            // Usar DOM Custom Event para comunicación
            const customEvent = new CustomEvent('udemy-interceptor-notification', {
                detail: messageData,
                bubbles: true
            });
            
            document.dispatchEvent(customEvent);
            
        } catch (error) {
            console.error('❌ Error enviando notificación:', error);
            console.log('Contexto del error:', {
                window: typeof window,
                parent: typeof window.parent,
                isParent: window.parent === window,
                location: window.location.href,
                require: typeof require
            });
        }
        
        
        // Enviar al backend usando la URL correcta
        fetch(`${this.backendURL}user-courses/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            
            // Enviar notificación de éxito usando DOM CustomEvent
            const successMessage = data.message ? `✅ ${data.message}` : '✅ Curso guardado exitosamente';
            
            const successEvent = new CustomEvent('udemy-interceptor-notification', {
                detail: {
                    source: 'udemy-interceptor',
                    event: 'show-notification',
                    data: {
                        type: 'success',
                        message: successMessage
                    }
                },
                bubbles: true
            });
            
            document.dispatchEvent(successEvent);
            
            // Comunicar con el padre para abrir Brave sin notificaciones
            const braveEvent = new CustomEvent('udemy-interceptor-notification', {
                detail: {
                    source: 'udemy-interceptor',
                    event: 'open-in-brave',
                    data: {
                        courseUrl: `https://www.udemy.com/course/${slug}/learn/`,
                        slug: slug
                    }
                },
                bubbles: true
            });
            
            document.dispatchEvent(braveEvent);
        })
        .catch(error => {
            
            // Enviar error usando DOM CustomEvent
            const errorMessage = error.message.toLowerCase();
            
            if (error.message.includes('400')) {
                let message;
                if (errorMessage.includes('already') || errorMessage.includes('existe') || errorMessage.includes('ya existe')) {
                    message = {
                        type: 'success',
                        message: '✅ Curso ya estaba guardado'
                    };
                } else {
                    // Para otros HTTP 400, asumir que el curso se guardó exitosamente
                    message = {
                        type: 'success',
                        message: '✅ Curso guardado exitosamente'
                    };
                }
                
                const errorEvent = new CustomEvent('udemy-interceptor-notification', {
                    detail: {
                        source: 'udemy-interceptor',
                        event: 'show-notification',
                        data: message
                    },
                    bubbles: true
                });
                
                document.dispatchEvent(errorEvent);
                
                // Abrir en Brave de todas formas usando comunicación con padre
                const braveEvent = new CustomEvent('udemy-interceptor-notification', {
                    detail: {
                        source: 'udemy-interceptor',
                        event: 'open-in-brave',
                        data: {
                            courseUrl: `https://www.udemy.com/course/${slug}/learn/`,
                            slug: slug
                        }
                    },
                    bubbles: true
                });
                
                document.dispatchEvent(braveEvent);
                
            } else {
                let message;
                if (error.message.includes('401')) {
                    message = '❌ No autorizado. Inicia sesión primero';
                } else if (error.message.includes('500')) {
                    message = '❌ Error del servidor. Intenta más tarde';
                } else {
                    message = '❌ Error: ' + error.message;
                }
                
                const errorEvent = new CustomEvent('udemy-interceptor-notification', {
                    detail: {
                        source: 'udemy-interceptor',
                        event: 'show-notification',
                        data: {
                            type: 'error',
                            message: message
                        }
                    },
                    bubbles: true
                });
                
                document.dispatchEvent(errorEvent);
            }
        });
    }

    openCourseAfterSave(slug) {
        // Abrir el curso en Brave inmediatamente después de guardarlo exitosamente
        const learnUrl = `https://www.udemy.com/course/${slug}/learn/`;
        
        // Mostrar notificación de que se está abriendo en Brave
        if (window.electronAPI && window.electronAPI.send) {
            window.electronAPI.send('webview-notification', {
                type: 'info',
                message: '🚀 Abriendo curso en Brave...'
            });
        }
        
        this.openCourseInBrave(learnUrl)
            .then(success => {
                if (success) {
                }
            })
            .catch(error => {
                this.showErrorNotification('⚠️ Error abriendo en Brave, pero el curso se guardó correctamente');
            });
    }
    
    showErrorNotification(message) {
        // Enviar error usando DOM Custom Event
        const messageData = {
            source: 'udemy-interceptor',
            event: 'show-notification',
            data: {
                type: 'error',
                message: message
            }
        };
        
        const customEvent = new CustomEvent('udemy-interceptor-notification', {
            detail: messageData,
            bubbles: true
        });
        
        document.dispatchEvent(customEvent);
    }

    sendToElectron(message, color) {
        
        try {
            // Validar electronAPI con retry
            if (!this.validateElectronAPI()) {
                return false;
            }
            
            // Envío directo a Electron
            window.electronAPI.send('webview-notification', {
                message: message,
                color: color,
                type: this.getNotificationType(color)
            });
            return true;
            
        } catch (error) {
            return false;
        }
    }

    validateElectronAPI(maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            if (typeof window !== 'undefined' && 
                window.electronAPI && 
                typeof window.electronAPI.send === 'function') {
                return true;
            }
            
            // Breve pausa antes del siguiente intento
            if (i < maxRetries - 1) {
                const start = Date.now();
                while (Date.now() - start < 100) {} // Espera sincrónica de 100ms
            }
        }
        return false;
    }

    getNotificationType(color) {
        switch (color) {
            case '#4CAF50': return 'success';
            case '#f44336': return 'error';
            case '#2196F3': return 'info';
            case '#FF9800': return 'warning';
            default: return 'info';
        }
    }

    // Método createDirectNotification eliminado - solo usar Electron

    async openCourseInBrave(courseUrl) {
        // Normalizar URL a string antes de enviar
        const normalizedUrl = this.normalizeUrl(courseUrl);
        
        try {
            // Método 1: A través del API de Electron si está disponible
            if (window.electronAPI && window.electronAPI.invoke) {
                const result = await window.electronAPI.invoke('chrome-launch-course', normalizedUrl);
                
                // Manejar respuesta estructurada
                if (result && typeof result === 'object') {
                    if (result.success) {
                        this.showSuccessNotification('✅ Curso abierto en Brave');
                        return true;
                    } else {
                        // Mostrar error específico al usuario
                        const errorMsg = result.details ? result.details.userMessage : result.error;
                        const suggestion = result.details ? result.details.suggestion : 'Intenta nuevamente';
                        
                        this.showErrorNotification(`❌ ${errorMsg}. ${suggestion}`);
                        return false;
                    }
                } 
                // Compatibilidad con respuesta booleana (código anterior)
                else if (result === true) {
                    this.showSuccessNotification('✅ Curso abierto en Brave');
                    return true;
                } else {
                }
            }

            // Método 2: A través del send si invoke no está disponible
            if (window.electronAPI && window.electronAPI.send) {
                window.electronAPI.send('chrome-launch-course', normalizedUrl);
                
                // No podemos verificar el resultado con send, pero intentamos
                this.showSuccessNotification('✅ Enviando a Brave...');
                return true;
            }

            // Método 3: Comunicación vía postMessage
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    source: 'udemy-interceptor',
                    event: 'open-in-brave',
                    data: { courseUrl: normalizedUrl }
                }, '*');
                
                this.showSuccessNotification('✅ Enviando a Brave...');
                return true;
            }

            // Comunicación directa sin cola
            
            this.showSuccessNotification('✅ Solicitando abrir en Brave...');
            return true;
            
        } catch (error) {
            this.showErrorNotification('❌ Error abriendo en Brave: ' + error.message);
            return false;
        }
    }

    normalizeUrl(url) {
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

    cleanup() {
        
        // Limpiar intervalos
        if (this.enrollButtonInterval) {
            clearInterval(this.enrollButtonInterval);
            this.enrollButtonInterval = null;
        }
        
        if (this.saveButtonInterval) {
            clearInterval(this.saveButtonInterval);
            this.saveButtonInterval = null;
        }
        
        // Limpiar timeouts
        if (this.mutationTimeout) {
            clearTimeout(this.mutationTimeout);
            this.mutationTimeout = null;
        }
        
        // Limpiar observadores DOM
        if (this.domObserver) {
            this.domObserver.disconnect();
            this.domObserver = null;
        }
        
        // También limpiar observer legacy
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Marcar como inactivo
        this.isActive = false;
        
        // Resetear flag de botón reemplazado
        this.enrollButtonReplaced = false;
        
    }

    // === SISTEMA SIMPLIFICADO SIN COLA ===
    // Eliminado sistema de cola complejo - comunicación directa con Electron
}

// === INICIALIZACIÓN ===
let interceptorInstance = null;

// Función de inicialización
function initializeInterceptor() {
    if (interceptorInstance) {
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
            instance: interceptorInstance,
            isInitialized: true, // Asegurar que esta propiedad esté disponible
            
            // Métodos de comunicación por cola (solo acciones, notificaciones vía Electron)
            getActionQueue: () => interceptorInstance.getActionQueue(),
            clearActionQueue: () => interceptorInstance.clearActionQueue(),
            hasQueuedActions: () => interceptorInstance.hasQueuedActions()
        };
        
        
        // Diagnóstico de comunicación disponible
        
        return interceptorInstance;
        
    } catch (error) {
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
    
    try {
        if (window.electronAPI) {
            const success = await window.electronAPI.invoke('chrome-launch-course', courseUrl);
            
            if (success) {
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        return false;
    }
};
