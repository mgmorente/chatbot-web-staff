import { addMessageToChat } from './chat.js';

export function renderTelefonosCompanias(data) {

    // Agrupar por nombre
    const groupedData = data.reduce((acc, s) => {
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
    addMessageToChat('bot', html);

}
