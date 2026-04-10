import { addMessageToChat } from './chat.js';
import { getAgenda } from './storage.js';

export function renderAgenda() {
    const data = getAgenda();
    const agenda = data.value;

    if (!agenda || agenda.length === 0) {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-calendar-x"></i> No hay eventos en la agenda</div>');
        return;
    }

    const items = agenda.map(r => {
        const start = new Date(r.start.dateTime + "Z").toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        return `
        <div class="data-card">
            <div class="data-card__icon"><i class="bi bi-calendar-event"></i></div>
            <div class="data-card__body">
                <div class="data-card__title">${r.subject}</div>
                <div class="data-card__meta">
                    <span><i class="bi bi-clock"></i> ${start}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    const count = agenda.length;
    const html = `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-calendar3"></i> Agenda <span class="data-panel__count">${count}</span></div>
            ${items}
        </div>`;

    addMessageToChat('bot', html);
}
