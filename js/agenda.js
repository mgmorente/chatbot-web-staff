import { addMessageToChat } from './chat.js';

export function renderAgenda(agenda) {
    const data = agenda.data;

    if (!data || data.length === 0) {
        addMessageToChat('bot', "No hay eventos en la agenda");
        return;
    }

    // Si hay datos
    const htmlParts = data.map(r => {
        return `
            <li class="list-group-item">
                <strong class="small d-block mb-1">${r.titulo}</strong>
                <small class="text-secondary d-block">
                    <i class="bi bi-calendar me-1"></i>${r.inicio} · Organizador: ${r.organizador}
                </small>
            </li>
        `;
    });

    const html = `<ul class="list-group list-group-flush">${htmlParts.join('')}</ul>`;
    addMessageToChat('bot', html);
}
