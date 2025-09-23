// clientes.js
import { getClientes, storeSelectedClient } from './storage.js';
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
        theme: "bootstrap-5", // o "default"
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
        }
    });
}

// Función principal para manejar la selección de cliente
export function handleClienteSelection($select, clienteModal) {
    document.getElementById('client-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const selectedClient = $select.val();
        if (!selectedClient) return;

        storeSelectedClient(selectedClient);
        clienteModal.hide();
        updateHeaderClient();

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
    }
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
async function fetchCliente(clientId) {
    const token = localStorage.getItem('userToken');
    const data = await fetchClienteData(clientId, token);
    localStorage.setItem('clienteData', JSON.stringify(data));
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
        <div class="row row-cols-1 g-2">
            <div class="col">
                <div class="card shadow-sm h-100 border-0 p-2">
                    <div class="d-flex flex-column">
                        <strong class="small d-block">${c.nombre} · ${c.nif}</strong>
                        <small class="d-block text-secondary">
                        <i class="bi bi-telephone"></i> ${c.telefono} ·
                        <i class="bi bi-envelope"></i> ${c.email} ·
                        <i class="bi bi-geo-alt"></i> ${c.domicilio}
                        </small>
                        <small class="d-block text-secondary">
                            ${c.tipo || 'N/A'} ·
                            ${c.cliente_fiel ? '<i class="bi bi-heart-fill text-danger"></i> Cliente fiel' : 'No fiel'} ·
                            <i class="bi bi-star-fill"></i> ${c.cod_importancia}€
                        </small>
                        <small class="d-block text-secondary">
                            <strong>Pólizas</strong> ${polizasActivas} activas / ${polizasVencidas} vencidas ·
                            <strong>Siniestros</strong> ${siniestrosAbiertos} abiertos / ${siniestrosCerrados} cerrados
                        </small>
                    </div>
                </div>
            </div>
        </div>
        `;
    addMessageToChat('bot', html);
}

