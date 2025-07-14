class AuthManager {
  constructor() {
    this.storageKeys = {
      authToken: 'authToken',
      userId: 'userId',
      userEmail: 'userEmail',
      userFullname: 'userFullname',
      userData: 'userData',
      udemyAccount: 'udemyAccount'
    };
  }

  isAuthenticated() {
    const token = this.getToken();
    return token && !this.isTokenExpired();
  }

  getToken() {
    return localStorage.getItem(this.storageKeys.authToken);
  }

  getUserData() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKeys.userData));
    } catch {
      return null;
    }
  }

  getUserInfo() {
    const data = this.getUserData();
    return data ? {
      id: data.id,
      email: data.email,
      fullname: data.fullname,
      loginTime: data.loginTime
    } : {};
  }

  getUdemyAccount() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKeys.udemyAccount));
    } catch {
      return null;
    }
  }

  logout() {
    Object.values(this.storageKeys).forEach(localStorage.removeItem.bind(localStorage));
    console.log("🚪 Sesión cerrada");
  }

  isTokenExpired() {
    const data = this.getUserData();
    if (!data?.loginTime) return true;
    const hours = (new Date() - new Date(data.loginTime)) / 1000 / 60 / 60;
    return hours > 24;
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
}

window.authManager = new AuthManager();
