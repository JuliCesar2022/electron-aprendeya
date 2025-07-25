/**
 * LoginForm - Componente para manejar el formulario de login
 */
class LoginForm {
    constructor(options = {}) {
        this.onLoginSuccess = options.onLoginSuccess || (() => {});
        this.onLoginError = options.onLoginError || (() => {});
        
        // DOM elements
        this.form = null;
        this.emailInput = null;
        this.passwordInput = null;
        this.loginBtn = null;
        this.loading = null;
        this.errorEl = null;
        this.successEl = null;
        
        this.init();
    }
    
    init() {
        this.setupDOMReferences();
        this.setupEventListeners();
    }
    
    setupDOMReferences() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        this.loading = document.getElementById('loading');
        this.errorEl = document.getElementById('errorMessage');
        this.successEl = document.getElementById('successMessage');
    }
    
    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Demo credentials click handler
        const demoCredentials = document.querySelector('.demo-credentials');
        if (demoCredentials) {
            demoCredentials.addEventListener('click', () => this.fillDemoCredentials());
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const email = this.emailInput?.value.trim();
        const password = this.passwordInput?.value.trim();
        
        if (!email || !password) {
            this.showMessage('error', 'Completa todos los campos');
            return;
        }
        
        this.setLoading(true);
        this.showMessage('', '');
        
        try {
            const token = await this.performLogin(email, password);
            this.showMessage('success', 'Login exitoso. Configurando Udemy...');
            
            await this.setupUdemyAccount(token);
            this.showMessage('success', 'Redirigiendo a Udemy...');
            
            // Call success callback
            this.onLoginSuccess(token);
            
        } catch (error) {
            this.showMessage('error', error.message || 'Error inesperado');
            this.onLoginError(error);
        } finally {
            this.setLoading(false);
        }
    }
    
    async performLogin(email, password) {
        const loginData = {
            email,
            password,
            ...this.getDeviceInfo()
        };
        
        const response = await fetch('https://aprendeya-backend.forif.co/api/v1/auth/login', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Accept': 'application/json' 
            },
            body: JSON.stringify(loginData)
        });
        
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Error ${response.status}`);
        }
        
        const data = await response.json();
        const { token, id, email: userEmail, fullname } = data;
        
        // Store auth data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userId', id);
        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('userFullname', fullname);
        localStorage.setItem('userData', JSON.stringify({ 
            ...data, 
            loginTime: new Date().toISOString() 
        }));
        
        return token;
    }
    
    async setupUdemyAccount(token) {
        const response = await fetch('https://aprendeya-backend.forif.co/api/v1/udemy-accounts/optimal-account', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Cuenta no disponible');
        }
        
        const account = await response.json();
        localStorage.setItem('udemyAccount', JSON.stringify(account));
        
        const userEmail = localStorage.getItem('userEmail');
        const userFullname = localStorage.getItem('userFullname');
        
        // Set cookies in Electron
        if (window.electronAPI) {
            console.log('🍪 [LOGIN] Configurando cookies para nueva cuenta:', { 
                email: userEmail, 
                hasAccessToken: !!(account.accessToken), 
                hasSessionId: !!(account.dj_session_id),
                hasClientId: !!(account.client_id)
            });
            
            const cookieResult = await window.electronAPI.invoke('set-cookies', [
                { name: 'access_token', value: account.accessToken, domain: '.udemy.com', path: '/', secure: true },
                { name: 'dj_session_id', value: account.dj_session_id, domain: '.udemy.com', path: '/', secure: true, httpOnly: false },
                { name: 'client_id', value: account.client_id, domain: '.udemy.com', path: '/', secure: true },
                { name: 'auth_token', value: token, domain: '.udemy.com', path: '/', secure: false },
                { name: 'user_email', value: userEmail || '', domain: '.udemy.com', path: '/', secure: false },
                { name: 'user_fullname', value: encodeURIComponent(userFullname || ''), domain: '.udemy.com', path: '/', secure: false }
            ]);
            
            console.log('🍪 [LOGIN] Resultado de configuración de cookies:', cookieResult);
            
            if (cookieResult && cookieResult.success) {
                console.log('✅ [LOGIN] Cookies configuradas exitosamente para Udemy');
            } else {
                console.error('❌ [LOGIN] Error configurando cookies:', cookieResult);
            }
        }
        
        return account;
    }
    
    getDeviceInfo() {
        return {
            device_id: this.generateUUID(),
            user_agent: navigator.userAgent,
            ip_address: "192.168.1.1"
        };
    }
    
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    showMessage(type, text) {
        this.errorEl.style.display = 'none';
        this.successEl.style.display = 'none';
        
        if (type === 'error') {
            this.errorEl.textContent = text;
            this.errorEl.style.display = 'block';
        } else if (type === 'success') {
            this.successEl.textContent = text;
            this.successEl.style.display = 'block';
        }
    }
    
    setLoading(isLoading) {
        if (this.loginBtn) {
            this.loginBtn.disabled = isLoading;
        }
        if (this.loading) {
            this.loading.style.display = isLoading ? 'block' : 'none';
        }
    }
    
    fillDemoCredentials() {
        if (this.emailInput) {
            this.emailInput.value = 'admin@forif.com';
        }
        if (this.passwordInput) {
            this.passwordInput.value = 'string';
        }
    }
    
    // Public methods
    reset() {
        if (this.form) {
            this.form.reset();
        }
        this.showMessage('', '');
        this.setLoading(false);
    }
    
    getFormData() {
        return {
            email: this.emailInput?.value.trim() || '',
            password: this.passwordInput?.value.trim() || ''
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginForm;
} else {
    window.LoginForm = LoginForm;
}