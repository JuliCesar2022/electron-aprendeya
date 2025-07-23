/**
 * Brave Integration - Integración con navegador Brave
 * 
 * Maneja la apertura de cursos en Brave Browser con transferencia de sesión
 * y configuración optimizada para streaming de video.
 */

import { showInterceptorNotification, showInterceptorLoader, hideInterceptorLoader } from './dialog-integration.js';
import { hasElectronAPI } from '../utils/environment-detector.js';

/**
 * Abre un curso de Udemy en el navegador Brave
 * @param {string} courseUrl - URL del curso
 * @returns {Promise<boolean>} True si se abrió exitosamente
 */
export async function openCourseInBrave(courseUrl) {
    console.log('🎓 Abriendo curso en Brave con modo kiosko:', courseUrl);
    
    // Verificar disponibilidad de APIs
    if (!hasElectronAPI()) {
        console.log('ℹ️ Funcionalidad Brave no disponible en este contexto');
        showInterceptorNotification('Funcionalidad no disponible en WebView', 'warning');
        return false;
    }
    
    try {
        // Mostrar indicador de carga
        showInterceptorLoader('Abriendo curso en Brave...');
        
        // Lanzar curso en Brave con cookies transferidas
        const success = await window.electronAPI.invoke('chrome-launch-course', courseUrl);
        
        hideInterceptorLoader();
        
        if (success) {
            console.log('✅ Curso abierto exitosamente en Brave');
            showInterceptorNotification('Curso abierto en Brave Browser', 'success');
            return true;
        } else {
            throw new Error('No se pudo abrir el curso en Brave');
        }
        
    } catch (error) {
        hideInterceptorLoader();
        console.error('❌ Error abriendo curso en Brave:', error);
        showInterceptorNotification(`Error: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Transfiere las cookies de sesión al navegador Brave
 * @returns {Promise<boolean>} True si se transfirieron exitosamente
 */
export async function transferSessionToBrave() {
    if (!hasElectronAPI()) {
        return false;
    }
    
    try {
        console.log('🍪 Transfiriendo sesión a Brave...');
        
        // Obtener cookies importantes
        const cookies = extractSessionCookies();
        
        if (cookies.length === 0) {
            console.log('⚠️ No se encontraron cookies de sesión');
            return false;
        }
        
        // Transferir cookies via IPC
        const success = await window.electronAPI.invoke('transfer-cookies-to-brave', cookies);
        
        if (success) {
            console.log('✅ Sesión transferida exitosamente a Brave');
            return true;
        } else {
            console.log('❌ Error transfiriendo sesión a Brave');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error en transferencia de sesión:', error);
        return false;
    }
}

/**
 * Extrae las cookies de sesión importantes para Udemy
 * @returns {Array} Array de objetos cookie
 */
export function extractSessionCookies() {
    const cookieNames = [
        'access_token',
        'dj_session_id', 
        'auth_token',
        'client_id',
        'user_email',
        'user_fullname',
        'ud_cache_modern_browser',
        'ud_cache_release',
        'ud_cache_version'
    ];
    
    const cookies = [];
    
    cookieNames.forEach(name => {
        const value = getCookieValue(name);
        if (value) {
            cookies.push({
                name,
                value,
                domain: '.udemy.com',
                path: '/',
                secure: name.includes('token') || name.includes('session'),
                httpOnly: name.includes('session')
            });
        }
    });
    
    console.log(`🍪 Extraídas ${cookies.length} cookies de sesión`);
    return cookies;
}

/**
 * Obtiene el valor de una cookie específica
 * @param {string} name - Nombre de la cookie
 * @returns {string|null} Valor de la cookie o null
 */
function getCookieValue(name) {
    try {
        const cookies = document.cookie.split(';').map(c => c.trim());
        for (const cookie of cookies) {
            if (cookie.startsWith(name + '=')) {
                return decodeURIComponent(cookie.split('=')[1]);
            }
        }
        return null;
    } catch (error) {
        console.error(`❌ Error obteniendo cookie ${name}:`, error);
        return null;
    }
}

/**
 * Verifica si Brave está disponible en el sistema
 * @returns {Promise<boolean>} True si Brave está disponible
 */
export async function isBraveAvailable() {
    if (!hasElectronAPI()) {
        return false;
    }
    
    try {
        const available = await window.electronAPI.invoke('check-brave-availability');
        return available;
    } catch (error) {
        console.error('❌ Error verificando disponibilidad de Brave:', error);
        return false;
    }
}

/**
 * Configura Brave con optimizaciones para Udemy
 * @returns {Promise<boolean>} True si se configuró exitosamente
 */
export async function configureBraveForUdemy() {
    if (!hasElectronAPI()) {
        return false;
    }
    
    try {
        console.log('⚙️ Configurando Brave para Udemy...');
        
        const config = {
            // Configuraciones de video
            enableHardwareAcceleration: true,
            enableWidevinedrm: true,
            disableWebSecurity: false,
            
            // Configuraciones de experiencia
            enableKioskMode: true,
            disableInfobars: true,
            disableNotifications: true,
            
            // Configuraciones de privacidad
            clearDataOnExit: true,
            useTemporaryProfile: true,
            
            // User agent personalizado
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        
        const success = await window.electronAPI.invoke('configure-brave', config);
        
        if (success) {
            console.log('✅ Brave configurado exitosamente');
            return true;
        } else {
            console.log('❌ Error configurando Brave');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error en configuración de Brave:', error);
        return false;
    }
}

/**
 * Cierra todas las instancias de Brave abiertas
 * @returns {Promise<boolean>} True si se cerraron exitosamente
 */
export async function closeBraveInstances() {
    if (!hasElectronAPI()) {
        return false;
    }
    
    try {
        console.log('🛑 Cerrando instancias de Brave...');
        
        const success = await window.electronAPI.invoke('close-brave-instances');
        
        if (success) {
            console.log('✅ Instancias de Brave cerradas');
            showInterceptorNotification('Brave Browser cerrado', 'info');
            return true;
        } else {
            console.log('⚠️ No se encontraron instancias de Brave');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error cerrando Brave:', error);
        return false;
    }
}

/**
 * Obtiene información sobre las instancias de Brave activas
 * @returns {Promise<Object>} Información de las instancias
 */
export async function getBraveInstancesInfo() {
    if (!hasElectronAPI()) {
        return { count: 0, instances: [] };
    }
    
    try {
        const info = await window.electronAPI.invoke('get-brave-instances');
        return info || { count: 0, instances: [] };
    } catch (error) {
        console.error('❌ Error obteniendo info de Brave:', error);
        return { count: 0, instances: [] };
    }
}

/**
 * Abre una URL específica en Brave (función genérica)
 * @param {string} url - URL a abrir
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<boolean>} True si se abrió exitosamente
 */
export async function openUrlInBrave(url, options = {}) {
    if (!hasElectronAPI()) {
        return false;
    }
    
    try {
        const defaultOptions = {
            transferCookies: true,
            kioskMode: false,
            newWindow: true
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        console.log('🌐 Abriendo URL en Brave:', url);
        
        if (finalOptions.transferCookies) {
            await transferSessionToBrave();
        }
        
        const success = await window.electronAPI.invoke('open-url-in-brave', {
            url,
            options: finalOptions
        });
        
        return success;
        
    } catch (error) {
        console.error('❌ Error abriendo URL en Brave:', error);
        return false;
    }
}

/**
 * Función de conveniencia para abrir el dashboard de Udemy en Brave
 * @returns {Promise<boolean>} True si se abrió exitosamente
 */
export async function openUdemyDashboardInBrave() {
    return openUrlInBrave('https://www.udemy.com/home/my-courses/learning/', {
        transferCookies: true,
        kioskMode: false
    });
}

/**
 * Función de conveniencia para abrir la página principal de Udemy en Brave
 * @returns {Promise<boolean>} True si se abrió exitosamente
 */
export async function openUdemyHomeInBrave() {
    return openUrlInBrave('https://www.udemy.com/', {
        transferCookies: true,
        kioskMode: false
    });
}

// Exponer función global para compatibilidad con código existente
if (typeof window !== 'undefined') {
    window.openCourseInBrave = openCourseInBrave;
}