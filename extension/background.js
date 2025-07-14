let popupWindowId = null;
  let udemyTabAlreadyExists = false;
  importScripts("socket.io.js");

let socket = null;
const activeTabs = new Set();
// Escuchar mensajes desde el content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TAB_ENTER" && sender.tab?.id !== undefined) {
    activeTabs.add(sender.tab.id);
    console.warn("[ENTER]", activeTabs);
  }

  if (message.type === "TAB_LEAVE" && sender.tab?.id !== undefined) {
    activeTabs.delete(sender.tab.id);
    console.warn("[LEAVE]", activeTabs);
  }



 if (message.action === "conectar_socket") {
    conectarSocket(message.udemyId);
  }

  if (message.action === 'get_token') {
    chrome.storage.local.get(['token'], (result) => {
      sendResponse({ token: result.token });
    });
    return true; // Necesario porque usamos sendResponse async
    }

    
    if (message.action === "cerrar") {
            chrome.windows.remove(sender.tab.windowId);
        }
    


  if (message.action === 'check_popup') {
    sendResponse({ popupOpen: popupWindowId !== null });
    return true;
  }



  if (message.type === 'udemy_ping') {
    // La primera vez, devuelve falso, luego verdadero
    sendResponse({ udemy_tab_active: udemyTabAlreadyExists });
    udemyTabAlreadyExists = true;
  }


 
    if (message.action === 'open_popup') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (currentTab) {
                chrome.tabs.update(currentTab.id, {
                    url: chrome.runtime.getURL('index.html')
                });
            }
        });
    }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (activeTabs.has(tabId)) {
    activeTabs.delete(tabId);
    console.warn("[REMOVED] Pestaña cerrada. Pestañas activas:", activeTabs.size);

    if (activeTabs.size === 0) {
      udemyTabAlreadyExists = false;
      chrome.storage.local.get(["accountUdemyId"], (data) => {
        const id = data.accountUdemyId;
      
        if (id) {
          socket.disconnect()
        }
      });
    }
  }
});





function conectarSocket() {
  // Obtener el ID desde chrome.storage.local
  chrome.storage.local.get(["accountUdemyId"], (result) => {
    const udemyId = result.accountUdemyId;

    if (!udemyId) {
      console.warn("⚠️ No se encontró accountUdemyId en storage.");
      return;
    }

    if (socket && socket.connected) {
      console.log("⚠️ Ya estás conectado");
      return;
    }

    // Crear la conexión con auth
    socket = io("https://aprendeya-backend.forif.co", {
      transports: ["websocket"],
      query: {
        udemyId: udemyId
      }
    });

    socket.on("connect", () => {
      console.log("✅ Conectado al socket con udemyId:", udemyId);
    });

    socket.on("disconnect", () => {
      console.log("❌ Desconectado del servidor");
    });

    socket.on("mensaje", (data) => {
      console.log("📩 Recibido del servidor:", data);
    });
  });
}

