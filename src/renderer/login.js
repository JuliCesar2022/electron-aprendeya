document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loading = document.getElementById('loading');
  const errorEl = document.getElementById('errorMessage');
  const successEl = document.getElementById('successMessage');

  const showMessage = (type, text) => {
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    if (type === 'error') {
      errorEl.textContent = text;
      errorEl.style.display = 'block';
    } else if (type === 'success') {
      successEl.textContent = text;
      successEl.style.display = 'block';
    }
  };

  const generateUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

  const getDeviceInfo = () => ({
    device_id: generateUUID(),
    user_agent: navigator.userAgent,
    ip_address: "192.168.1.1"
  });

  async function login(email, password) {
    const loginData = {
      email,
      password,
      ...getDeviceInfo()
    };

    const response = await fetch('https://aprendeya-backend.forif.co/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(loginData)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Error ${response.status}`);
    }

    const data = await response.json();
    const { token, id, email: userEmail, fullname } = data;

    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', id);
    localStorage.setItem('userEmail', userEmail);
    localStorage.setItem('userFullname', fullname);
    localStorage.setItem('userData', JSON.stringify({ ...data, loginTime: new Date().toISOString() }));

    return token;
  }

  async function getOptimalAccount(token) {
    const response = await fetch('https://aprendeya-backend.forif.co/api/v1/udemy-accounts/optimal-account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Cuenta no disponible');

    const account = await response.json();
    localStorage.setItem('udemyAccount', JSON.stringify(account));
const userEmail = localStorage.getItem('userEmail');
const userFullname = localStorage.getItem('userFullname');

    if (window.electronAPI) {
      await window.electronAPI.invoke('set-cookies', [
        { name: 'access_token', value: account.accessToken, domain: '.udemy.com', path: '/', secure: true },
        { name: 'dj_session_id', value: account.dj_session_id, domain: '.udemy.com', path: '/', secure: true, httpOnly: true },
        { name: 'client_id', value: account.client_id, domain: '.udemy.com', path: '/', secure: true },
        { name: 'auth_token', value: token, domain: '.udemy.com', path: '/', secure: false },
        {name: 'user_email', value: userEmail || '', domain: '.udemy.com', path: '/', secure: false},
        {name: 'user_fullname',value: encodeURIComponent(userFullname || ''),domain: '.udemy.com',path: '/',secure: false}
      ]);
    }

    return account;
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
      return showMessage('error', 'Completa todos los campos');
    }

    loginBtn.disabled = true;
    loading.style.display = 'block';
    showMessage('', '');

    try {
      const token = await login(email, password);
      showMessage('success', 'Login exitoso. Configurando Udemy...');
      await getOptimalAccount(token);
      showMessage('success', 'Redirigiendo a Udemy...');
      setTimeout(() => goToUdemy(), 1500);
    } catch (err) {
      showMessage('error', err.message || 'Error inesperado');
    } finally {
      loginBtn.disabled = false;
      loading.style.display = 'none';
    }
  }

   function goToUdemy() {
            if (window.electronAPI) {
                window.electronAPI.send('go-to-udemy', 'https://www.udemy.com/');
            } else {
                // Fallback para testing en navegador
                window.location.href = 'https://www.udemy.com/';
            }
        }

  // EVENT LISTENERS
  loginForm.addEventListener('submit', handleLoginSubmit);
  document.getElementById('back-button').addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.send('go-to-home');
    } else {
      window.location.href = 'index.html';
    }
  });

  document.querySelector('.demo-credentials').addEventListener('click', () => {
    document.getElementById('email').value = 'admin@forif.com';
    document.getElementById('password').value = 'string';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('back-button').click();
    }
  });
});
