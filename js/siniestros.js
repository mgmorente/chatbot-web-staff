import { addMessageToChat } from './chat.js';
import { renderDocumentos } from './docs.js';

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

    const items = siniestros.map(s => {
        const cerrado = (s.estado || '').toLowerCase() === 'cerrado';
        const tramites = data.tramites ? data.tramites.filter(t => t.siniestro == s.id) : [];
        const tieneDocs = data.documentos?.some(doc => doc.entidad.toLowerCase() === 'siniestro' && doc.documento == s.id);

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
        <div class="data-card${cerrado ? ' data-card--muted' : ''}">
            <div class="data-card__icon"><i class="bi ${cerrado ? 'bi-lock' : 'bi-exclamation-triangle'}"></i></div>
            <div class="data-card__body">
                <div class="data-card__title">${s.id || 'N/D'} <span class="data-card__sep">·</span> ${s.compania || 'N/D'}</div>
                <div class="data-card__meta">
                    <span><i class="bi bi-calendar3"></i> ${s.fecha_apertura || 'N/D'}</span>
                    ${s.causa ? `<span>${s.causa}</span>` : ''}
                    <span>Póliza ${s.cia_poliza || 'N/D'}</span>
                </div>
                <div class="data-card__status">${cerrado
                    ? '<span class="status-dot status-dot--ko"></span> Cerrado'
                    : '<span class="status-dot status-dot--ok"></span> Abierto'
                }</div>
                ${timelineHtml}
            </div>
            ${tieneDocs ? `<button class="data-card__btn ver-documentos-btn" data-siniestro="${s.id}" title="Ver documentos"><i class="bi bi-folder2-open"></i></button>` : ''}
        </div>`;
    }).join('');

    const count = siniestros.length;
    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-exclamation-triangle"></i> Siniestros <span class="data-panel__count">${count}</span></div>
            ${items}
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;
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
