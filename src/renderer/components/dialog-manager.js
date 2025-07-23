/**
 * DialogManager - Sistema de diálogos reutilizable
 * 
 * Características:
 * - Múltiples tipos: info, warning, error, success
 * - Animaciones: popup, slide-top, slide-right, toast
 * - Posiciones: center, top-right
 * - Auto-cierre configurable
 * - Soporte para promesas
 * - Botones personalizables
 */
class DialogManager {
    constructor() {
        this.overlay = null;
        this.container = null;
        this.header = null;
        this.icon = null;
        this.title = null;
        this.content = null;
        this.message = null;
        this.actions = null;
        
        this.currentDialog = null;
        this.initialized = false;
        
        this.createDialogStructure();
        this.setupEventListeners();
    }

    createDialogStructure() {
        // Create dialog HTML structure if it doesn't exist
        if (!document.getElementById('dialog-overlay')) {
            const dialogHTML = `
                <div class="dialog-overlay" id="dialog-overlay">
                    <div class="dialog-container" id="dialog-container">
                        <div class="dialog-header" id="dialog-header">
                            <div class="dialog-icon" id="dialog-icon"></div>
                            <h3 class="dialog-title" id="dialog-title"></h3>
                        </div>
                        <div class="dialog-content" id="dialog-content">
                            <p class="dialog-message" id="dialog-message"></p>
                            <div class="dialog-progress" id="dialog-progress" style="display: none;">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="dialog-progress-fill"></div>
                                </div>
                                <div class="progress-text" id="dialog-progress-text">0%</div>
                            </div>
                        </div>
                        <div class="dialog-actions" id="dialog-actions">
                            <!-- Buttons will be dynamically inserted here -->
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', dialogHTML);
        }

        // Get references to DOM elements
        this.overlay = document.getElementById('dialog-overlay');
        this.container = document.getElementById('dialog-container');
        this.header = document.getElementById('dialog-header');
        this.icon = document.getElementById('dialog-icon');
        this.title = document.getElementById('dialog-title');
        this.content = document.getElementById('dialog-content');
        this.message = document.getElementById('dialog-message');
        this.progress = document.getElementById('dialog-progress');
        this.progressFill = document.getElementById('dialog-progress-fill');
        this.progressText = document.getElementById('dialog-progress-text');
        this.actions = document.getElementById('dialog-actions');
        
        this.initialized = true;
    }

    setupEventListeners() {
        // Wait for DOM elements to be available
        const setupListeners = () => {
            if (!this.overlay) return;
            
            // Close dialog when clicking overlay (unless persistent)
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay && !this.currentDialog?.persistent) {
                    this.hide();
                }
            });

            // Close dialog with ESC key (unless persistent)
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.overlay.classList.contains('show') && !this.currentDialog?.persistent) {
                    this.hide();
                }
            });
        };

        if (this.initialized) {
            setupListeners();
        } else {
            // Wait for initialization
            setTimeout(setupListeners, 100);
        }
    }

    show(options = {}) {
        if (!this.initialized || !this.overlay) {
            console.error('DialogManager not properly initialized');
            return Promise.resolve(false);
        }

        const config = {
            type: 'info', // info, warning, error, success
            title: 'Confirmación',
            message: '¿Estás seguro?',
            animation: 'popup', // popup, slide-top, slide-right, toast
            position: 'center', // center, top-right
            buttons: [
                { text: 'Cancelar', type: 'secondary', action: () => this.hide() },
                { text: 'Aceptar', type: 'primary', action: () => this.hide() }
            ],
            autoClose: null, // null or milliseconds
            showProgress: false, // Show progress bar
            progress: 0, // Progress percentage (0-100)
            progressText: null, // Custom progress text
            persistent: false, // Don't close on overlay click or ESC
            ...options
        };

        // Set icon based on type
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            success: '✅'
        };

        this.icon.textContent = icons[config.type] || icons.info;
        this.icon.className = `dialog-icon ${config.type}`;
        this.title.textContent = config.title;
        this.message.textContent = config.message;

        // Handle progress bar
        if (config.showProgress) {
            this.progress.style.display = 'block';
            this.updateProgress(config.progress, config.progressText);
        } else {
            this.progress.style.display = 'none';
        }

        // Clear previous animation classes
        this.container.className = 'dialog-container';
        
        // Set animation type
        if (config.animation === 'slide-top') {
            this.container.classList.add('slide-from-top');
        } else if (config.animation === 'slide-right') {
            this.container.classList.add('slide-from-right');
            this.overlay.style.background = 'transparent';
            this.overlay.style.backdropFilter = 'none';
        } else if (config.animation === 'toast') {
            this.container.classList.add('message-toast');
            this.overlay.style.background = 'transparent';
            this.overlay.style.backdropFilter = 'none';
        } else {
            // Default popup animation
            this.overlay.style.background = 'rgba(0, 0, 0, 0.5)';
            this.overlay.style.backdropFilter = 'blur(4px)';
        }

        // Set position
        if (config.position === 'top-right' && (config.animation === 'slide-right' || config.animation === 'toast')) {
            // Para slide-right y toast, no usar flexbox ya que usan position fixed
            this.overlay.style.alignItems = 'initial';
            this.overlay.style.justifyContent = 'initial';
            this.overlay.style.padding = '0';
        } else if (config.position === 'top-right') {
            this.overlay.style.alignItems = 'flex-start';
            this.overlay.style.justifyContent = 'flex-end';
            this.overlay.style.padding = '20px';
        } else {
            this.overlay.style.alignItems = 'center';
            this.overlay.style.justifyContent = 'center';
            this.overlay.style.padding = '0';
        }

        // Create buttons
        this.actions.innerHTML = '';
        config.buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = `dialog-btn ${button.type || 'secondary'}`;
            btn.textContent = button.text;
            btn.onclick = button.action || (() => this.hide());
            this.actions.appendChild(btn);
        });

        // Show dialog
        this.overlay.classList.add('show');
        this.currentDialog = config;

        // Auto close if specified
        if (config.autoClose) {
            setTimeout(() => {
                this.hide();
            }, config.autoClose);
        }

        return new Promise((resolve) => {
            this.currentDialog.resolve = resolve;
        });
    }

    hide() {
        if (!this.overlay) return;
        
        this.overlay.classList.remove('show');
        
        if (this.currentDialog && this.currentDialog.resolve) {
            this.currentDialog.resolve(false);
        }
        
        this.currentDialog = null;
    }

    updateProgress(percentage, customText = null) {
        if (!this.progressFill || !this.progressText) return;
        
        const percent = Math.max(0, Math.min(100, percentage));
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = customText || `${Math.round(percent)}%`;
        
        // Update current dialog progress if exists
        if (this.currentDialog) {
            this.currentDialog.progress = percent;
            this.currentDialog.progressText = customText;
        }
    }

    updateMessage(message) {
        if (this.message) {
            this.message.textContent = message;
        }
        if (this.currentDialog) {
            this.currentDialog.message = message;
        }
    }

    updateTitle(title) {
        if (this.title) {
            this.title.textContent = title;
        }
        if (this.currentDialog) {
            this.currentDialog.title = title;
        }
    }

    // Convenience methods
    confirm(options = {}) {
        return this.show({
            type: 'warning',
            title: options.title || 'Confirmación',
            message: options.message || '¿Estás seguro?',
            animation: options.animation || 'popup',
            buttons: [
                { 
                    text: options.cancelText || 'Cancelar', 
                    type: 'secondary', 
                    action: () => {
                        if (this.currentDialog && this.currentDialog.resolve) {
                            this.currentDialog.resolve(false);
                        }
                        this.hide();
                    }
                },
                { 
                    text: options.confirmText || 'Confirmar', 
                    type: options.confirmType || 'danger', 
                    action: () => {
                        if (this.currentDialog && this.currentDialog.resolve) {
                            this.currentDialog.resolve(true);
                        }
                        this.hide();
                    }
                }
            ]
        });
    }

    alert(options = {}) {
        return this.show({
            type: options.type || 'info',
            title: options.title || 'Información',
            message: options.message || 'Mensaje',
            animation: options.animation || 'popup',
            buttons: [
                { 
                    text: options.buttonText || 'Aceptar', 
                    type: 'primary', 
                    action: () => {
                        if (this.currentDialog && this.currentDialog.resolve) {
                            this.currentDialog.resolve(true);
                        }
                        this.hide();
                    }
                }
            ]
        });
    }

    toast(options = {}) {
        return this.show({
            type: options.type || 'success',
            title: options.title || 'Notificación',
            message: options.message || 'Operación completada',
            animation: 'toast',
            position: 'top-right',
            autoClose: options.autoClose || 3000,
            buttons: []
        });
    }

    // Static method to create a global instance
    static createGlobalInstance() {
        if (!window.dialogManager) {
            window.dialogManager = new DialogManager();
        }
        return window.dialogManager;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DialogManager;
} else {
    // Browser environment - attach to window
    window.DialogManager = DialogManager;
}