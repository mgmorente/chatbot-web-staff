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

export function renderModCliente() {
    const data = localStorage.getItem('clienteData')
        ? JSON.parse(localStorage.getItem('clienteData'))
        : null;

    document.getElementById('modal-movil').placeholder = data.cliente.telefono || '';
    document.getElementById('modal-email').placeholder = data.cliente.email || '';
    document.getElementById('error-validacion').innerText = '';

    const modal = new bootstrap.Modal(document.getElementById('modClienteModal'));
    modal.show();

    // Capturar el submit
    const form = document.getElementById('modClienteForm');
    form.onsubmit = async function (e) {
        e.preventDefault();

        const movil = document.getElementById('modal-movil').value.trim();
        const email = document.getElementById('modal-email').value.trim();

        // Validaciones
        if (!movil || !email) {
            document.getElementById('error-validacion').innerText = 'Todos los campos son obligatorios';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            document.getElementById('error-validacion').innerText = 'Email no válido';
            return;
        }

        // Datos válidos
        const datos = { movil, email };
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

async function fetchClienteAgenda(clientId, token) {
    try {
        const response = await fetch(`${ENV.API_URL}/agenda?nif=${clientId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Empresa': 'pacc',
                'Device': 'web'
            }
        });

        if (!response.ok) throw new Error('Error al obtener la agenda del cliente');

        return await response.json();
    } catch (error) {
        console.error(error);
        return null; // o lanzar el error si quieres manejarlo afuera
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
        const agenda = await fetchClienteAgenda(clientId, token);
        localStorage.setItem('clienteAgenda', JSON.stringify(agenda));

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
                <div class="card-body">

                    <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="card-title mb-1">${c.nombre}<small class="text-muted"> - ${c.nif}</small></h6>
                        
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <i class="bi bi-star-fill text-warning" title="Importancia"></i> ${c.cod_importancia}€
                    </div>
                    </div>

                    <ul class="list-group list-group-flush">

                    <li class="list-group-item">
                        <i class="bi bi-telephone me-1"></i>
                        <a href="tel:${c.telefono}">${c.telefono}</a>
                        ${c.email
                            ? `<br><i class="bi bi-envelope me-1"></i> <a href="#" class="email-cliente">${c.email}</a>`
                            : ''}
                        <br><i class="bi bi-geo-alt me-1"></i> ${c.domicilio}
                    </li>

                    <li class="list-group-item text-secondary">
                        <i class="bi bi-building me-1"></i> ${c.sucursal}<br>
                        <i class="bi bi-people me-1"></i> Colaborador: ${c.colaborador}<br>
                        <i class="bi bi-person-badge me-1"></i> ECuentas: ${c.ecuentas}
                    </li>

                    <li class="list-group-item">
                        ${c.cliente_fiel
                            ? '<span class="badge text-danger-emphasis bg-danger-subtle border border-danger-subtle me-1">FIEL</span>'
                            : ''}
                        <span class="badge text-info-emphasis bg-info-subtle border border-info-subtle">
                        ${c.tipo || 'N/A'}
                        </span>
                    
                        <span class="badge text-success-emphasis bg-success-subtle border border-success-subtle me-1">
                        Pólizas activas: ${polizasActivas}
                        </span>
                        <span class="badge text-secondary-emphasis bg-secondary-subtle border border-secondary-subtle me-1">
                        Pólizas vencidas: ${polizasVencidas}
                        </span>
                        <span class="badge text-warning-emphasis bg-warning-subtle border border-warning-subtle me-1">
                        Siniestros abiertos: ${siniestrosAbiertos}
                        </span>
                        <span class="badge text-secondary-emphasis bg-secondary-subtle border border-secondary-subtle">
                        Siniestros cerrados: ${siniestrosCerrados}
                        </span>
                    </li>

                    </ul>
                </div>

            </div>
        </div>
    `;
    addMessageToChat('bot', html);
}


