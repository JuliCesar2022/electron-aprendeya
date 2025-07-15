// Sistema de intercepción y modificación de contenido de Udemy
class UdemyInterceptor {
    constructor() {
        this.isActive = false;
        this.observers = [];
        this.modifications = new Map();
        this.pendingModifications = new Set();
        this.retryAttempts = new Map();
        this.lastUrl = window.location.href;
        this.debounceTimer = null;
        this.maxRetries = 10;
        this.retryDelay = 500;
        this.backendURL = 'https://aprendeya-backend.forif.co/api/v1/';
        this.init();
    }
     getCookieValue(name) {
        const cookies = document.cookie.split(';').map(c => c.trim());
        for (const cookie of cookies) {
            if (cookie.startsWith(name + '=')) {
                return decodeURIComponent(cookie.split('=')[1]);
            }
        }
        return null;
    }

    async checkAndOptimizeUserSession() {
        try {
            // Verificar si la app ya fue inicializada (navegación interna)
            if (window.appInitialized) {
                console.log('⚠️ App ya inicializada - omitiendo optimización de cuenta');
                return;
            }
            
            console.log('🔄 Primera vez o sesión nueva - ejecutando optimización...');
            
            // Las cookies ya se configuran en index.html con la cuenta óptima
            // Aquí solo aplicamos las optimizaciones visuales si hay datos de usuario
            const fullname = this.getCookieValue('user_fullname');
            
            if (fullname) {
                await this.applyUserOptimizations({ fullname: decodeURIComponent(fullname) });
            }

        } catch (error) {
            // Error silencioso
        }
    }


    async applyUserOptimizations(userData) {
        
        // Actualizar nombre en modificaciones
        if (userData.fullName || userData.name || userData.fullname) {
            const fullname = userData.fullName || userData.name || userData.fullname;
            
            // Actualizar modificaciones existentes con nuevo nombre
            this.modifications.forEach((modification, id) => {
                if (modification.newContent && typeof modification.newContent === 'string') {
                    if (modification.newContent.includes('Hola de nuevo,')) {
                        modification.newContent = `Hola de nuevo, ${fullname}`;
                    }
                }
            });

        }

        // Aplicar modificaciones inmediatamente
        setTimeout(() => {
            this.applyAllModifications();
        }, 500);
    }

    showOptimizationNotification(message) {
        // Usar la función de notificación existente si está disponible
        if (typeof this.showNotification === 'function') {
            this.showNotification(message, '#28a745');
        } else {
        }
    }


    init() {
        
        // Verificar si estamos en Udemy
        if (!this.isUdemyDomain()) {
            return;
        }

        this.isActive = true;
        
        // Prevenir navegación hacia atrás al index
        this.preventBackToIndex();
        
        // Verificar y optimizar sesión de usuario existente
        this.checkAndOptimizeUserSession();
        
        
        // Configurar modificaciones por defecto
        this.setupDefaultModifications();
        
        
        // Iniciar observadores cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.startObservers();
            });
        } else {
            this.startObservers();
        }

        // Verificación inicial de elementos
        this.performInitialCheck();
    }

    preventBackToIndex() {
        // Detectar si NO hay variable global (primera vez desde index/login)
        const isFirstTime = !window.appInitialized;
        
        console.log('🔍 DEBUG - preventBackToIndex:');
        console.log('  window.appInitialized:', window.appInitialized);
        console.log('  isFirstTime:', isFirstTime);
        
        if (isFirstTime) {
            // Reemplazar completamente el historial para eliminar cualquier navegación hacia atrás
            window.history.replaceState(null, null, window.location.href);
            
            // Agregar múltiples entradas al historial para hacer más difícil volver
            for (let i = 0; i < 10; i++) {
                window.history.pushState(null, null, window.location.href);
            }
            
            // Interceptar cualquier intento de navegación hacia atrás
            window.addEventListener('popstate', (event) => {
                // Prevenir completamente la navegación hacia atrás
                event.preventDefault();
                window.history.pushState(null, null, window.location.href);
                
                // Forzar recarga en la página actual si es necesario
                if (window.location.href !== document.URL) {
                    window.location.href = document.URL;
                }
            });
            
            // Interceptar teclas de navegación (Alt + Flecha izquierda, Backspace, etc.)
            document.addEventListener('keydown', (event) => {
                // Prevenir Alt + Flecha izquierda (navegación hacia atrás)
                if (event.altKey && event.key === 'ArrowLeft') {
                    event.preventDefault();
                    return false;
                }
                
                // Prevenir Backspace fuera de inputs (navegación hacia atrás)
                if (event.key === 'Backspace' && !['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
                    event.preventDefault();
                    return false;
                }
            });
        }
    }

    performInitialCheck() {
        
        // Verificar elementos objetivo específicos
        const targetChecks = [
            {
                name: 'Saludo principal',
                selector: '.user-occupation-header-module--user-details--kJD-k h3.ud-heading-xl',
                expected: 'Hola de nuevo, [Nombre]'
            },
            {
                name: 'Headers de usuario',
                selector: '[class*="user-occupation-header"] h3',
                expected: 'Elementos con saludo'
            },
            {
                name: 'Cualquier H3',
                selector: 'h3',
                expected: 'Títulos H3 en página'
            },
            {
                name: 'Dropdown de usuario',
                selector: '[data-purpose="user-dropdown"]',
                expected: 'Menú de usuario'
            },
            {
                name: 'Elementos con "Hola"',
                selector: '*',
                expected: 'Texto que contenga "Hola"',
                textCheck: true
            }
        ];

        targetChecks.forEach(check => {
            const elements = document.querySelectorAll(check.selector);
            
            if (elements.length > 0) {
                elements.forEach((el, index) => {
                    const text = el.textContent?.trim() || el.innerText?.trim() || '';
                    if (check.textCheck) {
                        if (text.toLowerCase().includes('hola')) {
                        }
                    } else {
                    }
                });
            } else {
            }
        });

        // Verificar estructura general de la página
        this.checkPageStructure();
    }

    checkPageStructure() {
        
        const structureChecks = [
            'header',
            '.ud-header',
            '[class*="header"]',
            'main',
            '[class*="main"]',
            '[class*="user"]',
            '[data-purpose]'
        ];

        structureChecks.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
            }
        });

        // Mostrar todas las clases que contienen "user"
        const allElements = document.querySelectorAll('*');
        const userClasses = new Set();
        allElements.forEach(el => {
            if (el.className && typeof el.className === 'string') {
                el.className.split(' ').forEach(cls => {
                    if (cls.toLowerCase().includes('user') || cls.toLowerCase().includes('greeting')) {
                        userClasses.add(cls);
                    }
                });
            }
        });

        if (userClasses.size > 0) {
            Array.from(userClasses).forEach(cls => {
            });
        }
    }

    isUdemyDomain() {
        return window.location.hostname.includes('udemy.com');
    }

    setupDefaultModifications() {
          const fullname = this.getCookieValue('user_fullname') || 'Mundo';
          
          // Verificar si estamos en una página de curso
          this.setupCoursePageModifications();
          
          // Siempre interceptar enlaces de logout
          this.setupLogoutProtection();
          
          // Bloquear acceso a páginas de pagos y suscripciones
          this.setupPaymentProtection();
const initial = fullname?.trim()?.charAt(0)?.toUpperCase() || 'M';
    this.addModification({
    id: 'avatar-initial',
    selector: '[data-purpose="display-initials"].ud-avatar.ud-heading-xl',
    type: 'text',
    originalPattern: /^[A-Z]$/,
    newContent: initial,
    description: `Cambiar inicial del avatar por "${initial}"`,
    priority: 'high'
}); 
          this.addModification({
        id: 'greeting-modification',
        selector: '.user-occupation-header-module--user-details--kJD-k h3.ud-heading-xl, .user-occupation-header-module--user-details--kJD-k h3',
        type: 'text',
        originalPattern: /Hola de nuevo, .+/,
        newContent: `Hola de nuevo, ${fullname}`,
        description: `Cambiar saludo personal por "Hola de nuevo, ${fullname}"`,
        priority: 'high'
    });
        // Modificación para diferentes variaciones del saludo
          this.addModification({
        id: 'greeting-variations',
        selector: 'h1:contains("Hola"), h2:contains("Hola"), h3:contains("Hola"), h4:contains("Hola")',
        type: 'text',
        originalPattern: /Hola(?:\s+de\s+nuevo)?,?\s+\w+/,
        newContent: `Hola de nuevo, ${fullname}`,
        description: `Cambiar variaciones del saludo a "Hola de nuevo, ${fullname}"`,
        priority: 'high'
    });

           this.addModification({
        id: 'user-header-greeting',
        selector: '[class*="user-occupation-header"] h3, [class*="user-details"] h3, [data-purpose*="greeting"] h3',
        type: 'text',
        originalPattern: /Hola\s+(de\s+nuevo,?\s*)?[^,\n]+/,
        newContent: `Hola de nuevo, ${fullname}`,
        description: 'Saludo en header de usuario',
        priority: 'high'
    });


        // Modificación del nombre en la barra superior
        this.addModification({
        id: 'navbar-name',
        selector: '[data-purpose="user-dropdown"] span, .header-user-menu span, [class*="user-name"]',
        type: 'text',
        originalPattern: /^[A-Za-z\s]+$/,
        newContent: fullname,
        description: 'Cambiar nombre en navbar',
        priority: 'medium'
    });

        // Modificación para breadcrumbs o títulos de página que contengan el nombre
         this.addModification({
        id: 'page-titles',
        selector: 'h1, h2, .breadcrumb, [class*="page-title"]',
        type: 'text',
        originalPattern: /Hola\s+\w+/,
        newContent: `Hola de nuevo, ${fullname}`,
        description: 'Saludos en títulos de página',
        priority: 'low'
    });

        // Modificación para elementos que se cargan dinámicamente
         this.addModification({
        id: 'dynamic-greetings',
        selector: '[class*="greeting"], [class*="welcome"], [data-testid*="greeting"]',
        type: 'text',
        originalPattern: /Hola.+?(?=\.|\$|<)/,
        newContent: `Hola de nuevo, ${fullname}`,
        description: 'Saludos en elementos dinámicos',
        priority: 'medium'
    });
    }
    
    setupCoursePageModifications() {
        // Detectar si estamos en una página de curso
        if (window.location.pathname.includes('/course/')) {
            
            // Reemplazar botones de inscripción con selector específico
            this.addModification({
                id: 'course-subscription-button-replacement',
                selector: 'a[data-purpose="subscription-redirect-button"]',
                type: 'button-replacement',
                description: 'Reemplazar botones de suscripción/inscripción',
                priority: 'high',
                handler: this.replaceSubscriptionButton.bind(this)
            });
        } else {
            // Interceptar botones de "Guardar" en páginas de búsqueda
            this.addModification({
                id: 'save-to-list-button-intercept',
                selector: '[data-testid="save-to-list-button"]',
                type: 'click-intercept',
                description: 'Interceptar botones de guardar en listas de cursos',
                priority: 'high',
                handler: this.handleSaveToListClick.bind(this)
            });
        }
    }
    
    setupLogoutProtection() {
        
        // Eliminar completamente enlaces de logout
        this.addModification({
            id: 'logout-protection',
            selector: 'a[href^="/user/logout/"]',
            type: 'element-removal',
            description: 'Eliminar completamente los enlaces de logout',
            priority: 'high',
            handler: this.removeElement.bind(this)
        });
        
        // Verificar si ya estamos en una URL de logout
        if (window.location.href.includes('/logout')) {
            window.stop();
            window.location.href = '/';
        }
    }
    
    setupPaymentProtection() {
        
        // Verificar si ya estamos en una URL bloqueada
        this.checkBlockedUrls();
        
        // Bloquear elementos del dropdown de suscripciones
        this.addModification({
            id: 'subscription-menu-blocker',
            selector: '.user-profile-dropdown-module--subscription-menu-item--TGzkF',
            type: 'element-removal',
            description: 'Eliminar elemento de suscripciones del menú',
            priority: 'high',
            handler: this.removeElement.bind(this)
        });
        
        // Eliminar enlaces de métodos de pago
        this.addModification({
            id: 'payment-methods-blocker',
            selector: 'a[href="/user/edit-payment-methods/"]',
            type: 'element-removal',
            description: 'Eliminar enlaces de métodos de pago',
            priority: 'high',
            handler: this.removeElement.bind(this)
        });
        
        // Eliminar otros enlaces relacionados con pagos/suscripciones
        this.addModification({
            id: 'billing-links-blocker',
            selector: 'a[href*="/user/manage-subscriptions/"], a[href*="/user/edit-payment-methods/"], a[href*="/dashboard/credit-history/"], a[href*="/user/edit-account/"], a[href*="/subscription-settings"], a[href*="/billing"], a[href*="/purchase-history"], a[href*="/account-settings"], a[href*="/payment-methods"], a[href*="/invoices"], a[href*="/profile/edit"]',
            type: 'element-removal',
            description: 'Eliminar enlaces de facturación y cuenta',
            priority: 'high',
            handler: this.removeElement.bind(this)
        });
    }
    
    checkBlockedUrls() {
        const blockedPaths = [
            '/user/manage-subscriptions/',
            '/user/edit-payment-methods/',
            '/dashboard/credit-history/',
            '/user/edit-account/',
            '/subscription-settings',
            '/billing',
            '/purchase-history',
            '/account-settings',
            '/payment-methods',
            '/invoices',
            '/profile/edit'
        ];
        
        const currentPath = window.location.pathname.toLowerCase();
        
        const isBlocked = blockedPaths.some(path => currentPath.startsWith(path));
        
        if (isBlocked) {
            this.showErrorNotification('🚫 Acceso denegado. Redirigiendo al inicio...');
            
            // Detener carga actual y redirigir
            window.stop();
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    }
    
    removeElement(element) {
        // Verificar si ya fue removido
        if (!element || !element.parentNode) {
            return false;
        }
        
        
        // Eliminar inmediatamente del DOM
        element.parentNode.removeChild(element);
        
        return true;
    }
    
    handleSaveToListClick(event, element) {
        event.stopPropagation();
        event.preventDefault();
        
        
        // Buscar el contenedor del curso
        const courseCard = element.closest('.course-list-context-menu');
        if (!courseCard) {
            this.showErrorNotification('❌ No se pudo encontrar la información del curso');
            return;
        }
        
        // Buscar el enlace del curso
        const courseContainer = courseCard.querySelector('a[href*="/course/"]');
        if (!courseContainer) {
            this.showErrorNotification('❌ No se pudo encontrar el enlace del curso');
            return;
        }
        
        const rawUrl = courseContainer.getAttribute('href') || '';
        const slug = rawUrl.replace(/^\/course\/|\/$/g, '');
        
        if (!slug) {
            this.showErrorNotification('❌ No se pudo extraer el identificador del curso');
            return;
        }
        
        // Extraer el título del curso
        let courseTitle = null;
        if (courseContainer) {
            // Buscar en nodos de texto directos
            for (const node of courseContainer.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    courseTitle = node.textContent.trim();
                    if (courseTitle) break;
                }
            }
            
            // Si no se encontró en texto directo, buscar en elementos hijos
            if (!courseTitle) {
                const titleElement = courseContainer.querySelector('h3, h4, h5, [class*="title"], [class*="name"]');
                if (titleElement) {
                    courseTitle = titleElement.textContent.trim();
                }
            }
        }
        
        if (!courseTitle) {
            courseTitle = `Curso ${slug}`;
        }
        
        // Extraer imagen del curso
        const courseImg = courseCard.querySelector('img')?.src;
        
        const payload = {
            name: courseTitle,
            udemyId: slug,
            urlImage: courseImg || null
        };
        
        
        // Procesar el guardado del curso
        this.saveCourseToBackend(payload, slug);
    }
    
    saveCourseToBackend(payload, slug) {
        // Obtener token de las cookies
        const token = this.getCookieValue('auth_token');
        
        if (!token) {
            this.showErrorNotification('❌ Token no encontrado. Inicia sesión primero.');
            return;
        }
        
        // Mostrar indicador de carga
        this.showLoadingNotification('⏳ Guardando curso...');
        
        // Hacer petición POST
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
            this.showSuccessNotification('✅ Curso guardado exitosamente');
            
            // Disparar evento para actualizar dropdown
            window.dispatchEvent(new CustomEvent('courseAdded', { 
                detail: { 
                    course: data,
                    slug: slug 
                } 
            }));
            
            // Redirigir al curso después de 1.5 segundos
            setTimeout(() => {
                const learnUrl = `https://www.udemy.com/course/${slug}/learn/`;
                window.location.href = learnUrl;
            }, 1500);
        })
        .catch(error => {
            this.showErrorNotification(`❌ Error: ${error.message}`);
        });
    }
    
    replaceSubscriptionButton(element) {
        // Verificar si ya fue reemplazado
        if (element.dataset.interceptorButtonReplaced) {
            return false;
        }
        
        
        // Extraer información del curso original
        const courseUrl = element.href;
        const courseTitle = document.title;
        const originalText = element.textContent?.trim() || 'Ir al curso';
        
        
        // Usar solo el estilo genérico
        const customButton = this.createGenericButton(courseTitle, courseUrl, originalText);
        
        // Reemplazar el botón
        element.parentNode.replaceChild(customButton, element);
        
        return true;
    }
    
    createGenericButton(courseTitle, courseUrl, originalText) {
        const button = document.createElement('button');
        button.dataset.interceptorButtonReplaced = 'true';
        button.style.cssText = `
            background: linear-gradient(45deg, #4834d4, #686de0);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(72, 52, 212, 0.4);
            transition: all 0.3s ease;
            text-transform: uppercase;
        `;
        
        button.textContent = 'Inscribirme';
        
        this.addButtonEvents(button, courseTitle, courseUrl, 'Botón de suscripción');
        return button;
    }
    
    addButtonEvents(button, courseTitle, courseUrl, buttonType) {
        // Hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px) scale(1.02)';
            button.style.filter = 'brightness(1.1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0) scale(1)';
            button.style.filter = 'brightness(1)';
        });
        
        // Click event
        button.addEventListener('click', () => {
            this.handleCourseEnrollment(courseTitle, courseUrl);
        });
    }
    
    handleCourseEnrollment(courseTitle, courseUrl) {
        
        // Extraer slug del curso de la URL
        const slugMatch = courseUrl.match(/\/course\/([^/]+)\//);
        const slug = slugMatch?.[1];
        
        if (!slug) {
            this.showErrorNotification('❌ No se pudo extraer el slug del curso');
            return;
        }
        
        // Obtener imagen del curso
        const imgElement = document.querySelector('.intro-asset--img-aspect--3gluH img');
        const imageUrl = imgElement?.src || null;
        
        // Preparar payload
        const payload = {
            name: courseTitle,
            udemyId: slug,
            urlImage: imageUrl,
        };
        
        
        // Usar el método compartido para guardar
        this.saveCourseToBackend(payload, slug);
    }
    
    showLoadingNotification(message) {
        this.showNotification(message, '#2196F3'); // Azul para loading
    }
    
    showSuccessNotification(message) {
        this.showNotification(message, '#4CAF50'); // Verde para éxito
    }
    
    showErrorNotification(message) {
        this.showNotification(message, '#f44336'); // Rojo para error
    }
    
    replaceEnrollButton(element) {
        // Verificar si ya fue reemplazado
        if (element.dataset.interceptorReplaced) {
            return false;
        }
        
        
        // Extraer información del curso original
        const originalButton = element.querySelector('a[data-purpose="subscription-redirect-button"]');
        const courseUrl = originalButton ? originalButton.href : window.location.href;
        const courseTitle = document.title;
        
        // Crear el nuevo botón personalizado
        const customButton = document.createElement('div');
        customButton.style.cssText = `
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            margin: 20px 0;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        `;
        
        customButton.innerHTML = `
            <button id="custom-enroll-btn" style="
                background: linear-gradient(45deg, #ff6b6b, #ee5a24);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            ">
                🚀 ACCEDER AHORA AL CURSO
            </button>
            <p style="
                color: white;
                margin: 10px 0 0 0;
                font-size: 14px;
                opacity: 0.9;
            ">
                ✨ Interceptado por tu extensión personalizada
            </p>
        `;
        
        // Agregar hover effects
        const button = customButton.querySelector('#custom-enroll-btn');
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.6)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4)';
        });
        
        // Agregar evento click
        button.addEventListener('click', () => {
            alert(`🎓 ¡Botón interceptado!\n\nCurso: ${courseTitle}\nURL: ${courseUrl}`);
        });
        
        // Reemplazar el contenido
        element.innerHTML = customButton.outerHTML;
        element.dataset.interceptorReplaced = 'true';
        
        return true;
    }
    
    replaceSliderMenuButton(element) {
        // Verificar si ya fue reemplazado
        if (element.dataset.interceptorSliderReplaced) {
            return false;
        }
        
        
        // Extraer información del curso original
        const originalButton = element.querySelector('a[data-purpose="subscription-redirect-button"]');
        const courseUrl = originalButton ? originalButton.href : window.location.href;
        const courseTitle = document.title;
        
        // Crear el nuevo botón personalizado para el slider
        const customSliderButton = document.createElement('div');
        customSliderButton.style.cssText = `
            padding: 15px;
            text-align: center;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            border-radius: 8px;
            margin: 10px 0;
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
            position: relative;
            overflow: hidden;
        `;
        
        customSliderButton.innerHTML = `
            <button id="custom-slider-btn" style="
                background: transparent;
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.3);
                padding: 12px 25px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                width: 100%;
                backdrop-filter: blur(10px);
            ">
                ⚡ ACCESO DIRECTO
            </button>
            <div style="
                position: absolute;
                top: 0;
                right: 0;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                padding: 2px 8px;
                font-size: 10px;
                border-radius: 0 8px 0 8px;
                font-weight: bold;
            ">
                CUSTOM
            </div>
        `;
        
        // Agregar hover effects específicos para el slider
        const button = customSliderButton.querySelector('#custom-slider-btn');
        button.addEventListener('mouseenter', () => {
            button.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            button.style.background = 'rgba(255, 255, 255, 0.1)';
            button.style.transform = 'scale(1.02)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            button.style.background = 'transparent';
            button.style.transform = 'scale(1)';
        });
        
        // Agregar evento click
        button.addEventListener('click', () => {
            alert(`🎯 ¡Botón del slider interceptado!\n\nCurso: ${courseTitle}\nURL: ${courseUrl}\nTipo: Menú deslizante`);
        });
        
        // Reemplazar el contenido
        element.innerHTML = customSliderButton.outerHTML;
        element.dataset.interceptorSliderReplaced = 'true';
        
        return true;
    }
    
    handleEnrollButtonClick(event, element) {
        event.preventDefault();
        event.stopPropagation();
        
        
        // Extraer información del curso
        const courseUrl = element.href;
        const courseTitle = document.title;
        
        // Cambiar el comportamiento del botón
        this.showCustomEnrollDialog(courseTitle, courseUrl);
        
        return false;
    }
    
    showCustomEnrollDialog(courseTitle, courseUrl) {
        // Crear modal personalizado
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            ">
                <h3 style="margin: 0 0 20px 0; color: #333;">🎓 Inscribirse al Curso</h3>
                <p style="margin: 0 0 20px 0; color: #666;">
                    <strong>Curso:</strong> ${courseTitle}
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="proceed-to-course" style="
                        background: linear-gradient(45deg, #ff6b6b, #ee5a24);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
                        transition: all 0.3s ease;
                    ">
                        🚀 Acceder Ahora
                    </button>
                    <button id="add-to-wishlist" style="
                        background: linear-gradient(45deg, #4834d4, #686de0);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(72, 52, 212, 0.4);
                        transition: all 0.3s ease;
                    ">
                        💎 Agregar a Favoritos
                    </button>
                    <button id="close-modal" style="
                        background: linear-gradient(45deg, #2c2c54, #40407a);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(44, 44, 84, 0.4);
                        transition: all 0.3s ease;
                    ">
                        ✖️ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners para los botones
        modal.querySelector('#proceed-to-course').addEventListener('click', () => {
            window.location.href = courseUrl;
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#add-to-wishlist').addEventListener('click', () => {
            this.addToWishlist(courseTitle, courseUrl);
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Cerrar al hacer click fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    addToWishlist(courseTitle, courseUrl) {
        // Guardar en localStorage
        const wishlist = JSON.parse(localStorage.getItem('udemy-interceptor-wishlist') || '[]');
        
        const courseData = {
            title: courseTitle,
            url: courseUrl,
            addedAt: new Date().toISOString(),
            id: Date.now()
        };
        
        // Evitar duplicados
        if (!wishlist.find(item => item.url === courseUrl)) {
            wishlist.push(courseData);
            localStorage.setItem('udemy-interceptor-wishlist', JSON.stringify(wishlist));
            
            // Mostrar notificación
            this.showNotification('✅ Curso guardado en tu lista personalizada');
        } else {
            this.showNotification('ℹ️ El curso ya está en tu lista');
        }
    }
    
    showNotification(message, backgroundColor = '#28a745') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10001;
            font-weight: bold;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Añadir animación CSS si no existe
        if (!document.querySelector('#notification-style')) {
            const style = document.createElement('style');
            style.id = 'notification-style';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }

    addModification(config) {
        this.modifications.set(config.id, config);
    }

    removeModification(id) {
        this.modifications.delete(id);
    }

    startObservers() {
        
        // Observer principal para cambios en el DOM
        this.startMainObserver();
        
        // Observer para navegación SPA
        this.startNavigationObserver();
        
        // Observer para elementos específicos de usuario
        this.startUserElementsObserver();
        
        // Observer para cambios de URL
        this.startUrlObserver();
        
        // Aplicar modificaciones iniciales con retry
        this.scheduleModifications(1000);
        
        // Aplicar modificaciones periódicamente 
        setInterval(() => this.scheduleModifications(), 5000);
        
        // Aplicar con más frecuencia en páginas de curso
        this.coursePageInterval = setInterval(() => {
            if (window.location.pathname.includes('/course/')) {
                this.scheduleModifications();
            }
        }, 2000);
        
        // Listener para eventos de carga dinámica
        this.setupDynamicLoadListeners();
    }

    // Función debounce para evitar sobrecarga
    debounce(func, delay) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, delay);
    }

    scheduleModifications(delay = 0) {
        this.debounce(() => {
            this.applyAllModificationsWithRetry();
        }, delay);
    }

    startMainObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldApplyModifications = false;
            let hasSignificantChanges = false;
            let hasCourseButtons = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Verificar si el nuevo elemento contiene selectores objetivo
                            if (this.containsTargetSelectors(node)) {
                                shouldApplyModifications = true;
                            }
                            
                            // Detectar específicamente botones de curso
                            if (this.containsCourseButtons(node)) {
                                hasCourseButtons = true;
                                shouldApplyModifications = true;
                            }
                            
                            // Detectar cambios significativos en la estructura
                            if (this.isSignificantChange(node)) {
                                hasSignificantChanges = true;
                            }
                        }
                    });
                }
                
                // También observar cambios de texto
                if (mutation.type === 'characterData') {
                    const element = mutation.target.parentElement;
                    if (element && this.isTargetElement(element)) {
                        shouldApplyModifications = true;
                    }
                }
            });
            
            if (shouldApplyModifications) {
                const delay = hasCourseButtons ? 800 : (hasSignificantChanges ? 1500 : 300);
                this.scheduleModifications(delay);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
            attributeFilter: ['class', 'data-purpose', 'data-testid']
        });

        this.observers.push(observer);
    }

    startNavigationObserver() {
        // Interceptar navegación SPA
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this.onNavigationChange();
        };
        
        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            this.onNavigationChange();
        };
        
        window.addEventListener('popstate', () => {
            this.onNavigationChange();
        });
        
    }

    startUrlObserver() {
        // Observer para cambios de URL que no disparan events
        setInterval(() => {
            if (window.location.href !== this.lastUrl) {
                this.lastUrl = window.location.href;
                this.onNavigationChange();
            }
        }, 1000);
    }

    setupDynamicLoadListeners() {
        // Escuchar eventos de carga dinámica comunes
        const events = ['load', 'DOMContentLoaded', 'readystatechange'];
        
        events.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.scheduleModifications(500);
            });
        });

        // Escuchar eventos de React/Vue si están disponibles
        if (window.React || window.Vue) {
            this.setupFrameworkListeners();
        }

        // Listener para requests AJAX/fetch completados
        this.interceptAjaxRequests();
    }

    setupFrameworkListeners() {
        // Para React
        if (window.React) {
            const originalRender = window.React.render;
            if (originalRender) {
                window.React.render = (...args) => {
                    const result = originalRender.apply(window.React, args);
                    this.scheduleModifications(200);
                    return result;
                };
            }
        }
    }

    interceptAjaxRequests() {
        // Interceptar fetch
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            return originalFetch.apply(window, args).then(response => {
                if (response.ok && response.url.includes('udemy.com')) {
                    this.scheduleModifications(800);
                }
                return response;
            });
        };

        // Interceptar XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(...args) {
            this.addEventListener('load', () => {
                if (this.responseURL && this.responseURL.includes('udemy.com')) {
                    window.udemyInterceptor?.scheduleModifications(800);
                }
            });
            return originalOpen.apply(this, args);
        };
    }

    onNavigationChange() {
        
        // Reset de contadores de retry
        this.retryAttempts.clear();
        this.pendingModifications.clear();
        
        // Verificar si necesitamos reconfigurar modificaciones para páginas de curso
        this.checkAndUpdateCourseModifications();
        
        // Refrescar cache de cursos si han pasado más de 2 minutos
        if (window.lastCacheUpdate && (Date.now() - window.lastCacheUpdate) > 120000) {
            if (window.invalidateCoursesCache) {
                window.invalidateCoursesCache();
            }
        }
        
        // Aplicar modificaciones después de que la nueva página cargue
        this.scheduleModifications(2000);
        
        // También intentar aplicaciones más tempranas
        setTimeout(() => this.scheduleModifications(500), 500);
        setTimeout(() => this.scheduleModifications(1000), 1000);
        setTimeout(() => this.scheduleModifications(3000), 3000);
    }
    
    checkAndUpdateCourseModifications() {
        const isCoursePage = window.location.pathname.includes('/course/');
        const hasSubscriptionModification = this.modifications.has('course-subscription-button-replacement');
        const hasSaveToListModification = this.modifications.has('save-to-list-button-intercept');
        const hasLogoutProtection = this.modifications.has('logout-protection');
        
        
        // Siempre asegurar que las protecciones estén activas
        if (!hasLogoutProtection) {
            this.setupLogoutProtection();
        }
        
        if (!this.modifications.has('subscription-menu-blocker')) {
            this.setupPaymentProtection();
        }
        
        if (isCoursePage && (!hasSubscriptionModification || hasSaveToListModification)) {
            this.removeModification('save-to-list-button-intercept'); // Remover interceptor de guardar
            this.setupCoursePageModifications();
        } else if (!isCoursePage && (hasSubscriptionModification || !hasSaveToListModification)) {
            this.removeModification('course-subscription-button-replacement'); // Remover reemplazo de suscripción
            this.setupCoursePageModifications();
        }
    }

    isSignificantChange(node) {
        // Detectar cambios importantes en la estructura
        const significantClasses = [
            'user-occupation-header',
            'header-user-menu',
            'ud-header',
            'main-content',
            'course-dashboard'
        ];
        
        if (node.className && typeof node.className === 'string') {
            return significantClasses.some(cls => node.className.includes(cls));
        }
        
        return false;
    }

    isTargetElement(element) {
        const targetSelectors = Array.from(this.modifications.values())
            .map(mod => mod.selector);
        
        return targetSelectors.some(selector => {
            try {
                return element.matches && element.matches(selector);
            } catch (e) {
                return false;
            }
        });
    }

    startUserElementsObserver() {
        // Observer específico para elementos que cambian frecuentemente
        const specificSelectors = [
            '.user-occupation-header-module--user-details--kJD-k',
            '[data-purpose="user-dropdown"]',
            '.header-user-menu'
        ];

        specificSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const observer = new MutationObserver(() => {
                    setTimeout(() => this.applyAllModifications(), 100);
                });

                observer.observe(element, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });

                this.observers.push(observer);
            });
        });
    }

    containsTargetSelectors(element) {
        const targetSelectors = Array.from(this.modifications.values())
            .map(mod => mod.selector);
        
        return targetSelectors.some(selector => {
            try {
                return element.querySelector && element.querySelector(selector);
            } catch (e) {
                return false;
            }
        });
    }
    
    containsCourseButtons(element) {
        // Detectar específicamente botones de suscripción/inscripción, guardar, logout y pagos
        const courseButtonSelectors = [
            'a[data-purpose="subscription-redirect-button"]',
            '[data-testid="save-to-list-button"]',
            'a[href^="/user/logout/"]',
            '.user-profile-dropdown-module--subscription-menu-item--TGzkF',
            'a[href="/user/edit-payment-methods/"]',
            'a[href*="/user/manage-subscriptions/"]',
            'a[href*="/billing"]',
            'a[href*="/payment-methods"]',
            'a[href*="/learn/"]',
            'button[data-purpose*="enroll"]',
            '[class*="enroll"]',
            '[class*="purchase"]'
        ];
        
        return courseButtonSelectors.some(selector => {
            try {
                const found = element.querySelector && element.querySelector(selector);
                if (found) {
                }
                return found;
            } catch (e) {
                return false;
            }
        });
    }

    applyAllModifications() {
        if (!this.isActive) return;

        let modificationsApplied = 0;
        
        this.modifications.forEach((config, id) => {
            try {
                const applied = this.applyModification(config);
                if (applied) {
                    modificationsApplied++;
                    this.pendingModifications.delete(id);
                    this.retryAttempts.delete(id);
                } else {
                    // Agregar a pendientes para retry
                    this.pendingModifications.add(id);
                }
            } catch (error) {
                this.pendingModifications.add(id);
            }
        });

        if (modificationsApplied > 0) {
        }

        if (this.pendingModifications.size > 0) {
        }
    }

    applyAllModificationsWithRetry() {
        this.applyAllModifications();
        
        // Retry para modificaciones pendientes
        if (this.pendingModifications.size > 0) {
            this.retryPendingModifications();
        }
    }

    retryPendingModifications() {
        const pendingArray = Array.from(this.pendingModifications);
        
        pendingArray.forEach(id => {
            const attempts = this.retryAttempts.get(id) || 0;
            
            if (attempts < this.maxRetries) {
                this.retryAttempts.set(id, attempts + 1);
                
                setTimeout(() => {
                    const config = this.modifications.get(id);
                    if (config) {
                        try {
                            const applied = this.applyModification(config);
                            if (applied) {
                                this.pendingModifications.delete(id);
                                this.retryAttempts.delete(id);
                            }
                        } catch (error) {
                        }
                    }
                }, this.retryDelay * (attempts + 1));
            } else {
                this.pendingModifications.delete(id);
                this.retryAttempts.delete(id);
            }
        });
    }

    applyModification(config) {
        
        const elements = document.querySelectorAll(config.selector);
        
        let applied = false;

        elements.forEach((element, index) => {
            
            if (config.type === 'element-removal') {
                // Remover elemento completamente
                
                if (config.handler) {
                    const removed = config.handler(element);
                    if (removed) {
                        applied = true;
                    }
                }
            } else if (config.type === 'button-replacement') {
                // Reemplazar botón completamente
                
                if (config.handler) {
                    const replaced = config.handler(element);
                    if (replaced) {
                        applied = true;
                    }
                }
            } else if (config.type === 'click-intercept') {
                // Interceptar clicks en botones
                if (!element.dataset.interceptorClickAdded) {
                    
                    element.addEventListener('click', (event) => {
                        if (config.handler) {
                            config.handler(event, element);
                        }
                    });
                    
                    element.dataset.interceptorClickAdded = 'true';
                    applied = true;
                }
            } else if (config.type === 'text') {
                const currentText = element.textContent || element.innerText;
                
                if (config.originalPattern.test(currentText)) {
                    // Marcar elemento como modificado para evitar loops
                    if (element.dataset.interceptorModified === config.id) {
                        return;
                    }

                    const newText = typeof config.newContent === 'function' 
                        ? config.newContent(currentText) 
                        : config.newContent;
                    
                    
                    element.textContent = newText;
                    element.dataset.interceptorModified = config.id;
                    
                    // Agregar estilo visual para indicar modificación
                    element.style.cssText += `
                         background: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    border: none !important;
                    `;
                    if (config.id === 'avatar-initial') {
    element.style.cssText += `
           background: rgba(78, 205, 196, 0.6) !important;
        border: 2px solid rgba(78, 205, 196, 1) !important;
        border-radius: 50% !important;
        padding: 0.5rem !important;
        transition: background 0.3s ease, border 0.3s ease !important;
        cursor: pointer !important;
    `;
     element.addEventListener('mouseenter', () => {
        element.style.background = 'rgba(78, 205, 196, 0.8)';
        element.style.borderColor = 'rgba(34, 166, 179, 1)';
    });

    element.addEventListener('mouseleave', () => {
        element.style.background = 'rgba(78, 205, 196, 0.6)';
        element.style.borderColor = 'rgba(78, 205, 196, 1)';
    });
}

                    
                    applied = true;
                    
                    // Log adicional para verificación
                } else {
                }
            }
        });

        return applied;
    }

    // Método para agregar modificaciones personalizadas desde la consola
    addCustomModification(selector, originalPattern, newContent, description = 'Modificación personalizada') {
        const id = `custom-${Date.now()}`;
        this.addModification({
            id,
            selector,
            type: 'text',
            originalPattern: new RegExp(originalPattern, 'i'),
            newContent,
            description
        });
        
        // Aplicar inmediatamente
        setTimeout(() => this.applyAllModifications(), 100);
        
        return id;
    }

    // Método para listar todas las modificaciones activas
    listModifications() {
        this.modifications.forEach((config, id) => {
        });
    }

    // Método para pausar/reanudar el interceptor
    toggle() {
        this.isActive = !this.isActive;
    }

    // Limpiar observadores
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        // Limpiar intervalos
        if (this.coursePageInterval) {
            clearInterval(this.coursePageInterval);
        }
        
        this.isActive = false;
    }
}

// --- Lógica de inicialización y UI para el proceso de renderizado ---

// Cargar interceptor de Udemy si estamos en Udemy
if (window.location.hostname.includes('udemy.com')) {

  // Crear instancia global del interceptor si no existe (para evitar duplicados si se inyecta varias veces)
  if (!window.udemyInterceptor) {
    window.udemyInterceptor = new UdemyInterceptor();
  }

  // Funciones de conveniencia para la consola
  window.interceptorHelpers = {
      // Cambiar saludo rápidamente
      changeName: (newName) => {
          window.udemyInterceptor.addCustomModification(
              'h1, h2, h3, h4, h5, h6',
              'Hola de nuevo, .+',
              `Hola de nuevo, ${newName}`,
              `Cambiar nombre a ${newName}`
          );
      },
      
      // Listar modificaciones
      list: () => window.udemyInterceptor.listModifications(),
      
      // Pausar/reanudar
      toggle: () => window.udemyInterceptor.toggle(),
      
      // Aplicar modificaciones manualmente
      apply: () => window.udemyInterceptor.applyAllModifications()
  };

  // Funciones de verificación directa para debugging
  window.debugUdemy = {
      // Buscar todos los elementos que contengan "Hola"
      findHolaElements: () => {
          const allElements = document.querySelectorAll('*');
          const holaElements = [];
          
          allElements.forEach((el, index) => {
              const text = el.textContent || el.innerText || '';
              if (text.toLowerCase().includes('hola') && text.trim().length > 0 && text.trim().length < 200) {
                  holaElements.push({
                      element: el,
                      text: text.trim(),
                      tag: el.tagName,
                      classes: el.className,
                      id: el.id
                  });
              }
          });
          
          holaElements.forEach((item, index) => {
          });
          
          return holaElements;
      },

      // Verificar selectores específicos
      testSelectors: () => {
          const selectors = [
              '.user-occupation-header-module--user-details--kJD-k h3.ud-heading-xl',
              '.user-occupation-header-module--user-details--kJD-k h3',
              '[class*="user-occupation-header"] h3',
              '[class*="user-details"] h3',
              'h3',
              '[data-purpose="user-dropdown"]',
              '[class*="user"]',
              '[data-purpose*="greeting"] h3' // Agregado para probar el nuevo selector
          ];
          
          selectors.forEach(selector => {
              try {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach((el, i) => {
                      if (i < 3) { // Solo mostrar los primeros 3
                          const text = (el.textContent || el.innerText || '').trim();
                      }
                  });
              } catch (e) {
              }
          });
      },

      // Aplicar modificación manual
      applyManualChange: (selector = 'h3', newText = 'Hola Mundo') => {
          
          const elements = document.querySelectorAll(selector);
          let changed = 0;
          
          elements.forEach((el, index) => {
              const currentText = el.textContent || el.innerText || '';
              if (currentText.toLowerCase().includes('hola') && !currentText.includes('Mundo')) {
                  el.textContent = newText;
                  el.style.cssText += 'background: #ff6b6b44 !important; border: 2px solid #ff6b6b !important;';
                  changed++;
              }
          });
          
          return changed;
      },

      // Estado del interceptor
      status: () => {
          if (window.udemyInterceptor) {
              window.udemyInterceptor.listModifications();
          } else {
          }
      },

      // Forzar aplicación
      force: () => {
          if (window.udemyInterceptor) {
              window.udemyInterceptor.applyAllModifications();
          } else {
          }
      }
  };


  // --- Función de logout personalizada ---
  async function handleCustomLogout() {
    
    // Confirmar con el usuario
    if (!confirm('¿Estás seguro que deseas cerrar sesión? Se eliminarán TODAS las cookies y datos de sesión de la aplicación.')) {
      return;
    }

    try {
      
      // Limpiar authManager si está disponible
      if (window.authManager && typeof window.authManager.logout === 'function') {
        window.authManager.logout();
      }

      // Limpiar TODO el localStorage y sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      
      // Eliminar cookies de Udemy desde el navegador
      const cookiesToDelete = ['dj_session_id', 'access_token', 'client_id', 'auth_token', 'user_email', 'user_fullname'];
      
      cookiesToDelete.forEach(cookieName => {
        // Eliminar para diferentes dominios y paths
        const domains = ['.udemy.com', 'www.udemy.com', 'udemy.com'];
        const paths = ['/', '/user', '/home'];
        
        domains.forEach(domain => {
          paths.forEach(path => {
            document.cookie = `${cookieName}=; Max-Age=0; path=${path}; domain=${domain};`;
          });
        });
        
        // También sin domain especificado
        paths.forEach(path => {
          document.cookie = `${cookieName}=; Max-Age=0; path=${path};`;
        });
      });

      
      // Limpiar TODAS las cookies desde Electron (esto incluye las de tu app)
      if (window.electronAPI && window.electronAPI.invoke) {
        try {
          const result = await window.electronAPI.invoke('clear-cookies');
          if (result.success) {
          } else {
          }
        } catch (electronError) {
        }
      }

      
      // Esperar un momento para que se completen las operaciones
      setTimeout(() => {
        // Redirigir a página principal de la aplicación
        if (window.electronAPI) {
          window.electronAPI.send('go-to-home');
        } else {
          window.location.href = 'https://www.udemy.com/';
        }
      }, 500);
      
    } catch (error) {
      alert('Hubo un error al cerrar sesión. Por favor, intenta nuevamente.');
    }
  }

  // --- Lógica de la barra de herramientas y atajos de teclado ---
  const style = document.createElement('style');
  style.textContent = `
    .udemy-extension-toolbar {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.8);
      padding: 10px;
      border-radius: 5px;
      display: flex;
      gap: 10px;
    }

    .back-button-solo {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 9998;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      padding: 12px 16px;
      border-radius: 25px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .back-button-solo:hover {
      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
    }

    .back-button-solo:active {
      transform: translateY(0) scale(1.02);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    
    .udemy-extension-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      position: relative;
    }
    
    .udemy-extension-btn:hover {
      background: #0056b3;
    }

    #home-btn {
      background: linear-gradient(45deg, #667eea, #764ba2);
      font-weight: bold;
      font-size: 16px;
    }

    #home-btn:hover {
      background: linear-gradient(45deg, #764ba2, #667eea);
    }

    #my-learning-btn {
      position: relative;
    }

    #logout-btn {
      background: #dc3545;
      font-weight: bold;
    }

    #logout-btn:hover {
      background: #c82333;
    }

    .courses-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      min-width: 300px;
      max-width: 400px;
      padding: 15px;
      display: none;
      z-index: 10001;
    }

    .courses-dropdown.show {
      display: block;
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }

    .dropdown-title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }

    .view-all-link {
      font-size: 12px;
      color: #007bff;
      text-decoration: none;
    }

    .course-item {
      display: flex;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background 0.2s;
    }

    .course-item:hover {
      background: #f8f9fa;
      border-radius: 4px;
    }

    .course-item:last-child {
      border-bottom: none;
    }

    .course-image {
      width: 60px;
      height: 35px;
      object-fit: cover;
      border-radius: 4px;
    }

    .course-info {
      flex: 1;
    }

    .course-title {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      line-height: 1.2;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .course-progress {
      font-size: 11px;
      color: #666;
    }

    .loading-spinner {
      text-align: center;
      padding: 20px;
      color: #666;
    }

    .error-message {
      text-align: center;
      padding: 20px;
      color: #dc3545;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);

  // Crear toolbar principal
  const toolbar = document.createElement('div');
  toolbar.className = 'udemy-extension-toolbar';
  
  toolbar.innerHTML = `
    <button class="udemy-extension-btn" id="home-btn">🏠</button>
    <button class="udemy-extension-btn" id="my-learning-btn">
      📚 My learning
      <div class="courses-dropdown" id="courses-dropdown">
        <div class="loading-spinner">Cargando cursos...</div>
      </div>
    </button>
    <button class="udemy-extension-btn" id="logout-btn">🚪 Cerrar sesión</button>
  `;
  
  // Crear botón "Volver" independiente
  const backButton = document.createElement('button');
  backButton.className = 'back-button-solo';
  backButton.id = 'back-btn-solo';
  backButton.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
    <span>Volver</span>
  `;
  
  // Función helper para obtener cookies
  function getCookieValue(name) {
    const cookies = document.cookie.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(name + '=')) {
        return decodeURIComponent(cookie.split('=')[1]);
      }
    }
    return null;
  }
  
  // Configurar comportamiento del botón según origen
  const referrer = document.referrer;
  const authToken = getCookieValue('auth_token');
  const userEmail = getCookieValue('user_email');
  
  // Detectar si NO hay variable global (primera vez desde index/login)
  const isFirstTime = !window.appInitialized;
  
  console.log('🔍 DEBUG - Back button setup:');
  console.log('  Referrer:', referrer);
  console.log('  window.appInitialized:', window.appInitialized);
  console.log('  isFirstTime:', isFirstTime);
  
  // Establecer la variable global después de la primera navegación
  if (isFirstTime) {
    window.appInitialized = true;
    console.log('  ✅ Variable global establecida');
  }
  
  if (isFirstTime) {
    // Si es primera vez desde index/login, deshabilitar visualmente el botón
    backButton.style.opacity = '0.5';
    backButton.style.cursor = 'not-allowed';
    backButton.title = 'No hay páginas anteriores disponibles';
    
    console.log('  🚫 Botón DESHABILITADO - primera vez desde app');
    
    backButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('  ❌ Click bloqueado - botón deshabilitado');
      // No hacer nada, botón deshabilitado
    });
  } else {
    // Si no es primera vez, comportamiento normal
    backButton.title = 'Volver a la página anterior';
    
    console.log('  ✅ Botón HABILITADO - navegación interna');
    
    backButton.addEventListener('click', () => {
      console.log('  ⬅️ Navegando hacia atrás');
      window.history.back();
    });
  }
  
  // Agregar ambos elementos al DOM
  document.body.appendChild(toolbar);
  document.body.appendChild(backButton);

  // --- Funciones para manejar el dropdown de cursos ---
  let coursesCache = null;
  let dropdownTimeout = null;
  let lastCacheUpdate = 0;
  let isLoadingCourses = false;
  const CACHE_DURATION = 30000; // 30 segundos
  const MAX_RETRY_ATTEMPTS = 3;

  async function fetchUserCourses(forceRefresh = false) {
    
    // Verificar que el interceptor esté disponible
    if (!window.udemyInterceptor) {
      throw new Error('UdemyInterceptor no está disponible');
    }

    // Obtener token desde cookies con múltiples intentos
    let token = window.udemyInterceptor.getCookieValue('auth_token');
    
    // Intentar nombres alternativos de token si no se encuentra
    if (!token) {
      const alternativeTokenNames = ['access_token', 'token', 'authorization_token', 'user_token'];
      for (const tokenName of alternativeTokenNames) {
        token = window.udemyInterceptor.getCookieValue(tokenName);
        if (token) {
          break;
        }
      }
    }
    
    
    if (!token) {
      // Mostrar todas las cookies disponibles para debugging
      throw new Error('Token de autenticación no encontrado en las cookies. Por favor, inicia sesión en la aplicación.');
    }
    
    // Verificar que el token no esté vacío o sea solo espacios
    if (!token.trim()) {
      throw new Error('Token de autenticación inválido (vacío). Por favor, inicia sesión nuevamente.');
    }

    // Verificar cache si no es refresh forzado
    const now = Date.now();
    if (!forceRefresh && coursesCache && (now - lastCacheUpdate) < CACHE_DURATION) {
      return coursesCache;
    }

    // Evitar múltiples peticiones simultáneas
    if (isLoadingCourses && !forceRefresh) {
      return coursesCache || [];
    }

    isLoadingCourses = true;
    
    let retryCount = 0;
    
    while (retryCount < MAX_RETRY_ATTEMPTS) {
      try {
        const url = `${window.udemyInterceptor.backendURL}user-courses/`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        
        // Manejar la estructura específica del backend: { data: [...] }
        const rawCourses = data.data || data.results || data || [];
        
        // Transformar la estructura del backend a la estructura esperada
        const courses = rawCourses.map(item => {
          // Si ya viene transformado (retrocompatibilidad)
          if (item.name && item.udemyId) {
            return item;
          }
          
          // Transformar estructura del backend
          if (item.course) {
            return {
              id: item.id,
              name: item.course.name,
              udemyId: item.course.urlCourseUdemy,
              urlImage: item.course.urlImage,
              courseId: item.course.id,
              createdAt: item.createdAt || item.created_at
            };
          }
          
          // Fallback para otras estructuras
          return {
            id: item.id,
            name: item.name || 'Curso sin nombre',
            udemyId: item.urlCourseUdemy || item.udemyId || '',
            urlImage: item.urlImage || null,
            createdAt: item.createdAt || item.created_at
          };
        });
        
        
        // Actualizar cache
        coursesCache = courses;
        lastCacheUpdate = now;
        window.lastCacheUpdate = now;
        isLoadingCourses = false;
        
        return courses;
        
      } catch (error) {
        retryCount++;
        
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          isLoadingCourses = false;
          throw error;
        }
      }
    }
  }

  // Función para invalidar cache cuando se agregan nuevos cursos
  function invalidateCoursesCache() {
    coursesCache = null;
    lastCacheUpdate = 0;
  }

  // Hacer funciones globales para acceso desde otras partes
  window.invalidateCoursesCache = invalidateCoursesCache;
  window.lastCacheUpdate = lastCacheUpdate;

  // Agregar listener para eventos de nuevos cursos guardados
  window.addEventListener('courseAdded', (event) => {
    invalidateCoursesCache();
    // Actualizar dropdown si está visible
    const dropdown = document.getElementById('courses-dropdown');
    if (dropdown && dropdown.classList.contains('show')) {
      showCoursesDropdown(true); // Forzar refresh
    }
  });

  function renderCoursesDropdown(courses, isLoading = false, error = null) {
    const dropdown = document.getElementById('courses-dropdown');
    
    if (isLoading) {
      dropdown.innerHTML = `
        <div class="loading-spinner">
          <div style="display: inline-block; margin-right: 10px;">⏳</div>
          Actualizando cursos...
        </div>
      `;
      return;
    }
    
    // Mostrar error específico si existe
    if (error) {
      let errorMessage = error.message;
      let actionButton = '';
      let statusIcon = '❌';
      
      // Personalizar mensaje según el tipo de error
      if (error.message.includes('Token') || error.message.includes('autenticación')) {
        statusIcon = '🔑';
        errorMessage = 'Sesión expirada o token inválido';
        actionButton = `
          <button onclick="window.location.reload()" style="
            background: #28a745; 
            color: white; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 3px; 
            cursor: pointer; 
            font-size: 11px;
            margin-top: 8px;
          ">Recargar página</button>
        `;
      } else if (error.message.includes('HTTP 401')) {
        statusIcon = '🚫';
        errorMessage = 'Sin autorización. Necesitas iniciar sesión nuevamente.';
        actionButton = `
          <button onclick="window.location.reload()" style="
            background: #28a745; 
            color: white; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 3px; 
            cursor: pointer; 
            font-size: 11px;
            margin-top: 8px;
          ">Recargar página</button>
        `;
      } else if (error.message.includes('HTTP 404')) {
        statusIcon = '🔍';
        errorMessage = 'Endpoint no encontrado. Verifica la configuración del backend.';
      } else if (error.message.includes('HTTP 500')) {
        statusIcon = '⚠️';
        errorMessage = 'Error interno del servidor. Intenta más tarde.';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        statusIcon = '🌐';
        errorMessage = 'Sin conexión al servidor. Verifica tu conexión a internet.';
      } else if (error.message.includes('UdemyInterceptor no está disponible')) {
        statusIcon = '🔧';
        errorMessage = 'Sistema no inicializado correctamente. Recarga la página.';
        actionButton = `
          <button onclick="window.location.reload()" style="
            background: #6c757d; 
            color: white; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 3px; 
            cursor: pointer; 
            font-size: 11px;
            margin-top: 8px;
          ">Recargar página</button>
        `;
      } else {
        statusIcon = '❌';
        errorMessage = error.message;
      }
      
      // Botón de reintentar por defecto si no hay otro botón
      if (!actionButton) {
        actionButton = `
          <button onclick="refreshCourses()" style="
            background: #007bff; 
            color: white; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 3px; 
            cursor: pointer; 
            font-size: 11px;
            margin-top: 8px;
          ">Reintentar</button>
        `;
      }
      
      dropdown.innerHTML = `
        <div class="dropdown-header">
          <div class="dropdown-title">Cursos</div>
          <a href="#" onclick="window.electronAPI.send('go-to-my-learning'); return false;" class="view-all-link">Mi aprendizaje</a>
        </div>
        <div class="error-message">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 16px; margin-right: 8px;">${statusIcon}</span>
            <strong>Error al cargar cursos</strong>
          </div>
          <div style="font-size: 12px; line-height: 1.4; margin-bottom: 8px;">
            ${errorMessage}
          </div>
          ${actionButton}
          <details style="margin-top: 12px; font-size: 10px; color: #666;">
            <summary style="cursor: pointer; padding: 4px 0;">Detalles técnicos</summary>
            <div style="margin-top: 5px; padding: 8px; background: #f8f9fa; border-radius: 3px; border-left: 3px solid #dc3545; font-family: monospace; white-space: pre-wrap; overflow-wrap: break-word;">${error.message}</div>
          </details>
        </div>
      `;
      return;
    }
    
    if (!courses || courses.length === 0) {
      dropdown.innerHTML = `
        <div class="dropdown-header">
          <div class="dropdown-title">Cursos</div>
          <a href="#" onclick="window.electronAPI.send('go-to-my-learning'); return false;" class="view-all-link">Mi aprendizaje</a>
        </div>
        <div class="error-message">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 16px; margin-right: 8px;">📚</span>
            <strong>No tienes cursos guardados</strong>
          </div>
          <div style="font-size: 12px; line-height: 1.4; color: #666;">
            Guarda cursos usando el botón "Inscribirme" en las páginas de curso.
          </div>
          <button onclick="refreshCourses()" style="
            background: #28a745; 
            color: white; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 3px; 
            cursor: pointer; 
            font-size: 11px;
            margin-top: 8px;
          ">Actualizar lista</button>
        </div>
      `;
      return;
    }

    // Ordenar cursos por fecha de adición (más recientes primero)
    const sortedCourses = courses.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || Date.now());
      const dateB = new Date(b.createdAt || b.created_at || Date.now());
      return dateB - dateA;
    });

    dropdown.innerHTML = `
      <div class="dropdown-header">
        <div class="dropdown-title">Cursos</div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button onclick="refreshCourses()" style="
            background: none; 
            border: none; 
            color: #007bff; 
            cursor: pointer; 
            font-size: 12px;
            padding: 0;
          " title="Actualizar lista">🔄</button>
          <a href="#" onclick="window.electronAPI.send('go-to-my-learning'); return false;" class="view-all-link">Mi aprendizaje</a>
        </div>
      </div>
      <div class="courses-list">
        ${sortedCourses.slice(0, 4).map((course, index) => {
          
          const courseSlug = course.udemyId || course.urlCourseUdemy || course.slug || '';
          
          return `
            <div class="course-item" onclick="goToCourse('${courseSlug}', event)" data-course-id="${courseSlug}">
              <img src="${course.urlImage || 'https://via.placeholder.com/60x35/f0f0f0/666?text=Curso'}" 
                   alt="Course image" 
                   class="course-image"
                   onerror="this.src='https://via.placeholder.com/60x35/f0f0f0/666?text=Curso'">
              <div class="course-info">
                <div class="course-title">${escapeHtml(course.name)}</div>
                <div class="course-progress">Empieza a aprender</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${sortedCourses.length > 4 ? `
        <div style="text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f0f0;">
          <a href="#" onclick="window.electronAPI.send('go-to-my-learning'); return false;" class="view-all-link">Ver todos los cursos (${sortedCourses.length})</a>
        </div>
      ` : ''}
      <div style="text-align: center; margin-top: 5px; font-size: 10px; color: #999;">
        Actualizado ${getTimeAgo(lastCacheUpdate)}
      </div>
    `;
  }

  // Función helper para escapar HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Función helper para mostrar tiempo relativo
  function getTimeAgo(timestamp) {
    if (!timestamp) return 'hace un momento';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'hace un momento';
    if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)} h`;
    return `hace ${Math.floor(diff / 86400000)} d`;
  }

  async function showCoursesDropdown(forceRefresh = false) {
    
    const dropdown = document.getElementById('courses-dropdown');
    if (!dropdown) {
      return;
    }
    
    dropdown.classList.add('show');
    
    // Mostrar loading si es refresh forzado o no hay cache
    if (forceRefresh || !coursesCache) {
      renderCoursesDropdown(null, true);
    }
    
    try {
      const courses = await fetchUserCourses(forceRefresh);
      renderCoursesDropdown(courses);
    } catch (error) {
      renderCoursesDropdown(null, false, error);
    }
  }

  // Función global para refrescar cursos
  window.refreshCourses = function() {
    showCoursesDropdown(true);
  };

  // Función de debugging para verificar el estado
  window.debugCoursesSystem = function() {
    
    // Verificar tokens disponibles
    const tokenNames = ['auth_token', 'access_token', 'token', 'authorization_token', 'user_token'];
    tokenNames.forEach(tokenName => {
      const token = window.udemyInterceptor?.getCookieValue(tokenName);
    });
    
    
    // Intentar petición manual
    if (window.udemyInterceptor) {
      fetchUserCourses(true)
        .then(courses => {
        })
        .catch(error => {
        });
    }
  };

  function hideCoursesDropdown() {
    const dropdown = document.getElementById('courses-dropdown');
    dropdown.classList.remove('show');
  }

  // Función global para navegar a un curso específico
  window.goToCourse = function(courseId, event) {
    
    // Detener propagación del evento para evitar conflictos
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (!courseId || courseId.trim() === '') {
      alert('Error: ID del curso no válido');
      return;
    }
    
    // Cerrar el dropdown antes de navegar
    const dropdown = document.getElementById('courses-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
    
    // Construir URL correcta del curso para navegar directamente
    const courseUrl = `https://www.udemy.com/course/${courseId}/learn/`;
    
    // Navegar directamente al curso (no usar electronAPI que va a my-learning)
    window.location.href = courseUrl;
  };

  // Event listeners para los botones
  const myLearningBtn = document.getElementById('my-learning-btn');
  if (myLearningBtn) {
    myLearningBtn.addEventListener('mouseenter', () => {
      clearTimeout(dropdownTimeout);
      showCoursesDropdown();
    });

    myLearningBtn.addEventListener('mouseleave', () => {
      dropdownTimeout = setTimeout(() => {
        hideCoursesDropdown();
      }, 200);
    });

    myLearningBtn.addEventListener('click', (event) => {
      // Solo navegar si el click no fue en el dropdown
      const dropdown = document.getElementById('courses-dropdown');
      const isDropdownClick = dropdown && dropdown.contains(event.target);
      
      if (!isDropdownClick) {
        window.electronAPI.send('go-to-my-learning');
      } else {
      }
    });
  }

  // Mantener dropdown visible cuando el mouse está sobre él
  const dropdown = document.getElementById('courses-dropdown');
  if (dropdown) {
    dropdown.addEventListener('mouseenter', () => {
      clearTimeout(dropdownTimeout);
    });

    dropdown.addEventListener('mouseleave', () => {
      hideCoursesDropdown();
    });
  }

  // Agregar event listener para el botón home
  const homeButton = document.getElementById('home-btn');
  if (homeButton) {
    homeButton.addEventListener('click', () => {
      window.location.href = 'https://www.udemy.com/';
    });
  }


  // Agregar event listener para el botón de logout
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      handleCustomLogout();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
      switch(event.key) {
        case 'i':
          // Activar/desactivar interceptor con Ctrl+I
          if (window.udemyInterceptor) {
            event.preventDefault();
            window.udemyInterceptor.toggle();
          }
          break;
        case 'm':
          // Mostrar modificaciones con Ctrl+M
          if (window.interceptorHelpers) {
            event.preventDefault();
            window.interceptorHelpers.list();
          }
          break;
      }
    }
  });
}