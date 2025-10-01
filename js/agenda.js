import { addMessageToChat } from './chat.js';
import { getAgenda } from './storage.js';

export function renderAgenda() {
    const data = getAgenda();
    const agenda = data.value;

    if (!agenda || agenda.length === 0) {
        addMessageToChat('bot', "No hay eventos en la agenda");
        return;
    }

    // Si hay datos
    const htmlParts = agenda.map(r => {

        const start = new Date(r.start.dateTime + "Z").toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        const end = new Date(r.end.dateTime + "Z").toLocaleString("es-ES", { timeZone: "Europe/Madrid" });

        return `
            <li class="list-group-item">
                <strong class="small d-block mb-1">${r.subject}</strong>
                <small class="text-secondary d-block">
                    <i class="bi bi-calendar me-1"></i>${start}
                </small>
            </li>
        `;
    });

    const html = `<ul class="list-group list-group-flush">${htmlParts.join('')}</ul>`;
    addMessageToChat('bot', html);
}
