/**
 * NavigationHandler - Maneja la navegación en la página de login
 */
class NavigationHandler {
    constructor() {
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        console.log('✅ NavigationHandler component initialized');
    }
    
    setupEventListeners() {
        // Back button
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToHome();
            });
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.goToHome();
            }
        });
    }
    
    goToHome() {
        console.log('🏠 Navigating to home page...');
        
        if (window.electronAPI) {
            window.electronAPI.send('go-to-home');
        } else {
            // Fallback for browser testing
            console.log('🔄 Fallback navigation to index page');
            window.location.href = '../index/index.html';
        }
    }
    
    goToUdemy() {
        console.log('🎓 Navigating to Udemy WebView...');
        
        if (window.electronAPI) {
            window.electronAPI.send('go-to-udemy-webview');
        } else {
            // Fallback for browser testing
            console.log('🔄 Fallback navigation to Udemy');
            window.location.href = 'https://www.udemy.com/';
        }
    }
    
    // Public method to trigger Udemy navigation with delay
    navigateToUdemyWithDelay(delay = 1500) {
        setTimeout(() => {
            this.goToUdemy();
        }, delay);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationHandler;
} else {
    window.NavigationHandler = NavigationHandler;
}