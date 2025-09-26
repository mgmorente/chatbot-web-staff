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
            <div class="col">
                <div class="card shadow-sm h-100 border-0 p-2">
                    <div class="d-flex flex-column ${textoClase}">
                        <small class="d-block">
                            <strong>${r.recibo}</strong> · ${r.ramo} · ${r.compania} · ${r.cia_poliza}
                        </small>
                        <small class="d-block text-secondary">
                            <i class="bi bi-calendar"></i> ${r.fecha_efecto} → ${r.fecha_vencimiento} ·
                            Prima: ${r.prima_total}€ ·
                            ${r.situacion}
                        </small>
                    </div>
                </div>
            </div>
        `;
    });

    const html = `<div class="row row-cols-1 g-2">${htmlParts.join('')}</div>`;
    addMessageToChat('bot', html);
}
