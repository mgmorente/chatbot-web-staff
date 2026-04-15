import { addMessageToChat } from './chat.js';
import { renderDocumentos } from './docs.js';
import { showLoading, norm } from './utils.js';

const ramoIcons = {
    "AUTOS": "bi-car-front", "HOGAR": "bi-house", "SALUD": "bi-heart-pulse",
    "VIDA": "bi-heart", "ACCIDENTES": "bi-bandaid", "PYME": "bi-building",
    "COMERCIOS": "bi-shop"
};

function getIcon(tipo) {
    return ramoIcons[tipo?.toUpperCase()] || 'bi-file-earmark-text';
}

/**
 * Comprueba si una fecha (formato DD/MM/YYYY o YYYY-MM-DD) cumple un valor de filtro.
 * - Fecha única "YYYY-MM-DD"  → igualdad exacta
 * - "YYYY-MM"               → mismo mes
 * - "YYYY"                  → mismo año
 * - Rango "YYYY-MM-DD/YYYY-MM-DD"
 */
function matchFechaRango(fechaRaw, filtro) {
    if (!fechaRaw || !filtro) return true;
    const toIso = (s) => {
        if (!s) return null;
        const t = String(s).trim();
        // DD/MM/YYYY
        const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
        return null;
    };
    const iso = toIso(fechaRaw);
    if (!iso) return false;
    const f = String(filtro).trim();
    if (f.includes('/')) {
        // rango "YYYY-MM-DD/YYYY-MM-DD"
        const [ini, fin] = f.split('/').map(s => s.trim());
        return (!ini || iso >= ini) && (!fin || iso <= fin);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return iso === f;
    if (/^\d{4}-\d{2}$/.test(f)) return iso.startsWith(f);
    if (/^\d{4}$/.test(f)) return iso.startsWith(f);
    return iso.includes(f);
}

export async function descargaPoliza(poliza) {
    try {
        showLoading();
        const response = await fetch(
            `${ENV.API_URL_PRODUCCION}/eiac/duplicado?contrato=${poliza}`,
            { method: 'GET', headers: { 'Accept': 'application/pdf' } }
        );
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            Swal.fire({ icon: 'error', title: 'Error', text: errorData.message || 'Error al descargar la póliza' });
            return;
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `duplicado_${poliza}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        Swal.fire('Descarga completada', 'El duplicado se descargó correctamente', 'success');
    } catch (err) {
        console.error('Error descargaPoliza:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Error al descargar la póliza' });
    }
}

export async function walletPoliza(poliza) {
    try {
        showLoading();
        await fetch(
            `${ENV.API_URL_PRODUCCION}/cliente/generar-pkpass?contrato=${poliza}`,
            { method: 'GET', headers: { 'Accept': 'application/json', 'Empresa': ENV.EMPRESA, 'Device': ENV.DEVICE } }
        )
        .then(response => response.json())
        .then(data => {
            if (data.mensaje) Swal.fire('Atención', data.mensaje, 'info');
            else if (data.pkpass) Swal.fire('Envío completado', 'El wallet se envió correctamente', 'success');
            else Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
        });
    } catch (err) {
        console.error('Error walletPoliza:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Error al enviar wallet' });
    }
}

export function renderDuplicadoInline() {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    const polizasActivas = data?.polizas?.filter(p => p.situacion == 1) || [];

    if (!polizasActivas.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-shield-x"></i> No hay pólizas activas para duplicar</div>');
        return;
    }

    const items = polizasActivas.map(p => `
        <div class="data-card data-card--action" data-poliza="${p.poliza}" data-action="duplicado">
            <div class="data-card__icon"><i class="bi ${getIcon(p.tipo_producto)}"></i></div>
            <div class="data-card__body">
                <div class="data-card__title">${p.cia_poliza || 'N/D'} <span class="data-card__sep">·</span> ${p.compania || 'N/D'}</div>
                <div class="data-card__sub">${p.ramo || p.tipo_producto || ''}${p.objeto ? ' · ' + p.objeto : ''}${p.matricula ? ' · ' + p.matricula : ''}</div>
            </div>
            <div class="data-card__badge"><i class="bi bi-download"></i></div>
        </div>`).join('');

    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-files"></i> Selecciona póliza para duplicado</div>
            ${items}
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;
    container.querySelectorAll('.data-card[data-action="duplicado"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.currentTarget;
            const poliza = card.dataset.poliza;
            addMessageToChat('user', `Duplicado: ${card.querySelector('.data-card__title').textContent}`);
            descargaPoliza(poliza);
        });
    });
}

export function renderWalletInline() {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    const polizasActivas = data?.polizas?.filter(p => p.situacion == 1) || [];

    if (!polizasActivas.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-shield-x"></i> No hay pólizas activas para wallet</div>');
        return;
    }

    const items = polizasActivas.map(p => `
        <div class="data-card data-card--action" data-poliza="${p.poliza}" data-action="wallet">
            <div class="data-card__icon"><i class="bi ${getIcon(p.tipo_producto)}"></i></div>
            <div class="data-card__body">
                <div class="data-card__title">${p.cia_poliza || 'N/D'} <span class="data-card__sep">·</span> ${p.compania || 'N/D'}</div>
                <div class="data-card__sub">${p.ramo || p.tipo_producto || ''}${p.objeto ? ' · ' + p.objeto : ''}${p.matricula ? ' · ' + p.matricula : ''}</div>
            </div>
            <div class="data-card__badge data-card__badge--green"><i class="bi bi-wallet2"></i></div>
        </div>`).join('');

    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-wallet2"></i> Selecciona póliza para wallet</div>
            ${items}
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;
    container.querySelectorAll('.data-card[data-action="wallet"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.currentTarget;
            const poliza = card.dataset.poliza;
            addMessageToChat('user', `Wallet: ${card.querySelector('.data-card__title').textContent}`);
            walletPoliza(poliza);
        });
    });
}

function parseDate(str) {
    if (!str) return 0;
    if (str.includes('/')) {
        const [d, m, y] = str.split('/');
        const fullYear = y.length === 2 ? '20' + y : y;
        return new Date(+fullYear, +m - 1, +d).getTime() || 0;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const [d, m, y] = str.split('-');
        return new Date(+y, +m - 1, +d).getTime() || 0;
    }
    return new Date(str).getTime() || 0;
}

function buildPolizaCard(p, tieneDocs) {
    const activa = p.situacion === 1;
    return `
    <div class="data-card" data-searchable="${norm(p.cia_poliza + ' ' + p.tipo_producto + ' ' + p.compania + ' ' + (p.objeto || '') + ' ' + (p.matricula || ''))}">
        <div class="data-card__icon"><i class="bi ${getIcon(p.tipo_producto)}"></i></div>
        <div class="data-card__body">
            <div class="data-card__title">${p.cia_poliza || 'N/D'} <span class="data-card__sep">·</span> ${(p.tipo_producto || '').toUpperCase() || 'N/D'} <span class="data-card__sep">·</span> ${p.compania || 'N/D'}</div>
            <div class="data-card__meta">
                ${p.fecha_vencimiento ? `<span><i class="bi bi-calendar3"></i> Vence ${p.fecha_vencimiento}</span>` : ''}
                ${p.prima != null ? `<span>${p.prima}€</span>` : ''}
                ${p.matricula ? `<span><i class="bi bi-car-front"></i> ${p.matricula}</span>` : ''}
                ${p.objeto ? `<span>${p.objeto}</span>` : ''}
            </div>
            <div class="data-card__status">${activa ? '<span class="status-dot status-dot--ok"></span> Activa' : '<span class="status-dot status-dot--ko"></span> Anulada'}</div>
        </div>
        ${tieneDocs ? `<button class="data-card__btn ver-documentos-btn" data-poliza="${p.poliza}" title="Ver documentos"><i class="bi bi-folder2-open"></i></button>` : ''}
    </div>`;
}

export function renderPolizasCliente(d) {
    const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
    if (!data?.polizas?.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-shield-x"></i> No hay pólizas disponibles</div>');
        return;
    }

    // Ignora valores que sean placeholders (ej. "(activa | anulada)") o vacíos
    const isPlaceholder = (v) => {
        if (v === null || v === undefined) return true;
        const s = String(v).trim();
        if (!s) return true;
        if (s.includes('|')) return true;                 // "(activa | anulada)"
        if (/^\(.*\)$/.test(s)) return true;              // envuelto en paréntesis
        return false;
    };

    const filtros = d.args || {};
    let polizasFiltradas = data.polizas.filter(p => {
        return Object.entries(filtros).every(([key, value]) => {
            if (isPlaceholder(value)) return true;
            switch (key) {
                case "ramo": return norm(p.tipo_producto).includes(norm(value));
                case "compania": return norm(p.compania).includes(norm(value));
                case "matricula":
                case "codigo":
                    // Normaliza: quita espacios y guiones para comparar "1234-ABC" con "1234ABC"
                    const mNorm = s => norm(String(s || '').replace(/[\s-]/g, ''));
                    return mNorm(p.matricula).includes(mNorm(value))
                        || mNorm(p.cia_poliza).includes(mNorm(value))
                        || mNorm(p.poliza).includes(mNorm(value));
                case "fecha_efecto": return (p.fecha_efecto || '').includes(value);
                case "fecha_vencimiento":
                case "fecha":
                    return matchFechaRango(p.fecha_vencimiento, value);
                case "estado":
                    const estado = p.situacion === 1 ? "activa" : "anulada";
                    return estado === String(value).toLowerCase();
                default: return true;
            }
        });
    });

    if (!polizasFiltradas.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-shield-x"></i> No hay pólizas que cumplan las condiciones</div>');
        return;
    }

    // Ordenar: activas (situacion=1) primero, luego por fecha de vencimiento desc
    polizasFiltradas.sort((a, b) => {
        const aActiva = a.situacion === 1 ? 1 : 0;
        const bActiva = b.situacion === 1 ? 1 : 0;
        if (aActiva !== bActiva) return bActiva - aActiva;
        return parseDate(b.fecha_vencimiento) - parseDate(a.fecha_vencimiento);
    });

    const tieneDocs = (poliza) => data.documentos?.some(d => d.entidad.toLowerCase() === 'poliza' && d.documento == poliza);
    const count = polizasFiltradas.length;
    const MAX_VISIBLE = 5;
    const showSearch = count > MAX_VISIBLE;

    // Siempre mostrar las primeras MAX_VISIBLE; el resto se oculta tras "Ver N más"
    const visibleArr = polizasFiltradas.slice(0, MAX_VISIBLE);
    const hiddenArr  = polizasFiltradas.slice(MAX_VISIBLE);
    const visibleHtml = visibleArr.map(p => buildPolizaCard(p, tieneDocs(p.poliza))).join('');

    let hiddenHtml = '';
    if (hiddenArr.length > 0) {
        const rest = hiddenArr.length;
        hiddenHtml = `
            <details class="data-group__more">
                <summary class="data-group__more-btn"><i class="bi bi-chevron-down"></i> Ver ${rest} póliza${rest > 1 ? 's' : ''} más</summary>
                ${hiddenArr.map(p => buildPolizaCard(p, tieneDocs(p.poliza))).join('')}
            </details>`;
    }

    const searchHtml = showSearch
        ? `<div class="data-panel__search"><i class="bi bi-search"></i><input type="text" class="data-panel__search-input" placeholder="Buscar póliza…"></div>`
        : '';

    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-shield-check"></i> Pólizas <span class="data-panel__count">${count}</span></div>
            ${searchHtml}
            <div class="data-panel__list">
                ${visibleHtml}
                ${hiddenHtml}
            </div>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;

    // Búsqueda
    const searchInput = container.querySelector('.data-panel__search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = norm(searchInput.value.trim());
            const panel = searchInput.closest('.data-panel');
            const listEl = panel.querySelector('.data-panel__list');
            const detailsEl = listEl.querySelector('.data-group__more');

            // Si hay búsqueda activa, abrir detalles y filtrar todo
            if (q) {
                if (detailsEl) detailsEl.open = true;
                listEl.querySelectorAll('.data-card').forEach(card => {
                    const match = card.dataset.searchable?.includes(q);
                    card.style.display = match ? '' : 'none';
                });
            } else {
                // Reset: cerrar detalles, mostrar todo
                if (detailsEl) detailsEl.open = false;
                listEl.querySelectorAll('.data-card').forEach(card => {
                    card.style.display = '';
                });
            }
        });
    }

    // Documentos buttons
    container.querySelectorAll('.ver-documentos-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            renderDocumentos(e.currentTarget.dataset.poliza);
        });
    });
}
