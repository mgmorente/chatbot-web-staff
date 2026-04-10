// forms.js — Formularios inline en el chat (sin modales)
import { addMessageToChat } from './chat.js';
import { showLoading } from './utils.js';
import { getStoredToken } from './storage.js';


function getToken() {
    const td = getStoredToken();
    return td?.token || '';
}

function getClienteData() {
    return JSON.parse(localStorage.getItem('clienteData') || 'null');
}

/** Cierra/desactiva formularios inline previos que sigan abiertos */
function closePreviousForms() {
    document.querySelectorAll('.chat-inline-form').forEach(f => {
        // Si ya fue completado (tiene success), no tocar
        if (f.querySelector('.inline-form-success')) return;
        // Destruir flatpickrs abiertos
        f.querySelectorAll('.js-flatpickr, .js-flatpickr-datetime').forEach(inp => {
            if (inp._flatpickr) inp._flatpickr.destroy();
        });
        f.innerHTML = `<div class="inline-form-cancelled"><i class="bi bi-x-circle"></i> Formulario cancelado</div>`;
    });
}

// ===== MODIFICAR CLIENTE =====
export function renderModClienteInline() {
    closePreviousForms();
    const data = getClienteData();
    if (!data?.cliente) return;

    const html = `
        <div class="chat-inline-form">
            <div class="inline-form-title"><i class="bi bi-pencil-square"></i> Modificar datos de contacto</div>
            <form id="inlineModClienteForm" novalidate>
                <div class="inline-form-group">
                    <label>Móvil actual</label>
                    <input type="text" class="inline-input" value="${data.cliente.telefono || ''}" disabled>
                </div>
                <div class="inline-form-group">
                    <label>Nuevo móvil</label>
                    <input type="text" name="movil" class="inline-input" pattern="^[67]\\d{8}$" required
                        placeholder="Ej: 612345678">
                </div>
                <div class="inline-form-group">
                    <label>Email actual</label>
                    <input type="email" class="inline-input" value="${data.cliente.email || ''}" disabled>
                </div>
                <div class="inline-form-group">
                    <label>Nuevo email</label>
                    <input type="email" name="email" class="inline-input" required placeholder="ejemplo@correo.com">
                </div>
                <div class="inline-form-actions">
                    <button type="button" class="inline-btn-submit js-form-btn"><i class="bi bi-check-lg"></i> Guardar</button>
                </div>
            </form>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;
    const form = container.querySelector('#inlineModClienteForm');

    form.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });

    form.querySelector('.js-form-btn').addEventListener('click', async () => {
        if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

        const nif = data.cliente.nif;
        const movil = form.querySelector('[name="movil"]').value.trim();
        const email = form.querySelector('[name="email"]').value.trim();

        showLoading();
        try {
            const res = await fetch(`${ENV.API_URL}/update-cliente`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'empresa': ENV.EMPRESA, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nif, movil, email })
            });
            if (!res.ok) throw new Error();
            Swal.close();
            form.closest('.chat-inline-form').innerHTML = '<div class="inline-form-success"><i class="bi bi-check-circle"></i> Datos modificados correctamente</div>';
        } catch {
            Swal.close();
            Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
        }
    });
}

// ===== AGENDA =====
export function renderAgendaInline() {
    closePreviousForms();
    const data = getClienteData();
    if (!data?.cliente) return;

    const html = `
        <div class="chat-inline-form">
            <div class="inline-form-title"><i class="bi bi-calendar-plus"></i> Nueva cita cliente</div>
            <form id="inlineAgendaForm" novalidate>
                <div class="inline-form-group">
                    <label>Fecha y hora</label>
                    <input type="text" name="datetime" class="inline-input js-flatpickr-datetime" placeholder="Selecciona fecha y hora" required readonly>
                </div>
                <div class="inline-form-group">
                    <label>Asunto</label>
                    <input type="text" name="asunto" class="inline-input" placeholder="Escribe el asunto" required>
                </div>
                <div class="inline-form-actions">
                    <button type="button" class="inline-btn-submit js-form-btn"><i class="bi bi-check-lg"></i> Guardar</button>
                </div>
            </form>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;
    const form = container.querySelector('#inlineAgendaForm');

    // Flatpickr con fecha + hora
    const dtInput = form.querySelector('.js-flatpickr-datetime');
    if (window.flatpickr) {
        const fp = flatpickr(dtInput, {
            locale: 'es',
            enableTime: true,
            time_24hr: true,
            dateFormat: 'Y-m-d H:i',
            altInput: true,
            altFormat: 'j F Y · H:i',
            minDate: 'today',
            minuteIncrement: 15,
            disableMobile: true,
            appendTo: document.body,
            position: 'auto',
            onReady(_, __, instance) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = 'Confirmar';
                btn.className = 'flatpickr-confirm-btn';
                btn.addEventListener('click', () => instance.close());
                instance.calendarContainer.appendChild(btn);
            },
            onOpen(_, __, instance) {
                // Asegurar que el calendario sea completamente visible
                requestAnimationFrame(() => {
                    const cal = instance.calendarContainer;
                    if (!cal) return;
                    const rect = cal.getBoundingClientRect();
                    // Si el top queda fuera de la pantalla, reposicionar abajo
                    if (rect.top < 0) {
                        cal.style.top = '8px';
                    }
                    // Si el bottom queda fuera de la pantalla, reposicionar arriba
                    if (rect.bottom > window.innerHeight) {
                        cal.style.top = (window.innerHeight - rect.height - 8) + 'px';
                    }
                });
            },
        });
    }

    form.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });

    form.querySelector('.js-form-btn').addEventListener('click', async () => {
        if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

        const body = {
            nif: data.cliente.nif,
            subject: form.querySelector('[name="asunto"]').value.trim(),
            start: form.querySelector('[name="datetime"]').value,
            tipo: 'cita',
        };

        showLoading();
        try {
            const res = await fetch(`${ENV.API_URL}/agenda`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, 'Empresa': ENV.EMPRESA, 'Device': ENV.DEVICE },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error();
            Swal.close();
            form.closest('.chat-inline-form').innerHTML = '<div class="inline-form-success"><i class="bi bi-check-circle"></i> Cita registrada correctamente</div>';
        } catch {
            Swal.close();
            Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
        }
    });
}

// ===== EMAIL =====
export function renderEmailInline() {
    closePreviousForms();
    const data = getClienteData();
    if (!data?.cliente) return;

    const html = `
        <div class="chat-inline-form">
            <div class="inline-form-title"><i class="bi bi-envelope"></i> Enviar email</div>
            <form id="inlineEmailForm" novalidate>
                <div class="inline-form-group">
                    <label>Para</label>
                    <input type="email" name="to" class="inline-input" value="${data.cliente.email || ''}" required>
                </div>
                <div class="inline-form-group">
                    <label>Asunto</label>
                    <input type="text" name="subject" class="inline-input" required>
                </div>
                <div class="inline-form-group">
                    <label>Mensaje</label>
                    <textarea name="body" class="inline-input inline-textarea" rows="3" required></textarea>
                </div>
                <div class="inline-form-group">
                    <label>Adjunto <small>(opcional, max 5MB)</small></label>
                    <input type="file" name="attachment" class="inline-input" accept=".pdf,.jpg,.png,.doc,.docx,.xls,.xlsx">
                </div>
                <div class="inline-form-error hidden"></div>
                <div class="inline-form-actions">
                    <button type="button" class="inline-btn-submit js-form-btn"><i class="bi bi-send"></i> Enviar</button>
                </div>
            </form>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;
    const form = container.querySelector('#inlineEmailForm');

    form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); });

    form.querySelector('.js-form-btn').addEventListener('click', async () => {
        if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

        const errorBox = form.querySelector('.inline-form-error');
        errorBox.classList.add('hidden');

        const attachment = form.querySelector('[name="attachment"]').files[0] || null;
        if (attachment) {
            const ext = attachment.name.split('.').pop().toLowerCase();
            const allowed = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
            if (!allowed.includes(ext)) { errorBox.textContent = 'Tipo de archivo no permitido.'; errorBox.classList.remove('hidden'); return; }
            if (attachment.size > 5 * 1024 * 1024) { errorBox.textContent = 'El archivo es demasiado grande (max 5MB).'; errorBox.classList.remove('hidden'); return; }
        }

        const formData = new FormData();
        formData.append('to', form.querySelector('[name="to"]').value.trim());
        formData.append('subject', form.querySelector('[name="subject"]').value.trim());
        formData.append('body', form.querySelector('[name="body"]').value.trim());
        if (attachment) formData.append('attachment', attachment);

        showLoading();
        try {
            const res = await fetch(`${ENV.API_URL}/send-email`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'Empresa': ENV.EMPRESA, 'Device': ENV.DEVICE },
                body: formData
            });
            if (!res.ok) throw new Error();
            Swal.close();
            form.closest('.chat-inline-form').innerHTML = '<div class="inline-form-success"><i class="bi bi-check-circle"></i> Correo enviado correctamente</div>';
        } catch {
            Swal.close();
            Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
        }
    });
}

// ===== PRESINIESTRO =====
// Componente picker reutilizable: buscador con lista, teclado, chip seleccionado
export function initInlinePicker(container, items, { placeholder, renderItem, renderChip, searchFields }) {
    const hidden = container.querySelector('input[type="hidden"]');
    const searchInput = container.querySelector('.inline-picker-search');
    const listEl = container.querySelector('.inline-picker-list');
    const selectedEl = container.querySelector('.inline-picker-selected');
    let activeIdx = -1;
    let picked = null;
    let onPickCb = null;

    function render(term = '') {
        const t = term.toLowerCase();
        const filtered = t
            ? items.filter(item => searchFields(item).toLowerCase().includes(t))
            : items;

        activeIdx = -1;
        if (!filtered.length) {
            listEl.innerHTML = '<li class="inline-poliza-hint">Sin resultados</li>';
            return;
        }
        listEl.innerHTML = filtered.map(item => renderItem(item)).join('');
        listEl.querySelectorAll('.inline-picker-item').forEach(el => {
            el.addEventListener('click', () => pick(el.dataset.value));
        });
    }

    function updateActive() {
        listEl.querySelectorAll('.inline-picker-item').forEach((el, i) => {
            el.classList.toggle('active', i === activeIdx);
            if (i === activeIdx) el.scrollIntoView({ block: 'nearest' });
        });
    }

    function pick(value) {
        // Buscar en todos los campos posibles de ID
        const found = items.find(x => String(x._value ?? x.codigo ?? x.poliza ?? x.id ?? '') === String(value));
        if (!found) return;
        picked = found;
        hidden.value = value;
        selectedEl.innerHTML = `
            <div class="inline-poliza-chip">
                ${renderChip(found)}
                <button type="button" class="inline-poliza-clear" title="Cambiar"><i class="bi bi-x-lg"></i></button>
            </div>`;
        selectedEl.style.display = '';
        searchInput.style.display = 'none';
        listEl.innerHTML = '';
        selectedEl.querySelector('.inline-poliza-clear').addEventListener('click', clear);
        if (onPickCb) onPickCb(found);
    }

    function clear() {
        picked = null;
        hidden.value = '';
        selectedEl.style.display = 'none';
        selectedEl.innerHTML = '';
        searchInput.style.display = '';
        searchInput.value = '';
        searchInput.focus();
        listEl.innerHTML = '';
        if (onPickCb) onPickCb(null);
    }

    searchInput.setAttribute('placeholder', placeholder);
    searchInput.addEventListener('input', () => render(searchInput.value.trim()));
    searchInput.addEventListener('focus', () => { if (!picked) render(searchInput.value.trim()); });
    searchInput.addEventListener('keydown', (e) => {
        const els = listEl.querySelectorAll('.inline-picker-item');
        if (!els.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = activeIdx < els.length - 1 ? activeIdx + 1 : 0; updateActive(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = activeIdx > 0 ? activeIdx - 1 : els.length - 1; updateActive(); }
        else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx >= 0 && activeIdx < els.length) pick(els[activeIdx].dataset.value); }
    });

    return {
        get value() { return picked; },
        get rawValue() { return hidden.value; },
        onPick(cb) { onPickCb = cb; },
        setItems(newItems) { items = newItems; clear(); },
        clear,
    };
}

export function renderPresiniestroInline() {
    closePreviousForms();
    const data = getClienteData();
    if (!data?.cliente) return;

    const polizasActivas = data.polizas?.filter(p => p.situacion == 1) || [];
    if (!polizasActivas.length) {
        addMessageToChat('bot', '<div>No hay pólizas activas para registrar presiniestro.</div>');
        return;
    }

    const descriptores = JSON.parse(localStorage.getItem('descriptores') || '[]');

    const ramoIcons = {
        "AUTOS": "bi-car-front", "HOGAR": "bi-house", "SALUD": "bi-heart-pulse",
        "VIDA": "bi-heart", "ACCIDENTES": "bi-bandaid", "PYME": "bi-building",
        "COMERCIOS": "bi-shop"
    };

    const pickerHTML = `
        <div class="inline-poliza-picker">
            <input type="hidden" name="%%NAME%%" required>
            <input type="text" class="inline-input inline-picker-search" autocomplete="off">
            <ul class="inline-poliza-list inline-picker-list"></ul>
            <div class="inline-picker-selected" style="display:none"></div>
        </div>`;

    const html = `
        <div class="chat-inline-form">
            <div class="inline-form-title"><i class="bi bi-exclamation-triangle"></i> Registro Presiniestro</div>
            <form class="js-presiniestro-form" novalidate>
                <div class="inline-form-group">
                    <label>Póliza</label>
                    ${pickerHTML.replace('%%NAME%%', 'poliza')}
                </div>
                <div class="inline-form-group js-causa-group" style="display:none">
                    <label>Causa</label>
                    ${pickerHTML.replace('%%NAME%%', 'causa')}
                </div>
                <div class="inline-form-group">
                    <label>Fecha</label>
                    <input type="text" name="fecha" class="inline-input js-flatpickr" placeholder="Selecciona fecha" required readonly>
                </div>
                <div class="inline-form-group">
                    <label>Descripción</label>
                    <textarea name="descripcion" class="inline-input inline-textarea" rows="3" placeholder="Detalle del siniestro" required></textarea>
                </div>
                <div class="inline-form-group">
                    <label>Archivos <small>(opcional)</small></label>
                    <input type="file" name="fichero1" class="inline-input mb-1" accept=".pdf,.jpg,.png,.doc,.docx">
                    <input type="file" name="fichero2" class="inline-input mb-1" accept=".pdf,.jpg,.png,.doc,.docx">
                    <input type="file" name="fichero3" class="inline-input" accept=".pdf,.jpg,.png,.doc,.docx">
                </div>
                <div class="inline-form-actions">
                    <button type="button" class="inline-btn-submit js-form-btn"><i class="bi bi-check-lg"></i> Guardar</button>
                </div>
            </form>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;
    const form = container.querySelector('.js-presiniestro-form');
    const causaGroup = form.querySelector('.js-causa-group');

    // --- Flatpickr ---
    const fechaInput = form.querySelector('.js-flatpickr');
    if (window.flatpickr) {
        flatpickr(fechaInput, {
            locale: 'es',
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'j F Y',
            maxDate: 'today',
            disableMobile: true,
            appendTo: document.body,
            position: 'auto',
            onOpen(_, __, instance) {
                requestAnimationFrame(() => {
                    const cal = instance.calendarContainer;
                    if (!cal) return;
                    const rect = cal.getBoundingClientRect();
                    if (rect.top < 0) {
                        cal.style.top = '8px';
                    }
                    if (rect.bottom > window.innerHeight) {
                        cal.style.top = (window.innerHeight - rect.height - 8) + 'px';
                    }
                });
            },
        });
    }

    // --- Picker Póliza ---
    const polizaPicker = initInlinePicker(
        form.querySelectorAll('.inline-poliza-picker')[0],
        polizasActivas,
        {
            placeholder: 'Busca por compañía, ramo, matrícula...',
            searchFields: p => [p.cia_poliza, p.compania, p.ramo, p.tipo_producto, p.objeto || '', p.matricula || ''].join(' '),
            renderItem: p => {
                const icon = ramoIcons[p.tipo_producto?.toUpperCase()] || 'bi-file-earmark-text';
                return `<li class="inline-poliza-item inline-picker-item" data-value="${p.poliza}">
                    <i class="bi ${icon} me-1"></i><strong>${p.cia_poliza}</strong> · ${p.compania}
                    <small class="d-block text-muted">${p.ramo || p.tipo_producto}${p.objeto ? ' · ' + p.objeto : ''}${p.matricula ? ' · ' + p.matricula : ''}</small>
                </li>`;
            },
            renderChip: p => {
                const icon = ramoIcons[p.tipo_producto?.toUpperCase()] || 'bi-file-earmark-text';
                return `<i class="bi ${icon} me-1"></i><strong>${p.cia_poliza}</strong> · ${p.compania}${p.objeto ? ' · ' + p.objeto : ''}${p.matricula ? ' · ' + p.matricula : ''}`;
            },
        }
    );

    // --- Picker Causa (se carga al seleccionar póliza) ---
    let causas = [];
    const causaPicker = initInlinePicker(
        form.querySelectorAll('.inline-poliza-picker')[1],
        causas,
        {
            placeholder: 'Busca una causa...',
            searchFields: c => c.nombre,
            renderItem: c => `<li class="inline-poliza-item inline-picker-item" data-value="${c.codigo}">${c.nombre}</li>`,
            renderChip: c => c.nombre,
        }
    );

    polizaPicker.onPick((poliza) => {
        if (poliza) {
            causas = descriptores.filter(d => d.tipo.includes(poliza.ramo_tipo));
            causaPicker.setItems(causas);
            causaGroup.style.display = '';
        } else {
            causaPicker.setItems([]);
            causaGroup.style.display = 'none';
        }
    });

    // Bloquear Enter (excepto en pickers que lo manejan solos y textarea)
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !e.target.classList.contains('inline-picker-search')) e.preventDefault();
    });

    // --- Submit por botón ---
    form.querySelector('.js-form-btn').addEventListener('click', async () => {
        if (!polizaPicker.rawValue) return;
        if (!causaPicker.rawValue) return;
        if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

        const poliza = polizaPicker.value;
        const causa = causaPicker.value;
        const fecha = form.querySelector('[name="fecha"]').value;
        const descripcion = form.querySelector('[name="descripcion"]').value.trim();

        showLoading();
        try {
            const res = await fetch(`${ENV.API_URL}/presiniestro`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'empresa': ENV.EMPRESA, 'Content-Type': 'application/json' },
                body: JSON.stringify({ poliza: polizaPicker.rawValue, fecha, causa: causaPicker.rawValue, descripcion })
            });
            if (!res.ok) throw new Error();
            Swal.close();

            const fechaDisplay = form.querySelector('[name="fecha"]')._flatpickr?.altInput?.value || fecha;
            form.closest('.chat-inline-form').innerHTML = `
                <div class="inline-form-success">
                    <div class="mb-2"><i class="bi bi-check-circle"></i> Presiniestro registrado correctamente</div>
                    <div class="inline-form-summary">
                        <div><small class="text-muted">Póliza</small><br><strong>${poliza?.cia_poliza || ''}</strong> · ${poliza?.compania || ''}</div>
                        <div><small class="text-muted">Causa</small><br>${causa?.nombre || ''}</div>
                        <div><small class="text-muted">Fecha</small><br>${fechaDisplay}</div>
                        <div><small class="text-muted">Descripción</small><br>${descripcion}</div>
                    </div>
                </div>`;
        } catch {
            Swal.close();
            Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
        }
    });
}

// ===== SUBIR DOCUMENTO =====
export function renderSubirDocInline() {
    closePreviousForms();
    const data = getClienteData();
    if (!data?.cliente) return;

    const polizasActivas = data.polizas?.filter(p => p.situacion == 1) || [];
    const siniestrosAbiertos = data.siniestros?.filter(s => s.estado === 'Abierto') || [];

    const ramoIcons = {
        "AUTOS": "bi-car-front", "HOGAR": "bi-house", "SALUD": "bi-heart-pulse",
        "VIDA": "bi-heart", "ACCIDENTES": "bi-bandaid", "PYME": "bi-building",
        "COMERCIOS": "bi-shop"
    };

    const pickerHTML = (name) => `
        <div class="inline-poliza-picker">
            <input type="hidden" name="${name}" required>
            <input type="text" class="inline-input inline-picker-search" autocomplete="off">
            <ul class="inline-poliza-list inline-picker-list"></ul>
            <div class="inline-picker-selected" style="display:none"></div>
        </div>`;

    const html = `
        <div class="chat-inline-form">
            <div class="inline-form-title"><i class="bi bi-cloud-upload"></i> Subir documentación</div>
            <form class="js-subirdoc-form" novalidate>
                <div class="inline-form-group">
                    <label>Entidad</label>
                    <select name="entidad" class="inline-input" required>
                        <option value="">Selecciona una entidad</option>
                        <option value="cliente">Cliente</option>
                        <option value="poliza">Póliza</option>
                        <option value="siniestro">Siniestro</option>
                    </select>
                </div>
                <div class="inline-form-group js-doc-poliza-group" style="display:none">
                    <label>Póliza</label>
                    ${pickerHTML('poliza')}
                </div>
                <div class="inline-form-group js-doc-siniestro-group" style="display:none">
                    <label>Siniestro</label>
                    ${pickerHTML('siniestro')}
                </div>
                <div class="inline-form-group">
                    <label>Descripción</label>
                    <input type="text" name="descripcion" class="inline-input" placeholder="Ej: DNI escaneado" required>
                </div>
                <div class="inline-form-group">
                    <label>Archivo</label>
                    <input type="file" name="fichero" class="inline-input" accept=".pdf,.jpg,.png,.doc,.docx" required>
                </div>
                <div class="inline-form-actions">
                    <button type="button" class="inline-btn-submit js-form-btn"><i class="bi bi-cloud-upload"></i> Subir</button>
                </div>
            </form>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;
    const form = container.querySelector('.js-subirdoc-form');
    const entidadSelect = form.querySelector('[name="entidad"]');
    const polizaGroup = form.querySelector('.js-doc-poliza-group');
    const siniestroGroup = form.querySelector('.js-doc-siniestro-group');

    // Bloquear Enter (excepto en pickers)
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.target.classList.contains('inline-picker-search')) e.preventDefault();
    });

    // Picker póliza
    const polizaPicker = initInlinePicker(
        polizaGroup.querySelector('.inline-poliza-picker'),
        polizasActivas,
        {
            placeholder: 'Busca póliza...',
            searchFields: p => [p.cia_poliza, p.compania, p.ramo, p.tipo_producto, p.objeto || '', p.matricula || ''].join(' '),
            renderItem: p => {
                const icon = ramoIcons[p.tipo_producto?.toUpperCase()] || 'bi-file-earmark-text';
                return `<li class="inline-poliza-item inline-picker-item" data-value="${p.poliza}">
                    <i class="bi ${icon} me-1"></i><strong>${p.cia_poliza}</strong> · ${p.compania}
                    <small class="d-block text-muted">${p.ramo || p.tipo_producto}${p.objeto ? ' · ' + p.objeto : ''}${p.matricula ? ' · ' + p.matricula : ''}</small>
                </li>`;
            },
            renderChip: p => {
                const icon = ramoIcons[p.tipo_producto?.toUpperCase()] || 'bi-file-earmark-text';
                return `<i class="bi ${icon} me-1"></i><strong>${p.cia_poliza}</strong> · ${p.compania}`;
            },
        }
    );

    // Picker siniestro
    const siniestroPicker = initInlinePicker(
        siniestroGroup.querySelector('.inline-poliza-picker'),
        siniestrosAbiertos,
        {
            placeholder: 'Busca siniestro...',
            searchFields: s => [s.id, s.compania, s.cia_poliza, s.causa || '', s.objeto || ''].join(' '),
            renderItem: s => `<li class="inline-poliza-item inline-picker-item" data-value="${s.id}">
                <strong>${s.id}</strong> · ${s.compania}
                <small class="d-block text-muted">${s.cia_poliza}${s.causa ? ' · ' + s.causa : ''}</small>
            </li>`,
            renderChip: s => `<strong>${s.id}</strong> · ${s.compania}`,
        }
    );

    // Mostrar/ocultar pickers según entidad
    entidadSelect.addEventListener('change', () => {
        const val = entidadSelect.value;
        polizaGroup.style.display = val === 'poliza' ? '' : 'none';
        siniestroGroup.style.display = val === 'siniestro' ? '' : 'none';
        if (val !== 'poliza') polizaPicker.clear();
        if (val !== 'siniestro') siniestroPicker.clear();
    });

    form.querySelector('.js-form-btn').addEventListener('click', async () => {
        if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

        const entidad = entidadSelect.value;
        const descripcion = form.querySelector('[name="descripcion"]').value.trim();
        const fichero = form.querySelector('[name="fichero"]').files[0];
        const formData = new FormData();
        formData.append('nif', data.cliente.nif);
        formData.append('entidad', entidad);
        formData.append('descripcion', descripcion);
        formData.append('fichero', fichero);

        let refLabel = entidad.charAt(0).toUpperCase() + entidad.slice(1);
        let refValue = '';

        if (entidad === 'poliza') {
            formData.append('poliza', polizaPicker.rawValue);
            const p = polizaPicker.value;
            refValue = p ? `${p.cia_poliza} · ${p.compania}` : polizaPicker.rawValue;
        }
        if (entidad === 'siniestro') {
            formData.append('siniestro', siniestroPicker.rawValue);
            formData.append('tramite', true);
            const s = siniestroPicker.value;
            refValue = s ? `${s.id} · ${s.compania}` : siniestroPicker.rawValue;
        }

        showLoading('Enviando documento...');
        try {
            const res = await fetch(`${ENV.API_URL}/upload-doc`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'Empresa': ENV.EMPRESA, 'Device': ENV.DEVICE },
                body: formData
            });
            if (!res.ok) throw new Error();
            Swal.close();
            form.closest('.chat-inline-form').innerHTML = `
                <div class="inline-form-success">
                    <div class="mb-2"><i class="bi bi-check-circle"></i> Documento subido correctamente</div>
                    <div class="inline-form-summary">
                        <div><small class="text-muted">Entidad</small><br>${refLabel}${refValue ? ' — ' + refValue : ''}</div>
                        <div><small class="text-muted">Archivo</small><br>${fichero?.name || ''}</div>
                        <div style="grid-column: 1 / -1"><small class="text-muted">Descripción</small><br>${descripcion}</div>
                    </div>
                </div>`;
        } catch {
            Swal.close();
            Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
        }
    });
}
