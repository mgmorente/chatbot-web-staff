import { addMessageToChat } from './chat.js';
// js/siniestros.js

// Renderiza la lista de siniestros con botón para ver trámites
export function renderSiniestrosCliente() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.siniestros || !data.siniestros.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay siniestros disponibles.</div>');
        return;
    }

    const htmlParts = data.siniestros.map(s => {
        const estado = s.estado || 'Desconocido';
        const textoClase = estado === 'Cerrado' ? 'text-danger' : '';

        return `
            <li class="list-group-item ${textoClase}">
                <div class="d-flex justify-content-between align-items-center">
                    <small>
                        <strong>${s.id || 'N/D'}</strong> · ${estado} · ${s.compania || 'N/D'}
                    </small>
                    <button class="btn btn-sm btn-outline-primary ver-tramites-btn" data-siniestro="${s.id}">
                        Ver trámites
                    </button>
                </div>
                <small class="d-block text-secondary mt-1">
                    <i class="bi bi-calendar me-2"></i>Apertura: ${s.fecha_apertura || 'N/D'} 
                    ${s.causa ? ' · Causa: ' + s.causa : ''} · 
                    Póliza: ${s.cia_poliza || 'N/D'}
                </small>
                <div class="tramites-container mt-2" id="tramites-${s.id}"></div>
            </li>
        `;
    });

    const html = `<ul class="list-group list-group-flush">${htmlParts.join('')}</ul>`;
    addMessageToChat('bot', html);

    // Listener para los botones de trámites
    document.querySelectorAll('.ver-tramites-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const siniestroId = e.currentTarget.getAttribute('data-siniestro');
            renderSiniestrosTramites(siniestroId);
        });
    });
}

// Renderiza los trámites, opcionalmente por siniestro
export function renderSiniestrosTramites(siniestroId = null) {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.tramites || !data.tramites.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay trámites disponibles.</div>');
        return;
    }

    // Filtrar por siniestro si se pasa un ID
    const tramitesFiltrados = siniestroId
        ? data.tramites.filter(t => t.siniestro == siniestroId)
        : data.tramites;

    if (!tramitesFiltrados.length) {
        addMessageToChat('bot', `<div class="text-warning">No hay trámites disponibles${siniestroId ? ' para el siniestro ' + siniestroId : ''}.</div>`);
        return;
    }

    // Agrupar por siniestro
    const grouped = tramitesFiltrados.reduce((acc, t) => {
        if (!acc[t.siniestro]) acc[t.siniestro] = [];
        acc[t.siniestro].push(t);
        return acc;
    }, {});

    // Construir todo el HTML en una sola cadena
    let html = '';

    Object.entries(grouped).forEach(([siniestro, tramites]) => {
        const tramitesHtml = tramites.map(t => {
            const adjuntosJson = t.adjuntos ? JSON.parse(t.adjuntos) : null;

            return `
                <li class="list-group-item">
                    <small class="d-block text-muted">${t.fecha_creacion}</small>
                    <small class="d-block">${t.traza}</small>
                    <small class="d-block">
                        <div class="p-2 rounded bg-light">
                            ${t.mensaje}
                            ${adjuntosJson && adjuntosJson.descripcion
                                ? `<div class="mt-1">
                                        <a href="#" class="ver-adjuntos" title="Ver adjuntos">
                                            <i class="bi bi-paperclip"></i> ${adjuntosJson.descripcion}
                                        </a>
                                   </div>`
                                : ''}
                        </div>
                    </small>
                </li>
            `;
        }).join('');

        html += `
            <div>
                <div><small class="fw-bold">Siniestro ${siniestro}</small></div>
                <ul class="list-group list-group-flush">${tramitesHtml}</ul>
            </div>
        `;
    });

    // Llamada única a addMessageToChat
    addMessageToChat('bot', html);
}

