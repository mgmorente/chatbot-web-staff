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
            ${i.area} · ${i.telefono}
        </div>
    `).join('');

        return `
    <div class="col">
        <div class="card shadow-sm h-100 border-0 p-2">
            <div class="d-flex flex-column">
                <strong class="small d-block mb-1">${nombre}</strong>
                ${itemsHtml}
            </div>
        </div>
    </div>
    `;
    });

    const html = `<div class="row row-cols-1 g-2">${htmlParts.join('')}</div>`;
    addMessageToChat('bot', html);
}
