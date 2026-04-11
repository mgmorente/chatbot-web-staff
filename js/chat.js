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
            const shareBtn = document.createElement('span');
            shareBtn.className = 'message-share-btn';
            shareBtn.title = 'Compartir';
            shareBtn.innerHTML = '<i class="bi bi-share"></i>';
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openShareMenu(shareBtn, textDiv);
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
function closeAllShareMenus() {
    document.querySelectorAll('.share-menu').forEach(m => m.remove());
}

function openShareMenu(shareBtn, textDiv) {
    // Si ya hay un menú abierto, cerrarlo
    const existing = textDiv.querySelector('.share-menu');
    if (existing) { existing.remove(); return; }
    closeAllShareMenus();

    const menu = document.createElement('div');
    menu.className = 'share-menu';
    menu.innerHTML = `
        <div class="share-menu-item" data-channel="whatsapp"><i class="bi bi-whatsapp"></i> WhatsApp</div>
        <div class="share-menu-item" data-channel="email"><i class="bi bi-envelope"></i> Email</div>
    `;

    // Posicionar el menú junto al footer
    const footer = textDiv.querySelector('.message-footer');
    footer.style.position = 'relative';
    footer.appendChild(menu);

    // Click handlers para cada opción
    menu.querySelectorAll('.share-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const channel = item.dataset.channel;
            item.innerHTML = '<i class="bi bi-hourglass-split"></i> Generando...';
            item.style.pointerEvents = 'none';
            doShare(channel, textDiv);
        });
    });

    // Cerrar al tocar fuera
    const closeHandler = (e) => {
        if (!menu.contains(e.target) && !shareBtn.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 50);
}

async function doShare(channel, textDiv) {
    try {
        // Clonar el contenido limpio
        const clone = textDiv.cloneNode(true);
        clone.querySelectorAll('.message-footer, .share-menu, .message-share-btn, button, input, select, textarea').forEach(el => el.remove());
        clone.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));

        // Wrapper para la captura
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'padding:16px 20px; background:#fff; font-family:Inter,sans-serif; min-width:320px; max-width:500px; position:fixed; left:-9999px; top:0;';

        // Cabecera
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #e5e7eb;';
        const dateStr = new Date().toLocaleDateString('es-ES');
        const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        header.innerHTML = '<span style="font-weight:700; color:#1a8d4f; font-size:13px;">PACCMAN STAFF</span>'
            + '<span style="font-size:10px; color:#999; margin-left:auto;">' + dateStr + ' · ' + timeStr + '</span>';
        wrapper.appendChild(header);
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        // Capturar imagen
        const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
        document.body.removeChild(wrapper);

        const dataUrl = canvas.toDataURL('image/png');

        // Intentar Web Share API nativa (móvil)
        if (channel !== 'download') {
            try {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const file = new File([blob], 'paccman_info.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Información GRUPO PACC' });
                    closeAllShareMenus();
                    return;
                }
            } catch (_) { /* fallback */ }
        }

        // Descargar imagen
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'paccman_' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Abrir app destino
        if (channel === 'whatsapp') {
            setTimeout(() => window.open('https://wa.me/', '_blank'), 600);
        } else if (channel === 'email') {
            setTimeout(() => window.open('mailto:?subject=' + encodeURIComponent('Información GRUPO PACC') + '&body=' + encodeURIComponent('Adjunto imagen con la información.')), 600);
        }

    } catch (err) {
        console.error('Error compartiendo:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar la imagen', timer: 2000, showConfirmButton: false });
    }

    closeAllShareMenus();
}
