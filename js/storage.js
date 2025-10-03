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
    localStorage.removeItem('clienteData');
    localStorage.removeItem('clientes');
    localStorage.removeItem('user');
    localStorage.removeItem('descriptores');
    localStorage.removeItem('companias');
    localStorage.removeItem('clienteAgenda');
}

export function storeClientes(clientes) {
    localStorage.setItem('clientes', JSON.stringify(clientes));
}

export function getClientes() {
    return JSON.parse(localStorage.getItem('clientes')) || [];
}

export function getCompanias() {
    return JSON.parse(localStorage.getItem('companias')) || [];
}

export function getAgenda() {
    return JSON.parse(localStorage.getItem('clienteAgenda')) || [];
}

export function getSelectedClient() {
    return localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')).cliente.nombre : null;
}

export function getUser() {
    return localStorage.getItem('user') ? localStorage.getItem('user') : null;
}
