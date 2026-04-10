import { addMessageToChat } from './chat.js';
import { getCompanias } from './storage.js';

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

    const items = Object.entries(groupedData).map(([nombre, phones]) => {
        const phonesHtml = phones.map(i => `
            <div class="data-card__phone">
                <span class="data-card__phone-area">${i.area}</span>
                <a href="tel:${i.telefono}" class="data-card__phone-num"><i class="bi bi-telephone"></i> ${i.telefono}</a>
            </div>`).join('');

        return `
        <div class="data-card">
            <div class="data-card__icon"><i class="bi bi-building"></i></div>
            <div class="data-card__body">
                <div class="data-card__title">${nombre}</div>
                ${phonesHtml}
            </div>
        </div>`;
    }).join('');

    const count = Object.keys(groupedData).length;
    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-telephone"></i> Compañías <span class="data-panel__count">${count}</span></div>
            ${items}
        </div>`;

    addMessageToChat('bot', html);
}
