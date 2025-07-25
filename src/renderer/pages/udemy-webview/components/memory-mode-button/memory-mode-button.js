/**
 * Memory Mode Button Component
 * Displays the current memory optimization mode
 */
class MemoryModeButton {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.onModeClick = options.onModeClick || (() => {});
        
        this.memoryInfo = null;
        this.element = null;
        
        this.init();
    }

    init() {
        this.createElement();
        this.fetchMemoryInfoWithRetry();
        this.setupEventListeners();
        
        // Update memory info every 30 seconds
        setInterval(() => {
            this.fetchMemoryInfo();
        }, 30000);
    }

    async fetchMemoryInfoWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            
            try {
                await this.fetchMemoryInfo();
                
                // If we have valid data, break out of retry loop
                if (this.memoryInfo && this.memoryInfo.profile) {
                    return;
                }
            } catch (error) {
            }
            
            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries) {
                const delay = 1000 * attempt; // 1s, 2s, 3s
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        this.showError();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'memory-mode-button';
        this.element.innerHTML = `
            <div class="memory-mode-content">
                <div class="memory-mode-icon">🖥️</div>
                <div class="memory-mode-info">
                    <div class="memory-mode-label">Modo</div>
                    <div class="memory-mode-value">Cargando...</div>
                </div>
                <div class="memory-mode-stats">
                    <div class="memory-mode-ram">--GB</div>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.element);
    }

    async fetchMemoryInfo() {
        try {
            
            if (!window.electronAPI) {
                this.showError();
                return;
            }

            const result = await window.electronAPI.invoke('get-memory-info');
            
            if (result && typeof result === 'object') {
                this.memoryInfo = result;
                this.updateDisplay();
            } else {
                this.showError();
            }
        } catch (error) {
            this.showError();
        }
    }

    updateDisplay() {
        if (!this.memoryInfo || !this.element) {
            return;
        }


        const modeValue = this.element.querySelector('.memory-mode-value');
        const ramStats = this.element.querySelector('.memory-mode-ram');
        const icon = this.element.querySelector('.memory-mode-icon');

        if (!modeValue || !ramStats || !icon) {
            return;
        }

        // Update mode display
        const profile = this.memoryInfo.profile || 'unknown';
        const displayName = this.getModeDisplayName(profile);
        const modeIcon = this.getModeIcon(profile);
        
        
        modeValue.textContent = displayName;
        icon.textContent = modeIcon;
        
        // Update RAM stats with better fallback handling
        const currentFreeRAM = this.memoryInfo.currentFreeRAM;
        const freeRAM = this.memoryInfo.freeRAM;
        const totalRAM = this.memoryInfo.totalRAM;
        
        
        const displayFreeRAM = currentFreeRAM || freeRAM || 0;
        const displayTotalRAM = totalRAM || 0;
        
        if (displayTotalRAM > 0) {
            ramStats.textContent = `${displayFreeRAM}/${displayTotalRAM}GB`;
        } else {
            ramStats.textContent = 'N/A';
        }
        
        // Update CSS class for styling
        this.element.className = `memory-mode-button memory-mode-${profile}`;
        
        // Add tooltip
        this.element.title = this.getTooltipText();
        
    }

    getModeDisplayName(profile) {
        const modeNames = {
            'high-performance': 'Alto Rendimiento',
            'balanced': 'Equilibrado',
            'low-memory': 'Memoria Baja',
            'ultra-low': 'Ultra Bajo'
        };
        return modeNames[profile] || 'Desconocido';
    }

    getModeIcon(profile) {
        const icons = {
            'high-performance': '🚀',
            'balanced': '⚖️',
            'low-memory': '🔋',
            'ultra-low': '🆘'
        };
        return icons[profile] || '🖥️';
    }

    getTooltipText() {
        if (!this.memoryInfo) return 'Información de memoria no disponible';
        
        const profile = this.memoryInfo.profile || 'unknown';
        const freeRAM = this.memoryInfo.currentFreeRAM || this.memoryInfo.freeRAM || 0;
        const totalRAM = this.memoryInfo.totalRAM || 0;
        const appLimit = this.memoryInfo.app || 0;
        const webviewLimit = this.memoryInfo.webview || 0;
        
        return `Modo: ${this.getModeDisplayName(profile)}\n` +
               `RAM libre: ${freeRAM}GB de ${totalRAM}GB\n` +
               `Límite App: ${appLimit}MB\n` +
               `Límite WebView: ${webviewLimit}MB\n` +
               `Click para más detalles`;
    }

    showError() {
        
        if (!this.element) {
            return;
        }
        
        const modeValue = this.element.querySelector('.memory-mode-value');
        const ramStats = this.element.querySelector('.memory-mode-ram');
        const icon = this.element.querySelector('.memory-mode-icon');
        
        if (modeValue) modeValue.textContent = 'Error';
        if (ramStats) ramStats.textContent = '--GB';
        if (icon) icon.textContent = '❌';
        
        this.element.className = 'memory-mode-button memory-mode-error';
        this.element.title = 'Error obteniendo información de memoria. Revisa la consola para más detalles.';
        
    }

    setupEventListeners() {
        if (!this.element) return;
        
        this.element.addEventListener('click', () => {
            this.handleClick();
        });
    }

    handleClick() {
        // Show detailed memory info in console for debugging
        console.group('📊 Información Detallada de Memoria');
        console.groupEnd();
        
        // Call custom callback
        this.onModeClick(this.memoryInfo);
        
        // Show toast notification if available
        if (window.udemyWebViewPage?.dialog) {
            const profile = this.memoryInfo?.profile || 'unknown';
            const freeRAM = this.memoryInfo?.currentFreeRAM || this.memoryInfo?.freeRAM || 0;
            const totalRAM = this.memoryInfo?.totalRAM || 0;
            
            window.udemyWebViewPage.dialog.toast({
                type: 'info',
                title: 'Modo de Memoria',
                message: `${this.getModeDisplayName(profile)} • ${freeRAM}/${totalRAM}GB RAM`,
                autoClose: 3000
            });
        }
    }

    // Public methods
    refresh() {
        this.fetchMemoryInfo();
    }

    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }

    show() {
        if (this.element) {
            this.element.style.display = 'block';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MemoryModeButton;
} else {
    window.MemoryModeButton = MemoryModeButton;
}