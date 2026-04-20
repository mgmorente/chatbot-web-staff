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
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.cliente) return;

    const c = data.cliente;
    const polizasActivas = data.polizas ? data.polizas.filter(p => p.situacion === 1).length : 0;
    const polizasVencidas = data.polizas ? data.polizas.filter(p => p.situacion !== 1).length : 0;
    const siniestrosAbiertos = data.siniestros ? data.siniestros.filter(s => s.estado !== 'Cerrado').length : 0;
    const siniestrosCerrados = data.siniestros ? data.siniestros.filter(s => s.estado === 'Cerrado').length : 0;

    // Recibos pendientes
    const recibosPendientes = data.recibos ? data.recibos.filter(r => r.situacion !== 'Cobrado') : [];
    const totalPendiente = recibosPendientes.reduce((sum, r) => sum + (parseFloat(r.prima_total) || 0), 0);

    const initials = c.nombre ? c.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?';

    // Acorta "Grupo Pacc" a "GP" para que los metadatos (sucursal,
    // colaborador, ejecutivo de cuentas) no ocupen tanto espacio.
    const shortenGP = v => (v || 'N/D').replace(/Grupo\s+Pacc/gi, 'GP');

    // Recordatorios: tarjetas visuales compactas (post-it), scroll horizontal
    const recordatorios = Array.isArray(data.recordatorios) ? data.recordatorios : [];
    const recPendientes = recordatorios.filter(r => !r.hecho);
    const recNumPend    = recPendientes.length;
    const fcRecCards = recPendientes.map(r => `
        <button type="button" class="fc-rec-card js-ficha-action" data-command="consultar_recordatorio" title="Ver recordatorios">
            <i class="bi bi-bookmark-star-fill fc-rec-card-pin"></i>
            <span class="fc-rec-card-text">${(r.texto || '').replace(/</g,'&lt;')}</span>
        </button>`).join('');
    const fcRecSection = `
        <div class="fc-rec-section">
            <div class="fc-rec-section-head">
                <span class="fc-rec-section-title">
                    <i class="bi bi-bookmark-star"></i>
                    Recordatorios
                    ${recNumPend ? `<span class="fc-rec-section-count">${recNumPend}</span>` : ''}
                </span>
                <button type="button" class="fc-rec-section-btn js-ficha-action" data-command="registrar_recordatorio" title="Nuevo recordatorio">
                    <i class="bi bi-plus-lg"></i>
                </button>
            </div>
            ${recNumPend
                ? `<div class="fc-rec-section-cards">${fcRecCards}</div>`
                : `<button type="button" class="fc-rec-section-empty js-ficha-action" data-command="registrar_recordatorio">
                        <i class="bi bi-plus-circle"></i> Añadir el primer recordatorio
                   </button>`
            }
        </div>`;

    const html = `
        <div class="fc">
            <div class="fc-top">
                <div class="fc-info">
                    <div class="fc-name">${c.nombre}${c.cliente_fiel ? ' <i class="bi bi-heart-fill fc-fiel"></i>' : ''}</div>
                    <div class="fc-sub">${c.nif} · ${c.tipo || 'N/A'}${c.cod_importancia != null ? ` · <i class="bi bi-star-fill fc-star"></i>${c.cod_importancia}` : ''}</div>
                </div>
            </div>
            <div class="fc-stats">
                <button class="fc-pill fc-pill--green js-ficha-action" data-command="consultar_poliza" data-args='{"estado":"activa"}'>${polizasActivas} activas</button>
                <button class="fc-pill fc-pill--gray js-ficha-action" data-command="consultar_poliza" data-args='{"estado":"anulada"}'>${polizasVencidas} anuladas</button>
                <button class="fc-pill fc-pill--orange js-ficha-action" data-command="consultar_siniestro" data-args='{"estado":"abierto"}'>${siniestrosAbiertos} siniestros</button>
                <button class="fc-pill fc-pill--red js-ficha-action" data-command="consultar_recibo" data-args='{"pendientes":true}'>${recibosPendientes.length} pendientes</button>
            </div>
            <div class="fc-details">
                ${(c.telefono || c.email) ? `
                    <div class="fc-row fc-row--inline">
                        ${c.telefono ? `<a href="tel:${c.telefono}" class="fc-row-item"><i class="bi bi-telephone"></i>${c.telefono}</a>` : ''}
                        ${c.email ? `<a href="#" class="fc-row-item email-cliente"><i class="bi bi-envelope"></i>${c.email}</a>` : ''}
                    </div>
                ` : ''}
                ${c.domicilio ? `<div class="fc-row"><i class="bi bi-geo-alt"></i>${c.domicilio}</div>` : ''}
                <div class="fc-meta">
                    <span class="fc-meta-item" title="Sucursal">
                        <i class="bi bi-building"></i>
                        <span class="fc-meta-label">Sucursal</span>
                        <span class="fc-meta-value">${shortenGP(c.sucursal)}</span>
                    </span>
                    <span class="fc-meta-item" title="Colaborador">
                        <i class="bi bi-people"></i>
                        <span class="fc-meta-label">Colaborador</span>
                        <span class="fc-meta-value">${shortenGP(c.colaborador)}</span>
                    </span>
                    <span class="fc-meta-item" title="Ejecutivo de cuentas">
                        <i class="bi bi-person-badge"></i>
                        <span class="fc-meta-label">Ej. cuentas</span>
                        <span class="fc-meta-value">${shortenGP(c.ecuentas)}</span>
                    </span>
                </div>
            </div>
            ${fcRecSection}
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
