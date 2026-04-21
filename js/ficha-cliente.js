// ficha-cliente.js
// Sidebar derecho colapsable con la información del cliente seleccionado.
// Se refresca automáticamente al disparar el evento 'clienteChanged'.
//
// Contiene:
//   - Datos personales (nombre, NIF, contacto, domicilio, sucursal, colaborador)
//   - Recordatorios pendientes (post-it compactos)
//   - Pólizas activas (conteo + lista compacta)
//   - Recibos pendientes / devueltos
//   - Siniestros abiertos
//
// Estado colapsado/expandido persistido en localStorage 'fichaSidebarCollapsed'.

const COLLAPSED_KEY = 'fichaSidebarCollapsed';
const SIDEBAR_ID = 'fichaClienteSidebar';

function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getClienteData() {
    try {
        return JSON.parse(localStorage.getItem('clienteData')) || null;
    } catch {
        return null;
    }
}

// ---------- Construcción de secciones ----------

function renderEmpty() {
    return `
        <div class="fcs-empty">
            <div class="fcs-empty-icon"><i class="bi bi-person-plus"></i></div>
            <div class="fcs-empty-title">Sin cliente seleccionado</div>
            <div class="fcs-empty-desc">Selecciona un cliente desde la barra superior
                para ver aquí toda su información.</div>
            <button type="button" class="fcs-empty-btn" data-fcs-action="open-cliente-modal">
                <i class="bi bi-search"></i> Buscar cliente
            </button>
        </div>
    `;
}

function renderHeader(c) {
    const initials = c.nombre
        ? c.nombre.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
        : '?';
    const fiel = c.cliente_fiel
        ? '<i class="bi bi-heart-fill fcs-fiel" title="Cliente fiel"></i>'
        : '';
    const importancia = (c.cod_importancia != null && c.cod_importancia !== '')
        ? `<span class="fcs-chip fcs-chip--star" title="Importancia"><i class="bi bi-star-fill"></i>${esc(c.cod_importancia)}</span>`
        : '';
    const tipo = c.tipo
        ? `<span class="fcs-chip" title="Tipo">${esc(c.tipo)}</span>`
        : '';
    return `
        <div class="fcs-header">
            <div class="fcs-avatar">${esc(initials)}</div>
            <div class="fcs-header-info">
                <div class="fcs-name" title="${esc(c.nombre || '')}">
                    ${esc(c.nombre || 'Sin nombre')} ${fiel}
                </div>
                <div class="fcs-subline">
                    <span class="fcs-nif">${esc(c.nif || '—')}</span>
                    ${tipo}
                    ${importancia}
                </div>
            </div>
        </div>
    `;
}

function renderDatosPersonales(c) {
    const tel = c.telefono ? `
        <a class="fcs-chip-action" href="tel:${esc(c.telefono)}" title="Llamar a ${esc(c.telefono)}">
            <i class="bi bi-telephone"></i>
            <span>${esc(c.telefono)}</span>
        </a>` : '';

    const email = c.email ? `
        <button type="button" class="fcs-chip-action" data-fcs-action="email-cliente" title="Enviar email a ${esc(c.email)}">
            <i class="bi bi-envelope"></i>
            <span>${esc(c.email)}</span>
        </button>` : '';

    const contactRow = (tel || email)
        ? `<div class="fcs-contact-row">${tel}${email}</div>`
        : '';

    const domicilio = c.domicilio ? `
        <div class="fcs-item fcs-item--static" title="${esc(c.domicilio)}">
            <i class="bi bi-geo-alt"></i>
            <span>${esc(c.domicilio)}</span>
        </div>` : '';

    const shortenGP = v => String(v).replace(/Grupo\s+Pacc/gi, 'GP');

    const metaItems = [
        c.sucursal    ? { icon: 'building',      label: 'Sucursal',     value: c.sucursal } : null,
        c.colaborador ? { icon: 'people',        label: 'Colab.',       value: c.colaborador } : null,
        c.ecuentas    ? { icon: 'person-badge',  label: 'Ej. ctas',     value: c.ecuentas } : null,
    ].filter(Boolean);

    const meta = metaItems.length ? `
        <div class="fcs-meta">
            ${metaItems.map(m => `
                <div class="fcs-meta-row" title="${esc(m.label)}: ${esc(String(m.value))}">
                    <i class="bi bi-${esc(m.icon)}"></i>
                    <span class="fcs-meta-value">${esc(shortenGP(m.value))}</span>
                </div>
            `).join('')}
        </div>` : '';

    const body = (contactRow || domicilio || meta)
        ? contactRow + domicilio + meta
        : '<div class="fcs-empty-line">Sin datos de contacto</div>';

    return `
        <section class="fcs-section fcs-section--compact" data-section="datos">
            <header class="fcs-section-head">
                <span class="fcs-section-title">
                    <i class="bi bi-person-vcard"></i> Datos
                </span>
                <button type="button" class="fcs-section-btn" data-fcs-action="actualizar-cliente" title="Modificar datos">
                    <i class="bi bi-pencil"></i>
                </button>
            </header>
            <div class="fcs-section-body fcs-section-body--tight">${body}</div>
        </section>
    `;
}

// ---------- Recordatorios ----------

function renderRecordatorios(recordatorios = []) {
    const pendientes = recordatorios.filter(r => !r.hecho);
    const count = pendientes.length;

    const cards = pendientes.length
        ? pendientes.slice(0, 6).map(r => `
            <button type="button" class="fcs-rec-card" data-fcs-action="ver-recordatorios" title="${esc(r.texto || '')}">
                <i class="bi bi-bookmark-star-fill fcs-rec-pin"></i>
                <span class="fcs-rec-text">${esc(r.texto || '')}</span>
            </button>
        `).join('') + (pendientes.length > 6
            ? `<button type="button" class="fcs-rec-more" data-fcs-action="ver-recordatorios">
                    +${pendientes.length - 6} más
               </button>`
            : '')
        : `<button type="button" class="fcs-rec-empty" data-fcs-action="nuevo-recordatorio">
                <i class="bi bi-plus-circle"></i> Añadir recordatorio
           </button>`;

    return `
        <section class="fcs-section fcs-section--rec" data-section="recordatorios">
            <header class="fcs-section-head">
                <span class="fcs-section-title">
                    <i class="bi bi-bookmark-star"></i> Recordatorios
                    ${count ? `<span class="fcs-badge fcs-badge--amber">${count}</span>` : ''}
                </span>
                <button type="button" class="fcs-section-btn" data-fcs-action="nuevo-recordatorio" title="Nuevo recordatorio">
                    <i class="bi bi-plus-lg"></i>
                </button>
            </header>
            <div class="fcs-section-body fcs-rec-body">${cards}</div>
        </section>
    `;
}

// ---------- Stats resumidos (pills estilo sticky-stats) ----------

function renderStats(data) {
    const polizas     = Array.isArray(data.polizas)    ? data.polizas    : [];
    const siniestros  = Array.isArray(data.siniestros) ? data.siniestros : [];
    const recibos     = Array.isArray(data.recibos)    ? data.recibos    : [];

    const nPolizas     = polizas.filter(p => p.situacion === 1).length;
    const nSiniestros  = siniestros.filter(s => s.estado !== 'Cerrado').length;
    const nPendientes  = recibos.filter(r => r.situacion !== 'Cobrado').length;
    const nDevueltos   = recibos.filter(r => {
        const s = (r.situacion || '').toLowerCase();
        return s.includes('devuelto') || s.includes('impag');
    }).length;

    // Pill: si 0, no-op visual (se atenúa pero se muestra el recuento)
    const pill = (modifier, n, label, action, zeroClass = false) => `
        <button type="button"
                class="fc-pill fc-pill--${modifier} fcs-stat-pill ${n === 0 ? 'fcs-stat-pill--zero' : ''}"
                data-fcs-action="${action}"
                title="${esc(label)}">
            <span class="fcs-stat-pill-num">${n}</span>
            <span class="fcs-stat-pill-label">${esc(label)}</span>
        </button>`;

    return `
        <section class="fcs-stats" data-section="stats">
            ${pill('green',  nPolizas,    'pólizas',    'ver-polizas')}
            ${pill('orange', nSiniestros, 'siniestros', 'ver-siniestros')}
            ${pill('red',    nPendientes, 'pendientes', 'ver-recibos')}
            ${nDevueltos ? `
                <button type="button" class="fc-pill fc-pill--red fcs-stat-pill fcs-stat-pill--alt"
                        data-fcs-action="ver-recibos" title="Recibos devueltos / impagados">
                    <span class="fcs-stat-pill-num">${nDevueltos}</span>
                    <span class="fcs-stat-pill-label">devueltos</span>
                </button>` : ''}
        </section>
    `;
}

// ---------- Render principal ----------

function renderBody(data) {
    if (!data || !data.cliente) return renderEmpty();
    const c = data.cliente;
    return `
        ${renderHeader(c)}
        ${renderStats(data)}
        <div class="fcs-sections">
            ${renderDatosPersonales(c)}
            ${renderRecordatorios(data.recordatorios || [])}
        </div>
    `;
}

// ---------- Colapsado / expandido ----------

const MOBILE_BREAKPOINT = 992;
function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

function isCollapsed() {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
}

function applyCollapsedState(el) {
    if (!el) return;
    // En desktop: aplicar la clase is-collapsed según localStorage.
    // En móvil ignoramos is-collapsed (el estado real es is-open / no is-open).
    if (!isMobile()) {
        el.classList.toggle('is-collapsed', isCollapsed());
    } else {
        el.classList.remove('is-collapsed');
    }
    const btn = el.querySelector('[data-fcs-toggle]');
    if (btn) {
        const collapsedNow = !isMobile() && isCollapsed();
        btn.setAttribute('aria-expanded', String(!collapsedNow));
        btn.title = isMobile()
            ? 'Cerrar ficha'
            : (collapsedNow ? 'Expandir ficha' : 'Plegar ficha');
        // Rotar el chevron según estado
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.remove('bi-chevron-right', 'bi-chevron-left', 'bi-x-lg');
            if (isMobile()) {
                icon.classList.add('bi-x-lg');
            } else {
                icon.classList.add(collapsedNow ? 'bi-chevron-left' : 'bi-chevron-right');
            }
        }
    }
}

function toggleCollapsed() {
    const el = document.getElementById(SIDEBAR_ID);
    if (!el) return;
    if (isMobile()) {
        // En móvil el botón cierra el drawer
        el.classList.remove('is-open');
        return;
    }
    // En desktop: alternar el plegado
    localStorage.setItem(COLLAPSED_KEY, isCollapsed() ? '0' : '1');
    applyCollapsedState(el);
}

// ---------- API pública ----------

// Dispara los comandos ya existentes en la app (handleCommand en app.js
// escucha 'fichaSidebarAction' y traduce a las funciones correspondientes)
function dispatchAction(action) {
    document.dispatchEvent(new CustomEvent('fichaSidebarAction', { detail: { action } }));
}

function hideSidebar() {
    const el = document.getElementById(SIDEBAR_ID);
    if (!el) return;
    if (isMobile()) {
        el.classList.remove('is-open');
    } else {
        localStorage.setItem(COLLAPSED_KEY, '1');
        applyCollapsedState(el);
    }
}

function bindInteractions(el) {
    if (!el) return;

    el.addEventListener('click', (e) => {
        // Toggle plegar/expandir manual
        const toggle = e.target.closest('[data-fcs-toggle]');
        if (toggle) {
            e.preventDefault();
            toggleCollapsed();
            return;
        }

        // Cualquier botón con acción: ejecuta la acción y además oculta la ficha
        const actionBtn = e.target.closest('[data-fcs-action]');
        if (actionBtn) {
            e.preventDefault();
            const action = actionBtn.getAttribute('data-fcs-action');
            dispatchAction(action);

            // Las acciones que reabren la ficha inmediatamente (recargar, abrir modal
            // de cliente) no deben forzar el plegado.
            const noHide = new Set(['recargar', 'open-cliente-modal']);
            if (!noHide.has(action)) hideSidebar();
            return;
        }

        // Enlaces <a> tipo "tel:" también deben ocultar la ficha (aunque no tengan
        // data-fcs-action, son botones de contacto dentro de la ficha).
        const contactLink = e.target.closest('a.fcs-chip-action');
        if (contactLink) {
            hideSidebar();
        }
    });
}

export function renderFichaClienteSidebar() {
    const el = document.getElementById(SIDEBAR_ID);
    if (!el) return;
    const data = getClienteData();
    const content = el.querySelector('.fcs-content');
    if (content) content.innerHTML = renderBody(data);
    applyCollapsedState(el);
}

export function initFichaClienteSidebar() {
    // Si ya existe, no duplicar
    if (document.getElementById(SIDEBAR_ID)) return;

    const aside = document.createElement('aside');
    aside.id = SIDEBAR_ID;
    aside.className = 'fcs-sidebar';
    aside.setAttribute('aria-label', 'Ficha del cliente');
    aside.innerHTML = `
        <div class="fcs-toolbar">
            <button type="button" class="fcs-toggle" data-fcs-toggle
                    aria-expanded="true" aria-controls="fcsContent" title="Plegar ficha">
                <i class="bi bi-chevron-right"></i>
            </button>
            <span class="fcs-title">Ficha cliente</span>
            <button type="button" class="fcs-refresh" data-fcs-action="recargar" title="Recargar datos">
                <i class="bi bi-arrow-clockwise"></i>
            </button>
        </div>
        <div id="fcsContent" class="fcs-content"></div>
    `;

    // Insertar al final del staff-layout (como hermano derecho de staff-main)
    const layout = document.querySelector('.staff-layout');
    if (layout) layout.appendChild(aside);
    else document.body.appendChild(aside);

    bindInteractions(aside);
    renderFichaClienteSidebar();

    // Refrescar automáticamente cuando cambie el cliente
    document.addEventListener('clienteChanged', () => renderFichaClienteSidebar());

    // Reaplicar estado cuando cambia el tamaño de ventana (desktop ↔ móvil)
    let _resizeT = null;
    window.addEventListener('resize', () => {
        clearTimeout(_resizeT);
        _resizeT = setTimeout(() => applyCollapsedState(aside), 120);
    });
}

// Expuestos globalmente por comodidad de depuración / invocación
window.renderFichaClienteSidebar = renderFichaClienteSidebar;
