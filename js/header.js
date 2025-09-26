// header.js
import { getClientes, getSelectedClient } from './storage.js';
import { addMessageToChat } from './chat.js';

export function updateHeaderClient() {
    const clienteNombre = getSelectedClient();
    const selectedEl = document.getElementById('selected-client');
    
    if (!clienteNombre || !selectedEl) return;

    if (clienteNombre) {
        selectedEl.textContent = clienteNombre;
        document.getElementById('chat-box').innerHTML = '';
        addMessageToChat('bot', `Ha seleccionado un nuevo cliente: ${clienteNombre}`);
    }    
    else selectedEl.textContent = '';
}
