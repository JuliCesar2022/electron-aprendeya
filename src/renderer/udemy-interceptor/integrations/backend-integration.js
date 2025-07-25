/**
 * Backend Integration - Integración con el backend de la aplicación
 * 
 * Maneja toda la comunicación con el backend de la aplicación Electron,
 * incluyendo sincronización de datos, configuración y estadísticas.
 */

import { showInterceptorNotification, showInterceptorLoader, hideInterceptorLoader } from './dialog-integration.js';
import { hasElectronAPI } from '../utils/environment-detector.js';

/**
 * Clase que maneja la integración con el backend
 */
export class BackendIntegration {
    constructor() {
        this.isOnline = false;
        this.lastSync = null;
        this.syncInterval = null;
        this.config = {
            autoSync: true,
            syncIntervalMs: 300000, // 5 minutos
            retryAttempts: 3,
            retryDelay: 1000
        };
        
        this.initialize();
    }
    
    /**
     * Inicializa la integración con el backend
     */
    async initialize() {
        if (!hasElectronAPI()) {
            return;
        }
        
        
        // Verificar conectividad
        await this.checkConnection();
        
        // Configurar auto-sync si está habilitado
        if (this.config.autoSync) {
            this.startAutoSync();
        }
        
        // Configurar listeners
        this.setupEventListeners();
    }
    
    /**
     * Verifica la conexión con el backend
     * @returns {Promise<boolean>} True si hay conexión
     */
    async checkConnection() {
        if (!hasElectronAPI()) {
            return false;
        }
        
        try {
            const response = await window.electronAPI.invoke('backend-ping');
            this.isOnline = response === 'pong';
            
            if (this.isOnline) {
            } else {
            }
            
            return this.isOnline;
            
        } catch (error) {
            this.isOnline = false;
            return false;
        }
    }
    
    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        if (!hasElectronAPI()) {
            return;
        }
        
        // Listener para cambios de conectividad
        window.electronAPI.receive('backend-status-changed', (status) => {
            this.isOnline = status.online;
            
            if (status.online && this.config.autoSync) {
                this.syncData();
            }
        });
        
        // Listener para actualizaciones de configuración
        window.electronAPI.receive('config-updated', (newConfig) => {
            this.handleConfigUpdate(newConfig);
        });
    }
    
    /**
     * Inicia la sincronización automática
     */
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (this.isOnline) {
                this.syncData();
            }
        }, this.config.syncIntervalMs);
        
    }
    
    /**
     * Detiene la sincronización automática
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    /**
     * Sincroniza datos con el backend
     * @returns {Promise<boolean>} True si la sincronización fue exitosa
     */
    async syncData() {
        if (!hasElectronAPI() || !this.isOnline) {
            return false;
        }
        
        try {
            
            // Obtener datos locales para sincronizar
            const localData = this.collectLocalData();
            
            // Enviar datos al backend
            const syncResult = await window.electronAPI.invoke('sync-interceptor-data', localData);
            
            if (syncResult.success) {
                this.lastSync = Date.now();
                
                // Procesar datos recibidos del backend
                if (syncResult.data) {
                    this.processBackendData(syncResult.data);
                }
                
                return true;
            } else {
                return false;
            }
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Recolecta datos locales para sincronizar
     * @returns {Object} Datos locales
     */
    collectLocalData() {
        const data = {
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            interceptorStats: {}
        };
        
        // Recolectar estadísticas del interceptor si está disponible
        if (window.udemyInterceptorCore) {
            data.interceptorStats = window.udemyInterceptorCore.getStatus();
        }
        
        // Recolectar información de la página actual
        data.pageInfo = {
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            isCoursePage: this.isCoursePage(),
            courseInfo: this.extractCourseInfo()
        };
        
        return data;
    }
    
    /**
     * Procesa datos recibidos del backend
     * @param {Object} backendData - Datos del backend
     */
    processBackendData(backendData) {
        if (backendData.config) {
            this.handleConfigUpdate(backendData.config);
        }
        
        if (backendData.notifications) {
            backendData.notifications.forEach(notification => {
                showInterceptorNotification(notification.message, notification.type);
            });
        }
        
        if (backendData.commands) {
            backendData.commands.forEach(command => {
                this.executeBackendCommand(command);
            });
        }
    }
    
    /**
     * Verifica si la página actual es una página de curso
     * @returns {boolean} True si es página de curso
     */
    isCoursePage() {
        return window.location.pathname.includes('/course/') || 
               window.location.pathname.includes('/learn/');
    }
    
    /**
     * Extrae información del curso actual si está disponible
     * @returns {Object|null} Información del curso
     */
    extractCourseInfo() {
        if (!this.isCoursePage()) {
            return null;
        }
        
        try {
            // Intentar extraer información básica del curso
            const courseTitle = document.querySelector('h1[data-purpose="course-header-title"]')?.textContent ||
                              document.querySelector('.course-title')?.textContent ||
                              document.title;
            
            const instructor = document.querySelector('[data-purpose="instructor-name-top"]')?.textContent ||
                             document.querySelector('.instructor-name')?.textContent;
            
            const courseUrl = window.location.href;
            const courseId = courseUrl.match(/\/course\/([^\/]+)/)?.[1];
            
            return {
                title: courseTitle?.trim(),
                instructor: instructor?.trim(),
                url: courseUrl,
                id: courseId,
                extractedAt: Date.now()
            };
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Maneja actualizaciones de configuración desde el backend
     * @param {Object} newConfig - Nueva configuración
     */
    handleConfigUpdate(newConfig) {
        // Actualizar configuración local
        if (newConfig.backendIntegration) {
            this.config = { ...this.config, ...newConfig.backendIntegration };
        }
        
        // Notificar al interceptor core si está disponible
        if (window.udemyInterceptorCore && newConfig.interceptor) {
            window.udemyInterceptorCore.updateConfig(newConfig.interceptor);
        }
        
        // Reiniciar auto-sync si cambió la configuración
        if (newConfig.backendIntegration?.autoSync !== undefined) {
            if (newConfig.backendIntegration.autoSync) {
                this.startAutoSync();
            } else {
                this.stopAutoSync();
            }
        }
    }
    
    /**
     * Ejecuta un comando recibido del backend
     * @param {Object} command - Comando a ejecutar
     */
    executeBackendCommand(command) {
        
        switch (command.type) {
            case 'restart-interceptor':
                if (window.udemyInterceptorCore) {
                    window.udemyInterceptorCore.restart();
                }
                break;
                
            case 'force-modifications':
                if (window.udemyInterceptorCore) {
                    window.udemyInterceptorCore.forceModifications();
                }
                break;
                
            case 'show-notification':
                showInterceptorNotification(command.message, command.notificationType || 'info');
                break;
                
            case 'reload-page':
                if (command.delay) {
                    setTimeout(() => window.location.reload(), command.delay);
                } else {
                    window.location.reload();
                }
                break;
                
            default:
        }
    }
    
    /**
     * Envía estadísticas al backend
     * @param {Object} stats - Estadísticas a enviar
     * @returns {Promise<boolean>} True si se enviaron exitosamente
     */
    async sendStats(stats) {
        if (!hasElectronAPI() || !this.isOnline) {
            return false;
        }
        
        try {
            const result = await window.electronAPI.invoke('send-stats', {
                timestamp: Date.now(),
                stats,
                context: 'interceptor'
            });
            
            return result.success;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Reporta un error al backend
     * @param {Error} error - Error a reportar
     * @param {Object} context - Contexto adicional
     * @returns {Promise<boolean>} True si se reportó exitosamente
     */
    async reportError(error, context = {}) {
        if (!hasElectronAPI() || !this.isOnline) {
            return false;
        }
        
        try {
            const errorReport = {
                message: error.message,
                stack: error.stack,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                context
            };
            
            const result = await window.electronAPI.invoke('report-error', errorReport);
            
            if (result.success) {
            }
            
            return result.success;
            
        } catch (reportError) {
            return false;
        }
    }
    
    /**
     * Solicita configuración actualizada del backend
     * @returns {Promise<Object|null>} Configuración actualizada
     */
    async fetchConfig() {
        if (!hasElectronAPI() || !this.isOnline) {
            return null;
        }
        
        try {
            const config = await window.electronAPI.invoke('get-config');
            return config;
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Obtiene información del estado de la integración
     * @returns {Object} Estado de la integración
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            lastSync: this.lastSync,
            autoSyncEnabled: !!this.syncInterval,
            config: { ...this.config },
            hasElectronAPI: hasElectronAPI()
        };
    }
    
    /**
     * Registra información del estado en la consola
     */
    logStatus() {
        const status = this.getStatus();
        
        console.group('🔗 Backend Integration Status');
        console.groupEnd();
    }
    
    /**
     * Limpia recursos y detiene procesos
     */
    destroy() {
        
        this.stopAutoSync();
        this.isOnline = false;
        this.lastSync = null;
        
    }
}

// Instancia singleton para uso global
let backendIntegrationInstance = null;

/**
 * Obtiene la instancia singleton de BackendIntegration
 * @returns {BackendIntegration} Instancia de BackendIntegration
 */
export function getBackendIntegration() {
    if (!backendIntegrationInstance) {
        backendIntegrationInstance = new BackendIntegration();
    }
    return backendIntegrationInstance;
}

/**
 * Funciones de conveniencia para uso directo
 */

/**
 * Sincroniza datos con el backend
 * @returns {Promise<boolean>} True si fue exitoso
 */
export async function syncWithBackend() {
    const integration = getBackendIntegration();
    return integration.syncData();
}

/**
 * Reporta un error al backend
 * @param {Error} error - Error a reportar
 * @param {Object} context - Contexto adicional
 * @returns {Promise<boolean>} True si fue exitoso
 */
export async function reportErrorToBackend(error, context = {}) {
    const integration = getBackendIntegration();
    return integration.reportError(error, context);
}

/**
 * Verifica si hay conexión con el backend
 * @returns {Promise<boolean>} True si hay conexión
 */
export async function isBackendOnline() {
    const integration = getBackendIntegration();
    return integration.checkConnection();
}

// Exponer para debugging
if (typeof window !== 'undefined') {
    window.backendIntegration = getBackendIntegration;
}