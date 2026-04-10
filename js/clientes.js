// clientes.js
import { getClientes, addClienteReciente, getClientesRecientes } from './storage.js';
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
                    <small style="color: var(--staff-text-muted, #94a3b8)">${cliente.nif}</small>
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
        // Llamada a API
        await fetchCliente(selectedClient);
    });
}

// Función para obtener y almacenar clientes desde la API
export async function storeClientesList() {
    const token = localStorage.getItem('userToken');
    const data = await fetchClientesList(token); // <-- await aquí
    if (data) {
        localStorage.setItem('clientes', JSON.stringify(data));
        renderClientesSelect($('#client-select'));
    }
}

export async function recargarDatosCliente() {
    const data = localStorage.getItem('clienteData')
        ? JSON.parse(localStorage.getItem('clienteData'))
        : null;
    if (!data || !data.cliente) return;
    await fetchCliente(data.cliente.nif);
}

export function renderModCliente() {
    const data = localStorage.getItem('clienteData')
        ? JSON.parse(localStorage.getItem('clienteData'))
        : null;
    if (!data || !data.cliente) return;

    document.getElementById('movil_now').value = data.cliente.telefono || '';
    document.getElementById('email_now').value = data.cliente.email || '';

    const modal = new bootstrap.Modal(document.getElementById('modClienteModal'));
    modal.show();
}

// Llamada a la API para obtener los datos del cliente
async function fetchClienteData(clientId, token) {
    try {
        const response = await fetch(`${ENV.API_URL}/resumen?nif=${clientId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Empresa': ENV.EMPRESA,
                'Device': ENV.DEVICE
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
                'Empresa': ENV.EMPRESA,
                'Device': ENV.DEVICE
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
                'Empresa': ENV.EMPRESA,
                'Device': ENV.DEVICE
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

        // Guardar en historial de recientes
        if (data && data.cliente) {
            addClienteReciente(data.cliente.nif, data.cliente.nombre);
        }

        updateHeaderClient();
        document.dispatchEvent(new CustomEvent('clienteChanged'));
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
    const totalRecibos = data.recibos ? data.recibos.length : 0;
    const totalDocs = data.documentos ? data.documentos.length : 0;

    const html = `
        <div class="client-card">
            <!-- Cabecera con avatar y nombre -->
            <div class="client-card-header">
                <div class="client-avatar">
                    <i class="bi bi-person-fill"></i>
                </div>
                <div class="client-header-info">
                    <div class="client-name">${c.nombre}</div>
                    <div class="client-nif"><i class="bi bi-fingerprint"></i> ${c.nif}</div>
                    <div class="client-tags">
                        ${c.cliente_fiel ? '<span class="client-tag tag-fiel"><i class="bi bi-heart-fill"></i> FIEL</span>' : ''}
                        <span class="client-tag tag-tipo">${c.tipo || 'N/A'}</span>
                    </div>
                </div>
                <div class="client-valor">
                    <div class="client-valor-amount"><i class="bi bi-star-fill"></i> ${c.cod_importancia}€</div>
                    <div class="client-valor-label">Importancia</div>
                </div>
            </div>

            <!-- Stats grid -->
            <div class="client-stats">
                <div class="client-stat stat-success">
                    <div class="client-stat-value">${polizasActivas}</div>
                    <div class="client-stat-label">Pólizas activas</div>
                </div>
                <div class="client-stat stat-muted">
                    <div class="client-stat-value">${polizasVencidas}</div>
                    <div class="client-stat-label">Pólizas vencidas</div>
                </div>
                <div class="client-stat stat-warning">
                    <div class="client-stat-value">${siniestrosAbiertos}</div>
                    <div class="client-stat-label">Siniestros abiertos</div>
                </div>
                <div class="client-stat stat-closed">
                    <div class="client-stat-value">${siniestrosCerrados}</div>
                    <div class="client-stat-label">Siniestros cerrados</div>
                </div>
            </div>

            <!-- Datos de contacto -->
            <div class="client-contact">
                <div class="client-contact-item">
                    <div class="contact-icon icon-phone"><i class="bi bi-telephone-fill"></i></div>
                    <div class="contact-data">
                        <div class="contact-label">Teléfono</div>
                        <a href="tel:${c.telefono}" class="contact-value">${c.telefono}</a>
                    </div>
                </div>
                ${c.email ? `
                <div class="client-contact-item">
                    <div class="contact-icon icon-email"><i class="bi bi-envelope-fill"></i></div>
                    <div class="contact-data">
                        <div class="contact-label">Email</div>
                        <a href="#" class="contact-value email-cliente">${c.email}</a>
                    </div>
                </div>
                ` : ''}
                <div class="client-contact-item">
                    <div class="contact-icon icon-address"><i class="bi bi-geo-alt-fill"></i></div>
                    <div class="contact-data">
                        <div class="contact-label">Dirección</div>
                        <div class="contact-value">${c.domicilio}</div>
                    </div>
                </div>
            </div>

            <!-- Info interna -->
            <div class="client-internal">
                <div class="client-internal-item">
                    <i class="bi bi-building"></i>
                    <span class="internal-label">Sucursal</span>
                    <span class="internal-value">${c.sucursal}</span>
                </div>
                <div class="client-internal-item">
                    <i class="bi bi-people"></i>
                    <span class="internal-label">Colaborador</span>
                    <span class="internal-value">${c.colaborador}</span>
                </div>
                <div class="client-internal-item">
                    <i class="bi bi-person-badge"></i>
                    <span class="internal-label">ECuentas</span>
                    <span class="internal-value">${c.ecuentas}</span>
                </div>
            </div>
        </div>
    `;
    addMessageToChat('bot', html);
}

// --- Buscador global en el chat ---
// Detecta si el mensaje del usuario es una búsqueda de cliente (NIF o nombre)
// Retorna los resultados encontrados o null si no es una búsqueda
export function buscarClienteEnChat(message) {
    const clientes = getClientes();
    if (!clientes || clientes.length === 0) return null;

    const term = message.trim().toLowerCase();

    // Detectar patrones de búsqueda explícita
    const patronesBusqueda = [
        /^buscar\s+(.+)/i,
        /^busca\s+(.+)/i,
        /^cliente\s+(.+)/i,
        /^buscar cliente\s+(.+)/i,
        /^seleccionar\s+(.+)/i,
        /^cargar\s+(.+)/i,
    ];

    let terminoBusqueda = null;
    for (const patron of patronesBusqueda) {
        const match = message.match(patron);
        if (match) {
            terminoBusqueda = match[1].trim().toLowerCase();
            break;
        }
    }

    // Si no hay patrón explícito, comprobar si es un NIF (8 dígitos + letra o similar)
    if (!terminoBusqueda) {
        const nifPattern = /^[0-9]{7,8}[a-zA-Z]$/;
        const cifPattern = /^[a-zA-Z][0-9]{7,8}[a-zA-Z0-9]?$/;
        if (nifPattern.test(term) || cifPattern.test(term)) {
            terminoBusqueda = term;
        }
    }

    if (!terminoBusqueda) return null;

    // Buscar coincidencias
    const resultados = clientes.filter(c =>
        c.nombre.toLowerCase().includes(terminoBusqueda) ||
        c.nif.toLowerCase().includes(terminoBusqueda)
    );

    return { termino: terminoBusqueda, resultados };
}

// Renderiza los resultados de búsqueda en el chat
export function renderBusquedaClientes(resultados, termino) {
    if (resultados.length === 0) {
        addMessageToChat('bot', `
            <div class="search-results">
                <div class="search-results-header">
                    <i class="bi bi-search"></i> Sin resultados para "<strong>${termino}</strong>"
                </div>
                <div class="search-empty">No se encontraron clientes. Prueba con otro nombre o NIF.</div>
            </div>
        `);
        return;
    }

    const INITIAL_LIMIT = 6;
    const renderItem = c => `
        <button class="search-result-item" data-nif="${c.nif}">
            <div class="search-result-avatar"><i class="bi bi-person"></i></div>
            <div class="search-result-info">
                <div class="search-result-name">${c.nombre}</div>
                <div class="search-result-nif">${c.nif}</div>
            </div>
            <div class="search-result-action"><i class="bi bi-arrow-right"></i></div>
        </button>`;

    const allItems = resultados.map(renderItem).join('');
    const hasMore = resultados.length > INITIAL_LIMIT;

    const refineHint = resultados.length > 50
        ? `<div class="search-results-hint"><i class="bi bi-lightbulb"></i> Demasiados resultados. Intenta buscar con NIF o nombre completo.</div>`
        : '';

    const showMoreBtn = hasMore
        ? `<button class="search-results-toggle" onclick="this.previousElementSibling.classList.add('search-results-expanded');this.remove();">
               <i class="bi bi-chevron-down"></i> Ver todos (${resultados.length})
           </button>`
        : '';

    addMessageToChat('bot', `
        <div class="search-results">
            <div class="search-results-header">
                <i class="bi bi-search"></i> ${resultados.length} resultado${resultados.length > 1 ? 's' : ''} para "<strong>${termino}</strong>"
            </div>
            <div class="search-results-list ${hasMore ? 'search-results-capped' : ''}">
                ${allItems}
            </div>
            ${showMoreBtn}
            ${refineHint}
        </div>
    `);
}

// --- Historial de clientes recientes ---
export function renderClientesRecientes() {
    const recientes = getClientesRecientes();

    if (recientes.length === 0) {
        addMessageToChat('bot', 'No hay clientes recientes todavía.');
        return;
    }

    const items = recientes.map(c => `
        <button class="recent-client-item" data-nif="${c.nif}">
            <div class="recent-client-avatar"><i class="bi bi-person"></i></div>
            <div class="recent-client-info">
                <div class="recent-client-name">${c.nombre}</div>
                <div class="recent-client-nif">${c.nif}</div>
            </div>
            <div class="recent-client-time">${timeAgo(c.timestamp)}</div>
        </button>
    `).join('');

    addMessageToChat('bot', `
        <div class="recent-clients">
            <div class="recent-clients-header">
                <i class="bi bi-clock-history"></i> Clientes recientes
            </div>
            <div class="recent-clients-list">
                ${items}
            </div>
        </div>
    `);
}

// Helper: tiempo relativo
function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

// Exportar fetchCliente para uso externo (búsqueda en chat)
export { fetchCliente };
