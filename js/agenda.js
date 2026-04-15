import { addMessageToChat, addThinkingMessage, removeThinkingMessage } from './chat.js';
import { getAgenda, getStoredToken } from './storage.js';

async function refetchAgenda() {
    try {
        const cliente = JSON.parse(localStorage.getItem('clienteData') || 'null')?.cliente;
        const token = getStoredToken()?.token;
        if (!cliente?.nif || !token) return { error: 'sin_cliente' };

        const res = await fetch(`${ENV.API_URL}/agenda?nif=${cliente.nif}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Empresa': ENV.EMPRESA,
                'Device': ENV.DEVICE
            }
        });

        // Outlook no conectado o token expirado
        if (res.status === 401) {
            localStorage.setItem('agendaDisponible', '0');
            window._agendaDisponible = false;
            window._outlookDisponible = false;
            document.dispatchEvent(new CustomEvent('outlookStatusChanged', { detail: { disponible: false } }));
            return { error: 'outlook_no_conectado' };
        }

        if (!res.ok) return { error: 'error_servidor' };
        const raw = await res.json();
        const agenda = Array.isArray(raw) ? raw : (raw?.value ?? null);
        if (!Array.isArray(agenda)) return { error: 'respuesta_invalida' };

        // Actualizar caché y marcar agenda disponible
        localStorage.setItem('clienteAgenda', JSON.stringify(agenda));
        localStorage.setItem('agendaDisponible', '1');
        window._agendaDisponible = true;
        window._outlookDisponible = true;
        document.dispatchEvent(new CustomEvent('outlookStatusChanged', { detail: { disponible: true } }));
        return { agenda };
    } catch {
        return { error: 'fetch_fallo' };
    }
}

function buildAgendaHtml(agenda) {
    if (!agenda || agenda.length === 0) {
        return '<div class="data-empty"><i class="bi bi-calendar-x"></i> No hay eventos en la agenda</div>';
    }
    const items = agenda.map(r => {
        const dt = r?.start?.dateTime;
        const start = dt ? new Date(dt + "Z").toLocaleString("es-ES", { timeZone: "Europe/Madrid" }) : '';
        return `
        <div class="data-card">
            <div class="data-card__icon"><i class="bi bi-calendar-event"></i></div>
            <div class="data-card__body">
                <div class="data-card__title">${r.subject || 'Sin asunto'}</div>
                <div class="data-card__meta">
                    ${start ? `<span><i class="bi bi-clock"></i> ${start}</span>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    return `
        <div class="data-panel">
            <div class="data-panel__header"><i class="bi bi-calendar3"></i> Agenda <span class="data-panel__count">${agenda.length}</span></div>
            ${items}
        </div>`;
}

export async function renderAgenda() {
    const cached = getAgenda();
    addThinkingMessage();
    const res = await refetchAgenda();
    removeThinkingMessage();

    if (res?.error === 'outlook_no_conectado') {
        addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-envelope-x"></i> Tu sesión de Outlook 365 no está activa. Conéctala desde Pacconline → Configuración Outlook365 para ver y gestionar la agenda.</div>');
        return;
    }

    const agenda = res?.agenda ?? (Array.isArray(cached) ? cached : []);
    addMessageToChat('bot', buildAgendaHtml(agenda));
}
