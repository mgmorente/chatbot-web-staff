// js/docs.js
// documentos
import { addMessageToChat } from './chat.js';
import { initInlinePicker } from './forms.js';

// Mostrar documentos filtrados directamente (usado desde polizas.js y siniestros.js al pulsar "Docs")
export function renderDocumentos(id = null) {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    if (!data?.documentos?.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-folder-x"></i> No hay documentos disponibles</div>');
        return;
    }

    const docsFiltrados = id
        ? data.documentos.filter(d => d.documento == id)
        : data.documentos;

    if (!docsFiltrados.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-folder-x"></i> No hay documentos disponibles</div>');
        return;
    }

    addMessageToChat('bot', buildDocsHTML(docsFiltrados));
}

// Flujo con pickers: entidad → item → documentos
export function renderDocumentosConFiltro() {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    if (!data?.documentos?.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-folder-x"></i> No hay documentos disponibles</div>');
        return;
    }

    const allPolizas = data.polizas || [];
    const allSiniestros = data.siniestros || [];

    const entidadLabels = {
        'cliente': 'Cliente', 'poliza': 'Póliza',
        'siniestro': 'Siniestro', 'recibo': 'Recibo',
    };
    const entidadIcons = {
        'cliente': 'bi-person', 'poliza': 'bi-shield-check',
        'siniestro': 'bi-exclamation-triangle', 'recibo': 'bi-receipt',
    };

    // Entidades que tienen documentos
    const entidades = [...new Set(data.documentos.map(d => d.entidad.toLowerCase()))];
    const entidadItems = entidades.map(e => ({
        _value: e,
        label: entidadLabels[e] || e,
        icon: entidadIcons[e] || 'bi-folder',
        count: data.documentos.filter(d => d.entidad.toLowerCase() === e).length,
    }));

    const pickerHTML = `
        <div class="inline-poliza-picker">
            <input type="hidden" name="%%NAME%%" required>
            <input type="text" class="inline-input inline-picker-search" autocomplete="off">
            <ul class="inline-poliza-list inline-picker-list"></ul>
            <div class="inline-picker-selected" style="display:none"></div>
        </div>`;

    const html = `
        <div class="chat-inline-form">
            <div class="inline-form-title"><i class="bi bi-folder"></i> Consultar documentos</div>
            <form class="js-docs-form" novalidate>
                <div class="inline-form-group">
                    <label>Entidad</label>
                    ${pickerHTML.replace('%%NAME%%', 'entidad')}
                </div>
                <div class="inline-form-group js-docs-item-group" style="display:none">
                    <label class="js-docs-item-label">Elemento</label>
                    ${pickerHTML.replace('%%NAME%%', 'item')}
                </div>
                <div class="inline-form-actions">
                    <button type="button" class="inline-btn-submit js-form-btn"><i class="bi bi-search"></i> Consultar</button>
                </div>
            </form>
            <div class="js-docs-result"></div>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;
    const form = container.querySelector('.js-docs-form');
    const itemGroup = form.querySelector('.js-docs-item-group');
    const itemLabel = form.querySelector('.js-docs-item-label');
    const resultDiv = container.querySelector('.js-docs-result');

    // Bloquear Enter
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.target.classList.contains('inline-picker-search')) e.preventDefault();
    });

    // Picker Entidad
    const entidadPicker = initInlinePicker(
        form.querySelectorAll('.inline-poliza-picker')[0],
        entidadItems,
        {
            placeholder: 'Busca una entidad...',
            searchFields: e => `${e.label} ${e._value}`,
            renderItem: e => `<li class="inline-poliza-item inline-picker-item" data-value="${e._value}">
                <i class="bi ${e.icon} me-1"></i> ${e.label} <span class="text-muted">(${e.count})</span>
            </li>`,
            renderChip: e => `<i class="bi ${e.icon} me-1"></i> ${e.label}`,
        }
    );

    // Picker Item (se configura dinámicamente al elegir entidad)
    const itemPicker = initInlinePicker(
        form.querySelectorAll('.inline-poliza-picker')[1],
        [],
        {
            placeholder: 'Busca...',
            searchFields: i => i.label,
            renderItem: i => `<li class="inline-poliza-item inline-picker-item" data-value="${i._value}">
                ${i.label} <span class="text-muted">(${i.count})</span>
            </li>`,
            renderChip: i => i.label,
        }
    );

    // Al elegir entidad → poblar picker de items
    entidadPicker.onPick((entidad) => {
        resultDiv.innerHTML = '';

        if (!entidad) {
            itemGroup.style.display = 'none';
            itemPicker.setItems([]);
            return;
        }

        const key = entidad._value;

        // Cliente no tiene sub-items
        if (key === 'cliente') {
            itemGroup.style.display = 'none';
            itemPicker.setItems([]);
            return;
        }

        const docsEntidad = data.documentos.filter(d => d.entidad.toLowerCase() === key);
        const docIds = [...new Set(docsEntidad.map(d => d.documento))];

        itemLabel.textContent = entidadLabels[key] || key;

        const subItems = docIds.map(id => {
            const count = docsEntidad.filter(d => d.documento == id).length;
            let label = String(id);
            if (key === 'poliza') {
                const p = allPolizas.find(x => x.poliza == id);
                label = p ? `${p.cia_poliza} · ${p.compania}` : label;
            } else if (key === 'siniestro') {
                const s = allSiniestros.find(x => x.id == id);
                label = s ? `${id} · ${s.compania}` : label;
            }
            return { _value: id, label, count };
        });

        itemPicker.setItems(subItems);
        itemGroup.style.display = '';
    });

    // Botón consultar
    form.querySelector('.js-form-btn').addEventListener('click', () => {
        const entidad = entidadPicker.rawValue;
        if (!entidad) return;

        const itemValue = itemPicker.rawValue;
        let docsFiltrados;

        if (entidad === 'cliente') {
            docsFiltrados = data.documentos.filter(d => d.entidad.toLowerCase() === 'cliente');
        } else if (itemValue) {
            docsFiltrados = data.documentos.filter(d => d.entidad.toLowerCase() === entidad && d.documento == itemValue);
        } else {
            docsFiltrados = data.documentos.filter(d => d.entidad.toLowerCase() === entidad);
        }

        if (!docsFiltrados.length) {
            resultDiv.innerHTML = '<div class="data-empty" style="margin-top:16px"><i class="bi bi-folder-x"></i> No hay documentos</div>';
            return;
        }

        resultDiv.innerHTML = `<div style="margin-top:16px">${buildDocsHTML(docsFiltrados)}</div>`;
    });
}

// Helper: construir HTML de lista de documentos
function buildDocsHTML(docs) {
    const grouped = docs.reduce((acc, d) => {
        const key = `${d.entidad}-${d.documento}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(d);
        return acc;
    }, {});

    let html = '';
    Object.entries(grouped).forEach(([key, items]) => {
        const [entidad, documento] = key.split('-');
        const itemsHtml = items.map(s => `
            <div class="data-card">
                <div class="data-card__icon"><i class="bi bi-file-earmark-text"></i></div>
                <div class="data-card__body">
                    <div class="data-card__title">${s.descripcion}</div>
                    <div class="data-card__meta"><span><i class="bi bi-calendar3"></i> ${s.fecha}</span></div>
                </div>
            </div>`).join('');

        html += `
            <div class="data-panel" style="margin-top:8px">
                <div class="data-panel__header"><i class="bi bi-folder2-open"></i> Documentos <span class="data-card__sep">·</span> ${entidad.toUpperCase()} ${documento} <span class="data-panel__count">${items.length}</span></div>
                ${itemsHtml}
            </div>`;
    });

    return html;
}
