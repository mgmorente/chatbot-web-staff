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

    let panels = '';
    Object.entries(grouped).forEach(([poliza, group]) => {
        const pendientes = group.recibos.filter(r => r.situacion !== 'Cobrado');
        const totalPendiente = pendientes.reduce((sum, r) => sum + (parseFloat(r.prima_total) || 0), 0);

        const items = group.recibos.map(r => {
            const cobrado = r.situacion === 'Cobrado';
            return `
            <div class="data-card${!cobrado ? ' data-card--danger' : ''}">
                <div class="data-card__icon"><i class="bi ${cobrado ? 'bi-check-circle' : 'bi-exclamation-circle'}"></i></div>
                <div class="data-card__body">
                    <div class="data-card__title">${r.recibo}</div>
                    <div class="data-card__meta">
                        <span><i class="bi bi-calendar3"></i> ${r.fecha_efecto} → ${r.fecha_vencimiento}</span>
                        <span><i class="bi bi-currency-euro"></i> ${r.prima_total}€</span>
                    </div>
                    <div class="data-card__status">${cobrado
                        ? '<span class="status-dot status-dot--ok"></span> Cobrado'
                        : `<span class="status-dot status-dot--ko"></span> ${r.situacion}`
                    }</div>
                </div>
            </div>`;
        }).join('');

        const pendienteTag = pendientes.length > 0
            ? `<span class="data-group__alert">${pendientes.length} pte · ${totalPendiente.toFixed(2)}€</span>`
            : '';

        const MAX_VISIBLE = 3;
        const allItems = group.recibos.length;
        const visibleItems = items.split('</div>\n').length; // just use the array
        let visibleHtml, hiddenHtml = '';

        if (allItems > MAX_VISIBLE) {
            const cardArray = group.recibos.map((r, i) => {
                const cobrado = r.situacion === 'Cobrado';
                return `
                <div class="data-card${!cobrado ? ' data-card--danger' : ''}">
                    <div class="data-card__icon"><i class="bi ${cobrado ? 'bi-check-circle' : 'bi-exclamation-circle'}"></i></div>
                    <div class="data-card__body">
                        <div class="data-card__title">${r.recibo}</div>
                        <div class="data-card__meta">
                            <span><i class="bi bi-calendar3"></i> ${r.fecha_efecto} → ${r.fecha_vencimiento}</span>
                            <span><i class="bi bi-currency-euro"></i> ${r.prima_total}€</span>
                        </div>
                        <div class="data-card__status">${cobrado
                            ? '<span class="status-dot status-dot--ok"></span> Cobrado'
                            : `<span class="status-dot status-dot--ko"></span> ${r.situacion}`
                        }</div>
                    </div>
                </div>`;
            });
            visibleHtml = cardArray.slice(0, MAX_VISIBLE).join('');
            const rest = allItems - MAX_VISIBLE;
            hiddenHtml = `
                <details class="data-group__more">
                    <summary class="data-group__more-btn"><i class="bi bi-chevron-down"></i> Ver ${rest} recibo${rest > 1 ? 's' : ''} más</summary>
                    ${cardArray.slice(MAX_VISIBLE).join('')}
                </details>`;
        } else {
            visibleHtml = items;
        }

        panels += `
            <div class="data-group">
                <div class="data-group__header">
                    <i class="bi ${getIcon(group.tipo)}"></i>
                    <span class="data-group__title">${poliza} <span class="data-card__sep">·</span> ${group.compania}</span>
                    <span class="data-panel__count">${allItems}</span>
                    ${pendienteTag}
                </div>
                ${visibleHtml}
                ${hiddenHtml}
            </div>`;
    });

    const titulo = soloPendientes ? 'Recibos pendientes' : 'Recibos';
    const icon = soloPendientes ? 'bi-exclamation-triangle' : 'bi-receipt';
    const count = recibos.length;
    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi ${icon}"></i> ${titulo}</div>
            ${panels}
        </div>`;

    addMessageToChat('bot', html);
}
