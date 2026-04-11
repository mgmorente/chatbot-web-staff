// chat.js
export function addMessageToChat(type, message, thinking = false) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    if (thinking) messageDiv.classList.add('thinking');

    const textDiv = document.createElement('div');
    textDiv.classList.add('text');
    if (type === 'bot') textDiv.classList.add('w-100');
    textDiv.innerHTML = message;

    // Hora del mensaje y botón compartir (no en thinking)
    if (!thinking) {
        const footer = document.createElement('div');
        footer.className = 'message-footer';

        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        footer.appendChild(time);

        if (type === 'bot') {
            const shareBtn = document.createElement('button');
            shareBtn.className = 'message-share-btn';
            shareBtn.title = 'Compartir';
            shareBtn.innerHTML = '<i class="bi bi-share"></i>';
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleShareMenu(shareBtn, textDiv);
            });
            footer.appendChild(shareBtn);
        }

        textDiv.appendChild(footer);
    }

    messageDiv.appendChild(textDiv);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageDiv;
}

export function addThinkingMessage() {
    const thinkingHTML = `
        <div id="loading" class="d-flex align-items-center">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>`;
    addMessageToChat('bot', thinkingHTML, true);
}

export function removeThinkingMessage() {
    document.querySelectorAll('.thinking').forEach(el => el.remove());
}

export function showApiError(msg) {
    const errorDiv = document.getElementById('api-errors');
    errorDiv.textContent = msg;
    errorDiv.classList.remove('d-none');
}

export function clearApiError() {
    const errorDiv = document.getElementById('api-errors');
    if (!errorDiv.classList.contains('d-none')) {
        errorDiv.classList.add('d-none');
    }
}

// --- Compartir mensaje ---
let activeShareMenu = null;

function getMessageText(textDiv) {
    const clone = textDiv.cloneNode(true);
    // Eliminar elementos no deseados
    clone.querySelectorAll('.message-footer, .message-share-btn, .share-menu, button, input, select, .message-time, .timeline-dot').forEach(el => el.remove());

    // Añadir separadores antes de procesar
    clone.querySelectorAll('.data-panel__header').forEach(el => { el.prepend('\n━━━ '); el.append(' ━━━\n'); });
    clone.querySelectorAll('.data-card').forEach(el => el.prepend('\n'));
    clone.querySelectorAll('.data-card__sep').forEach(el => el.textContent = ' · ');
    clone.querySelectorAll('.data-card__meta span').forEach(el => el.prepend(' | '));
    clone.querySelectorAll('.data-card__count, .data-panel__count').forEach(el => { el.prepend('('); el.append(')'); });
    clone.querySelectorAll('.timeline-item').forEach(el => el.prepend('\n  ▸ '));
    clone.querySelectorAll('.inline-form-summary div').forEach(el => el.prepend('\n  • '));

    const raw = (clone.innerText || clone.textContent || '');

    // Limpiar espacios múltiples y líneas vacías excesivas
    return raw
        .replace(/[ \t]+/g, ' ')           // múltiples espacios → uno
        .replace(/ ?\n ?/g, '\n')           // espacios alrededor de saltos
        .replace(/\n{3,}/g, '\n\n')         // máximo 2 saltos seguidos
        .trim();
}

function toggleShareMenu(btn, textDiv) {
    // Cerrar menú activo si existe
    if (activeShareMenu) {
        activeShareMenu.remove();
        if (activeShareMenu._btn === btn) { activeShareMenu = null; return; }
        activeShareMenu = null;
    }

    const menu = document.createElement('div');
    menu.className = 'share-menu';
    menu._btn = btn;
    menu.innerHTML = `
        <button class="share-menu-item" data-channel="whatsapp">
            <i class="bi bi-whatsapp"></i> WhatsApp
        </button>
        <button class="share-menu-item" data-channel="email">
            <i class="bi bi-envelope"></i> Email
        </button>
        <button class="share-menu-item" data-channel="copy">
            <i class="bi bi-clipboard"></i> Copiar texto
        </button>
    `;

    btn.parentElement.appendChild(menu);
    activeShareMenu = menu;

    menu.addEventListener('click', (e) => {
        const item = e.target.closest('.share-menu-item');
        if (!item) return;

        const text = getMessageText(textDiv);
        const channel = item.dataset.channel;

        if (channel === 'whatsapp') {
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        } else if (channel === 'email') {
            const subject = encodeURIComponent('Información GRUPO PACC');
            const body = encodeURIComponent(text);
            window.open(`mailto:?subject=${subject}&body=${body}`);
        } else if (channel === 'copy') {
            navigator.clipboard.writeText(text).then(() => {
                item.innerHTML = '<i class="bi bi-check-lg"></i> Copiado';
                setTimeout(() => { item.innerHTML = '<i class="bi bi-clipboard"></i> Copiar texto'; }, 1500);
            });
            return; // no cerrar menú al copiar
        }

        menu.remove();
        activeShareMenu = null;
    });
}

// Cerrar menú al clic fuera
document.addEventListener('click', (e) => {
    if (activeShareMenu && !activeShareMenu.contains(e.target) && !e.target.closest('.message-share-btn')) {
        activeShareMenu.remove();
        activeShareMenu = null;
    }
});
