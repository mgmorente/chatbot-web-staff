import { addMessageToChat } from './chat.js';

// polizas.js
export function renderPolizasSelect($select, polizas) {
    $select.empty();

    // Opción inicial
    $select.append('<option value="">Selecciona una póliza</option>');

    // Añadir pólizas (valor = número de póliza)
    polizas.forEach(p => {
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
        dropdownParent: $('#duplicadoPolizaModal'), // ajusta si el select está dentro de un modal
        allowClear: true,
        closeOnSelect: true,
        width: '100%',
        templateResult: function (data) {
            if (!data.id) return data.text;
            const poliza = polizas.find(p => p.poliza === data.id);
            if (!poliza) return data.text;

            // Buscar icono por ramo, si no existe usar default
            const iconClass = ramoIcons[poliza.ramo] || ramoIcons["Otros"];

            return $(`
                <div>
                    <strong>${poliza.cia_poliza}</strong> ·
                    <small class="text-muted">${poliza.compania}</small> · 
                    <small class="text-muted">${poliza.ramo}</small>
                    ${poliza.objeto
                    ? `<br><small class="text-muted"><i class="${iconClass} me-1"></i>${poliza.objeto}</small>`
                    : ""
                }
                </div>
            `);
        },
        templateSelection: function (data) {
            if (!data.id) return data.text;
            const poliza = polizas.find(p => p.poliza === data.id);
            return poliza
                ? `${poliza.poliza} - ${poliza.compania}`
                : data.text;
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

export function renderPolizasCliente() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.polizas || !data.polizas.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay pólizas disponibles.</div>');
        return;
    }

    const htmlParts = data.polizas.map(p => {
        const situacion = p.situacion === 1 ? 'Activa' : 'No activa';
        const textoClase = situacion === 'Activa' ? '' : 'text-danger';

        return `
            <div class="col">
                <div class="card shadow-sm h-100 border-0 p-2">
                    <div class="d-flex justify-content-between align-items-start ${textoClase}">
                        
                        <div class="flex-grow-1 me-2">
                            <small class="d-block">
                                <strong>${p.cia_poliza}</strong> · ${p.tipo_producto} · ${p.compania}
                            </small>
                            <small class="d-block text-secondary">
                                <i class="bi bi-calendar"></i> ${p.fecha_efecto} → ${p.fecha_vencimiento} ·
                                Prima: ${p.prima}€ ·
                                ${p.objeto ? ' · ' + p.objeto : ''} · 
                                ${situacion}
                            </small>
                        </div>

                        <div>
                            <button class="btn btn-sm btn-secondary">
                                <i class="bi bi-folder"></i>
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        `;
    });

    const html = `<div class="row row-cols-1 g-2">${htmlParts.join('')}</div>`;
    addMessageToChat('bot', html);
}
