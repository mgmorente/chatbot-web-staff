import { addMessageToChat } from './chat.js';
import { renderDocumentos } from './docs.js';
import { showLoading } from './utils.js';

const ramoIcons = {
    "AUTOS": "bi-car-front", "HOGAR": "bi-house", "SALUD": "bi-heart-pulse",
    "VIDA": "bi-heart", "ACCIDENTES": "bi-bandaid", "PYME": "bi-building",
    "COMERCIOS": "bi-shop"
};

function getIcon(tipo) {
    return ramoIcons[tipo?.toUpperCase()] || 'bi-file-earmark-text';
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
    const parts = str.includes('/') ? str.split('/').reverse().join('-') : str;
    return new Date(parts).getTime() || 0;
}

function buildPolizaCard(p, tieneDocs) {
    const activa = p.situacion === 1;
    return `
    <div class="data-card${!activa ? ' data-card--muted' : ''}" data-searchable="${(p.cia_poliza + ' ' + p.tipo_producto + ' ' + p.compania + ' ' + (p.objeto || '') + ' ' + (p.matricula || '')).toLowerCase()}">
        <div class="data-card__icon"><i class="bi ${getIcon(p.tipo_producto)}"></i></div>
        <div class="data-card__body">
            <div class="data-card__title">${p.cia_poliza || 'N/D'} <span class="data-card__sep">·</span> ${(p.tipo_producto || '').toUpperCase() || 'N/D'} <span class="data-card__sep">·</span> ${p.compania || 'N/D'}</div>
            <div class="data-card__meta">
                ${p.fecha_vencimiento ? `<span><i class="bi bi-calendar3"></i> Vence ${p.fecha_vencimiento}</span>` : ''}
                ${p.prima != null ? `<span>${p.prima}€</span>` : ''}
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

    const filtros = d.args || {};
    let polizasFiltradas = data.polizas.filter(p => {
        return Object.entries(filtros).every(([key, value]) => {
            if (!value) return true;
            switch (key) {
                case "ramo": return p.tipo_producto?.toLowerCase().includes(value.toLowerCase());
                case "compania": return p.compania?.toLowerCase().includes(value.toLowerCase());
                case "fecha_efecto": return p.fecha_efecto?.toLowerCase().includes(value.toLowerCase());
                case "estado":
                    const estado = p.situacion === 1 ? "activa" : "anulada";
                    return estado === value.toLowerCase();
                default: return true;
            }
        });
    });

    if (!polizasFiltradas.length) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-shield-x"></i> No hay pólizas que cumplan las condiciones</div>');
        return;
    }

    // Ordenar: activas primero, luego por fecha vencimiento desc
    polizasFiltradas.sort((a, b) => {
        if (a.situacion !== b.situacion) return b.situacion - a.situacion; // activas primero
        return parseDate(b.fecha_vencimiento) - parseDate(a.fecha_vencimiento);
    });

    const tieneDocs = (poliza) => data.documentos?.some(d => d.entidad.toLowerCase() === 'poliza' && d.documento == poliza);
    const count = polizasFiltradas.length;
    const MAX_VISIBLE = 5;
    const showSearch = count > MAX_VISIBLE;

    // Separar activas e inactivas
    const activas = polizasFiltradas.filter(p => p.situacion === 1);
    const inactivas = polizasFiltradas.filter(p => p.situacion !== 1);

    // Visible: primeras 5 activas
    const visibleActivas = activas.slice(0, MAX_VISIBLE);
    const hiddenActivas = activas.slice(MAX_VISIBLE);
    const visibleHtml = visibleActivas.map(p => buildPolizaCard(p, tieneDocs(p.poliza))).join('');

    let hiddenHtml = '';
    const hiddenCards = [
        ...hiddenActivas.map(p => buildPolizaCard(p, tieneDocs(p.poliza))),
        ...inactivas.map(p => buildPolizaCard(p, tieneDocs(p.poliza)))
    ];

    if (hiddenCards.length > 0) {
        const rest = hiddenCards.length;
        hiddenHtml = `
            <details class="data-group__more">
                <summary class="data-group__more-btn"><i class="bi bi-chevron-down"></i> Ver ${rest} póliza${rest > 1 ? 's' : ''} más</summary>
                ${hiddenCards.join('')}
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
            const q = searchInput.value.toLowerCase().trim();
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
