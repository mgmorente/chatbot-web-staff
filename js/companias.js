import { addMessageToChat } from './chat.js';
import { getCompanias } from './storage.js';
import { norm } from './utils.js';

export async function storeCompaniasList() {
    const token = localStorage.getItem('userToken');
    const data = await fetchCompaniasList(token);
    if (data) {
        localStorage.setItem('companias', JSON.stringify(data));
    }
}

async function fetchCompaniasList(token) {
    try {
        const response = await fetch(`${ENV.API_URL}/companias`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Empresa': ENV.EMPRESA,
                'Device': ENV.DEVICE
            }
        });
        if (!response.ok) throw new Error('Error al obtener datos de compañías');
        return await response.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

export function renderTelefonosCompanias(d = []) {
    const data = getCompanias();

    const filteredData = (d?.args?.compania)
        ? data.filter(c => c.nombre.toLowerCase().includes(d.args.compania.toLowerCase()))
        : data;

    const groupedData = filteredData.reduce((acc, s) => {
        if (!acc[s.nombre]) acc[s.nombre] = [];
        acc[s.nombre].push(s);
        return acc;
    }, {});

    if (!Object.keys(groupedData).length) {
        addMessageToChat('bot', `<div class="data-empty"><i class="bi bi-building-x"></i> No se encontraron compañías${d?.args?.compania ? ` que coincidan con "${d.args.compania}"` : ''}</div>`);
        return;
    }

    const entries = Object.entries(groupedData);
    const count = entries.length;
    const MAX_VISIBLE = 5;
    const showSearch = count > MAX_VISIBLE;

    function buildCompaniaCard([nombre, phones]) {
        const phonesHtml = phones.map(i => `
            <div class="data-card__phone">
                <span class="data-card__phone-area">${i.area}</span>
                <a href="tel:${i.telefono}" class="data-card__phone-num"><i class="bi bi-telephone"></i> ${i.telefono}</a>
            </div>`).join('');

        return `
        <div class="data-card" data-searchable="${norm(nombre + ' ' + phones.map(i => i.area).join(' '))}">
            <div class="data-card__icon"><i class="bi bi-building"></i></div>
            <div class="data-card__body">
                <div class="data-card__title">${nombre}</div>
                ${phonesHtml}
            </div>
        </div>`;
    }

    const visibleCards = entries.slice(0, MAX_VISIBLE).map(e => buildCompaniaCard(e)).join('');
    let hiddenHtml = '';
    if (count > MAX_VISIBLE) {
        const rest = count - MAX_VISIBLE;
        hiddenHtml = `
            <details class="data-group__more">
                <summary class="data-group__more-btn"><i class="bi bi-chevron-down"></i> Ver ${rest} compañía${rest > 1 ? 's' : ''} más</summary>
                ${entries.slice(MAX_VISIBLE).map(e => buildCompaniaCard(e)).join('')}
            </details>`;
    }

    const searchHtml = showSearch
        ? `<div class="data-panel__search"><i class="bi bi-search"></i><input type="text" class="data-panel__search-input" placeholder="Buscar compañía…"></div>`
        : '';

    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-telephone"></i> Compañías <span class="data-panel__count">${count}</span></div>
            ${searchHtml}
            <div class="data-panel__list">
                ${visibleCards}
                ${hiddenHtml}
            </div>
        </div>`;

    const msgEl = addMessageToChat('bot', html);
    const container = msgEl || document;

    const searchInput = container.querySelector('.data-panel__search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = norm(searchInput.value.trim());
            const listEl = searchInput.closest('.data-panel').querySelector('.data-panel__list');
            const detailsEl = listEl.querySelector('.data-group__more');
            if (q) {
                if (detailsEl) detailsEl.open = true;
                listEl.querySelectorAll('.data-card').forEach(card => {
                    card.style.display = card.dataset.searchable?.includes(q) ? '' : 'none';
                });
            } else {
                if (detailsEl) detailsEl.open = false;
                listEl.querySelectorAll('.data-card').forEach(card => { card.style.display = ''; });
            }
        });
    }
}
