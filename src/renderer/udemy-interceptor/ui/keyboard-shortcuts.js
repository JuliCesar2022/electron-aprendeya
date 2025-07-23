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
                    console.log('⚠️ Interceptor core no disponible');
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
                    console.log('⚠️ Motor de modificaciones no disponible');
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
                    console.log('⚡ Modificaciones aplicadas forzadamente');
                } else {
                    console.log('⚠️ DOM Observer no disponible');
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
        
        console.log('⌨️ Atajos de teclado configurados');
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
                console.log(`⌨️ Atajo ejecutado: ${shortcutKey}`);
            } catch (error) {
                console.error(`❌ Error ejecutando atajo ${shortcutKey}:`, error);
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
            console.error('❌ Configuración de atajo inválida: falta acción');
            return false;
        }
        
        const shortcutConfig = {
            description: config.description || 'Sin descripción',
            action: config.action,
            preventDefault: config.preventDefault !== false, // Default true
            enabled: config.enabled !== false // Default true
        };
        
        this.shortcuts.set(shortcutKey.toLowerCase(), shortcutConfig);
        console.log(`✅ Atajo añadido: ${shortcutKey} - ${shortcutConfig.description}`);
        
        return true;
    }
    
    /**
     * Elimina un atajo de teclado
     * @param {string} shortcutKey - Clave del atajo
     */
    removeShortcut(shortcutKey) {
        const existed = this.shortcuts.delete(shortcutKey.toLowerCase());
        if (existed) {
            console.log(`🗑️ Atajo eliminado: ${shortcutKey}`);
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
            console.log(`🔄 Atajo ${shortcutKey}: ${enabled ? 'habilitado' : 'deshabilitado'}`);
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
        console.log(`⌨️ Atajos de teclado ${enabled ? 'habilitados' : 'deshabilitados'}`);
    }
    
    /**
     * Muestra las estadísticas del interceptor en la consola
     */
    showInterceptorStats() {
        console.group('📊 Estadísticas del Interceptor');
        
        if (this.interceptorCore) {
            console.log('Estado:', this.interceptorCore.isActive ? 'Activo' : 'Inactivo');
            
            if (this.interceptorCore.modificationEngine) {
                const stats = this.interceptorCore.modificationEngine.getStats();
                console.log('Modificaciones totales:', stats.totalModifications);
                console.log('Modificaciones habilitadas:', stats.enabledModifications);
                console.log('Motor habilitado:', stats.isEngineEnabled);
            }
            
            if (this.interceptorCore.domObserver) {
                const status = this.interceptorCore.domObserver.getStatus();
                console.log('Observer activo:', status.isActive);
                console.log('Tiempo activo:', `${status.uptime}s`);
                console.log('Mutaciones detectadas:', status.totalMutations);
                console.log('Modificaciones aplicadas:', status.modificationsApplied);
            }
        } else {
            console.log('❌ Interceptor core no disponible');
        }
        
        console.log('Atajos habilitados:', this.isEnabled);
        console.log('Total atajos:', this.shortcuts.size);
        
        console.groupEnd();
    }
    
    /**
     * Muestra la ayuda de atajos de teclado en la consola
     */
    showShortcutsHelp() {
        console.group('⌨️ Atajos de Teclado Disponibles');
        
        if (this.shortcuts.size === 0) {
            console.log('No hay atajos configurados');
        } else {
            for (const [key, config] of this.shortcuts) {
                const status = config.enabled ? '✅' : '❌';
                console.log(`${status} ${key.toUpperCase()}: ${config.description}`);
            }
        }
        
        console.log('\n💡 Tips:');
        console.log('• Los atajos funcionan en cualquier página de Udemy');
        console.log('• Ctrl equivale a Cmd en Mac');
        console.log('• Los atajos se pueden deshabilitar individualmente');
        
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
        console.log('🔄 Reseteando atajos a valores por defecto...');
        
        this.shortcuts.clear();
        this.initializeDefaultShortcuts();
        
        console.log('✅ Atajos reseteados');
    }
}