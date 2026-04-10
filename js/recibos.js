import { addMessageToChat } from './chat.js';

const ramoIcons = {
    "AUTOS": "bi-car-front", "HOGAR": "bi-house", "SALUD": "bi-heart-pulse",
    "VIDA": "bi-heart", "ACCIDENTES": "bi-bandaid", "PYME": "bi-building",
    "COMERCIOS": "bi-shop"
};

function getIcon(tipo) {
    return ramoIcons[tipo?.toUpperCase()] || 'bi-file-earmark-text';
}

function parseDate(str) {
    if (!str) return 0;
    // Soporta dd/mm/yyyy y yyyy-mm-dd
    const parts = str.includes('/') ? str.split('/').reverse().join('-') : str;
    return new Date(parts).getTime() || 0;
}

export function renderRecibosCliente({ soloPendientes = false } = {}) {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    if (!data?.recibos?.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-receipt-cutoff"></i> No hay recibos disponibles</div>');
        return;
    }

    let recibos = [...data.recibos];
    if (soloPendientes) {
        recibos = recibos.filter(r => r.situacion !== 'Cobrado');
        if (!recibos.length) {
            addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-check-circle"></i> No hay recibos pendientes</div>');
            return;
        }
    }

    // Ordenar por fecha desc
    recibos.sort((a, b) => parseDate(b.fecha_efecto) - parseDate(a.fecha_efecto));

    // Agrupar por póliza
    const grouped = {};
    recibos.forEach(r => {
        const key = r.cia_poliza || 'Sin póliza';
        if (!grouped[key]) grouped[key] = { recibos: [], ramo: r.ramo, compania: r.compania, tipo: r.ramo };
        grouped[key].recibos.push(r);
    });

    function buildReciboCard(r) {
        const cobrado = r.situacion === 'Cobrado';
        const searchable = [
            r.recibo, r.cia_poliza, r.ramo, r.compania, r.riesgo, r.matricula,
            r.prima_total, r.situacion, r.fecha_efecto, r.fecha_vencimiento
        ].filter(Boolean).join(' ').toLowerCase();

        const detailParts = [r.ramo, r.riesgo, r.matricula].filter(Boolean);
        const detailSuffix = detailParts.length ? ` <span class="data-card__sep">·</span> ${detailParts.join(' · ')}` : '';
        return `
        <div class="data-card data-card--compact${!cobrado ? ' data-card--danger' : ''}" data-searchable="${searchable}">
            <div class="data-card__icon"><i class="bi ${cobrado ? 'bi-check-circle' : 'bi-exclamation-circle'}"></i></div>
            <div class="data-card__body">
                <div class="data-card__title">${r.recibo || 'N/D'}${detailSuffix}</div>
                <div class="data-card__meta">
                    ${r.fecha_efecto || r.fecha_vencimiento ? `<span><i class="bi bi-calendar3"></i> ${r.fecha_efecto || '?'} → ${r.fecha_vencimiento || '?'}</span>` : ''}
                    ${r.prima_total != null ? `<span>${r.prima_total}€</span>` : ''}
                    <span>${cobrado ? '<span class="status-dot status-dot--ok"></span> Cobrado' : `<span class="status-dot status-dot--ko"></span> ${r.situacion || 'Pendiente'}`}</span>
                </div>
            </div>
        </div>`;
    }

    let panels = '';
    Object.entries(grouped).forEach(([poliza, group]) => {
        const pendientes = group.recibos.filter(r => r.situacion !== 'Cobrado');
        const totalPendiente = pendientes.reduce((sum, r) => sum + (parseFloat(r.prima_total) || 0), 0);

        const pendienteTag = pendientes.length > 0
            ? `<span class="data-group__alert">${pendientes.length} pte · ${totalPendiente.toFixed(2)}€</span>`
            : '';

        const MAX_VISIBLE = 3;
        const allItems = group.recibos.length;
        const cardArray = group.recibos.map(r => buildReciboCard(r));

        const visibleHtml = cardArray.slice(0, MAX_VISIBLE).join('');
        let hiddenHtml = '';
        if (allItems > MAX_VISIBLE) {
            const rest = allItems - MAX_VISIBLE;
            hiddenHtml = `
                <details class="data-group__more">
                    <summary class="data-group__more-btn"><i class="bi bi-chevron-down"></i> Ver ${rest} recibo${rest > 1 ? 's' : ''} más</summary>
                    ${cardArray.slice(MAX_VISIBLE).join('')}
                </details>`;
        }

        const groupSearchable = [poliza, group.compania, group.ramo].filter(Boolean).join(' ').toLowerCase();
        panels += `
            <div class="data-group" data-searchable="${groupSearchable}">
                <div class="data-group__header">
                    <i class="bi ${getIcon(group.tipo)}"></i>
                    <span class="data-group__title">${poliza || 'Sin póliza'} <span class="data-card__sep">·</span> ${group.compania || 'N/D'}</span>
                    ${pendienteTag}
                </div>
                ${visibleHtml}
                ${hiddenHtml}
            </div>`;
    });

    const titulo = soloPendientes ? 'Recibos pendientes' : 'Recibos';
    const icon = soloPendientes ? 'bi-exclamation-triangle' : 'bi-receipt';
    const count = recibos.length;
    const showSearch = count > 5;

    const searchHtml = showSearch
        ? `<div class="data-panel__search"><i class="bi bi-search"></i><input type="text" class="data-panel__search-input" placeholder="Buscar recibo…"></div>`
        : '';

    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi ${icon}"></i> ${titulo}</div>
            ${searchHtml}
            <div class="data-panel__list">
                ${panels}
            </div>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;

    const searchInput = container.querySelector('.data-panel__search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase().trim();
            const listEl = searchInput.closest('.data-panel').querySelector('.data-panel__list');
            if (q) {
                listEl.querySelectorAll('.data-group__more').forEach(d => d.open = true);
                listEl.querySelectorAll('.data-group').forEach(group => {
                    // Si el grupo coincide (póliza/compañía), mostrar todo el grupo
                    const groupMatch = group.dataset.searchable?.includes(q);
                    if (groupMatch) {
                        group.style.display = '';
                        group.querySelectorAll('.data-card').forEach(c => { c.style.display = ''; });
                    } else {
                        // Filtrar cards individuales por sus datos
                        group.querySelectorAll('.data-card').forEach(card => {
                            card.style.display = card.dataset.searchable?.includes(q) ? '' : 'none';
                        });
                        const visible = group.querySelectorAll('.data-card:not([style*="display: none"])').length;
                        group.style.display = visible > 0 ? '' : 'none';
                    }
                });
            } else {
                listEl.querySelectorAll('.data-group__more').forEach(d => d.open = false);
                listEl.querySelectorAll('.data-card, .data-group').forEach(el => { el.style.display = ''; });
            }
        });
    }
}
