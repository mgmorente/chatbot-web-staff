import { addMessageToChat } from './chat.js';
import { renderDocumentos } from './docs.js';
import { norm } from './utils.js';

function parseDate(str) {
    if (!str) return 0;
    if (str.includes('/')) {
        const [d, m, y] = str.split('/');
        const fullYear = y.length === 2 ? '20' + y : y;
        return new Date(+fullYear, +m - 1, +d).getTime() || 0;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const [d, m, y] = str.split('-');
        return new Date(+y, +m - 1, +d).getTime() || 0;
    }
    return new Date(str).getTime() || 0;
}

export function renderSiniestrosCliente(d = {}) {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    if (!data?.siniestros?.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-shield-x"></i> No hay siniestros disponibles</div>');
        return;
    }

    let siniestros = data.siniestros;
    if (d?.args?.estado) {
        const estadoBuscado = d.args.estado.toLowerCase();
        siniestros = siniestros.filter(s => (s.estado || '').toLowerCase() === estadoBuscado);
    }

    if (!siniestros.length) {
        addMessageToChat('bot', `<div class="data-empty"><i class="bi bi-check-circle"></i> No hay siniestros con estado "${d.args.estado}"</div>`);
        return;
    }

    // Ordenar: abiertos primero, luego por fecha desc
    siniestros.sort((a, b) => {
        const aCerrado = (a.estado || '').toLowerCase() === 'cerrado';
        const bCerrado = (b.estado || '').toLowerCase() === 'cerrado';
        if (aCerrado !== bCerrado) return aCerrado ? 1 : -1;
        return parseDate(b.fecha_apertura) - parseDate(a.fecha_apertura);
    });

    const allPolizas = data.polizas || [];
    const ramoIcons = {
        "AUTOS": "bi-car-front", "HOGAR": "bi-house", "SALUD": "bi-heart-pulse",
        "VIDA": "bi-heart", "ACCIDENTES": "bi-bandaid", "PYME": "bi-building",
        "COMERCIOS": "bi-shop"
    };

    function buildSiniestroCard(s) {
        const cerrado = (s.estado || '').toLowerCase() === 'cerrado';
        const tramites = data.tramites ? data.tramites.filter(t => t.siniestro == s.id) : [];
        const tieneDocs = data.documentos?.some(doc => doc.entidad.toLowerCase() === 'siniestro' && doc.documento == s.id);
        const poliza = allPolizas.find(p => p.cia_poliza == s.cia_poliza);
        const ramo = poliza?.ramo || poliza?.tipo_producto || '';
        const ramoIcon = ramoIcons[ramo?.toUpperCase()] || (cerrado ? 'bi-lock' : 'bi-exclamation-triangle');
        const riesgo = poliza?.riesgo || poliza?.objeto || '';
        const searchable = norm(`${s.id} ${s.compania || ''} ${s.causa || ''} ${s.cia_poliza || ''} ${ramo} ${riesgo}`);

        let timelineHtml = '';
        if (tramites.length) {
            const timelineItems = tramites.map(t => {
                const adjuntosJson = t.adjuntos ? JSON.parse(t.adjuntos) : null;
                const adjuntoHtml = adjuntosJson?.descripcion
                    ? `<span class="timeline-adjunto"><i class="bi bi-paperclip"></i> ${adjuntosJson.descripcion}</span>`
                    : '';
                return `
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">${t.fecha_creacion || ''}</div>
                            <div class="timeline-traza">${t.traza || ''}</div>
                            ${t.mensaje ? `<div class="timeline-mensaje">${t.mensaje}</div>` : ''}
                            ${adjuntoHtml}
                        </div>
                    </div>`;
            }).join('');
            timelineHtml = `
                <details class="siniestro-timeline-details">
                    <summary class="timeline-toggle"><i class="bi bi-clock-history"></i> Trámites (${tramites.length})</summary>
                    <div class="siniestro-timeline">${timelineItems}</div>
                </details>`;
        }

        return `
        <div class="data-card${cerrado ? ' data-card--muted' : ''}" data-searchable="${searchable}">
            <div class="data-card__icon"><i class="bi ${ramoIcon}"></i></div>
            <div class="data-card__body">
                <div class="data-card__title">${s.id || 'N/D'} <span class="data-card__sep">·</span> ${s.compania || 'N/D'}</div>
                <div class="data-card__meta">
                    ${s.fecha_apertura ? `<span><i class="bi bi-calendar3"></i> ${s.fecha_apertura}</span>` : ''}
                    ${s.causa ? `<span>${s.causa}</span>` : ''}
                    ${s.cia_poliza ? `<span>Póliza ${s.cia_poliza}</span>` : ''}
                    ${ramo ? `<span><i class="bi bi-shield-check"></i> ${ramo}</span>` : ''}
                    ${riesgo ? `<span><i class="bi bi-geo-alt"></i> ${riesgo}</span>` : ''}
                </div>
                <div class="data-card__status">${cerrado
                    ? '<span class="status-dot status-dot--ko"></span> Cerrado'
                    : '<span class="status-dot status-dot--ok"></span> Abierto'
                }</div>
                ${timelineHtml}
            </div>
            ${tieneDocs ? `<button class="data-card__btn ver-documentos-btn" data-siniestro="${s.id}" title="Ver documentos"><i class="bi bi-folder2-open"></i></button>` : ''}
        </div>`;
    }

    const count = siniestros.length;
    const MAX_VISIBLE = 5;
    const showSearch = count > MAX_VISIBLE;

    const visibleCards = siniestros.slice(0, MAX_VISIBLE).map(s => buildSiniestroCard(s)).join('');
    let hiddenHtml = '';
    if (count > MAX_VISIBLE) {
        const rest = count - MAX_VISIBLE;
        hiddenHtml = `
            <details class="data-group__more">
                <summary class="data-group__more-btn"><i class="bi bi-chevron-down"></i> Ver ${rest} siniestro${rest > 1 ? 's' : ''} más</summary>
                ${siniestros.slice(MAX_VISIBLE).map(s => buildSiniestroCard(s)).join('')}
            </details>`;
    }

    const searchHtml = showSearch
        ? `<div class="data-panel__search"><i class="bi bi-search"></i><input type="text" class="data-panel__search-input" placeholder="Buscar siniestro…"></div>`
        : '';

    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-exclamation-triangle"></i> Siniestros <span class="data-panel__count">${count}</span></div>
            ${searchHtml}
            <div class="data-panel__list">
                ${visibleCards}
                ${hiddenHtml}
            </div>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;

    // Búsqueda
    const searchInput = container.querySelector('.data-panel__search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = norm(searchInput.value.trim());
            const listEl = searchInput.closest('.data-panel').querySelector('.data-panel__list');
            const detailsEl = listEl.querySelector('.data-group__more');
            if (q) {
                if (detailsEl) detailsEl.open = true;
                listEl.querySelectorAll('.data-card').forEach(card => {
                    card.style.display = card.dataset.searchable?.includes(q) ? '' : 'none';
                });
            } else {
                if (detailsEl) detailsEl.open = false;
                listEl.querySelectorAll('.data-card').forEach(card => { card.style.display = ''; });
            }
        });
    }

    container.querySelectorAll('.ver-documentos-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            renderDocumentos(e.currentTarget.dataset.siniestro);
        });
    });
}

export function renderSiniestrosTramites(siniestroId = null) {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    if (!data?.tramites?.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-clock-history"></i> No hay trámites disponibles</div>');
        return;
    }

    const tramitesFiltrados = siniestroId
        ? data.tramites.filter(t => t.siniestro == siniestroId)
        : data.tramites;

    if (!tramitesFiltrados.length) {
        addMessageToChat('bot', `<div class="data-empty"><i class="bi bi-clock-history"></i> No hay trámites${siniestroId ? ' para el siniestro ' + siniestroId : ''}</div>`);
        return;
    }

    const grouped = tramitesFiltrados.reduce((acc, t) => {
        if (!acc[t.siniestro]) acc[t.siniestro] = [];
        acc[t.siniestro].push(t);
        return acc;
    }, {});

    let panels = '';
    Object.entries(grouped).forEach(([siniestro, tramites]) => {
        const items = tramites.map(t => {
            const adjuntosJson = t.adjuntos ? JSON.parse(t.adjuntos) : null;
            return `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div class="timeline-date">${t.fecha_creacion}</div>
                        <div class="timeline-traza">${t.traza}</div>
                        ${t.mensaje ? `<div class="timeline-mensaje">${t.mensaje}</div>` : ''}
                        ${adjuntosJson?.descripcion ? `<span class="timeline-adjunto"><i class="bi bi-paperclip"></i> ${adjuntosJson.descripcion}</span>` : ''}
                    </div>
                </div>`;
        }).join('');

        panels += `
            <div class="data-card">
                <div class="data-card__body" style="width:100%">
                    <div class="data-card__title">Siniestro ${siniestro}</div>
                    <div class="siniestro-timeline">${items}</div>
                </div>
            </div>`;
    });

    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-clock-history"></i> Trámites</div>
            ${panels}
        </div>`;

    addMessageToChat('bot', html);
}
