/**
 * DOM Observer - Observador de cambios en el DOM
 * 
 * Maneja la observación de cambios en el DOM usando MutationObserver
 * y aplica las modificaciones cuando sea necesario.
 */

import { showInterceptorNotification } from '../integrations/dialog-integration.js';

/**
 * Clase que maneja la observación del DOM y la aplicación automática de modificaciones
 */
export class DOMObserver {
    constructor(modificationEngine) {
        this.modificationEngine = modificationEngine;
        this.observer = null;
        this.isActive = false;
        this.observerConfig = {
            childList: true,
            subtree: true,
            characterData: true,
            attributeFilter: ['class', 'id']
        };
        
        // Throttling para evitar exceso de procesamiento
        this.lastExecution = 0;
        this.throttleDelay = 500; // 500ms entre ejecuciones
        this.pendingExecution = null;
        
        // Estadísticas
        this.stats = {
            totalMutations: 0,
            modificationsApplied: 0,
            throttledExecutions: 0,
            startTime: null
        };
    }
    
    /**
     * Inicia la observación del DOM
     */
    start() {
        if (this.isActive) {
            return;
        }
        
        try {
            this.observer = new MutationObserver((mutations) => {
                this.handleMutations(mutations);
            });
            
            this.observer.observe(document.body, this.observerConfig);
            this.isActive = true;
            this.stats.startTime = Date.now();
            
            
            // Aplicar modificaciones iniciales
            this.applyModificationsThrottled();
            
        } catch (error) {
            showInterceptorNotification('Error iniciando observador DOM', 'error');
        }
    }
    
    /**
     * Detiene la observación del DOM
     */
    stop() {
        if (!this.isActive) {
            return;
        }
        
        try {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            
            if (this.pendingExecution) {
                clearTimeout(this.pendingExecution);
                this.pendingExecution = null;
            }
            
            this.isActive = false;
            
        } catch (error) {
        }
    }
    
    /**
     * Reinicia el observador
     */
    restart() {
        this.stop();
        setTimeout(() => this.start(), 100);
    }
    
    /**
     * Maneja las mutaciones detectadas por el observer
     * @param {MutationRecord[]} mutations - Lista de mutaciones
     */
    handleMutations(mutations) {
        if (!this.isActive || !this.modificationEngine) {
            return;
        }
        
        this.stats.totalMutations += mutations.length;
        
        // Filtrar mutaciones relevantes
        const relevantMutations = this.filterRelevantMutations(mutations);
        
        if (relevantMutations.length > 0) {
            this.applyModificationsThrottled();
        }
    }
    
    /**
     * Filtra mutaciones que son relevantes para las modificaciones
     * @param {MutationRecord[]} mutations - Lista de mutaciones
     * @returns {MutationRecord[]} Mutaciones relevantes
     */
    filterRelevantMutations(mutations) {
        return mutations.filter(mutation => {
            // Ignorar cambios en elementos del interceptor
            if (this.isInterceptorElement(mutation.target)) {
                return false;
            }
            
            // Cambios en texto
            if (mutation.type === 'characterData') {
                return true;
            }
            
            // Nuevos nodos añadidos
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                return Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === Node.ELEMENT_NODE && this.hasTextContent(node)
                );
            }
            
            // Cambios en atributos que podrían afectar la visibilidad
            if (mutation.type === 'attributes') {
                const attrName = mutation.attributeName;
                return attrName === 'class' || attrName === 'style';
            }
            
            return false;
        });
    }
    
    /**
     * Verifica si un elemento es parte del sistema interceptor
     * @param {Node} node - Nodo a verificar
     * @returns {boolean} True si es elemento del interceptor
     */
    isInterceptorElement(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }
        
        // Elementos con atributos del interceptor
        if (node.dataset && node.dataset.udemyInterceptorModified) {
            return true;
        }
        
        // Elementos del DialogManager
        if (node.id && node.id.includes('dialog')) {
            return true;
        }
        
        // Elementos con clases específicas
        const interceptorClasses = ['udemy-extension', 'dialog-', 'udemigo-'];
        const className = node.className || '';
        
        return interceptorClasses.some(cls => className.includes(cls));
    }
    
    /**
     * Verifica si un elemento tiene contenido de texto relevante
     * @param {Element} element - Elemento a verificar
     * @returns {boolean} True si tiene texto relevante
     */
    hasTextContent(element) {
        if (!element || typeof element.textContent !== 'string') {
            return false;
        }
        
        const text = element.textContent.trim();
        return text.length > 0 && text.length < 1000; // Evitar textos muy largos
    }
    
    /**
     * Aplica modificaciones con throttling para evitar exceso de procesamiento
     */
    applyModificationsThrottled() {
        const now = Date.now();
        
        // Si ya se ejecutó recientemente, programar para más tarde
        if (now - this.lastExecution < this.throttleDelay) {
            if (this.pendingExecution) {
                clearTimeout(this.pendingExecution);
            }
            
            this.pendingExecution = setTimeout(() => {
                this.executeModifications();
                this.pendingExecution = null;
            }, this.throttleDelay);
            
            this.stats.throttledExecutions++;
            return;
        }
        
        this.executeModifications();
    }
    
    /**
     * Ejecuta las modificaciones inmediatamente
     */
    executeModifications() {
        if (!this.modificationEngine || !this.isActive) {
            return;
        }
        
        try {
            // Reconfigurar usuario si es necesario (por cambios de navegación)
            this.modificationEngine.checkAndSetupUser();
            
            const modified = this.modificationEngine.applyAllModifications();
            this.stats.modificationsApplied += modified;
            this.lastExecution = Date.now();
            
            if (modified > 0) {
            }
            
        } catch (error) {
        }
    }
    
    /**
     * Realiza una ejecución manual inmediata (sin throttling)
     */
    forceExecution() {
        this.lastExecution = 0; // Reset throttling
        this.executeModifications();
    }
    
    /**
     * Obtiene el estado actual del observer
     * @returns {Object} Estado del observer
     */
    getStatus() {
        const uptime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
        
        return {
            isActive: this.isActive,
            uptime: Math.round(uptime / 1000), // segundos
            totalMutations: this.stats.totalMutations,
            modificationsApplied: this.stats.modificationsApplied,
            throttledExecutions: this.stats.throttledExecutions,
            averageMutationsPerSecond: uptime > 0 ? 
                Math.round((this.stats.totalMutations * 1000) / uptime) : 0,
            lastExecution: this.lastExecution,
            hasPendingExecution: !!this.pendingExecution
        };
    }
    
    /**
     * Actualiza la configuración del observer
     * @param {Object} newConfig - Nueva configuración
     */
    updateConfig(newConfig) {
        this.observerConfig = { ...this.observerConfig, ...newConfig };
        
        if (this.isActive) {
            this.restart();
        }
    }
    
    /**
     * Actualiza el delay de throttling
     * @param {number} delay - Nuevo delay en milisegundos
     */
    setThrottleDelay(delay) {
        this.throttleDelay = Math.max(100, delay); // Mínimo 100ms
    }
    
    /**
     * Limpia las estadísticas
     */
    resetStats() {
        this.stats = {
            totalMutations: 0,
            modificationsApplied: 0,
            throttledExecutions: 0,
            startTime: this.isActive ? Date.now() : null
        };
    }
    
    /**
     * Registra información de debugging
     */
    logStatus() {
        const status = this.getStatus();
        
        console.group('👁️ DOM Observer Status');
        console.groupEnd();
    }
}