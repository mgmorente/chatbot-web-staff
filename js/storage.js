// storage.js

// Utilidad segura para parsear JSON de localStorage
export function safeGetJSON(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

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

// --- Historial de clientes recientes ---
const MAX_RECIENTES = 8;

export function addClienteReciente(nif, nombre) {
    let recientes = safeGetJSON('clientesRecientes', []);
    // Quitar si ya existe
    recientes = recientes.filter(r => r.nif !== nif);
    // Añadir al principio
    recientes.unshift({ nif, nombre, timestamp: Date.now() });
    // Limitar
    if (recientes.length > MAX_RECIENTES) recientes = recientes.slice(0, MAX_RECIENTES);
    localStorage.setItem('clientesRecientes', JSON.stringify(recientes));
}

export function getClientesRecientes() {
    return safeGetJSON('clientesRecientes', []);
}
