// clientes.js
import { getClientes } from './storage.js';
import { addMessageToChat } from './chat.js';
import { updateHeaderClient } from './header.js';

export function renderClientesSelect($select) {
    const clientes = getClientes();
    $select.empty();

    // Opción inicial
    $select.append('<option value="">Selecciona un cliente</option>');

    // Añadir clientes
    clientes.forEach(c => {
        $select.append(new Option(c.nombre, c.nif, false, false));
    });

    // Inicializar Select2
    $select.select2({
        theme: "bootstrap-5",
        placeholder: "Selecciona un cliente",
        dropdownParent: $('#clienteModal'),
        allowClear: true,
        closeOnSelect: true,
        width: '100%',
        templateResult: function (data) {
            if (!data.id) return data.text;
            const cliente = clientes.find(c => c.nif === data.id);
            if (!cliente) return data.text;

            return $(`
                <div>
                    <strong>${cliente.nombre}</strong><br>
                    <small class="text-muted">${cliente.nif}</small>
                </div>
            `);
        },
        templateSelection: function (data) {
            if (!data.id) return data.text;
            const cliente = clientes.find(c => c.nif === data.id);
            return cliente ? `${cliente.nombre} (${cliente.nif})` : data.text;
        },
        matcher: function (params, data) {
            if ($.trim(params.term) === '') return data;

            const cliente = clientes.find(c => c.nif === data.id);
            if (!cliente) return null;

            const term = params.term.toLowerCase();
            // Busca en varios campos
            if (
                cliente.nombre.toLowerCase().includes(term) ||
                cliente.nif.toLowerCase().includes(term)
            ) {
                return data;
            }

            return null;
        }
    });

}

// Función principal para manejar la selección de cliente
export function handleClienteSelection($select, clienteModal) {
    document.getElementById('client-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const selectedClient = $select.val();
        if (!selectedClient) return;

        clienteModal.hide();
        console.log('Cliente seleccionado:', selectedClient);
        // Llamada a API
        await fetchCliente(selectedClient);
    });
}

// Función para obtener y almacenar clientes desde la API
export async function storeClientesList() {
    const token = localStorage.getItem('userToken');
    const data = await fetchClientesList(token); // <-- await aquí
    console.log('Clientes obtenidos:', data);
    if (data) {
        localStorage.setItem('clientes', JSON.stringify(data));
        renderClientesSelect($('#client-select'));
    }
}

export function renderModCliente(cuentaActual, movilActual, emailActual) {
    document.getElementById('modal-cuenta').value = cuentaActual || '';
    document.getElementById('modal-movil').value = movilActual || '';
    document.getElementById('modal-email').value = emailActual || '';
    document.getElementById('error-validacion').innerText = '';

    const modal = new bootstrap.Modal(document.getElementById('modClienteModal'));
    modal.show();

    // Capturar el submit
    const form = document.getElementById('modClienteForm');
    form.onsubmit = async function (e) {
        e.preventDefault();

        const cuenta = document.getElementById('modal-cuenta').value.trim();
        const movil = document.getElementById('modal-movil').value.trim();
        const email = document.getElementById('modal-email').value.trim();

        // Validaciones
        if (!cuenta || !movil || !email) {
            document.getElementById('error-validacion').innerText = 'Todos los campos son obligatorios';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            document.getElementById('error-validacion').innerText = 'Email no válido';
            return;
        }

        // Datos válidos
        const datos = { cuenta, movil, email };
        console.log('Datos modificados:', datos);

        // Aquí puedes hacer tu llamada a API para guardar los datos
        // await guardarDatos(datos);

        modal.hide();
    };
}

// Llamada a la API para obtener los datos del cliente
async function fetchClienteData(clientId, token) {
    try {
        const response = await fetch(`${ENV.API_URL}/resumen?nif=${clientId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Empresa': 'pacc',
                'Device': 'web'
            }
        });
        if (!response.ok) throw new Error('Error al obtener datos del cliente');
        return await response.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

// Llamada a la API para obtener la lista de clientes
async function fetchClientesList(token) {
    try {
        const response = await fetch(`${ENV.API_URL}/clientes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Empresa': 'pacc',
                'Device': 'web'
            }
        });
        if (!response.ok) throw new Error('Error al obtener datos del cliente');
        return await response.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

// Función que combina fetch
// Función que combina fetch con swal
async function fetchCliente(clientId) {
    const token = localStorage.getItem('userToken');

    // Mostrar el swal de cargando
    Swal.fire({
        title: 'Cargando datos...',
        text: 'Por favor, espera un momento.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const data = await fetchClienteData(clientId, token);

        localStorage.setItem('clienteData', JSON.stringify(data));
        updateHeaderClient();

        Swal.close(); // cerrar swal al terminar
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron obtener los datos del cliente.'
        });
        console.error(error);
    }
}

export function renderFichaCliente() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.cliente) return;

    const c = data.cliente;
    const polizasActivas = data.polizas ? data.polizas.filter(p => p.situacion === 1).length : 0;
    const polizasVencidas = data.polizas ? data.polizas.filter(p => p.situacion !== 1).length : 0;
    const siniestrosAbiertos = data.siniestros ? data.siniestros.filter(s => s.estado !== 'Cerrado').length : 0;
    const siniestrosCerrados = data.siniestros ? data.siniestros.filter(s => s.estado === 'Cerrado').length : 0;
    const html = `
        <div class="row row-cols-1 g-3">
            <div class="col">
                <div class="card shadow-sm border-0 rounded-3">
                    <div class="card-body">

                        <!-- Encabezado con nombre y NIF -->
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 class="card-title mb-1">${c.nombre}</h6>
                                <small class="text-muted">${c.nif}</small>
                            </div>
                            <div class="d-flex align-items-center gap-1">
                                ${c.cliente_fiel ? '<i class="bi bi-heart-fill text-danger" title="Cliente fiel"></i>' : ''}
                                <i class="bi bi-star-fill text-warning" title="Importancia"></i> ${c.cod_importancia}€
                            </div>
                        </div>

                        <!-- Contacto -->
                        <div class="mb-2">
                            <small class="text-secondary d-block"><i class="bi bi-telephone me-1"></i> ${c.telefono}</small>
                            <small class="text-secondary d-block"><i class="bi bi-envelope me-1"></i> ${c.email}</small>
                            <small class="text-secondary d-block"><i class="bi bi-geo-alt me-1"></i> ${c.domicilio}</small>
                        </div>

                        <!-- Tipo -->
                        <div class="mb-2 d-flex gap-2 flex-wrap">
                            <small class="d-inline-flex align-items-center px-2 py-1 fw-semibold text-info-emphasis bg-info-subtle border border-info-subtle rounded-2">
                                ${c.tipo || 'N/A'}
                            </small>
                            ${c.cliente_fiel
            ? '<small class="d-inline-flex align-items-center px-2 py-1 fw-semibold text-danger-emphasis bg-danger-subtle border border-danger-subtle rounded-2">Fiel</small>'
            : '<small class="d-inline-flex align-items-center px-2 py-1 fw-semibold text-secondary-emphasis bg-secondary-subtle border border-secondary-subtle rounded-2">No fiel</small>'}
                        </div>

                        <!-- Polizas y Siniestros con pills -->
                        <div class="mt-2 d-flex flex-wrap gap-2">
                            <small class="d-inline-flex align-items-center px-2 py-1 fw-semibold text-success-emphasis bg-success-subtle border border-success-subtle rounded-2">
                                Pólizas activas: ${polizasActivas}
                            </small>
                            <small class="d-inline-flex align-items-center px-2 py-1 fw-semibold text-secondary-emphasis bg-secondary-subtle border border-secondary-subtle rounded-2">
                                Pólizas vencidas: ${polizasVencidas}
                            </small>
                            <small class="d-inline-flex align-items-center px-2 py-1 fw-semibold text-warning-emphasis bg-warning-subtle border border-warning-subtle rounded-2">
                                Siniestros abiertos: ${siniestrosAbiertos}
                            </small>
                            <small class="d-inline-flex align-items-center px-2 py-1 fw-semibold text-dark-emphasis bg-dark-subtle border border-dark-subtle rounded-2">
                                Siniestros cerrados: ${siniestrosCerrados}
                            </small>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    `;
    addMessageToChat('bot', html);
}

