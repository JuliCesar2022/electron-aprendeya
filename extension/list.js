
const pathRoutes = window.location.pathname;


if (pathRoutes.startsWith('/personal/home')) {
  const observer = new MutationObserver(() => {
    const heading = document.querySelector('h3.ud-heading-xl');
     

    
    if (heading ) {
      chrome.storage.local.get('fullName', (data) => {  
        const fullName = data.fullName;
        if (fullName) {
          heading.textContent = `¡Bienvenido de nuevo, ${fullName}!`;
        } else {
          heading.textContent = '¡Bienvenido de nuevo, Capitán!';
        } 
      }
      );
      
      observer.disconnect(); // Solo queremos cambiarlo una vez
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}