import { addMessageToChat } from './chat.js';

export function renderSiniestrosCliente() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.siniestros || !data.siniestros.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay siniestros disponibles.</div>');
        return;
    }

    const htmlParts = data.siniestros.map(s => {
        const estado = s.estado || 'Desconocido';
        const textoClase = estado === 'Cerrado' ? 'text-danger' : ''; // en rojo si no está cerrado

        return `
        <div class="col">
            <div class="card shadow-sm h-100 border-0 p-2">
                <div class="d-flex flex-column ${textoClase}">
                    <small class="d-block">
                        <strong>${s.id || 'N/D'}</strong> · ${estado || 'N/D'} · ${s.compania || 'N/D'}
                    </small>
                    <small class="d-block text-secondary">
                        <i class="bi bi-calendar me-2"></i>Apertura: ${s.fecha_apertura || 'N/D'} · 
                        Causa: ${s.causa ? ' · ' + s.causa : ''} · 
                        Póliza: ${s.cia_poliza}
                    </small>
                </div>
            </div>
        </div>
        `;
    });

    const html = `<div class="row row-cols-1 g-2">${htmlParts.join('')}</div>`;
    addMessageToChat('bot', html);
}

export function renderSiniestrosTramites() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.tramites || !data.tramites.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay trámites disponibles.</div>');
        return;
    }

    const htmlParts = data.tramites.map(s => {

        let adjuntosJson = [];
        try {
            adjuntosJson = JSON.parse(s.adjuntos);
        } catch (e) {
            console.error("Error al parsear adjuntos:", e);
        }

        return `
        <div class="col">
            <div class="card shadow-sm h-100 border-0 p-2">
                <div class="d-flex flex-column">

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

                </div>
            </div>
        </div>
        `;
    });

    const html = `<div class="row row-cols-1 g-2">${htmlParts.join('')}</div>`;
    addMessageToChat('bot', html);
}

