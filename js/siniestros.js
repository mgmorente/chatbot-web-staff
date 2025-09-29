import { addMessageToChat } from './chat.js';

// siniestros
export function renderSiniestrosCliente() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.siniestros || !data.siniestros.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay siniestros disponibles.</div>');
        return;
    }

    const htmlParts = data.siniestros.map(s => {
        const estado = s.estado || 'Desconocido';
        const textoClase = estado === 'Cerrado' ? 'text-danger' : ''; // rojo si cerrado

        return `
            <li class="list-group-item ${textoClase}">
                <small class="d-block">
                    <strong>${s.id || 'N/D'}</strong> · ${estado} · ${s.compania || 'N/D'}
                </small>
                <small class="d-block text-secondary">
                    <i class="bi bi-calendar me-2"></i>Apertura: ${s.fecha_apertura || 'N/D'} 
                    ${s.causa ? ' · Causa: ' + s.causa : ''} · 
                    Póliza: ${s.cia_poliza || 'N/D'}
                </small>
            </li>
        `;
    });

    const html = `<ul class="list-group list-group-flush">${htmlParts.join('')}</ul>`;
    addMessageToChat('bot', html);
}

// tramites
export function renderSiniestrosTramites() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.tramites || !data.tramites.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay trámites disponibles.</div>');
        return;
    }

    const htmlParts = data.siniestros.map(s => {
    const adjuntosJson = s.adjuntos ? JSON.parse(s.adjuntos) : null;

        return `
            <li class="list-group-item">
                <div class="d-flex justify-content-between w-100">
                    <strong class="small">Siniestro ${s.siniestro}</strong>
                    <span class="small text-muted">${s.fecha_creacion}</span>
                </div>
                
                <small class="d-block">${s.traza},</small>

                <small class="d-block">
                    ${s.mensaje}
                    ${adjuntosJson && adjuntosJson.descripcion
                        ? `<div>
                                <a href="#" class="ver-adjuntos" title="Ver adjuntos">
                                    <i class="bi bi-paperclip"></i> ${adjuntosJson.descripcion}
                                </a>
                            </div>`
                        : ''}
                </small>
            </li>
        `;
    });

    const html = `<ul class="list-group list-group-flush">${htmlParts.join('')}</ul>`;
    addMessageToChat('bot', html);
}
