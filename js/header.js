// header.js
import { getClientes, getSelectedClient } from './storage.js';

export function updateHeaderClient() {
    const clienteNombre = getSelectedClient();
    const selectedEl = document.getElementById('selected-client');
    
    if (!clienteNombre || !selectedEl) return;

    if (clienteNombre) selectedEl.textContent = clienteNombre;
    else selectedEl.textContent = '';
}
