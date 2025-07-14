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
        this.init();
    }

    init() {
        console.log('🎯 [UdemyInterceptor] Inicializando...');
        console.log('📍 [UdemyInterceptor] URL actual:', window.location.href);
        console.log('🌐 [UdemyInterceptor] Dominio:', window.location.hostname);
        console.log('📄 [UdemyInterceptor] Estado del DOM:', document.readyState);
        
        // Verificar si estamos en Udemy
        if (!this.isUdemyDomain()) {
            console.log('❌ [UdemyInterceptor] No estamos en Udemy, interceptor inactivo');
            return;
        }

        this.isActive = true;
        console.log('✅ [UdemyInterceptor] Activo en Udemy');
        console.log('🔧 [UdemyInterceptor] Configurando modificaciones por defecto...');
        
        // Configurar modificaciones por defecto
        this.setupDefaultModifications();
        
        console.log(`📝 [UdemyInterceptor] Total de modificaciones configuradas: ${this.modifications.size}`);
        
        // Iniciar observadores cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('⏳ [UdemyInterceptor] DOMContentLoaded, iniciando observadores...');
                this.startObservers();
            });
        } else {
            console.log('🚀 [UdemyInterceptor] DOM ya cargado, iniciando observadores directamente...');
            this.startObservers();
        }

        // Verificación inicial de elementos
        this.performInitialCheck();
    }

    performInitialCheck() {
        console.log('🔍 VERIFICACIÓN INICIAL DE ELEMENTOS:');
        
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
            console.log(`  📋 ${check.name}:`);
            console.log(`    - Selector: ${check.selector}`);
            console.log(`    - Elementos encontrados: ${elements.length}`);
            
            if (elements.length > 0) {
                elements.forEach((el, index) => {
                    const text = el.textContent?.trim() || el.innerText?.trim() || '';
                    if (check.textCheck) {
                        if (text.toLowerCase().includes('hola')) {
                            console.log(`    - [${index}] ✅ TEXTO CON "HOLA": "${text.substring(0, 50)}..."`);
                            console.log(`    - [${index}] 🏷️ Clases: ${el.className}`);
                        }
                    } else {
                        console.log(`    - [${index}] Texto: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
                        console.log(`    - [${index}] Clases: ${el.className}`);
                    }
                });
            } else {
                console.log(`    - ❌ No se encontraron elementos`);
            }
        });

        // Verificar estructura general de la página
        this.checkPageStructure();
    }

    checkPageStructure() {
        console.log('🏗️ ESTRUCTURA DE LA PÁGINA:');
        
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
                console.log(`  ✅ ${selector}: ${elements.length} elementos`);
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
            console.log('👤 CLASES RELACIONADAS CON USUARIO:');
            Array.from(userClasses).forEach(cls => {
                console.log(`  - ${cls}`);
            });
        }
    }

    isUdemyDomain() {
        return window.location.hostname.includes('udemy.com');
    }

    setupDefaultModifications() {
        // Modificación del saludo personalizado - principal
        this.addModification({
            id: 'greeting-modification',
            selector: '.user-occupation-header-module--user-details--kJD-k h3.ud-heading-xl, .user-occupation-header-module--user-details--kJD-k h3',
            type: 'text',
            originalPattern: /Hola de nuevo, .+/
,            newContent: 'Hola Mundo',
            description: 'Cambiar saludo personal por "Hola Mundo"',
            priority: 'high'
        });

        // Modificación para diferentes variaciones del saludo
        this.addModification({
            id: 'greeting-variations',
            selector: 'h1:contains("Hola"), h2:contains("Hola"), h3:contains("Hola"), h4:contains("Hola")',
            type: 'text',
            originalPattern: /Hola(?:\s+de\s+nuevo)?,?\s+\w+/
,            newContent: 'Hola Mundo',
            description: 'Cambiar variaciones del saludo',
            priority: 'high'
        });

        // Modificación más específica para el header de usuario
        this.addModification({
            id: 'user-header-greeting',
            selector: '[class*="user-occupation-header"] h3, [class*="user-details"] h3, [data-purpose*="greeting"] h3',
            type: 'text',
            originalPattern: /Hola\s+(de\s+nuevo,?\s*)?[^,\n]+/
,            newContent: 'Hola Mundo',
            description: 'Saludo en header de usuario',
            priority: 'high'
        });

        // Modificación del nombre en la barra superior
        this.addModification({
            id: 'navbar-name',
            selector: '[data-purpose="user-dropdown"] span, .header-user-menu span, [class*="user-name"]',
            type: 'text',
            originalPattern: /^[A-Za-z\s]+$/,
            newContent: 'Mundo',
            description: 'Cambiar nombre en navbar',
            priority: 'medium'
        });

        // Modificación para breadcrumbs o títulos de página que contengan el nombre
        this.addModification({
            id: 'page-titles',
            selector: 'h1, h2, .breadcrumb, [class*="page-title"]',
            type: 'text',
            originalPattern: /Hola\s+\w+/
,            newContent: 'Hola Mundo',
            description: 'Saludos en títulos de página',
            priority: 'low'
        });

        // Modificación para elementos que se cargan dinámicamente
        this.addModification({
            id: 'dynamic-greetings',
            selector: '[class*="greeting"], [class*="welcome"], [data-testid*="greeting"]',
            type: 'text',
            originalPattern: /Hola.+?(?=\.|\$|<)/
,            newContent: 'Hola Mundo',
            description: 'Saludos en elementos dinámicos',
            priority: 'medium'
        });
    }

    addModification(config) {
        this.modifications.set(config.id, config);
        console.log(`📝 Modificación agregada: ${config.description}`);
    }

    removeModification(id) {
        this.modifications.delete(id);
        console.log(`🗑️ Modificación eliminada: ${id}`);
    }

    startObservers() {
        console.log('👀 Iniciando observadores avanzados para SPA...');
        
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
        
        // Aplicar modificaciones periódicamente con menos frecuencia
        setInterval(() => this.scheduleModifications(), 5000);
        
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
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Verificar si el nuevo elemento contiene selectores objetivo
                            if (this.containsTargetSelectors(node)) {
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
                const delay = hasSignificantChanges ? 1500 : 300;
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
        console.log('✅ Observer principal mejorado iniciado');
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
        
        console.log('✅ Observer de navegación SPA iniciado');
    }

    startUrlObserver() {
        // Observer para cambios de URL que no disparan events
        setInterval(() => {
            if (window.location.href !== this.lastUrl) {
                console.log('🔄 Cambio de URL detectado:', this.lastUrl, '→', window.location.href);
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
            console.log('🔍 Framework detectado, configurando listeners adicionales');
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
        console.log('🧭 Navegación detectada, reiniciando observadores...');
        
        // Reset de contadores de retry
        this.retryAttempts.clear();
        this.pendingModifications.clear();
        
        // Aplicar modificaciones después de que la nueva página cargue
        this.scheduleModifications(2000);
        
        // También intentar aplicaciones más tempranas
        setTimeout(() => this.scheduleModifications(500), 500);
        setTimeout(() => this.scheduleModifications(1000), 1000);
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
                console.error(`❌ Error aplicando modificación ${id}:`, error);
                this.pendingModifications.add(id);
            }
        });

        if (modificationsApplied > 0) {
            console.log(`✅ ${modificationsApplied} modificaciones aplicadas`);
        }

        if (this.pendingModifications.size > 0) {
            console.log(`⏳ ${this.pendingModifications.size} modificaciones pendientes`);
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
                                console.log(`🔄 Retry exitoso para ${id} (intento ${attempts + 1})`);
                                this.pendingModifications.delete(id);
                                this.retryAttempts.delete(id);
                            }
                        } catch (error) {
                            console.error(`❌ Error en retry ${id}:`, error);
                        }
                    }
                }, this.retryDelay * (attempts + 1));
            } else {
                console.warn(`⚠️ Máximo de intentos alcanzado para ${id}`);
                this.pendingModifications.delete(id);
                this.retryAttempts.delete(id);
            }
        });
    }

    applyModification(config) {
        console.log(`\n🔧 APLICANDO MODIFICACIÓN: ${config.id}`);
        console.log(`📋 Descripción: ${config.description}`);
        console.log(`🎯 Selector: ${config.selector}`);
        console.log(`🔍 Patrón: ${config.originalPattern}`);
        
        const elements = document.querySelectorAll(config.selector);
        console.log(`📊 Elementos encontrados: ${elements.length}`);
        
        let applied = false;

        elements.forEach((element, index) => {
            console.log(`\n  📝 Elemento [${index}]:`);
            console.log(`    🏷️ Tag: ${element.tagName}`);
            console.log(`    🎨 Clases: ${element.className}`);
            
            if (config.type === 'text') {
                const currentText = element.textContent || element.innerText;
                console.log(`    📄 Texto actual: "${currentText}"`);
                console.log(`    🧪 Prueba patrón: ${config.originalPattern.test(currentText)}`);
                
                if (config.originalPattern.test(currentText)) {
                    // Marcar elemento como modificado para evitar loops
                    if (element.dataset.interceptorModified === config.id) {
                        console.log(`    ⚠️ Ya modificado anteriormente, saltando...`);
                        return;
                    }

                    const newText = typeof config.newContent === 'function' 
                        ? config.newContent(currentText) 
                        : config.newContent;
                    
                    console.log(`    🔄 APLICANDO CAMBIO: "${currentText}" → "${newText}"`);
                    
                    element.textContent = newText;
                    element.dataset.interceptorModified = config.id;
                    
                    // Agregar estilo visual para indicar modificación
                    element.style.cssText += `
                        background: linear-gradient(45deg, #ff6b6b22, #4ecdc422) !important;
                        border-radius: 5px !important;
                        padding: 2px 6px !important;
                        transition: all 0.3s ease !important;
                        border: 2px solid #4ecdc4 !important;
                    `;
                    
                    applied = true;
                    console.log(`    ✅ MODIFICACIÓN EXITOSA!`);
                    
                    // Log adicional para verificación
                    console.log(`    🎉 RESULTADO FINAL: "${element.textContent}"`);
                } else {
                    console.log(`    ❌ Patrón no coincide, sin modificación`);
                }
            }
        });

        console.log(`🏁 Modificación ${config.id} completada. Aplicada: ${applied}`);
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
        console.log('📋 Modificaciones activas:');
        this.modifications.forEach((config, id) => {
            console.log(`  - ${id}: ${config.description}`);
        });
    }

    // Método para pausar/reanudar el interceptor
    toggle() {
        this.isActive = !this.isActive;
        console.log(`🔄 Interceptor ${this.isActive ? 'activado' : 'pausado'}`);
    }

    // Limpiar observadores
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        this.isActive = false;
        console.log('🗑️ UdemyInterceptor destruido');
    }
}

// --- Lógica de inicialización y UI para el proceso de renderizado ---

// Cargar interceptor de Udemy si estamos en Udemy
if (window.location.hostname.includes('udemy.com')) {
  console.log('🎯 Detectado dominio de Udemy, cargando interceptor...');

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
          console.log('🔍 BUSCANDO ELEMENTOS CON "HOLA":');
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
          
          console.log(`📊 Encontrados ${holaElements.length} elementos con "Hola"`);
          holaElements.forEach((item, index) => {
              console.log(`
[${index}] 🎯 ELEMENTO CON "HOLA":`);
              console.log(`  📄 Texto: "${item.text}"`);
              console.log(`  🏷️ Tag: ${item.tag}`);
              console.log(`  🎨 Clases: ${item.classes}`);
              console.log(`  🆔 ID: ${item.id}`);
              console.log(`  📍 Elemento:`, item.element);
          });
          
          return holaElements;
      },

      // Verificar selectores específicos
      testSelectors: () => {
          console.log('🧪 PROBANDO SELECTORES ESPECÍFICOS:');
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
                  console.log(`
📋 ${selector}:`);
                  console.log(`  📊 Elementos: ${elements.length}`);
                  elements.forEach((el, i) => {
                      if (i < 3) { // Solo mostrar los primeros 3
                          const text = (el.textContent || el.innerText || '').trim();
                          console.log(`  [${i}] "${text.substring(0, 50)}..." - ${el.tagName}.${el.className}`);
                      }
                  });
              } catch (e) {
                  console.log(`❌ Error con selector ${selector}:`, e.message);
              }
          });
      },

      // Aplicar modificación manual
      applyManualChange: (selector = 'h3', newText = 'Hola Mundo') => {
          console.log(`🔧 APLICANDO CAMBIO MANUAL:`);
          console.log(`  🎯 Selector: ${selector}`);
          console.log(`  📝 Nuevo texto: ${newText}`);
          
          const elements = document.querySelectorAll(selector);
          let changed = 0;
          
          elements.forEach((el, index) => {
              const currentText = el.textContent || el.innerText || '';
              if (currentText.toLowerCase().includes('hola') && !currentText.includes('Mundo')) {
                  console.log(`  [${index}] 🔄 "${currentText}" → "${newText}"`);
                  el.textContent = newText;
                  el.style.cssText += 'background: #ff6b6b44 !important; border: 2px solid #ff6b6b !important;';
                  changed++;
              }
          });
          
          console.log(`✅ Cambiados ${changed} elementos`);
          return changed;
      },

      // Estado del interceptor
      status: () => {
          if (window.udemyInterceptor) {
              console.log('📊 ESTADO DEL INTERCEPTOR:');
              console.log(`  ✅ Activo: ${window.udemyInterceptor.isActive}`);
              console.log(`  📝 Modificaciones: ${window.udemyInterceptor.modifications.size}`);
              console.log(`  ⏳ Pendientes: ${window.udemyInterceptor.pendingModifications.size}`);
              console.log(`  🔄 Observadores: ${window.udemyInterceptor.observers.length}`);
              window.udemyInterceptor.listModifications();
          } else {
              console.log('❌ Interceptor no disponible');
          }
      },

      // Forzar aplicación
      force: () => {
          console.log('💪 FORZANDO APLICACIÓN DE MODIFICACIONES:');
          if (window.udemyInterceptor) {
              window.udemyInterceptor.applyAllModifications();
          } else {
              console.log('❌ Interceptor no disponible');
          }
      }
  };

  console.log('🎯 UdemyInterceptor cargado. Usa window.udemyInterceptor o window.interceptorHelpers para controlar las modificaciones.');
  console.log('🔧 Para debugging usa: window.debugUdemy.findHolaElements(), window.debugUdemy.testSelectors(), window.debugUdemy.status()');
  console.log('💡 Prueba también: window.debugUdemy.applyManualChange() para cambios manuales');

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
    
    .udemy-extension-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .udemy-extension-btn:hover {
      background: #0056b3;
    }

    #dashboard-btn {
      background: linear-gradient(45deg, #667eea, #764ba2);
      font-weight: bold;
    }

    #dashboard-btn:hover {
      background: linear-gradient(45deg, #764ba2, #667eea);
    }
  `;
  document.head.appendChild(style);

  const toolbar = document.createElement('div');
  toolbar.className = 'udemy-extension-toolbar';
  
  // Mostrar botón de dashboard solo si estamos en Udemy
  const dashboardBtn = window.location.hostname.includes('udemy.com') 
    ? '<button class="udemy-extension-btn" id="dashboard-btn">🏠 Dashboard</button>' 
    : '';
  
  toolbar.innerHTML = `
    ${dashboardBtn}
    <button class="udemy-extension-btn" id="my-learning-btn">📚 My learning</button>
    
  `;
  
  document.body.appendChild(toolbar);

  document.getElementById('my-learning-btn').addEventListener('click', () => {
    window.electronAPI.send('go-to-my-learning');
  });

  

  // Agregar event listener para el botón de dashboard si existe
  const dashboardButton = document.getElementById('dashboard-btn');
  if (dashboardButton) {
    dashboardButton.addEventListener('click', () => {
      window.electronAPI.send('go-to-dashboard');
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