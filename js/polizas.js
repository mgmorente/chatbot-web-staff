import { addMessageToChat } from './chat.js';
import { renderDocumentos } from './docs.js'; // importa tu función

// polizas.js
export function renderPolizasSelect($select, polizas) {
    $select.empty();

    // Filtrar solo pólizas con situacion = 1
    const polizasActivas = polizas.filter(p => p.situacion == 1);

    // Opción inicial
    $select.append('<option value="">Selecciona una póliza</option>');

    // Añadir pólizas activas
    polizasActivas.forEach(p => {
        $select.append(new Option(p.poliza, p.poliza, false, false));
    });

    // Mapa de iconos por ramo
    const ramoIcons = {
        "AUTOS": "fas fa-car",
        "HOGAR": "fas fa-home",
        "SALUD": "fas fa-briefcase-medical",
        "VIDA": "fas fa-heartbeat",
        "ACCIDENTES": "fas fa-user-injured",
        "PYME": "fa-solid fa-building",
        "COMERCIOS": "fa-solid fa-store",
        "Otros": "fas fa-file-contract"
    };

    // Inicializar Select2
    $select.select2({
        theme: "bootstrap-5",
        placeholder: "Selecciona una póliza",
        dropdownParent: $('#duplicadoPolizaModal'),
        allowClear: true,
        closeOnSelect: true,
        width: '100%',
        templateResult: function (data) {
            if (!data.id) return data.text;
            const poliza = polizasActivas.find(p => p.poliza === data.id);
            if (!poliza) return data.text;

            const iconClass = ramoIcons[poliza.tipo_producto.toUpperCase()] || ramoIcons["Otros"];

            return $(`
                <div>
                    <strong>${poliza.cia_poliza}</strong> ·
                    <small class="text-muted">${poliza.compania}</small> · 
                    <small class="text-muted">${poliza.ramo}</small>
                    ${poliza.objeto ? `<br><small class="text-muted"><i class="${iconClass} me-1"></i>${poliza.objeto} ${poliza.matricula}</small>` : ""}
                </div>
            `);
        },
        templateSelection: function (data) {
            if (!data.id) return data.text;
            const poliza = polizasActivas.find(p => p.poliza === data.id);
            return poliza
                ? `${poliza.poliza} - ${poliza.compania}${poliza.matricula ? ' - ' + poliza.matricula : ''}`
                : data.text;
        },
        matcher: function (params, data) {
            if ($.trim(params.term) === '') return data;

            const poliza = polizasActivas.find(p => p.poliza === data.id);
            if (!poliza) return null;

            // Concatenar campos para búsqueda, incluyendo matrícula
            const text = [
                poliza.poliza,
                poliza.compania,
                poliza.ramo,
                poliza.objeto,
                poliza.matricula || ''
            ].join(' ').toLowerCase();

            return text.indexOf(params.term.toLowerCase()) > -1 ? data : null;
        }
    });
}


export async function descargaPoliza(polizaId) {
    try {
        // Mostrar SweetAlert2 con loading
        Swal.fire({
            title: 'Descargando póliza...',
            text: 'Por favor, espera mientras se genera el PDF.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await fetch(
            `https://pacconline.grupo-pacc.es/api/api/eiac/duplicado?contrato=${polizaId}`,
            { method: 'GET', headers: { 'Content-Type': 'application/pdf' } }
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
        a.download = `duplicado_${polizaId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        // Cerrar loading y mostrar éxito
        Swal.fire({
            icon: 'success',
            title: 'Descarga completada',
            text: `La póliza ${polizaId} se ha descargado correctamente.`,
            timer: 3000,
            showConfirmButton: false
        });

    } catch (err) {
        console.error('Error descargaPoliza:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.message || 'Ocurrió un problema al descargar la póliza'
        });
    }
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
    addMessageToChat('bot', html);

    document.querySelectorAll('.ver-documentos-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const poliza = e.currentTarget.getAttribute('data-poliza');
                renderDocumentos(poliza);
            });
        });
}

