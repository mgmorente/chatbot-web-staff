// autocomplete.js — Sugerencias predefinidas al escribir (estilo chatbot-web cliente)

const suggestions = [
    // Cliente
    { icon: 'bi-person-vcard',        text: 'Consultar ficha del cliente',          keywords: ['cliente', 'ficha', 'datos', 'consultar', 'ver', 'informacion'] },
    { icon: 'bi-pencil',              text: 'Modificar datos del cliente',           keywords: ['modificar', 'cambiar', 'actualizar', 'editar', 'datos', 'email', 'movil', 'telefono'] },
    { icon: 'bi-arrow-repeat',        text: 'Cambiar de cliente',                   keywords: ['cambiar', 'otro', 'seleccionar', 'cliente', 'buscar'] },
    { icon: 'bi-arrow-clockwise',     text: 'Recargar datos del cliente',           keywords: ['recargar', 'refrescar', 'actualizar', 'datos'] },

    // Pólizas
    { icon: 'bi-shield-check',        text: 'Consultar pólizas activas',            keywords: ['poliza', 'polizas', 'seguro', 'seguros', 'activa', 'contrato'] },
    { icon: 'bi-files',               text: 'Descargar duplicado de póliza',        keywords: ['duplicado', 'copia', 'descargar', 'pdf', 'poliza', 'documento'] },
    { icon: 'bi-wallet2',             text: 'Enviar wallet de póliza',              keywords: ['wallet', 'tarjeta', 'enviar', 'movil', 'apple', 'google'] },

    // Recibos
    { icon: 'bi-receipt',             text: 'Consultar recibos del cliente',         keywords: ['recibo', 'recibos', 'pago', 'pagos', 'pendiente', 'cuota'] },

    // Siniestros
    { icon: 'bi-exclamation-triangle', text: 'Consultar siniestros abiertos',       keywords: ['siniestro', 'siniestros', 'abierto', 'parte', 'accidente'] },
    { icon: 'bi-plus-circle',         text: 'Registrar un presiniestro',            keywords: ['registrar', 'nuevo', 'presiniestro', 'alta', 'abrir', 'declarar'] },

    // Documentos
    { icon: 'bi-folder',              text: 'Consultar documentos del cliente',      keywords: ['documento', 'documentos', 'archivo', 'adjunto', 'fichero'] },
    { icon: 'bi-upload',              text: 'Subir un documento',                   keywords: ['subir', 'upload', 'adjuntar', 'cargar', 'documento', 'archivo'] },

    // Agenda
    { icon: 'bi-calendar3',           text: 'Consultar agenda del cliente',          keywords: ['agenda', 'cita', 'citas', 'calendario', 'reunion'] },
    { icon: 'bi-calendar-plus',       text: 'Crear nueva cita en agenda',           keywords: ['nueva', 'cita', 'crear', 'agendar', 'programar'] },

    // Compañías
    { icon: 'bi-telephone',           text: 'Consultar teléfonos de compañías',     keywords: ['telefono', 'telefonos', 'compania', 'companias', 'asistencia', 'contacto', 'llamar'] },

    // Comunicación
    { icon: 'bi-envelope',            text: 'Enviar email al cliente',              keywords: ['email', 'correo', 'enviar', 'mail', 'mensaje'] },

    // Utilidades
    { icon: 'bi-clock-history',       text: 'Ver clientes recientes',               keywords: ['reciente', 'recientes', 'historial', 'ultimo', 'anteriores'] },
    { icon: 'bi-question-circle',     text: 'Ver funcionalidades disponibles',      keywords: ['ayuda', 'help', 'funcionalidades', 'que puedo', 'opciones'] },
];

let _el = null;
let _selected = -1;
let _visible = [];
let _composing = false;
let _chatInput = null;
let _onSend = null; // callback to send message

function normalize(text) {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[¿?¡!.,;:]/g, '')
        .trim();
}

function onInput() {
    const raw = _chatInput.value.trim();
    if (raw.length < 2) { hide(); return; }

    const query = normalize(raw);
    const words = query.split(/\s+/);

    const scored = suggestions.map(s => {
        let score = 0;
        const normalText = normalize(s.text);

        // Direct text match (highest)
        if (normalText.includes(query)) score += 10;

        // Keyword matches
        for (const word of words) {
            if (word.length < 2) continue;
            for (const kw of s.keywords) {
                if (kw.includes(word) || word.includes(kw)) score += 3;
            }
            if (normalText.includes(word)) score += 2;
        }
        return { ...s, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

    if (scored.length === 0) { hide(); return; }

    _visible = scored;
    _selected = -1;
    render();
}

function render() {
    _el.innerHTML = '';
    _visible.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item' + (i === _selected ? ' selected' : '');
        div.innerHTML = `<i class="bi ${item.icon}"></i><span>${item.text}</span>`;
        div.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            selectItem(i);
        });
        div.addEventListener('mouseenter', () => {
            _selected = i;
            highlightSelected();
        });
        _el.appendChild(div);
    });
    _el.classList.remove('hidden');
}

function highlightSelected() {
    _el.querySelectorAll('.autocomplete-item').forEach((el, i) => {
        el.classList.toggle('selected', i === _selected);
    });
}

function onKeydown(e) {
    if (_el.classList.contains('hidden') || _visible.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        _selected = Math.min(_selected + 1, _visible.length - 1);
        highlightSelected();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _selected = Math.max(_selected - 1, 0);
        highlightSelected();
    } else if (e.key === 'Enter' && _selected >= 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        selectItem(_selected);
    } else if (e.key === 'Escape') {
        hide();
    }
}

function selectItem(index) {
    const item = _visible[index];
    if (!item) return;
    _chatInput.value = item.text;
    hide();
    _chatInput.focus();
    // Auto-send
    if (_onSend) _onSend(item.text);
}

function hide() {
    if (_el) _el.classList.add('hidden');
    _selected = -1;
    _visible = [];
}

export function initAutocomplete(chatInput, onSend) {
    _chatInput = chatInput;
    _onSend = onSend;

    // Create dropdown container
    _el = document.createElement('div');
    _el.className = 'autocomplete-dropdown hidden';
    _el.id = 'autocomplete-dropdown';

    // Insert before input-wrapper inside chat-input-area
    const inputArea = chatInput.closest('.chat-input-area');
    inputArea.insertBefore(_el, inputArea.firstChild);

    // IME composition (Android keyboards)
    chatInput.addEventListener('compositionstart', () => { _composing = true; });
    chatInput.addEventListener('compositionend', () => {
        _composing = false;
        onInput();
    });

    chatInput.addEventListener('input', () => {
        if (!_composing) onInput();
    });
    chatInput.addEventListener('keydown', (e) => onKeydown(e));
    chatInput.addEventListener('blur', () => {
        setTimeout(() => hide(), 300);
    });
    chatInput.addEventListener('focus', () => {
        if (chatInput.value.trim().length >= 2) onInput();
    });
}
