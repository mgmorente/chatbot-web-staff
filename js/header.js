// header.js
import { getSelectedClient, getUser } from './storage.js';
import { addMessageToChat } from './chat.js';

export function updateHeaderClient() {
    // mensaje inicial
    if (!document.getElementById('chat-box').innerHTML.trim()) {
        addMessageToChat('bot', '¡Hola! Soy tu asistente virtual, <a href="#" class="change-client">selecciona un cliente</a> y pregúntame lo que necesites.');
    }
    // usuario
    const user = getUser() || '';
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = user;
    // Replicar el nombre en el chip del action-dock (menu flotante inferior)
    const dockUserNameEl = document.getElementById('action-dock-user-name');
    if (dockUserNameEl) dockUserNameEl.textContent = user;
    const dockUserBox = document.getElementById('action-dock-user');
    if (dockUserBox) {
        if (user) {
            dockUserBox.classList.remove('is-hidden');
            dockUserBox.setAttribute('aria-hidden', 'false');
        } else {
            dockUserBox.classList.add('is-hidden');
            dockUserBox.setAttribute('aria-hidden', 'true');
        }
    }

    // cliente
    const clienteNombre = getSelectedClient();
    const selectedEl = document.getElementById('selected-client');
    if (!selectedEl) return;

    if (clienteNombre) {
        selectedEl.textContent = clienteNombre;
        // Limpiamos el chat al cambiar de cliente, pero NO mostramos mensaje
        // de bienvenida — la información del cliente aparece en la ficha lateral.
        document.getElementById('chat-box').innerHTML = '';
    } else {
        selectedEl.textContent = 'Sin seleccionar';
    }
}
