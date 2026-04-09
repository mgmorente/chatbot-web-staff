// header.js
import { getSelectedClient, getUser } from './storage.js';
import { addMessageToChat } from './chat.js';

export function updateHeaderClient() {
    // mensaje inicial
    if (!document.getElementById('chat-box').innerHTML.trim()) {
        addMessageToChat('bot', '¡Hola! Soy tu asistente virtual, <a href="#" class="change-client">selecciona un cliente</a> y pregúntame lo que necesites.');
    }
    // usuario
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = getUser() || '';

    // cliente
    const clienteNombre = getSelectedClient();
    const selectedEl = document.getElementById('selected-client');
    if (!selectedEl) return;

    if (clienteNombre) {
        selectedEl.textContent = clienteNombre;
        document.getElementById('chat-box').innerHTML = '';
        addMessageToChat('bot', `Ha seleccionado un nuevo cliente: <strong>${clienteNombre}</strong>`);
    } else {
        selectedEl.textContent = 'Sin seleccionar';
    }
}
