import { addMessageToChat } from './chat.js';

export function renderAgenda(data) {

    const htmlParts = data.map(r => {

        return `
        <div class="col">
            <div class="card shadow-sm h-100 border-0 p-2">
                <div class="d-flex flex-column">
                    <!-- Título en negrita arriba -->
                    <strong class="small d-block mb-1">${r.titulo}</strong>

                    <!-- Información adicional abajo -->
                    <small class="text-secondary d-block">
                        <i class="bi bi-calendar me-1"></i>${r.inicio} · Organizador: ${r.organizador}
                    </small>
                </div>
            </div>
        </div>
        `;
    });

    const html = `<div class="row row-cols-1 g-2">${htmlParts.join('')}</div>`;
    addMessageToChat('bot', html);
}

