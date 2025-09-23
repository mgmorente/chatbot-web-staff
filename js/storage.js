// storage.js
export function getStoredToken() {
    try {
        const token = localStorage.getItem('userToken');
        const expiry = parseInt(localStorage.getItem('userTokenExpiry'), 10);
        if (!token || !expiry) return null;
        return { token, expiry };
    } catch {
        return null;
    }
}

export function storeToken(token, duration) {
    localStorage.setItem('userToken', token);
    localStorage.setItem('userTokenExpiry', (Date.now() + duration).toString());
}

export function clearStoredToken() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userTokenExpiry');
}

export function storeClientes(clientes) {
    localStorage.setItem('clientes', JSON.stringify(clientes));
}

export function getClientes() {
    return JSON.parse(localStorage.getItem('clientes')) || [];
}

export function storeSelectedClient(id) {
    localStorage.setItem('selectedClient', id);
}

export function getSelectedClient() {
    return localStorage.getItem('selectedClient') || '';
}
