import { addMessageToChat } from './chat.js';

export function renderRecibosCliente() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.recibos || !data.recibos.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay recibos disponibles.</div>');
        return;
    }

    const htmlParts = data.recibos.map(r => {
        const textoClase = r.situacion === 'Cobrado' ? '' : 'text-danger';

        return `
            <li class="list-group-item ${textoClase}">
                <small class="d-block">
                    <strong>${r.recibo}</strong> · ${r.ramo} · ${r.compania} · ${r.cia_poliza}
                </small>
                <small class="d-block text-secondary">
                    <i class="bi bi-calendar"></i> ${r.fecha_efecto} → ${r.fecha_vencimiento} ·
                    Prima: ${r.prima_total}€ ·
                    ${r.situacion}
                </small>
            </li>
        `;
    });

    const html = `
        <div><small class="text-muted fst-italic">Recibos</small></div>
        <ul class="list-group list-group-flush">${htmlParts.join('')}</ul>
    `;
    addMessageToChat('bot', html);
}
