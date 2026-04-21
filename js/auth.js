import { storeToken } from './storage.js';
import { storeClientesList } from './clientes.js';
import { storeCompaniasList } from './companias.js';
import { storeDescriptoresList } from './descriptores.js';

// auth.js
export function storeUser(user) {
    if (user) {
        localStorage.setItem('user', user.name);
        const el = document.getElementById('user-name');
        if (el) el.innerHTML = user.name;
        const dockEl = document.getElementById('action-dock-user-name');
        if (dockEl) dockEl.textContent = user.name;
        const dockBox = document.getElementById('action-dock-user');
        if (dockBox) {
            dockBox.classList.remove('is-hidden');
            dockBox.setAttribute('aria-hidden', 'false');
        }
    }
}

export async function handleLogin(usuario_pacc, password) {

    const SESSION_DURATION = 2 * 60 * 60 * 1000;

    const response = await fetch(`${ENV.API_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Empresa': 'pacc',
            'Device': 'web'
        },
        body: JSON.stringify({ usuario_pacc, password }),
    });

    // Parsear el JSON
    const data = await response.json();

    if (data.access_token) {
        storeToken(data.access_token, SESSION_DURATION);
        await storeClientesList();
        await storeCompaniasList();
        await storeDescriptoresList();
        storeUser(data.user);
        return true;
    } else {
        throw new Error(data.error || 'Error al autenticar');
    }

}

