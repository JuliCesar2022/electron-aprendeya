const backendURL = window.ENV?.urlBackend;





// Verificar si ya hay otra pestaña activa
chrome.runtime.sendMessage({ type: 'udemy_ping' }, (response) => {
  if (response?.udemy_tab_active) {
    console.log('[🔁] Otra pestaña de Udemy ya está activa, no se ejecuta la autenticación.');
    return;
  }

  // Solo la primera pestaña ejecuta esto
  if (!sessionStorage.getItem('udemy_checked')) {
    chrome.storage.local.get('token', (result) => {
        const token = result.token;
        if (!token || !isTokenValid(token)) {
            eliminarCookie("dj_session_id");
            eliminarCookie("access_token");
            eliminarCookie("client_id");
            return;
        };

      fetch(`${backendURL}udemy-accounts/optimal-account`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then((res) => res.json())
      .then((resp) => {
        chrome.storage.local.set({ accountUdemyId: resp.id }, () => {
          console.log('✅ Token guardado correctamente');
chrome.runtime.sendMessage({
  action: "conectar_socket",
  udemyId: resp.id
});

          
        });

        eliminarCookie("dj_session_id");
        eliminarCookie("access_token");
        eliminarCookie("client_id");

        setCookie('https://www.udemy.com', 'access_token', resp.accessToken, resp.revokedAt);
        setCookie('https://www.udemy.com', 'dj_session_id', resp.dj_session_id, resp.revokedAt);
        setCookie('https://www.udemy.com', 'client_id', resp.client_id, resp.revokedAt);

        sessionStorage.setItem('udemy_checked', 'true');
        sessionStorage.setItem('refreshing', 'true');

        window.location.reload();
      });
    });
  }
});



function setCookie(domain, name, value, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();

  document.cookie = `${name}=${value}; domain=${new URL(domain).hostname}; path=/; expires=${expires}; SameSite=None; Secure`;
}


function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp && payload.exp > now;
  } catch (e) {
    return false;
  }
}

if (window.location.hostname === 'www.udemy.com') {
  chrome.runtime.sendMessage({ action: 'get_token' }, (response) => {
    const token = response?.token;
    if (!token || !isTokenValid(token)) {
      chrome.runtime.sendMessage({ action: 'check_popup' }, (res) => {
        if (!res?.popupOpen) {
          chrome.runtime.sendMessage({ action: 'open_popup' });
        }
      });
    }
  });
}



 const blockedPaths = [
    '/user/manage-subscriptions/',
    '/user/edit-payment-methods/',
    "/dashboard/credit-history/",
    '/user/edit-account/',
    '/subscription-settings',
    '/billing',
    '/purchase-history',
    '/account-settings',
    '/payment-methods',
    '/invoices',
    '/profile/edit'
  ];

    const currentPath = window.location.pathname.toLowerCase();

  // 1. Bloquear acceso por URL
  if (blockedPaths.some(path => currentPath.startsWith(path))) {
        sessionStorage.setItem('refreshing', 'true');
    window.location.href = '/'; // Redirige a home o a donde quieras
  
  }







let cachedToken = null;
let cachedAccountUdemyId = null;

chrome.storage.local.get(['token', 'accountUdemyId'], (result) => {
  cachedToken = result.token;
  cachedAccountUdemyId = result.accountUdemyId;
});




// Antes de que recargue, marcamos que viene un refresh
window.addEventListener('keydown', (e) => {
  if ((e.key === 'F5') || (e.ctrlKey && e.key === 'r') || (e.metaKey && e.key.toLowerCase() === 'r')) {
    sessionStorage.setItem('refreshing', 'true');
  }
});

let isUdemyPage = false;
chrome.runtime.sendMessage({ type: 'udemy_ping' }, (response) => {
if (response?.udemy_tab_active) {
    isUdemyPage = true

    return;
  }

});

// Identificador único de esta pestaña (solo por seguridad, aunque puedes usar sender.tab.id)
// content-script.js
chrome.runtime.sendMessage({ type: "TAB_ENTER" });



let cursosUsuario = [];

const obcerverC = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        const popup = node.querySelector?.('[data-testid="popup"]') || node.closest?.('[data-testid="popup"]');
        if (popup && esDropdownDeCursos(popup)) {
          console.log("📦 Mostrando cursos del backend...");
          obcerverC.disconnect();
          renderCursosDelBackend(popup);
          reiniciarObserver();
        }
      }
    });
  }
});

function esDropdownDeCursos(popup) {
  const heading = popup.querySelector('.panel-menu-module--section-heading-title--DpCwA').textContent?.trim();
  return heading === "Courses" || heading === "Cursos";
}

function crearElementoCurso(curso) {
  const wrapper = document.createElement("div");
  wrapper.className = "panel-menu-module--item--XoZxL ud-custom-focus-visible media-object-module--media-object--ilk-Z";

  wrapper.innerHTML = `
    <div class="ud-custom-focus-target media-object-module--image-wrapper--pxSdJ">
      <img src="${curso.course.urlImage}" width="240" height="135" class="compact-course-progress-card-module--course-image--NCUhE" loading="lazy">
    </div>
    <div class="compact-course-progress-card-module--course-info--EzvuD">
      <a href="https://www.udemy.com/course/${curso.course.urlCourseUdemy}/learn" class="ud-heading-sm compact-course-progress-card-module--course-title--tMPDH compact-course-progress-card-module--course-title-condensed---Y2a- ud-focus-visible-target media-object-module--media-object-title--60qy5">
        ${curso.course.name}
      </a>
      <span class="ud-heading-sm compact-course-progress-card-module--start-learning--hkwdf">Start learning</span>
    </div>
  `;
  return wrapper;
}

function renderCursosDelBackend(container) {
  container.innerHTML = "";

  // Crear contenedor principal con fondo blanco
  const fondo = document.createElement("div");
  fondo.style.background = "#fff";
  fondo.style.borderRadius = "8px";
  fondo.style.padding = "8px 0";
  fondo.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.1)";

  // Agregar cursos
  if (cursosUsuario.length === 0) {
    const mensaje = document.createElement("div");
    mensaje.style.padding = "1rem";
    mensaje.style.textAlign = "center";
    mensaje.style.fontWeight = "bold";
    mensaje.style.color = "#1c1d1f";
    mensaje.style.fontSize = "1rem";
    mensaje.textContent = "⚠️ No tienes cursos guardados.";
    fondo.appendChild(mensaje);
  } else {
    cursosUsuario.forEach(curso => {
      const elemento = crearElementoCurso(curso);
      fondo.appendChild(elemento);
    });

    // Botón final "Go to My learning"
    const botonFinal = document.createElement("div");
    botonFinal.className = "panel-menu-module--item--XoZxL";
    botonFinal.innerHTML = `
      <a href="/home/my-courses/premium/" class="ud-btn ud-btn-medium ud-btn-primary ud-heading-sm panel-menu-module--cta--G-aTQ">
        <span class="ud-btn-label">Go to My learning</span>
      </a>
    `;
    fondo.appendChild(botonFinal);
  }

  container.appendChild(fondo);
}


function reiniciarObserver() {
  obcerverC.observe(document.body, { childList: true, subtree: true });
}

function obtenerToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["token"], (result) => {
      resolve(result.token || null);
    });
  });
}

async function cargarCursosDesdeBackend() {
  const token = await obtenerToken();
  if (!token) {
    console.warn("⚠️ No se encontró token en chrome.storage.local");
    return;
  }

  try {
    const res = await fetch(`${backendURL}user-courses?page=1&limit=5`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    cursosUsuario = data.data;
    console.log("✅ Cursos cargados desde backend:", cursosUsuario);
  } catch (err) {
    console.error("❌ Error al cargar cursos desde backend:", err);
  }
}

// Inicia todo
(async () => {
  await cargarCursosDesdeBackend();
  obcerverC.observe(document.body, { childList: true, subtree: true });

  // Por si el menú ya está visible al cargar
  const popup = document.querySelector('[data-testid="popup"]');
  if (popup && esDropdownDeCursos(popup)) {
    renderCursosDelBackend(popup);
  }
})();


const observer = new MutationObserver(() => {
  const allEnrollBtns = document.querySelectorAll('a[data-purpose="subscription-redirect-button"]');

  if (allEnrollBtns.length === 0) return;

  allEnrollBtns.forEach((originalBtn, index) => {
    // Ya procesado
    if (originalBtn.nextSibling?.id === "custom-enroll-btn-" + index) return;

    // Ocultar botón original
    originalBtn.style.display = 'none';
    originalBtn.onclick = (e) => e.preventDefault();

    // Crear botón personalizado
    const customBtn = document.createElement('button');
    customBtn.id = "custom-enroll-btn-" + index;
    customBtn.textContent = "Enroll and Save";
    customBtn.style.background = "#5624d0";
    customBtn.style.color = "white";
    customBtn.style.padding = "12px 16px";
    customBtn.style.border = "none";
    customBtn.style.borderRadius = "4px";
    customBtn.style.fontSize = "16px";
    customBtn.style.cursor = "pointer";
    customBtn.style.marginTop = "10px";
    customBtn.style.width = "100%";

    // Insertar el nuevo botón después del original
    originalBtn.parentNode.insertBefore(customBtn, originalBtn.nextSibling);

    // Lógica al hacer clic
    customBtn.addEventListener("click", () => {
      const currentUrl = window.location.href;
      const slugMatch = currentUrl.match(/\/course\/([^/]+)\//);
      const slug = slugMatch?.[1];
      if (!slug) return;

      const titleElement = document.querySelector('h1[data-purpose="lead-title"]');
      const courseName = titleElement?.textContent.trim() || "Curso sin título";

      const imgElement = document.querySelector('.intro-asset--img-aspect--3gluH img');
      const imageUrl = imgElement?.src || null;

      const payload = {
        name: courseName,
        udemyId: slug,
        urlImage: imageUrl,
      };

      chrome.storage.local.get("token", ({ token }) => {
        if (!token) {
          console.warn("⚠️ No se encontró el token en storage");
          return;
        }

        fetch(`${backendURL}user-courses/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        })
          .then(res => res.json())
          .then(data => {
            console.log("Curso guardado:", data);
            // Redirigir al curso
  showToast("Curso guardado exitosamente");

            setTimeout(() => {
              window.location.href = `https://www.udemy.com/course/${slug}/learn/`;
            }, 1500); // Esperar antes de redirigir
          })
          .catch(err => console.error("Error al guardar curso:", err));
      });
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});


// Iniciar observador en el <body>
observer.observe(document.body, {
  childList: true,
  subtree: true
});





function eliminarCookie(nombre) {
    const dominios = [".udemy.com", "www.udemy.com", "udemy.com"];
    const paths = ["/", "/user", "/", "/home", "/home/my-courses", ""];
  
    dominios.forEach(domain => {
      paths.forEach(path => {
        document.cookie = `${nombre}=; Max-Age=0; path=${path}; domain=${domain};`;
      });
    });
  
    // También intenta sin domain (por si fue creada localmente)
    paths.forEach(path => {
      document.cookie = `${nombre}=; Max-Age=0; path=${path};`;
    });
  
    console.log(`Intento de eliminación para la cookie: ${nombre}`);
  }
  function protegerLogout() {
  const observer = new MutationObserver(() => {
    document.querySelectorAll('a[href^="/user/logout/"]').forEach((logoutLink) => {
      if (logoutLink.dataset.protected === "true") return; // Ya está protegido

      logoutLink.dataset.protected = "true"; // Marcamos como protegido

      logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        console.log("🔒 Logout interceptado. Borrando cookies y token...");

        eliminarCookie("dj_session_id");
        eliminarCookie("access_token");
        eliminarCookie("client_id");

        chrome.storage.local.remove("token", () => {
          console.log("🧹 Token eliminado de chrome.storage.local");
        });

        chrome.storage.local.remove("accountUdemyId", () => {
          console.log("🧹 Account Udemy ID eliminado de chrome.storage.local");
        });

        window.location.reload(); // O redirigir a otra página
      });

      logoutLink.removeAttribute("href"); // Desactiva enlace original
      logoutLink.style.cursor = "pointer";
      logoutLink.title = "Logout bloqueado";
    });
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Prevención si la URL es /logout directamente
  if (window.location.href.includes("/logout")) {
    window.stop();
    window.location.href = "/";
  }
}

protegerLogout();
document.addEventListener('click', function (e) {
    const target = e.target.closest('a');

    if (target && target.target === '_blank') {
        e.preventDefault();
        window.location.href = target.href;
    }
});

window.open = function (url) {
    console.log("Interceptado window.open:", url);
    window.location.href = url;
    return null;
};


function renderMisCursosExternos(cursos = []) {
  const container = document.querySelector('[data-purpose="tab-container"]');
  if (!container) return;

  container.innerHTML = ""; // Limpiar contenido original

  // Crear contenedor wrapper
  const wrapper = document.createElement("div");
  wrapper.style.maxWidth = "1200px";
  wrapper.style.margin = "0 auto"; // centrar
  wrapper.style.padding = "20px";

  // Crear el grid responsivo dentro del wrapper
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(250px, 1fr))";
  grid.style.gap = "20px";
  grid.style.justifyContent = "center";

  // Agregar cada tarjeta
  cursos.forEach(curso => {
    const card = document.createElement("a");
    card.href = `https://www.udemy.com/course/${curso.course.urlCourseUdemy}/learn`;
    card.target = "_blank";

    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.textDecoration = "none";
    card.style.color = "inherit";
    card.style.border = "1px solid #ddd";
    card.style.padding = "10px";
    card.style.borderRadius = "8px";
    card.style.background = "#fff";
    card.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
    card.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";

    card.onmouseover = () => {
      card.style.transform = "scale(1.02)";
      card.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.15)";
    };
    card.onmouseout = () => {
      card.style.transform = "scale(1)";
      card.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
    };

    card.innerHTML = `
      <img src="${curso.course.urlImage}" alt="Curso" style="width: 100%; height: auto; border-radius: 4px; object-fit: cover;" />
      <div style="margin-top: 10px; flex: 1;">
        <h3 style="margin: 10px 0; font-size: 16px; line-height: 1.4; max-height: 3.6em; overflow: hidden; text-overflow: ellipsis;">
          ${curso.course.name}
        </h3>
        <div style="margin-top: 10px; color: white; background: #5624d0; padding: 8px 12px; border-radius: 4px; text-align: center; width: 100%;">
          Start Course
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}



function buscarYRenderizar() {
  chrome.storage.local.get("token", ({ token }) => {
    if (!token) {
      console.warn("Token no encontrado.");
      return;
    }

    fetch(`${backendURL}user-courses/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        renderMisCursosExternos(data.data);
      })
      .catch(err => console.error("Error al cargar cursos:", err));
  });
}

function esperarContenedorYRenderizar() {
  if (window.location.pathname !== "/home/my-courses/lists/") return;

  const observer = new MutationObserver((mutations, obs) => {
   const container = document.querySelector('[data-purpose="tab-container"]');

container.innerHTML = ''; // Borra todo
container.style.backgroundColor = "#fff"; // Fondo blanco

    if (container) {
        console.log(container);
        
      obs.disconnect(); // Deja de observar una vez que aparece
      buscarYRenderizar();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function controlarRecargaUnaVez() {
  const rutaActual = window.location.pathname;

  chrome.storage.local.get("refrescadoListaCursos", ({ refrescadoListaCursos }) => {
    if (rutaActual === "/home/my-courses/lists/") {
      if (!refrescadoListaCursos) {
        console.log("🔁 Página será recargada (primera vez en la ruta)");
        chrome.storage.local.set({ refrescadoListaCursos: true }, () => {
          location.reload();
        });
      } else {
        console.log("✅ Ya recargado anteriormente, no se recargará");
      }
    } else {
      // Si salimos de la ruta, eliminamos la variable
      chrome.storage.local.remove("refrescadoListaCursos", () => {
        console.log("🧹 Variable refrescadoListaCursos eliminada (ya no estamos en la ruta)");
      });
    }
  });
}

// Ejecutarlo al cargar
controlarRecargaUnaVez();

// Si Udemy funciona como SPA (navegación sin recargar), también puedes observar cambios en la URL:
let ultimaRuta = window.location.pathname;
const observerRuta = new MutationObserver(() => {
  const nuevaRuta = window.location.pathname;
  if (nuevaRuta !== ultimaRuta) {
    ultimaRuta = nuevaRuta;
    controlarRecargaUnaVez();
  }
});

observerRuta.observe(document.body, {
  childList: true,
  subtree: true
});


esperarContenedorYRenderizar();



  let TokenCourso= null;
      chrome.storage.local.get('token', (result) => {
  TokenCourso = result.token;

});

function hookearBotonGuardar(btn) {
  if (btn.dataset.hooked === "true") return;
  btn.dataset.hooked = "true";

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const courseCard = btn.closest('.course-list-context-menu');
    if (!courseCard) return;

    const courseContainer = courseCard.querySelector('a[href*="/course/"]');
    const rawUrl = courseContainer?.getAttribute('href') || '';
    const slug = rawUrl.replace(/^\/course\/|\/$/g, '');

    let courseTitle = null;
    if (courseContainer) {
      for (const node of courseContainer.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          courseTitle = node.textContent.trim();
          break;
        }
      }
    }

    const courseImg = courseCard.querySelector('img')?.src;

    const payload = {
      name: courseTitle,
      udemyId: slug,
      urlImage: courseImg
    };

    chrome.storage.local.get("token", ({ token }) => {
      if (!token) {
        console.warn("⚠️ Token no encontrado");
        return;
      }

      fetch(`${backendURL}user-courses/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          console.log("Curso guardado:", data);
          showToast("Curso guardado exitosamente");
          setTimeout(() => {
            window.location.href = `https://www.udemy.com/course/${slug}/learn/`;
          }, 1500);
        })
        .catch(err => {
          console.error("Error al guardar curso:", err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar el curso.'
          });
        });
    });
  });
}

const observerBoton = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;

      // Buscar botones dentro del nodo nuevo
      const nuevosBotones = node.querySelectorAll?.('[data-testid="save-to-list-button"]') || [];

      nuevosBotones.forEach(btn => hookearBotonGuardar(btn));

      // También por si el nodo en sí es el botón
      if (node.matches?.('[data-testid="save-to-list-button"]')) {
        hookearBotonGuardar(node);
      }
    }
  }
});

// Activar el observer
observerBoton.observe(document.body, {
  childList: true,
  subtree: true
});

function showToast(message = "Curso guardado", type = "success") {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = type === "success" ? '#4CAF50' : '#f44336';
  toast.style.color = '#fff';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
  toast.style.zIndex = 9999;
  toast.style.fontSize = '14px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.5s ease';

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.addEventListener('transitionend', () => toast.remove());
  }, 2000);
}

function reemplazarDatos(nombre, correo) {
  const contenedor = document.querySelector(".user-profile-dropdown-module--user-details--gQuWe");
  if (!contenedor) return;

  const nombreDiv = contenedor.querySelector(".ud-heading-md");
  const correoDiv = contenedor.querySelector(".ud-text-xs");

  if (nombreDiv) nombreDiv.textContent = nombre;
  if (correoDiv) correoDiv.textContent = correo;
}

function obtenerYReemplazar() {
  chrome.storage.local.get(["fullName", "email"], (result) => {
    const nombre = result.fullName;
    const correo = result.email;

    if (!nombre || !correo) return;

    reemplazarDatos(nombre, correo);
  });
}

// Crear el observer con nombre personalizado
const perfilObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;

      const contenedor = node.querySelector?.(".user-profile-dropdown-module--user-details--gQuWe") ||
                         node.closest?.(".user-profile-dropdown-module--user-details--gQuWe");

      if (contenedor) {
        console.log("👤 Perfil detectado, reemplazando datos...");
        obtenerYReemplazar();
        return; // solo una vez por mutación
      }
    }
  }
});


// Activar el observer SOLO en áreas donde el perfil puede aparecer (más eficiente que todo el body)
const target = document.querySelector("#u897-popover-trigger--panel--1") || document.body;

perfilObserver.observe(target, {
  childList: true,
  subtree: true
});

// Ejecutar también una vez al inicio por si ya está visible
obtenerYReemplazar();

function crearBarraLateral() {
  if (document.getElementById("barra-extension")) return;

  const barra = document.createElement("div");
  barra.id = "barra-extension";
  barra.innerHTML = `
    <div id="barra-contenido">
      <button id="btn-atras" title="Atrás">←</button>
      <button id="btn-refresh" title="Refrescar">⟳</button>
    </div>
    <div id="barra-toggle" title="Contraer">‹</div>
  `;

  // Estilos de la barra principal
  Object.assign(barra.style, {
    position: "fixed",
    top: "10px",
    left: "10px",
    backgroundColor: "#e0e0e0",
    borderRadius: "8px",
    padding: "6px 8px",
    display: "flex",
    alignItems: "center",
    zIndex: "9999",
    boxShadow: "2px 2px 8px rgba(0,0,0,0.2)",
    transition: "transform 0.3s ease",
  });

  // Estilos del contenido (botones)
  const contenido = barra.querySelector("#barra-contenido");
  Object.assign(contenido.style, {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  });

  // Estilos de botones
  const botones = barra.querySelectorAll("button");
  botones.forEach(btn => {
    Object.assign(btn.style, {
      backgroundColor: "#fff",
      border: "1px solid #ccc",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "16px",
      width: "32px",
      height: "32px",
      padding: "0",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });
  });

  // Flecha de toggle
  const toggle = barra.querySelector("#barra-toggle");
  Object.assign(toggle.style, {
    marginLeft: "10px",
    cursor: "pointer",
    fontSize: "18px",
    userSelect: "none",
  });

  // Funcionalidad botones
  barra.querySelector("#btn-atras").addEventListener("click", () => history.back());
  barra.querySelector("#btn-refresh").addEventListener("click", () => location.reload());

  // Mostrar / ocultar barra
  let expandido = true;
  toggle.addEventListener("click", () => {
    expandido = !expandido;

    if (!expandido) {
      contenido.style.display = "none";
      toggle.textContent = "›"; // hacia la derecha
      toggle.title = "Expandir";
    } else {
      contenido.style.display = "flex";
      toggle.textContent = "‹"; // hacia la izquierda
      toggle.title = "Contraer";
    }
  });

  document.body.appendChild(barra);
}

 crearBarraLateral();

