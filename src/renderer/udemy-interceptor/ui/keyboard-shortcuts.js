/**
 * Keyboard Shortcuts - Atajos de teclado para el interceptor
 * 
 * Maneja todos los atajos de teclado para controlar el interceptor
 * desde cualquier página de Udemy.
 */

/**
 * Clase que maneja los atajos de teclado del interceptor
 */
export class KeyboardShortcuts {
    constructor(interceptorCore) {
        this.interceptorCore = interceptorCore;
        this.isEnabled = true;
        this.shortcuts = new Map();
        
        this.initializeDefaultShortcuts();
        this.setupEventListeners();
    }
    
    /**
     * Inicializa los atajos de teclado por defecto
     */
    initializeDefaultShortcuts() {
        // Ctrl+I - Toggle interceptor
        this.addShortcut('ctrl+i', {
            description: 'Activar/desactivar interceptor',
            action: () => {
                if (this.interceptorCore) {
                    this.interceptorCore.toggle();
                } else {
                }
            },
            preventDefault: true
        });
        
        // Ctrl+M - Mostrar modificaciones
        this.addShortcut('ctrl+m', {
            description: 'Mostrar modificaciones activas',
            action: () => {
                if (this.interceptorCore && this.interceptorCore.modificationEngine) {
                    this.interceptorCore.modificationEngine.listModifications();
                } else {
                }
            },
            preventDefault: true
        });
        
        // Ctrl+Shift+R - Forzar aplicación de modificaciones
        this.addShortcut('ctrl+shift+r', {
            description: 'Forzar aplicación de modificaciones',
            action: () => {
                if (this.interceptorCore && this.interceptorCore.domObserver) {
                    this.interceptorCore.domObserver.forceExecution();
                } else {
                }
            },
            preventDefault: true
        });
        
        // Ctrl+Shift+S - Mostrar estadísticas
        this.addShortcut('ctrl+shift+s', {
            description: 'Mostrar estadísticas del interceptor',
            action: () => {
                this.showInterceptorStats();
            },
            preventDefault: true
        });
        
        // Ctrl+Shift+H - Mostrar ayuda de atajos
        this.addShortcut('ctrl+shift+h', {
            description: 'Mostrar ayuda de atajos de teclado',
            action: () => {
                this.showShortcutsHelp();
            },
            preventDefault: true
        });
    }
    
    /**
     * Configura los event listeners para los atajos de teclado
     */
    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            if (!this.isEnabled) {
                return;
            }
            
            this.handleKeydown(event);
        });
        
    }
    
    /**
     * Maneja el evento keydown
     * @param {KeyboardEvent} event - Evento de teclado
     */
    handleKeydown(event) {
        const shortcutKey = this.getShortcutKey(event);
        const shortcut = this.shortcuts.get(shortcutKey);
        
        if (shortcut) {
            if (shortcut.preventDefault) {
                event.preventDefault();
            }
            
            try {
                shortcut.action();
            } catch (error) {
            }
        }
    }
    
    /**
     * Convierte un evento de teclado en una clave de atajo
     * @param {KeyboardEvent} event - Evento de teclado
     * @returns {string} Clave del atajo
     */
    getShortcutKey(event) {
        const parts = [];
        
        if (event.ctrlKey || event.metaKey) {
            parts.push('ctrl');
        }
        
        if (event.shiftKey) {
            parts.push('shift');
        }
        
        if (event.altKey) {
            parts.push('alt');
        }
        
        // Normalizar la tecla
        const key = event.key.toLowerCase();
        parts.push(key);
        
        return parts.join('+');
    }
    
    /**
     * Añade un nuevo atajo de teclado
     * @param {string} shortcutKey - Clave del atajo (ej: 'ctrl+i')
     * @param {Object} config - Configuración del atajo
     */
    addShortcut(shortcutKey, config) {
        if (!config.action || typeof config.action !== 'function') {
            return false;
        }
        
        const shortcutConfig = {
            description: config.description || 'Sin descripción',
            action: config.action,
            preventDefault: config.preventDefault !== false, // Default true
            enabled: config.enabled !== false // Default true
        };
        
        this.shortcuts.set(shortcutKey.toLowerCase(), shortcutConfig);
        
        return true;
    }
    
    /**
     * Elimina un atajo de teclado
     * @param {string} shortcutKey - Clave del atajo
     */
    removeShortcut(shortcutKey) {
        const existed = this.shortcuts.delete(shortcutKey.toLowerCase());
        if (existed) {
        }
        return existed;
    }
    
    /**
     * Habilita o deshabilita un atajo específico
     * @param {string} shortcutKey - Clave del atajo
     * @param {boolean} enabled - Estado habilitado
     */
    toggleShortcut(shortcutKey, enabled) {
        const shortcut = this.shortcuts.get(shortcutKey.toLowerCase());
        if (shortcut) {
            shortcut.enabled = enabled;
            return true;
        }
        return false;
    }
    
    /**
     * Habilita o deshabilita todos los atajos
     * @param {boolean} enabled - Estado habilitado
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    
    /**
     * Muestra las estadísticas del interceptor en la consola
     */
    showInterceptorStats() {
        console.group('📊 Estadísticas del Interceptor');
        
        if (this.interceptorCore) {
            
            if (this.interceptorCore.modificationEngine) {
                const stats = this.interceptorCore.modificationEngine.getStats();
            }
            
            if (this.interceptorCore.domObserver) {
                const status = this.interceptorCore.domObserver.getStatus();
            }
        } else {
        }
        
        
        console.groupEnd();
    }
    
    /**
     * Muestra la ayuda de atajos de teclado en la consola
     */
    showShortcutsHelp() {
        console.group('⌨️ Atajos de Teclado Disponibles');
        
        if (this.shortcuts.size === 0) {
        } else {
            for (const [key, config] of this.shortcuts) {
                const status = config.enabled ? '✅' : '❌';
            }
        }
        
        
        console.groupEnd();
    }
    
    /**
     * Obtiene la lista de todos los atajos
     * @returns {Array} Lista de atajos con su configuración
     */
    getShortcutsList() {
        const shortcuts = [];
        
        for (const [key, config] of this.shortcuts) {
            shortcuts.push({
                key: key.toUpperCase(),
                description: config.description,
                enabled: config.enabled,
                preventDefault: config.preventDefault
            });
        }
        
        return shortcuts.sort((a, b) => a.key.localeCompare(b.key));
    }
    
    /**
     * Obtiene estadísticas de uso de atajos
     * @returns {Object} Estadísticas
     */
    getStats() {
        const enabledCount = Array.from(this.shortcuts.values())
            .filter(config => config.enabled).length;
            
        return {
            totalShortcuts: this.shortcuts.size,
            enabledShortcuts: enabledCount,
            disabledShortcuts: this.shortcuts.size - enabledCount,
            isSystemEnabled: this.isEnabled
        };
    }
    
    /**
     * Resetea todos los atajos a los valores por defecto
     */
    resetToDefaults() {
        
        this.shortcuts.clear();
        this.initializeDefaultShortcuts();
        
    }
}