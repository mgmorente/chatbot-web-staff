// pagos.js — Resumen de pagos del cliente con donut chart SVG
import { getStoredToken, getSelectedClient } from './storage.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage } from './chat.js';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];

function fmtEur(n) {
    return Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtEurShort(n) {
    return Number(n).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function buildDonutSvg(items, totalVal) {
    const cx = 80, cy = 80, r = 60, stroke = 24;
    const C = 2 * Math.PI * r;
    let offset = 0;

    let svg = `<svg viewBox="0 0 160 160" class="cb-donut">`;

    // Segmentos
    items.forEach((item, idx) => {
        const pct = item.prima / totalVal;
        const dash = pct * C;
        const gap = C - dash;
        const color = COLORS[idx % COLORS.length];
        svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" `
             + `stroke="${color}" stroke-width="${stroke}" `
             + `stroke-dasharray="${dash} ${gap}" `
             + `stroke-dashoffset="-${offset}" `
             + `transform="rotate(-90 ${cx} ${cy})" />`;
        offset += dash;
    });

    // Texto central
    svg += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="cb-donut-total">${fmtEurShort(totalVal)}</text>`;
    svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" class="cb-donut-label">total/año</text>`;
    svg += `</svg>`;

    return svg;
}

function buildLegend(items, totalVal) {
    let html = '<div class="cb-donut-legend">';
    items.forEach((item, idx) => {
        const color = COLORS[idx % COLORS.length];
        const pct = Math.round((item.prima / totalVal) * 100);
        html += `<div class="cb-legend-item">`
              + `<span class="cb-legend-dot" style="background:${color}"></span>`
              + `<span class="cb-legend-text">${escHtml(item.ramo)} (${pct}%)</span>`
              + `</div>`;
    });
    html += '</div>';
    return html;
}

export async function renderResumenPagos() {
    const clientId = getSelectedClient();
    if (!clientId) return;

    addThinkingMessage();

    try {
        const tokenData = getStoredToken();
        const response = await fetch(`${ENV.API_URL}/resumen-pagos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.token}`,
                'Empresa': ENV.EMPRESA,
                'Device': ENV.DEVICE
            },
            body: JSON.stringify({ nif: clientId })
        });

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            addMessageToChat('bot', 'No he encontrado datos de pagos para este cliente.');
            return;
        }

        const items = data.items.map(i => ({
            compania: i.compania || '',
            ramo: i.ramo || '',
            riesgo: i.riesgo || '',
            prima: parseFloat(i.prima) || 0
        }));
        const total = parseFloat(data.total) || items.reduce((s, i) => s + i.prima, 0);

        let html = '<div class="cb-pagos-resumen">';

        // Donut chart (solo si hay más de 1 item)
        if (items.length > 1 && total > 0) {
            html += '<div class="cb-pagos-chart">';
            html += buildDonutSvg(items, total);
            html += buildLegend(items, total);
            html += '</div>';
        }

        // Lista de pagos
        items.forEach(item => {
            html += `<div class="cb-pago-item">`;
            html += `<div class="cb-pago-info">`;
            html += `<span class="cb-pago-ramo">${escHtml(item.ramo)}</span>`;
            html += `<span class="cb-pago-detalle">${escHtml(item.compania)}`;
            if (item.riesgo) html += ` · ${escHtml(item.riesgo)}`;
            html += `</span></div>`;
            html += `<span class="cb-pago-prima">${fmtEur(item.prima)}</span>`;
            html += `</div>`;
        });

        // Total
        html += `<div class="cb-pago-total">`;
        html += `<span class="cb-pago-total-label">Total anual</span>`;
        html += `<span class="cb-pago-total-value">${fmtEur(total)}</span>`;
        html += `</div>`;

        html += '</div>';

        addMessageToChat('bot', html);

    } catch (err) {
        console.error('Error resumen pagos:', err);
        addMessageToChat('bot', 'Error al obtener el resumen de pagos.');
    } finally {
        removeThinkingMessage();
    }
}
