/**
 * FloatingWidget Component
 * Displays a draggable widget showing connection status and interceptor info
 */
class FloatingWidget {
    constructor(options = {}) {
        this.options = {
            containerId: 'floating-widget',
            title: 'Udemigo',
            initialStatus: 'Conectado',
            initialInfo: 'Interceptor activo • Socket conectado',
            draggable: true,
            minimizable: true,
            closable: true,
            onMinimize: null,
            onClose: null,
            ...options
        };
        
        this.container = null;
        this.statusDot = null;
        this.statusText = null;
        this.widgetInfo = null;
        
        // State
        this.isMinimized = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.init();
    }

    init() {
        this.createWidget();
        this.setupEventListeners();
        console.log('✅ FloatingWidget initialized');
    }

    createWidget() {
        // Create widget HTML structure
        const widgetHTML = `
            <div class="floating-widget" id="${this.options.containerId}">
                <div class="widget-header">
                    <div class="widget-title">${this.options.title}</div>
                    <div class="widget-controls">
                        ${this.options.minimizable ? 
                            '<button class="widget-btn" id="minimize-btn" title="Minimizar">−</button>' : 
                            ''
                        }
                        ${this.options.closable ? 
                            '<button class="widget-btn" id="close-btn" title="Cerrar">×</button>' : 
                            ''
                        }
                    </div>
                </div>
                <div class="widget-content">
                    <div class="status-indicator">
                        <div id="status-dot" class="status-dot"></div>
                        <span id="status-text">${this.options.initialStatus}</span>
                    </div>
                    <div id="widget-info" class="widget-info">
                        ${this.options.initialInfo}
                    </div>
                </div>
            </div>
        `;
        
        // Insert into DOM
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
        
        // Get references
        this.container = document.getElementById(this.options.containerId);
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        this.widgetInfo = document.getElementById('widget-info');
    }

    setupEventListeners() {
        if (!this.container) return;

        // Minimize button
        const minimizeBtn = document.getElementById('minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                this.toggleMinimize();
            });
        }

        // Close button
        const closeBtn = document.getElementById('close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
            });
        }

        // Double-click to toggle minimize
        this.container.addEventListener('dblclick', () => {
            if (this.options.minimizable) {
                this.toggleMinimize();
            }
        });

        // Draggable functionality
        if (this.options.draggable) {
            this.setupDragging();
        }
    }

    setupDragging() {
        // Make widget draggable
        this.container.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on buttons
            if (e.target.closest('.widget-btn')) return;
            
            this.isDragging = true;
            this.container.classList.add('dragging');
            
            const rect = this.container.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            // Keep widget within viewport
            const maxX = window.innerWidth - this.container.offsetWidth;
            const maxY = window.innerHeight - this.container.offsetHeight;
            
            this.container.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            this.container.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            this.container.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.container.classList.remove('dragging');
            }
        });
    }

    // Public methods
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.container.classList.toggle('minimized', this.isMinimized);
        
        const minimizeBtn = document.getElementById('minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.textContent = this.isMinimized ? '+' : '−';
            minimizeBtn.title = this.isMinimized ? 'Maximizar' : 'Minimizar';
        }

        if (this.options.onMinimize) {
            this.options.onMinimize(this.isMinimized);
        }
    }

    close() {
        this.container.style.display = 'none';
        
        if (this.options.onClose) {
            this.options.onClose();
        }
    }

    show() {
        this.container.style.display = 'block';
    }

    updateStatus(status, text) {
        if (this.statusDot) {
            this.statusDot.className = `status-dot ${status === 'connected' ? '' : 'disconnected'}`;
        }
        if (this.statusText) {
            this.statusText.textContent = text;
        }
    }

    updateInfo(info, temporary = false) {
        if (this.widgetInfo) {
            this.widgetInfo.textContent = info;
            
            // Reset to default after 3 seconds if temporary
            if (temporary) {
                setTimeout(() => {
                    this.widgetInfo.textContent = this.options.initialInfo;
                }, 3000);
            }
        }
    }

    setPosition(x, y) {
        this.container.style.left = x + 'px';
        this.container.style.top = y + 'px';
        this.container.style.right = 'auto';
    }

    getPosition() {
        const rect = this.container.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    destroy() {
        if (this.container) {
            this.container.remove();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FloatingWidget;
} else {
    window.FloatingWidget = FloatingWidget;
}