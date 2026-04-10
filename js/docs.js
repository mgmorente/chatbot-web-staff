// js/docs.js
// documentos
import { addMessageToChat } from './chat.js';

// Mostrar documentos filtrados directamente (usado desde polizas.js y siniestros.js al pulsar "Docs")
export function renderDocumentos(id = null) {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.documentos || !data.documentos.length) {
        addMessageToChat('bot', '<div>No hay documentos disponibles.</div>');
        return;
    }

    const docsFiltrados = id
        ? data.documentos.filter(d => d.documento == id)
        : data.documentos;

    if (!docsFiltrados.length) {
        addMessageToChat('bot', '<div>No hay documentos disponibles.</div>');
        return;
    }

    addMessageToChat('bot', buildDocsHTML(docsFiltrados));
}

// Flujo con selects: entidad → item → documentos
export function renderDocumentosConFiltro() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.documentos || !data.documentos.length) {
        addMessageToChat('bot', '<div>No hay documentos disponibles.</div>');
        return;
    }

    const allPolizas = data.polizas || [];
    const siniestros = data.siniestros || [];

    // Entidades que tienen documentos
    const entidades = [...new Set(data.documentos.map(d => d.entidad.toLowerCase()))];

    const entidadLabels = {
        'cliente': 'Cliente',
        'poliza': 'Póliza',
        'siniestro': 'Siniestro',
        'recibo': 'Recibo',
    };

    const entidadOpts = entidades.map(e =>
        `<option value="${e}">${entidadLabels[e] || e} (${data.documentos.filter(d => d.entidad.toLowerCase() === e).length})</option>`
    ).join('');

    const html = `
        <div class="chat-inline-form">
            <div class="inline-form-title"><i class="bi bi-folder"></i> Consultar documentos</div>
            <form class="js-docs-form" novalidate>
                <div class="inline-form-group">
                    <label>Entidad</label>
                    <select name="entidad" class="inline-input" required>
                        <option value="">Selecciona una entidad</option>
                        ${entidadOpts}
                    </select>
                </div>
                <div class="inline-form-group js-docs-item-group" style="display:none">
                    <label class="js-docs-item-label">Elemento</label>
                    <select name="item" class="inline-input">
                        <option value="">Todos</option>
                    </select>
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
    const entidadSelect = form.querySelector('[name="entidad"]');
    const itemGroup = form.querySelector('.js-docs-item-group');
    const itemLabel = form.querySelector('.js-docs-item-label');
    const itemSelect = form.querySelector('[name="item"]');
    const resultDiv = container.querySelector('.js-docs-result');

    // Bloquear Enter
    form.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });

    // Al cambiar entidad → poblar segundo select
    entidadSelect.addEventListener('change', () => {
        const entidad = entidadSelect.value;
        resultDiv.innerHTML = '';

        if (!entidad) {
            itemGroup.style.display = 'none';
            return;
        }

        // Cliente no tiene sub-items
        if (entidad === 'cliente') {
            itemGroup.style.display = 'none';
            return;
        }

        const docsEntidad = data.documentos.filter(d => d.entidad.toLowerCase() === entidad);
        const docIds = [...new Set(docsEntidad.map(d => d.documento))];

        itemLabel.textContent = entidadLabels[entidad] || entidad;

        let options = '<option value="">Todos</option>';
        docIds.forEach(id => {
            const count = docsEntidad.filter(d => d.documento == id).length;
            let label = id;
            if (entidad === 'poliza') {
                const p = allPolizas.find(x => x.poliza == id);
                label = p ? `${p.cia_poliza} · ${p.compania}` : id;
            } else if (entidad === 'siniestro') {
                const s = siniestros.find(x => x.id == id);
                label = s ? `${id} · ${s.compania}` : id;
            }
            options += `<option value="${id}">${label} (${count})</option>`;
        });

        itemSelect.innerHTML = options;
        itemGroup.style.display = '';
    });

    // Botón consultar
    form.querySelector('.js-form-btn').addEventListener('click', () => {
        const entidad = entidadSelect.value;
        if (!entidad) return;

        const itemValue = itemSelect.value;
        let docsFiltrados;

        if (entidad === 'cliente') {
            docsFiltrados = data.documentos.filter(d => d.entidad.toLowerCase() === 'cliente');
        } else if (itemValue) {
            docsFiltrados = data.documentos.filter(d => d.entidad.toLowerCase() === entidad && d.documento == itemValue);
        } else {
            docsFiltrados = data.documentos.filter(d => d.entidad.toLowerCase() === entidad);
        }

        if (!docsFiltrados.length) {
            resultDiv.innerHTML = '<div class="mt-2" style="font-size:0.85rem;color:var(--staff-text-muted)">No hay documentos.</div>';
            return;
        }

        resultDiv.innerHTML = '<div class="mt-2">' + buildDocsHTML(docsFiltrados) + '</div>';
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
            <li class="list-group-item">
                <div class="d-flex justify-content-between w-100">
                    <small><a href="#">${s.descripcion}</a></small>
                    <span class="small text-muted">${s.fecha}</span>
                </div>
            </li>
        `).join('');

        html += `
            <div>
                <div><small class="fw-bold">${entidad.toUpperCase()} ${documento}</small></div>
                <ul class="list-group list-group-flush">${itemsHtml}</ul>
            </div>
        `;
    });

    return html;
}
