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
                    <!-- Línea 1: número, tipo de siniestro, póliza y compañía -->
                    <strong class="small d-block">
                        ${s.id || 'N/D'} · ${estado || 'N/D'} · ${s.compania || 'N/D'}
                    </strong>

                    <!-- Línea 2: fecha y estado -->
                    <small class="d-block">
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

