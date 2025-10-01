import { addMessageToChat } from './chat.js';
import { getCompanias } from './storage.js';

// Función para obtener y almacenar companias desde la API
export async function storeCompaniasList() {
    const token = localStorage.getItem('userToken');
    const data = await fetchCompaniasList(token); // <-- await aquí
    console.log('Cias obtenidas:', data);
    if (data) {
        localStorage.setItem('companias', JSON.stringify(data));
    }
}

// Llamada a la API para obtener la lista de companias
async function fetchCompaniasList(token) {
    try {
        const response = await fetch(`${ENV.API_URL}/companias`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Empresa': 'pacc',
                'Device': 'web'
            }
        });
        if (!response.ok) throw new Error('Error al obtener datos de companias');
        return await response.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

export function renderTelefonosCompanias(d = []) {
    const data = getCompanias();

    // Filtrar por d.args.compania si existe (coincidencia parcial, case-insensitive)
    const filteredData = (d?.args?.compania)
        ? data.filter(c => c.nombre.toLowerCase().includes(d.args.compania.toLowerCase()))
        : data;

    // Agrupar por nombre
    const groupedData = filteredData.reduce((acc, s) => {
        if (!acc[s.nombre]) acc[s.nombre] = [];
        acc[s.nombre].push(s);
        return acc;
    }, {});

    // Construir HTML por grupo
    const htmlParts = Object.entries(groupedData).map(([nombre, items]) => {
        const itemsHtml = items.map(i => `
            <div class="small text-secondary mb-1">
                ${i.area} · <a href="tel:${i.telefono}">${i.telefono}</a>
            </div>
        `).join('');

        return `
            <li class="list-group-item">
                <strong class="small d-block mb-1">${nombre}</strong>
                ${itemsHtml}
            </li>
        `;
    });

    const html = `<ul class="list-group list-group-flush">${htmlParts.join('')}</ul>`;

    if (htmlParts.length === 0) {
        addMessageToChat('bot', `<div class="text-muted small">No se encontraron compañías que coincidan con "${d.args.compania}"</div>`);
    } else {
        addMessageToChat('bot', html);
    }
}



