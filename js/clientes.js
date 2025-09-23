// clientes.js
import { getClientes, storeSelectedClient } from './storage.js';
import { addMessageToChat } from './chat.js';
import { updateHeaderClient } from './header.js';

export function renderClientesSelect($select) {
    const clientes = getClientes();
    $select.empty();
    $select.append('<option value="">Selecciona un cliente</option>');
    clientes.forEach(c => {
        $select.append(new Option(c.text, c.id));
    });
}

// Función principal para manejar la selección de cliente
export function handleClienteSelection($select, clientModal) {
    document.getElementById('client-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const selectedClient = $select.val();
        if (!selectedClient) return;

        storeSelectedClient(selectedClient);
        clientModal.hide();
        updateHeaderClient();

        console.log('Cliente seleccionado:', selectedClient);

        // Llamada a API
        await fetchCliente(selectedClient);
    });
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

// Función que combina fetch
async function fetchCliente(clientId) {
    const token = localStorage.getItem('userToken');
    const data = await fetchClienteData(clientId, token);
    localStorage.setItem('clienteData', JSON.stringify(data));
}
