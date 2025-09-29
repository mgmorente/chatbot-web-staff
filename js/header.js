// header.js
import { getSelectedClient, getUser } from './storage.js';
import { addMessageToChat } from './chat.js';

export function updateHeaderClient() {
    // mensaje inicial
    if (!document.getElementById('chat-box').innerHTML.trim()) {
        addMessageToChat('bot', '¡Hola! Soy tu asistente virtual, <a href="#" class="change-client">selecciona un cliente</a> y preguntame lo que necesites.');
    }
    // usuario
    document.getElementById('user-name').innerHTML = getUser();
    // cliente
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
