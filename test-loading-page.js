const BraveController = require('./src/main/brave-controller.js');

async function testLoadingPage() {
    
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
        const result = await controller.launch(testCookies);
        
        if (result) {
            
            setTimeout(async () => {
                await controller.close();
                process.exit(0);
            }, 30000);
            
        } else {
            process.exit(1);
        }
        
    } catch (error) {
        process.exit(1);
    }
}

// Manejar Ctrl+C para cerrar limpiamente
process.on('SIGINT', () => {
    process.exit(0);
});

testLoadingPage();