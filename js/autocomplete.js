// autocomplete.js — Sugerencias predefinidas al escribir (estilo chatbot-web cliente)
// Cada sugerencia tiene un command que se ejecuta directamente (no va al backend)

const suggestions = [
    // Cliente
    { icon: 'bi-person-vcard',        text: 'Consultar ficha del cliente',          command: 'consultar_cliente',    keywords: ['cliente', 'ficha', 'datos', 'consultar', 'ver', 'informacion', 'persona'] },
    { icon: 'bi-pencil',              text: 'Modificar datos del cliente',           command: 'actualizar_cliente',   keywords: ['modificar', 'cambiar', 'actualizar', 'editar', 'datos', 'email', 'movil', 'telefono', 'cliente', 'direccion'] },
    { icon: 'bi-arrow-repeat',        text: 'Cambiar de cliente',                   command: 'cambiar_cliente',      keywords: ['cambiar', 'otro', 'seleccionar', 'cliente', 'buscar', 'nuevo'] },
    { icon: 'bi-arrow-clockwise',     text: 'Recargar datos del cliente',           command: 'recargar_cliente',     keywords: ['recargar', 'refrescar', 'actualizar', 'datos', 'cliente'] },

    // Pólizas
    { icon: 'bi-shield-check',        text: 'Consultar pólizas activas',            command: 'consultar_poliza',     keywords: ['poliza', 'polizas', 'seguro', 'seguros', 'activa', 'contrato', 'consultar', 'ver'] },
    { icon: 'bi-files',               text: 'Descargar duplicado de póliza',        command: 'duplicado_poliza',     keywords: ['duplicado', 'copia', 'descargar', 'pdf', 'poliza', 'documento', 'imprimir'] },
    { icon: 'bi-wallet2',             text: 'Enviar wallet de póliza',              command: 'wallet_poliza',        keywords: ['wallet', 'tarjeta', 'enviar', 'movil', 'apple', 'google', 'poliza'] },

    // Recibos
    { icon: 'bi-receipt',             text: 'Consultar recibos del cliente',         command: 'consultar_recibo',     keywords: ['recibo', 'recibos', 'pago', 'pagos', 'pendiente', 'cuota', 'cliente', 'consultar', 'factura'] },

    // Siniestros
    { icon: 'bi-exclamation-triangle', text: 'Consultar siniestros abiertos',       command: 'consultar_siniestro',  keywords: ['siniestro', 'siniestros', 'abierto', 'parte', 'accidente', 'consultar', 'ver'] },
    { icon: 'bi-plus-circle',         text: 'Registrar un presiniestro',            command: 'registrar_siniestro',  keywords: ['registrar', 'nuevo', 'presiniestro', 'alta', 'abrir', 'declarar', 'siniestro', 'parte'] },

    // Documentos
    { icon: 'bi-folder',              text: 'Consultar documentos del cliente',      command: 'consultar_documento',  keywords: ['documento', 'documentos', 'archivo', 'adjunto', 'fichero', 'consultar', 'cliente', 'ver'] },
    { icon: 'bi-upload',              text: 'Subir un documento',                   command: 'registrar_documento',  keywords: ['subir', 'upload', 'adjuntar', 'cargar', 'documento', 'archivo', 'fichero'] },

    // Agenda
    { icon: 'bi-calendar3',           text: 'Consultar agenda del cliente',          command: 'consultar_agenda',     keywords: ['agenda', 'cita', 'citas', 'calendario', 'reunion', 'cliente', 'consultar'] },
    { icon: 'bi-calendar-plus',       text: 'Crear nueva cita en agenda',           command: 'registrar_agenda',     keywords: ['nueva', 'cita', 'crear', 'agendar', 'programar', 'agenda', 'cliente', 'registrar'] },

    // Compañías
    { icon: 'bi-telephone',           text: 'Consultar teléfonos de compañías',     command: 'consultar_compania',   keywords: ['telefono', 'telefonos', 'compania', 'companias', 'asistencia', 'contacto', 'llamar', 'aseguradora', 'numero'] },

    // Pagos
    { icon: 'bi-cash-stack',          text: 'Resumen de pagos del cliente',         command: 'resumen_pagos',        keywords: ['paga', 'pago', 'pagos', 'cuanto', 'prima', 'primas', 'coste', 'precio', 'seguro', 'seguros', 'resumen', 'anual', 'total'] },

    // Tarificación
    { icon: 'bi-heart-pulse',         text: 'Tarificar seguro de salud',            command: 'cotizar_salud',        keywords: ['cotizar', 'cotizacion', 'tarificar', 'tarificacion', 'tarifa', 'salud', 'medico', 'sanitario', 'asisa', 'adeslas', 'gerenpiacc', 'prima', 'precio', 'presupuesto', 'calcular'] },

    // Recordatorios
    { icon: 'bi-bookmark-star',       text: 'Ver recordatorios del cliente',        command: 'consultar_recordatorio', keywords: ['recordatorio', 'recordatorios', 'recuerda', 'recuerdame', 'apunte', 'apuntes', 'nota', 'notas', 'tareas', 'pendiente', 'pendientes', 'ver', 'consultar'] },
    { icon: 'bi-bookmark-plus',       text: 'Nuevo recordatorio del cliente',       command: 'registrar_recordatorio', keywords: ['recordatorio', 'nuevo', 'nueva', 'crear', 'anadir', 'apuntar', 'apunta', 'anota', 'anotar', 'recordar', 'recuerdame', 'nota', 'tarea', 'pendiente'] },

    // Comunicación
    { icon: 'bi-envelope',            text: 'Enviar email al cliente',              command: 'enviar_email',         keywords: ['email', 'correo', 'enviar', 'mail', 'mensaje', 'cliente', 'carta', 'comunicacion'] },

    // Utilidades (comandos locales especiales)
    { icon: 'bi-clock-history',       text: 'Ver clientes recientes',               command: '_recientes',           keywords: ['reciente', 'recientes', 'historial', 'ultimo', 'anteriores'] },
    { icon: 'bi-question-circle',     text: 'Ver funcionalidades disponibles',      command: '_help',                keywords: ['ayuda', 'help', 'funcionalidades', 'que puedo', 'opciones', 'que tienes', 'que haces', 'que sabes', 'para que sirves', 'como funciona', 'menu'] },
];

let _el = null;
let _selected = -1;
let _visible = [];
let _composing = false;
let _chatInput = null;
let _onSelect = null; // callback: (text, command) => {}

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

    // Comandos que dependen de Outlook (agenda + email): deshabilitados si no está disponible
    const agendaCommands = ['consultar_agenda', 'registrar_agenda', 'enviar_email', 'enviar_email_cliente'];

    const scored = suggestions.map(s => {
        // Ocultar opciones de agenda si no está disponible
        if (agendaCommands.includes(s.command) && !window._agendaDisponible) return { ...s, score: 0 };

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
            // En móvil real, entre pointerdown y el click "fantasma" que
            // dispara el navegador puede pasar ~300-700 ms si el usuario
            // mantiene el dedo. Marcamos ya la ventana de apertura para
            // que el handler global "clic fuera = cerrar drawer" no
            // cierre la ficha que acaba de abrir este select.
            if (item.command === 'consultar_cliente' || item.command === 'recargar_cliente') {
                window.__fcsJustOpenedAt = Date.now();
            }
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
    } else if (e.key === 'Enter') {
        if (_selected >= 0) {
            e.preventDefault();
            e.stopImmediatePropagation();
            selectItem(_selected);
        } else {
            // Enter sin sugerencia seleccionada: dejar que el form envíe,
            // pero ocultar el desplegable (en Windows el input mantiene foco
            // y no dispara blur, así que las sugerencias se quedaban visibles).
            hide();
        }
    } else if (e.key === 'Escape') {
        hide();
    }
}

function selectItem(index) {
    const item = _visible[index];
    if (!item) return;
    _chatInput.value = '';
    hide();
    _chatInput.focus();
    // Ejecutar comando directamente
    if (_onSelect) _onSelect(item.text, item.command);
}

function hide() {
    if (_el) _el.classList.add('hidden');
    _selected = -1;
    _visible = [];
}

export function initAutocomplete(chatInput, onSelect) {
    _chatInput = chatInput;
    _onSelect = onSelect;

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

    // Al enviar el formulario (Enter o botón "enviar") ocultar siempre el
    // desplegable. En Windows el input conserva el foco, por lo que sin esto
    // las sugerencias se quedaban visibles.
    const parentForm = chatInput.form || chatInput.closest('form');
    if (parentForm) {
        parentForm.addEventListener('submit', () => hide());
    }
}
