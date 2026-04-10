import { addMessageToChat } from './chat.js';
import { renderDocumentos } from './docs.js'; // importa tu función
import { showLoading } from './utils.js';

// polizas.js

export async function descargaPoliza(poliza) {
    try {
        showLoading();

        const response = await fetch(
            `${ENV.API_URL_PRODUCCION}/eiac/duplicado?contrato=${poliza}`,
            {
                method: 'GET',
                headers: { 'Accept': 'application/pdf' }
            }
        );

        const contentType = response.headers.get('Content-Type');

        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message || 'Ocurrió un error al descargar la póliza'
            });
            return;
        }

        // Si es PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `duplicado_${poliza}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        Swal.fire('Descarga completada', 'El duplicado se descargo correctamente', 'success');

    } catch (err) {
        console.error('Error descargaPoliza:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.message || 'Ocurrió un problema al descargar la póliza'
        });
    }
}

export async function walletPoliza(poliza) {
    try {
        showLoading();

        await fetch(
            `${ENV.API_URL_PRODUCCION}/cliente/generar-pkpass?contrato=${poliza}`,
            {
                method: 'GET', 
                headers: {
                    'Accept': 'application/json',
                    'Empresa': ENV.EMPRESA,
                    'Device': ENV.DEVICE,
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.mensaje) {
                    Swal.fire('Atención', data.mensaje, 'info');
                } else if (data.pkpass) {
                    Swal.fire('Envio completado', 'El wallet se envió correctamente', 'success');
                } else {
                    Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
                }
            })

    } catch (err) {
        console.error('Error walletPoliza:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.message || 'Ocurrió un problema al descargar wallet'
        });
    }
}

// Mostrar pólizas activas en el chat para seleccionar y descargar duplicado
export function renderDuplicadoInline() {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    const polizasActivas = data?.polizas?.filter(p => p.situacion == 1) || [];

    if (!polizasActivas.length) {
        addMessageToChat('bot', '<div>No hay pólizas activas para duplicar.</div>');
        return;
    }

    const ramoIcons = {
        "AUTOS": "bi-car-front", "HOGAR": "bi-house", "SALUD": "bi-heart-pulse",
        "VIDA": "bi-heart", "ACCIDENTES": "bi-bandaid", "PYME": "bi-building",
        "COMERCIOS": "bi-shop"
    };

    const items = polizasActivas.map(p => {
        const icon = ramoIcons[p.tipo_producto?.toUpperCase()] || 'bi-file-earmark-text';
        return `
            <li class="list-group-item poliza-selectable" role="button" data-poliza="${p.poliza}" data-action="duplicado">
                <div class="d-flex justify-content-between align-items-center">
                    <small>
                        <i class="bi ${icon} me-1"></i>
                        <strong>${p.cia_poliza}</strong> · ${p.compania}
                    </small>
                    <span class="badge text-bg-primary"><i class="bi bi-download"></i></span>
                </div>
                <small class="d-block mt-1">
                    ${p.ramo || p.tipo_producto} ${p.objeto ? ' · ' + p.objeto : ''}${p.matricula ? ' · ' + p.matricula : ''}
                </small>
            </li>`;
    }).join('');

    const html = `
        <div><small class="text-success fst-italic">Selecciona una póliza para descargar duplicado</small></div>
        <ul class="list-group list-group-flush">${items}</ul>
    `;
    const msgEl = addMessageToChat('bot', html);

    const container = msgEl || document;
    container.querySelectorAll('.poliza-selectable[data-action="duplicado"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const poliza = e.currentTarget.getAttribute('data-poliza');
            addMessageToChat('user', `Duplicado: ${e.currentTarget.querySelector('strong').textContent}`);
            descargaPoliza(poliza);
        });
    });
}

// Mostrar pólizas activas en el chat para seleccionar y enviar wallet
export function renderWalletInline() {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    const polizasActivas = data?.polizas?.filter(p => p.situacion == 1) || [];

    if (!polizasActivas.length) {
        addMessageToChat('bot', '<div>No hay pólizas activas para wallet.</div>');
        return;
    }

    const ramoIcons = {
        "AUTOS": "bi-car-front", "HOGAR": "bi-house", "SALUD": "bi-heart-pulse",
        "VIDA": "bi-heart", "ACCIDENTES": "bi-bandaid", "PYME": "bi-building",
        "COMERCIOS": "bi-shop"
    };

    const items = polizasActivas.map(p => {
        const icon = ramoIcons[p.tipo_producto?.toUpperCase()] || 'bi-file-earmark-text';
        return `
            <li class="list-group-item poliza-selectable" role="button" data-poliza="${p.poliza}" data-action="wallet">
                <div class="d-flex justify-content-between align-items-center">
                    <small>
                        <i class="bi ${icon} me-1"></i>
                        <strong>${p.cia_poliza}</strong> · ${p.compania}
                    </small>
                    <span class="badge text-bg-success"><i class="bi bi-wallet2"></i></span>
                </div>
                <small class="d-block mt-1">
                    ${p.ramo || p.tipo_producto} ${p.objeto ? ' · ' + p.objeto : ''}${p.matricula ? ' · ' + p.matricula : ''}
                </small>
            </li>`;
    }).join('');

    const html = `
        <div><small class="text-success fst-italic">Selecciona una póliza para enviar wallet</small></div>
        <ul class="list-group list-group-flush">${items}</ul>
    `;
    const msgEl = addMessageToChat('bot', html);

    const container = msgEl || document;
    container.querySelectorAll('.poliza-selectable[data-action="wallet"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const poliza = e.currentTarget.getAttribute('data-poliza');
            addMessageToChat('user', `Wallet: ${e.currentTarget.querySelector('strong').textContent}`);
            walletPoliza(poliza);
        });
    });
}

export function renderPolizasCliente(d) {
    const data = localStorage.getItem('clienteData')
        ? JSON.parse(localStorage.getItem('clienteData'))
        : null;

    if (!data || !data.polizas || !data.polizas.length) {
        addMessageToChat('bot', '<div>No hay pólizas disponibles.</div>');
        return;
    }

    // Filtros recibidos desde la IA (pueden ser varios)
    const filtros = d.args || {};

    const polizasFiltradas = data.polizas.filter(p => {
        // Para cada filtro, comprobamos si se cumple en la póliza
        return Object.entries(filtros).every(([key, value]) => {
            if (!value) return true; // si el filtro no tiene valor, lo ignoramos

            // Mapeamos los campos de la póliza a las posibles claves
            switch (key) {
                case "ramo":
                    return p.tipo_producto?.toLowerCase().includes(value.toLowerCase());
                case "compania":
                    return p.compania?.toLowerCase().includes(value.toLowerCase());
                case "fecha_efecto":
                    return p.fecha_efecto?.toLowerCase().includes(value.toLowerCase());
                case "estado":
                    const estado = p.situacion === 1 ? "activa" : "anulada";
                    return estado === value.toLowerCase();
                default:
                    return true; // si llega un filtro que no mapeamos, lo ignoramos
            }
        });
    });

    if (!polizasFiltradas.length) {
        addMessageToChat(
            'bot',
            `<div>No hay pólizas que cumplan las condiciones indicadas.</div>`
        );
        return;
    }

    const htmlParts = polizasFiltradas.map(p => {
        const situacion = p.situacion === 1 ? 'activa' : 'anulada';
        const textoClase = situacion === 'activa' ? '' : 'text-danger';
        const tieneDocs = data.documentos && data.documentos.some(d => d.entidad.toLowerCase() === 'poliza' && d.documento == p.poliza);

        return `
            <li class="list-group-item d-flex justify-content-between align-items-start ${textoClase}">
                <div class="flex-grow-1 me-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="d-block">
                            <strong>${p.cia_poliza}</strong> · ${p.tipo_producto.toUpperCase()} · ${p.compania}
                        </small>
                        <div>
                            ${tieneDocs ? `<span class="badge text-bg-secondary ver-documentos-btn" role="button" data-poliza="${p.poliza}">Docs</span>` : ''}
                        </div>
                    </div>
                    <small class="d-block mt-1">
                        <i class="bi bi-calendar"></i> Vence: ${p.fecha_vencimiento} ·
                        Prima: ${p.prima}€ 
                        ${p.objeto ? ' · ' + p.objeto : ''}
                    </small>
                </div>            
            </li>
        `;
    });

    const html = `
        <div><small class="text-success fst-italic">Pólizas</small></div>
        <ul class="list-group list-group-flush">${htmlParts.join('')}</ul>
    `;
    const msgEl = addMessageToChat('bot', html);

    const container = msgEl || document;
    container.querySelectorAll('.ver-documentos-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const poliza = e.currentTarget.getAttribute('data-poliza');
            renderDocumentos(poliza);
        });
    });
}

