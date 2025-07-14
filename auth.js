// Sistema de autenticación y gestión de sesión
class AuthManager {
    constructor() {
        this.storageKeys = {
            authToken: 'authToken',
            userId: 'userId', 
            userEmail: 'userEmail',
            userFullname: 'userFullname',
            userData: 'userData'
        };
    }

    // Verificar si el usuario está autenticado
    isAuthenticated() {
        const token = this.getToken();
        return token !== null && token !== undefined && token !== '';
    }

    // Obtener token de autenticación
    getToken() {
        return localStorage.getItem(this.storageKeys.authToken);
    }

    // Obtener datos del usuario
    getUserData() {
        const userData = localStorage.getItem(this.storageKeys.userData);
        try {
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error al parsear datos de usuario:', error);
            return null;
        }
    }

    // Obtener información específica del usuario
    getUserInfo() {
        const userData = this.getUserData();
        if (userData) {
            return {
                id: userData.id,
                email: userData.email,
                fullname: userData.fullname,
                loginTime: userData.loginTime
            };
        }
        return {
            id: localStorage.getItem(this.storageKeys.userId),
            email: localStorage.getItem(this.storageKeys.userEmail),
            fullname: localStorage.getItem(this.storageKeys.userFullname),
            loginTime: null
        };
    }

    // Obtener datos de la cuenta de Udemy
    getUdemyAccount() {
        const accountData = localStorage.getItem('udemyAccount');
        try {
            return accountData ? JSON.parse(accountData) : null;
        } catch (error) {
            console.error('Error al parsear datos de cuenta de Udemy:', error);
            return null;
        }
    }

    // Limpiar datos de autenticación (logout)
    logout() {
        Object.values(this.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });
        // También limpiar datos de cuenta de Udemy
        localStorage.removeItem('udemyAccount');
        console.log('🚪 Sesión cerrada exitosamente');
    }

    // Verificar si el token está expirado (básico)
    isTokenExpired() {
        const userData = this.getUserData();
        if (!userData || !userData.loginTime) {
            return true;
        }

        const loginTime = new Date(userData.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        // Considerar token expirado después de 24 horas
        return hoursDiff > 24;
    }

    // Obtener headers para requests autenticados
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    // Renovar token (si es necesario)
    async refreshToken() {
        // Implementar lógica de renovación si tu API lo soporta
        console.log('🔄 Función de renovación de token no implementada');
        return false;
    }

    // Mostrar información de sesión en consola
    debugSession() {
        console.log('🔍 Información de sesión:');
        console.log('- Autenticado:', this.isAuthenticated());
        console.log('- Token:', this.getToken() ? 'Presente' : 'No disponible');
        console.log('- Usuario:', this.getUserInfo());
        console.log('- Token expirado:', this.isTokenExpired());
    }
}

// Crear instancia global del AuthManager
window.authManager = new AuthManager();

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    if (window.authManager.isAuthenticated()) {
        const userInfo = window.authManager.getUserInfo();
        console.log(`👋 Usuario autenticado: ${userInfo.fullname || userInfo.email}`);
        
        if (window.authManager.isTokenExpired()) {
            console.log('⚠️ Token expirado, necesario hacer login nuevamente');
            window.authManager.logout();
        }
    } else {
        console.log('🔒 Usuario no autenticado');
    }
});

// Función global para verificar autenticación antes de acciones
function requireAuth(callback) {
    if (window.authManager.isAuthenticated() && !window.authManager.isTokenExpired()) {
        callback();
    } else {
        console.log('🔒 Acción requiere autenticación, redirigiendo al login...');
        if (window.electronAPI) {
            window.electronAPI.goToLogin();
        } else {
            window.location.href = 'login.html';
        }
    }
}