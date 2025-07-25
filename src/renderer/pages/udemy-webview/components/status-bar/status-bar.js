/**
 * Status Bar Component
 * Displays contextual information at the top of the webview
 */
class StatusBar {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.memoryModeButton = options.memoryModeButton || null;
        
        this.element = null;
        this.clockElement = null;
        this.statusElement = null;
        this.versionElement = null;
        this.updateIndicator = null;
        
        this.clockInterval = null;
        this.updateAvailable = false;
        
        this.init();
    }

    init() {
        this.createElement();
        this.startClock();
        this.fetchAppInfo();
        this.checkForUpdates();
        
        // Update app version and status periodically
        setInterval(() => {
            this.updateStatus();
            this.checkForUpdates();
        }, 30000); // 30 seconds
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'status-bar';
        this.element.innerHTML = `
            <div class="status-bar-content">
            

            <div class="status-bar-center">
                    <!-- El botón de memoria se moverá aquí -->
                </div>
                

                <div class="status-bar-left">
                    <div class="status-bar-clock">
                        <span class="clock-time">--:--</span>
                        <span class="clock-date">--- -- ----</span>
                    </div>
                </div>
                
                
                <div class="status-bar-right">
                    <div class="status-bar-info">
                        <span class="status-app-version" title="Versión de la aplicación">v--</span>
                        <span class="status-update-indicator" style="display: none;" title="Actualización disponible">
                            <span class="update-text">Nueva actualización</span>
                            <span class="update-dot">●</span>
                        </span>
                        <span class="status-connection">🔗</span>
                    </div>
                </div>
            </div>
        `;
        
        // Insert at the beginning of container
        this.container.insertBefore(this.element, this.container.firstChild);
        
        // Get references to dynamic elements
        this.clockElement = this.element.querySelector('.status-bar-clock');
        this.statusElement = this.element.querySelector('.status-bar-info');
        this.versionElement = this.element.querySelector('.status-app-version');
        this.updateIndicator = this.element.querySelector('.status-update-indicator');
        
        // Add click event to update indicator
        if (this.updateIndicator) {
            this.updateIndicator.addEventListener('click', () => {
                this.handleUpdateClick();
            });
            this.updateIndicator.style.cursor = 'pointer';
        }
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            
            // Format time
            const timeOptions = { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            };
            const timeString = now.toLocaleTimeString('es-ES', timeOptions);
            
            // Format date
            const dateOptions = { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short'
            };
            const dateString = now.toLocaleDateString('es-ES', dateOptions)
                .replace('.', '')
                .toUpperCase();
            
            // Update DOM
            const timeEl = this.element.querySelector('.clock-time');
            const dateEl = this.element.querySelector('.clock-date');
            
            if (timeEl) timeEl.textContent = timeString;
            if (dateEl) dateEl.textContent = dateString;
        };
        
        // Update immediately and then every second
        updateClock();
        this.clockInterval = setInterval(updateClock, 1000);
    }

    async fetchAppInfo() {
        try {
            if (window.electronAPI) {
                const version = await window.electronAPI.invoke('get-app-version');
                if (this.versionElement && version) {
                    this.versionElement.textContent = `v${version}`;
                }
            }
        } catch (error) {
            console.log('Could not fetch app version:', error);
        }
    }

    updateStatus() {
        // Update connection status based on socket or other indicators
        const connectionEl = this.element.querySelector('.status-connection');
        if (connectionEl) {
            // You can customize this based on actual connection status
            const isConnected = window.udemyWebViewPage?.floatingWidget ? true : false;
            connectionEl.textContent = isConnected ? '🔗' : '🔌';
            connectionEl.title = isConnected ? 'Conectado' : 'Desconectado';
        }
    }

    async checkForUpdates() {
        try {
            if (window.electronAPI) {
                const updateInfo = await window.electronAPI.invoke('check-update-status');
                if (updateInfo && updateInfo.available) {
                    this.showUpdateIndicator();
                } else {
                    this.hideUpdateIndicator();
                }
            }
        } catch (error) {
            console.log('Could not check for updates:', error);
        }
    }

    showUpdateIndicator() {
        if (this.updateIndicator && !this.updateAvailable) {
            this.updateAvailable = true;
            this.updateIndicator.style.display = 'inline-flex';
            this.updateIndicator.style.alignItems = 'center';
            this.updateIndicator.style.gap = '4px';
            this.updateIndicator.style.marginLeft = '8px';
            this.updateIndicator.style.color = '#4CAF50';
            this.updateIndicator.style.fontSize = '11px';
            this.updateIndicator.style.fontWeight = 'bold';
            
            // Start blinking animation for the dot
            this.startBlinkingAnimation();
        }
    }

    hideUpdateIndicator() {
        if (this.updateIndicator && this.updateAvailable) {
            this.updateAvailable = false;
            this.updateIndicator.style.display = 'none';
            this.stopBlinkingAnimation();
        }
    }

    startBlinkingAnimation() {
        const dot = this.updateIndicator?.querySelector('.update-dot');
        if (dot) {
            dot.style.animation = 'blink 1.5s infinite';
            dot.style.color = '#4CAF50';
            
            // Add CSS animation if not already present
            if (!document.querySelector('#update-indicator-styles')) {
                const style = document.createElement('style');
                style.id = 'update-indicator-styles';
                style.textContent = `
                    @keyframes blink {
                        0%, 50% { opacity: 1; }
                        51%, 100% { opacity: 0.3; }
                    }
                    .status-update-indicator {
                        transition: all 0.3s ease;
                    }
                    .status-update-indicator:hover {
                        background-color: rgba(76, 175, 80, 0.1);
                        border-radius: 4px;
                        padding: 2px 4px;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    stopBlinkingAnimation() {
        const dot = this.updateIndicator?.querySelector('.update-dot');
        if (dot) {
            dot.style.animation = '';
        }
    }

    async handleUpdateClick() {
        if (!this.updateAvailable) return;
        
        try {
            // Show loading state
            const originalText = this.updateIndicator.querySelector('.update-text').textContent;
            this.updateIndicator.querySelector('.update-text').textContent = 'Verificando...';
            
            // Send update request to main process
            if (window.electronAPI) {
                await window.electronAPI.invoke('trigger-update-check');
                
                // Show notification that update process has started
                setTimeout(() => {
                    this.updateIndicator.querySelector('.update-text').textContent = originalText;
                }, 2000);
            }
        } catch (error) {
            console.error('Error triggering update:', error);
            this.updateIndicator.querySelector('.update-text').textContent = 'Error';
            setTimeout(() => {
                this.updateIndicator.querySelector('.update-text').textContent = 'Nueva actualización';
            }, 2000);
        }
    }

    // Method to move memory button to center
    moveMemoryButtonToCenter(memoryButton) {
        if (!memoryButton || !this.element) return;
        
        const centerContainer = this.element.querySelector('.status-bar-center');
        if (centerContainer && memoryButton.element) {
            // Move the memory button element to center container
            centerContainer.appendChild(memoryButton.element);
            
            // Update memory button styles for center positioning
            memoryButton.element.style.position = 'relative';
            memoryButton.element.style.top = 'auto';
            memoryButton.element.style.left = 'auto';
            memoryButton.element.style.margin = '0';
            
            console.log('✅ Memory button moved to status bar center');
        }
    }

    // Method to add custom info to right side
    addStatusInfo(text, icon = '') {
        const rightContainer = this.element.querySelector('.status-bar-right .status-bar-info');
        if (rightContainer) {
            const infoElement = document.createElement('span');
            infoElement.className = 'status-custom-info';
            infoElement.innerHTML = `${icon} ${text}`.trim();
            rightContainer.appendChild(infoElement);
        }
    }

    // Method to update left side with custom content
    updateLeftContent(content) {
        const leftContainer = this.element.querySelector('.status-bar-left');
        if (leftContainer && content) {
            leftContainer.innerHTML = content;
        }
    }

    // Cleanup
    destroy() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        
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
    module.exports = StatusBar;
} else {
    window.StatusBar = StatusBar;
}