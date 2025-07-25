/**
 * LoginPage - Controlador principal de la página de login
 */
class LoginPage {
    constructor() {
        this.loginForm = null;
        this.navigationHandler = null;
        this.dialogManager = null;
        this.updateManager = null;
        
        this.init();
    }
    
    init() {
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        // Initialize global dialog manager
        this.initializeDialogSystem();
        
        // Initialize global update manager
        this.initializeUpdateManager();
        
        // Initialize navigation handler
        this.navigationHandler = new NavigationHandler();
        
        // Initialize login form
        this.loginForm = new LoginForm({
            onLoginSuccess: (token) => this.handleLoginSuccess(token),
            onLoginError: (error) => this.handleLoginError(error)
        });
        
    }
    
    initializeDialogSystem() {
        this.dialogManager = DialogManager.createGlobalInstance();
    }
    
    initializeUpdateManager() {
        if (window.UpdateManager) {
            this.updateManager = UpdateManager.createGlobalInstance();
        }
    }
    
    handleLoginSuccess(token) {
        
        // Show success dialog
        this.dialogManager.toast({
            type: 'success',
            title: 'Login exitoso',
            message: 'Redirigiendo a Udemy...',
            autoClose: 2000
        });
        
        // Navigate to Udemy with delay
        this.navigationHandler.navigateToUdemyWithDelay(1500);
    }
    
    handleLoginError(error) {
        
        // Show error dialog
        this.dialogManager.alert({
            type: 'error',
            title: 'Error de login',
            message: error.message || 'Error inesperado durante el login',
            animation: 'popup'
        });
    }
    
    // Public methods for external access
    resetForm() {
        if (this.loginForm) {
            this.loginForm.reset();
        }
    }
    
    getFormData() {
        if (this.loginForm) {
            return this.loginForm.getFormData();
        }
        return { email: '', password: '' };
    }
}

// Initialize the page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.loginPage = new LoginPage();
});

// Make globally accessible for debugging
window.LoginPage = LoginPage;