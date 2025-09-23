// header.js
import { getClientes, getSelectedClient } from './storage.js';

export function updateHeaderClient() {
    const clientId = getSelectedClient();
    const selectedEl = document.getElementById('selected-client');
    if (!clientId || !selectedEl) return;

    const cliente = getClientes().find(c => c.nif === clientId);
    if (cliente) selectedEl.textContent = `${cliente.nombre}`;
    else selectedEl.textContent = '';
}
