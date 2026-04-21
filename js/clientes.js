// clientes.js
import { getClientes, addClienteReciente, getClientesRecientes } from './storage.js';
import { addMessageToChat } from './chat.js';
import { updateHeaderClient } from './header.js';
import { norm } from './utils.js';

// Inicializa el buscador nativo de clientes en el modal
export function initClienteSearch(clienteModal) {
    const searchInput = document.getElementById('client-search');
    const listEl = document.getElementById('client-list');
    const MAX_VISIBLE = 30;
    let activeIndex = -1;

    function selectCliente(nif) {
        clienteModal.hide();
        searchInput.value = '';
        listEl.innerHTML = '';
        activeIndex = -1;
        fetchCliente(nif);
    }

    function updateActive() {
        const items = listEl.querySelectorAll('.client-search-item');
        items.forEach((el, i) => {
            el.classList.toggle('active', i === activeIndex);
            if (i === activeIndex) el.scrollIntoView({ block: 'nearest' });
        });
    }

    function renderList(term = '') {
        const clientes = getClientes();
        const filtered = term
            ? clientes.filter(c =>
                norm(c.nombre).includes(norm(term)) ||
                norm(c.nif).includes(norm(term)))
            : clientes;

        const visibles = filtered.slice(0, MAX_VISIBLE);
        activeIndex = -1;

        listEl.innerHTML = visibles.map(c => `
            <li class="client-search-item" data-nif="${c.nif}">
                <strong>${c.nombre}</strong>
                <small>${c.nif}</small>
            </li>
        `).join('') + (filtered.length > MAX_VISIBLE
            ? `<li class="client-search-hint">Mostrando ${MAX_VISIBLE} de ${filtered.length} — refina la búsqueda</li>`
            : '');

        // Click listeners
        listEl.querySelectorAll('.client-search-item').forEach(item => {
            item.addEventListener('click', () => selectCliente(item.getAttribute('data-nif')));
        });
    }

    // Navegación con teclado
    searchInput.addEventListener('keydown', (e) => {
        const items = listEl.querySelectorAll('.client-search-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
            updateActive();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
            updateActive();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < items.length) {
                selectCliente(items[activeIndex].getAttribute('data-nif'));
            }
        }
    });

    searchInput.addEventListener('input', () => renderList(searchInput.value.trim()));

    // Al abrir el modal, resetear y enfocar
    document.getElementById('clienteModal').addEventListener('shown.bs.modal', () => {
        searchInput.value = '';
        listEl.innerHTML = '';
        activeIndex = -1;
        searchInput.focus();
    });
}

// Función para obtener y almacenar clientes desde la API
export async function storeClientesList() {
    const token = localStorage.getItem('userToken');
    const data = await fetchClientesList(token); // <-- await aquí
    if (data) {
        localStorage.setItem('clientes', JSON.stringify(data));
    }
}

export async function recargarDatosCliente() {
    const data = localStorage.getItem('clienteData')
        ? JSON.parse(localStorage.getItem('clienteData'))
        : null;
    if (!data || !data.cliente) return;
    await fetchCliente(data.cliente.nif);
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

        // Agenda: intentar cargar, pero no bloquear si falla
        const agendaRaw = await fetchClienteAgenda(clientId, token);
        // La API de Outlook devuelve { value: [...] }, extraemos el array
        const agenda = Array.isArray(agendaRaw) ? agendaRaw : (agendaRaw?.value ?? null);
        const agendaOk = Array.isArray(agenda);
        localStorage.setItem('clienteAgenda', JSON.stringify(agendaOk ? agenda : []));
        localStorage.setItem('agendaDisponible', agendaOk ? '1' : '0');

        // Guardar en historial de recientes
        if (data && data.cliente) {
            addClienteReciente(data.cliente.nif, data.cliente.nombre);
        }

        updateHeaderClient();
        document.dispatchEvent(new CustomEvent('clienteChanged', { detail: { agendaDisponible: agendaOk } }));
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
    // Antes: esta función inyectaba una tarjeta con los datos completos del
    // cliente como mensaje del bot en el chat.
    // Ahora: se abre/expande el sidebar lateral "Ficha cliente" (que ya
    // contiene la misma información y más) en lugar de ensuciar el chat
    // con una respuesta larga duplicada.
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.cliente) return;

    const sb = document.getElementById('fichaClienteSidebar');
    if (sb) {
        // Desktop: expandir (quitar colapsado). Móvil: abrir drawer.
        sb.classList.remove('is-collapsed');
        try { localStorage.setItem('fichaSidebarCollapsed', '0'); } catch {}
        if (window.innerWidth <= 992) {
            sb.classList.add('is-open');
            // Marcar momento de apertura para que el handler global de
            // "clic fuera = cerrar drawer" no cierre la ficha en el mismo
            // ciclo de click que la acaba de abrir (p. ej. al pulsar un
            // tile del action-dock o una sugerencia del autocomplete).
            window.__fcsJustOpenedAt = Date.now();
        }

        // Refrescar contenido para que refleje los datos actuales.
        if (typeof window.renderFichaClienteSidebar === 'function') {
            try { window.renderFichaClienteSidebar(); } catch {}
        }

        // Pequeño resalte visual para indicar que ahí está la ficha.
        sb.classList.add('fcs-flash');
        setTimeout(() => sb.classList.remove('fcs-flash'), 900);
    } else {
        // Fallback: si por algún motivo el sidebar no existe, al menos
        // avisamos en el chat (sin volcar toda la ficha).
        addMessageToChat('bot', `
            <div class="data-empty">
                <i class="bi bi-person-vcard"></i>
                Ficha del cliente disponible en el panel lateral.
            </div>
        `);
    }
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

    // Buscar coincidencias (sin tildes)
    const termNorm = norm(terminoBusqueda);
    const resultados = clientes.filter(c =>
        norm(c.nombre).includes(termNorm) ||
        norm(c.nif).includes(termNorm)
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
