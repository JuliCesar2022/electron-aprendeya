const BraveController = require('./src/main/brave-controller.js');

async function testLoadingPage() {
    console.log('🧪 Probando página de carga con progreso...');
    
    const controller = new BraveController();
    
    const testCookies = [
        { name: 'client_id', value: 'test_client_12345', domain: '.udemy.com' },
        { name: 'access_token', value: 'test_token_67890', domain: '.udemy.com' },
        { name: 'dj_session_id', value: 'test_session_abcdef', domain: '.udemy.com' },
        { name: 'sessionid', value: 'test_sessionid_xyz', domain: '.udemy.com' },
        { name: 'csrftoken', value: 'test_csrf_123', domain: '.udemy.com' },
        { name: 'ud_locale', value: 'es_ES', domain: '.udemy.com' },
        { name: 'ud_cache_version', value: '1', domain: '.udemy.com' }
    ];
    
    try {
        console.log('🚀 Lanzando Brave con página de carga...');
        const result = await controller.launch(testCookies);
        
        if (result) {
            console.log('✅ Brave lanzado exitosamente');
            console.log('');
            console.log('📋 Lo que deberías ver:');
            console.log('  1. 🍪 Página de carga con logo "Udemigo"');
            console.log('  2. 📊 Barra de progreso que se va llenando');
            console.log('  3. 🔢 Contador de cookies (0 de 7, 1 de 7, etc.)');
            console.log('  4. 📝 Mensajes de estado cambiando');
            console.log('  5. ✅ Icono de éxito al completar');
            console.log('  6. ⏱️ Countdown de 3 segundos');
            console.log('  7. 🔄 Redirección automática a Udemy');
            console.log('');
            console.log('🔧 Abre las DevTools (F12) para ver los logs de progreso');
            console.log('');
            console.log('⏱️ El test se cerrará automáticamente en 30 segundos...');
            
            setTimeout(async () => {
                console.log('🔄 Cerrando test...');
                await controller.close();
                console.log('✅ Test completado');
                process.exit(0);
            }, 30000);
            
        } else {
            console.error('❌ Error lanzando Brave');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Error durante test:', error);
        process.exit(1);
    }
}

// Manejar Ctrl+C para cerrar limpiamente
process.on('SIGINT', () => {
    console.log('\\n🔄 Cerrando test...');
    process.exit(0);
});

testLoadingPage();