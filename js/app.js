// app.js
import { getStoredToken, clearStoredToken, getSelectedClient } from './storage.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage } from './chat.js';
import { initClienteSearch, recargarDatosCliente, renderFichaCliente, buscarClienteEnChat, renderBusquedaClientes, renderClientesRecientes, fetchCliente } from './clientes.js';
import { renderPolizasCliente, renderDuplicadoInline, renderWalletInline } from './polizas.js';
import { renderModClienteInline, renderAgendaInline, renderEmailInline, renderPresiniestroInline, renderSubirDocInline, renderCotizarSaludInline, renderRecordatoriosInline, renderNuevoRecordatorioInline } from './forms.js';
import { renderRecibosCliente } from './recibos.js';
import { renderSiniestrosCliente } from './siniestros.js';
import { renderTelefonosCompanias } from './companias.js';
import { renderResumenPagos } from './pagos.js';
import { renderAgenda } from './agenda.js';
import { renderDocumentos, renderDocumentosConFiltro } from './docs.js';
import { updateHeaderClient } from './header.js';
import { showLoading } from './utils.js';
import { initAutocomplete } from './autocomplete.js';
import { initVoice } from './voice.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- Mostrar versión en el sidebar y permitir refresco forzado ---
    (function initVersionBadge() {
        const el = document.getElementById('appVersion');
        const txt = document.getElementById('appVersionText');
        if (!el || !txt) return;
        const info = window.APP_VERSION || { version: '?', buildDate: '', full: 'v?' };
        txt.textContent = info.full;
        el.title = `PACCMAN Staff ${info.full}\nClick para actualizar a la última versión`;
        el.addEventListener('click', async () => {
            el.classList.add('checking');
            try {
                // Desregistrar service workers
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map(r => r.unregister()));
                }
                // Borrar todas las cachés
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch (err) { console.warn('[Version] Error limpiando caché:', err); }
            // Recarga forzada
            window.location.reload();
        });
    })();

    // --- Fijar altura del viewport (evitar salto con teclado virtual) ---
    function setAppHeight() {
        const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--app-height', h + 'px');
    }
    setAppHeight();
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setAppHeight);
    } else {
        window.addEventListener('resize', setAppHeight);
    }

    // --- Comprobar sesión: redirigir a login si no hay token ---
    const tokenData = getStoredToken();
    let userToken = tokenData?.token || '';
    if (!tokenData || !tokenData.token || tokenData.expiry < Date.now()) {
        clearStoredToken();
        window.location.href = 'login.html';
        return;
    }

    // Comprobar expiración del token cada minuto
    setInterval(() => {
        const t = getStoredToken();
        if (!t || t.expiry < Date.now()) {
            clearStoredToken();
            window.location.href = 'login.html';
        }
    }, 60_000);

    updateHeaderClient();

    // --- Al cambiar de cliente: mostrar ficha + controlar agenda ---
    document.addEventListener('clienteChanged', (e) => {
        renderFichaCliente();
        const agendaOk = e.detail?.agendaDisponible ?? (localStorage.getItem('agendaDisponible') === '1');
        updateAgendaAvailability(agendaOk);
    });

    // --- Cambio de estado de Outlook (sin re-renderizar ficha) ---
    document.addEventListener('outlookStatusChanged', (e) => {
        updateAgendaAvailability(!!e.detail?.disponible);
    });

    // --- Clic en stats de la ficha cliente (pólizas, siniestros) ---
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.js-ficha-action');
        if (!btn) return;
        const command = btn.dataset.command;
        let args = {};
        try { args = JSON.parse(btn.dataset.args || '{}'); } catch {}
        handleCommand({ command, args });
    });

    function updateAgendaAvailability(disponible) {
        // Sidebar: deshabilitar botones que dependen de Outlook (agenda + email)
        document.querySelectorAll('[data-command="consultar_agenda"], [data-command="registrar_agenda"], [data-command="enviar_email"], [data-command="enviar_email_cliente"]').forEach(btn => {
            btn.disabled = !disponible;
            btn.style.opacity = disponible ? '' : '0.4';
            btn.style.pointerEvents = disponible ? '' : 'none';
        });
        // Autocomplete: marcar agenda/email como no disponible
        window._agendaDisponible = disponible;
        window._outlookDisponible = disponible;
    }

    // Restaurar estado de agenda al cargar (si ya había un cliente seleccionado)
    if (getSelectedClient()) {
        const savedAgenda = localStorage.getItem('agendaDisponible');
        if (savedAgenda !== null) {
            updateAgendaAvailability(savedAgenda === '1');
        }
    }

    // --- Scroll-to-bottom button + banner sticky de stats ---
    const chatBox = document.getElementById('chat-box');
    const btnScrollDown = document.getElementById('btn-scroll-down');
    const stickyStats = document.getElementById('sticky-stats');
    const scrollThreshold = 150;
    let _prevScrollTop = 0;

    function refreshStickyStats() {
        if (!stickyStats) return;
        const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
        if (!data?.cliente) { stickyStats.innerHTML = ''; stickyStats.classList.add('hidden'); return; }
        const c = data.cliente;
        const activas   = (data.polizas   || []).filter(p => p.situacion === 1).length;
        const anuladas  = (data.polizas   || []).filter(p => p.situacion !== 1).length;
        const abiertos  = (data.siniestros|| []).filter(s => s.estado !== 'Cerrado').length;
        const pendientes= (data.recibos   || []).filter(r => r.situacion !== 'Cobrado').length;
        stickyStats.innerHTML = `
            <div class="sticky-stats__pills">
                <button class="fc-pill fc-pill--green js-ficha-action" data-command="consultar_poliza" data-args='{"estado":"activa"}'>${activas} pólizas</button>
                <button class="fc-pill fc-pill--orange js-ficha-action" data-command="consultar_siniestro" data-args='{"estado":"abierto"}'>${abiertos} siniestros</button>
                <button class="fc-pill fc-pill--red js-ficha-action" data-command="consultar_recibo" data-args='{"pendientes":true}'>${pendientes} pendientes</button>
            </div>`;
    }
    refreshStickyStats();
    document.addEventListener('clienteChanged', refreshStickyStats);

    // Acumulador para detectar intención clara de subir/bajar (evita flicker)
    let _upAccum = 0, _downAccum = 0;
    const UP_TRIGGER = 30;    // px hacia arriba para desplegar
    const DOWN_TRIGGER = 20;  // px hacia abajo para ocultar

    chatBox.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = chatBox;
        const isScrolledUp = (scrollHeight - scrollTop - clientHeight) > scrollThreshold;
        btnScrollDown.classList.toggle('hidden', !isScrolledUp);

        const delta = scrollTop - _prevScrollTop;
        _prevScrollTop = scrollTop;

        if (!stickyStats || !stickyStats.innerHTML) return;

        // Si está pegado al final (o sin overflow), siempre ocultar
        const atBottom = (scrollHeight - scrollTop - clientHeight) < 20;
        const sinOverflow = scrollHeight <= clientHeight + 5;
        if (atBottom || sinOverflow) {
            stickyStats.classList.add('hidden');
            _upAccum = 0; _downAccum = 0;
            return;
        }

        if (delta < 0) { // scroll hacia arriba
            _upAccum += -delta;
            _downAccum = 0;
            if (_upAccum >= UP_TRIGGER) stickyStats.classList.remove('hidden');
        } else if (delta > 0) { // scroll hacia abajo
            _downAccum += delta;
            _upAccum = 0;
            if (_downAccum >= DOWN_TRIGGER) stickyStats.classList.add('hidden');
        }
    });

    btnScrollDown.addEventListener('click', () => {
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    });

    // --- Modal cliente (único modal que se mantiene) ---
    const clienteModal = new bootstrap.Modal(document.getElementById('clienteModal'));

    // --- Sidebar toggle (responsive) ---
    const sidebar = document.getElementById('staffSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        // Crear/quitar overlay
        let overlay = document.querySelector('.sidebar-overlay');
        if (sidebar.classList.contains('open')) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay active';
                overlay.addEventListener('click', () => {
                    sidebar.classList.remove('open');
                    overlay.remove();
                });
                document.body.appendChild(overlay);
            }
        } else if (overlay) {
            overlay.remove();
        }
    });

    // --- Sidebar: comportamiento acordeón + auto-scroll al expandir ---
    // (a) Abrir un grupo cierra los demás abiertos.
    // (b) Al terminar la animación, si el grupo expandido se sale por
    //     abajo del área visible (frecuente en móvil), se hace scroll
    //     dentro del sidebar-nav para que el contenido quede visible.
    const sidebarNav = sidebar.querySelector('.sidebar-nav');
    if (sidebarNav && window.bootstrap?.Collapse) {
        sidebarNav.querySelectorAll('.nav-group > .collapse').forEach(col => {
            col.addEventListener('show.bs.collapse', () => {
                sidebarNav.querySelectorAll('.nav-group > .collapse.show').forEach(other => {
                    if (other !== col) {
                        bootstrap.Collapse.getOrCreateInstance(other).hide();
                    }
                });
            });
            col.addEventListener('shown.bs.collapse', () => {
                const group = col.closest('.nav-group');
                if (!group) return;
                const navRect   = sidebarNav.getBoundingClientRect();
                const groupRect = group.getBoundingClientRect();
                if (groupRect.bottom > navRect.bottom) {
                    const diff = groupRect.bottom - navRect.bottom + 12;
                    sidebarNav.scrollBy({ top: diff, behavior: 'smooth' });
                }
            });
        });
    }

    // --- Handle Command ---
    function handleCommand(d) {
        // Recordar última intención para poder resolver mensajes de seguimiento cortos
        if (d?.command) window.__lastIntent = d.command;
        switch (d.command) {
            case 'recargar_cliente':
                recargarDatosCliente();
                break;
            case 'cambiar_cliente':
                clienteModal.show();
                break;
            case 'consultar_cliente':
                renderFichaCliente();
                break;
            case 'actualizar_cliente':
                renderModClienteInline();
                break;
            case 'consultar_poliza':
                renderPolizasCliente(d);
                break;
            case 'consultar_recibo': {
                const a = d.args || {};
                const estado = String(a.estado || '').toLowerCase();
                const soloPendientes = a.pendientes === true
                    || a.soloPendientes === true
                    || estado === 'pendiente' || estado === 'pendientes'
                    || estado === 'impagado' || estado === 'impagados'
                    || estado === 'no cobrado';
                renderRecibosCliente({ soloPendientes });
                break;
            }
            case 'consultar_siniestro':
                renderSiniestrosCliente(d);
                break;
            case 'consultar_documento':
                renderDocumentosConFiltro();
                break;
            case 'consultar_compania':
                renderTelefonosCompanias(d);
                break;
            case 'registrar_siniestro':
                renderPresiniestroInline();
                break;
            case 'consultar_agenda':
                renderAgenda();
                break;
            case 'registrar_agenda':
                renderAgendaInline();
                break;
            case 'registrar_documento':
            case 'registrar_documento_cliente':
            case 'registrar_documento_poliza':
                renderSubirDocInline();
                break;
            case 'enviar_email':
            case 'enviar_email_cliente':
                renderEmailInline();
                break;
            case 'duplicado':
            case 'duplicado_poliza':
                renderDuplicadoInline();
                break;
            case 'wallet':
            case 'wallet_poliza':
                renderWalletInline();
                break;
            case 'resumen_pagos':
            case 'consultar_pagos':
                renderResumenPagos();
                break;
            case 'cotizar_salud':
            case 'tarificar_salud':
                renderCotizarSaludInline();
                break;
            case 'consultar_recordatorio':
            case 'ver_recordatorios':
                renderRecordatoriosInline();
                break;
            case 'registrar_recordatorio':
            case 'nuevo_recordatorio':
                renderNuevoRecordatorioInline({
                    texto: d.args?.recordatorio || ''
                });
                break;
            default:
                if (d.message) addMessageToChat('bot', d.message);
                else addMessageToChat('bot', d.error || 'Error en la respuesta del servidor');
        }
    }

    // --- Voice (grabación de audio + transcripción) ---
    initVoice({
        getToken: () => userToken,
        getClient: () => getSelectedClient(),
        onResponse: (data) => handleCommand(data)
    });

    // --- Autocomplete ---
    const chatInput = document.getElementById('chat-message');
    initAutocomplete(chatInput, (text, command) => {
        // Mostrar el texto como mensaje del usuario
        addMessageToChat('user', text);


        // Comandos locales especiales (no requieren cliente)
        if (command === '_recientes') { renderClientesRecientes(); return; }
        if (command === '_help') { renderHelp(); return; }

        // Verificar que hay cliente seleccionado (excepto cambiar_cliente)
        if (!getSelectedClient() && command !== 'cambiar_cliente') {
            clienteModal.show();
            return;
        }

        // Ejecutar comando directamente (no va al backend)
        handleCommand({ command });
    });

    // --- Form chat ---
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const messageInput = document.getElementById('chat-message');
        const message = messageInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message);
        messageInput.value = '';

        // Ocultar quick actions tras el primer mensaje


        // Comandos locales del chat
        // Normalizamos a minúsculas Y eliminamos acentos para que el transcriptor de voz
        // (que puede devolver texto en mayúsculas y/o sin tildes) dispare los mismos triggers.
        const msgLower = message
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
            .trim();
        if (msgLower === 'recientes' || msgLower.includes('clientes recientes') || msgLower === 'historial') {
            renderClientesRecientes();
            return;
        }
        // Si la pregunta hace referencia al cliente, no es una petición de ayuda genérica
        const refiereCliente = msgLower.includes('cliente') || msgLower.includes(' su ') || msgLower.startsWith('su ')
            || msgLower.includes(' sus ') || msgLower.startsWith('sus ');

        if (!refiereCliente && (
            msgLower === 'ayuda' || msgLower === 'help' || msgLower.includes('funcionalidades')
            || msgLower.includes('que opciones') || msgLower.includes('qué opciones')
            || msgLower.includes('que puedo') || msgLower.includes('qué puedo')
            || msgLower.includes('que puedes') || msgLower.includes('qué puedes')
            || msgLower.includes('que sabes hacer') || msgLower.includes('qué sabes hacer')
            || msgLower.includes('que ofreces') || msgLower.includes('qué ofreces')
            || msgLower.includes('que tienes') || msgLower.includes('qué tienes')
            || msgLower.includes('que haces') || msgLower.includes('qué haces')
            || msgLower.includes('para que sirves') || msgLower.includes('para qué sirves')
            || msgLower.includes('como funciona') || msgLower.includes('cómo funciona'))) {
            renderHelp();
            return;
        }

        // Modificar / actualizar datos del cliente (email, teléfono, dirección, etc.)
        if (/\b(modificar|cambiar|actualizar|editar)\b/i.test(msgLower)
            && (/\b(cliente|email|correo|tel[eé]fono|m[oó]vil|direcci[oó]n|domicilio|datos)\b/i.test(msgLower))) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            handleCommand({ command: 'actualizar_cliente' });
            return;
        }

        // Teléfonos / contactos de compañías (lista general o filtrada)
        const COMPANIAS_CONOCIDAS = ['mapfre','allianz','axa','generali','mutua','asisa','adeslas','sanitas','liberty','pelayo','zurich','reale','caser','catalana','helvetia','santalucia','plus ultra','linea directa','hercules','mutuactivos','ocaso','meridiano','fiatc'];
        const mencionaCompania = COMPANIAS_CONOCIDAS.find(c => msgLower.includes(c));
        // Si el mensaje se refiere al cliente, NO es una consulta sobre compañías
        const esSobreCliente = /\b(cliente|al\s+cliente|del\s+cliente|de\s+la\s+clienta)\b/i.test(msgLower) || refiereCliente;
        if (!esSobreCliente && (
            /(tel[eé]fonos?\s+de|contactos?\s+(de\s+(la\s+)?compa|compa)|n[uú]mero\s+de\s+atenci[oó]n|listado\s+de\s+compa)/i.test(msgLower)
            || (mencionaCompania && /(tel[eé]fono|contacto|n[uú]mero)/i.test(msgLower)))) {
            handleCommand({ command: 'consultar_compania', args: mencionaCompania ? { compania: mencionaCompania } : {} });
            return;
        }

        // Preguntas genéricas sobre el cliente seleccionado → abrir ficha
        if (refiereCliente && /\b(sabes|datos|informaci[oó]n|ficha|resumen|perfil)\b/i.test(msgLower)) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            renderFichaCliente();
            return;
        }

        // Llamar al cliente → abrir tel: link si hay teléfono
        if (/\b(llamar|llamada|marcar|tel[eé]fonear)\b.*\b(cliente|al\s+cliente)\b/i.test(msgLower)
            || /\bllamar(lo|le|la)?\b/i.test(msgLower)) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            const cd = JSON.parse(localStorage.getItem('clienteData') || 'null');
            const tel = cd?.cliente?.telefono;
            if (tel) {
                addMessageToChat('bot', `<div class="data-empty"><a href="tel:${tel}" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:8px;"><i class="bi bi-telephone-fill"></i> <strong>${tel}</strong> — ${cd.cliente.nombre}</a></div>`);
            } else {
                addMessageToChat('bot', '<div class="data-empty"><i class="bi bi-telephone-x"></i> El cliente no tiene teléfono registrado.</div>');
            }
            return;
        }

        // Ejecutiva / colaborador del cliente → respuesta directa
        // Se activa si el mensaje menciona estos términos y (a) se refiere al cliente
        // o (b) ya hay un cliente seleccionado.
        if (/\b(ejecutiva|ejecutivo|colaborador|asesor|gestor|cuentas|ecuentas)\b/i.test(msgLower)
            && (refiereCliente || getSelectedClient())) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            const cd = JSON.parse(localStorage.getItem('clienteData') || 'null');
            const cli = cd?.cliente;
            if (cli) {
                const pideEjecutiva   = /\b(ejecutiv[oa]|cuentas|ecuentas)\b/i.test(msgLower);
                const pideColaborador = /\b(colaborador|asesor|gestor)\b/i.test(msgLower);
                // Ajustar etiqueta de ejecutivo/a según el género preguntado
                const usaMasculino = /\bejecutivo\b/i.test(msgLower);
                const labelEjecutiva = usaMasculino ? 'Ejecutivo de cuentas' : 'Ejecutiva de cuentas';
                const partes = [];
                if (pideEjecutiva)   partes.push(`<div class="fc-row" style="display:block;"><i class="bi bi-person-badge"></i> <strong>${labelEjecutiva}:</strong><br>${cli.ecuentas || 'N/D'}</div>`);
                if (pideColaborador) partes.push(`<div class="fc-row" style="display:block;"><i class="bi bi-people"></i> <strong>Colaborador:</strong><br>${cli.colaborador || 'N/D'}</div>`);
                if (partes.length) {
                    addMessageToChat('bot', `<div class="data-empty" style="text-align:left;">${partes.join('')}</div>`);
                    return;
                }
            }
            renderFichaCliente();
            return;
        }

        // Datos de contacto del cliente (teléfono, email, dirección) → respuesta directa
        if (/\bsu\s+(tel[eé]fono|m[oó]vil|email|correo|e-mail|direcci[oó]n|domicilio)\b/i.test(msgLower)
            || /\b(tel[eé]fono|m[oó]vil|email|correo|e-mail|direcci[oó]n|domicilio)\s+del\s+cliente\b/i.test(msgLower)
            || (/\b(tel[eé]fono|m[oó]vil|email|correo|e-mail|direcci[oó]n|domicilio)\b/i.test(msgLower) && getSelectedClient())) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            const cd = JSON.parse(localStorage.getItem('clienteData') || 'null');
            const cli = cd?.cliente;
            if (cli) {
                const pideTelefono  = /\b(tel[eé]fono|m[oó]vil)\b/i.test(msgLower);
                const pideEmail     = /\b(email|correo|e-mail)\b/i.test(msgLower);
                const pideDireccion = /\b(direcci[oó]n|domicilio)\b/i.test(msgLower);
                const partes = [];
                if (pideTelefono)  partes.push(cli.telefono  ? `<div class="fc-row" style="display:block;"><i class="bi bi-telephone"></i> <strong>Teléfono:</strong><br><a href="tel:${cli.telefono}">${cli.telefono}</a></div>` : `<div class="fc-row" style="display:block;"><i class="bi bi-telephone-x"></i> <strong>Teléfono:</strong><br>N/D</div>`);
                if (pideEmail)     partes.push(cli.email     ? `<div class="fc-row" style="display:block;"><i class="bi bi-envelope"></i> <strong>Email:</strong><br>${cli.email}</div>`       : `<div class="fc-row" style="display:block;"><i class="bi bi-envelope"></i> <strong>Email:</strong><br>N/D</div>`);
                if (pideDireccion) partes.push(cli.domicilio ? `<div class="fc-row" style="display:block;"><i class="bi bi-geo-alt"></i> <strong>Dirección:</strong><br>${cli.domicilio}</div>` : `<div class="fc-row" style="display:block;"><i class="bi bi-geo-alt"></i> <strong>Dirección:</strong><br>N/D</div>`);
                if (partes.length) {
                    addMessageToChat('bot', `<div class="data-empty" style="text-align:left;">${partes.join('')}</div>`);
                    return;
                }
            }
            renderFichaCliente();
            return;
        }

        // Resumen de pagos
        if (msgLower.includes('que paga') || msgLower.includes('qué paga')
            || msgLower.includes('cuanto paga') || msgLower.includes('cuánto paga')
            || msgLower.includes('cuanto pago') || msgLower.includes('cuánto pago')
            || msgLower.includes('resumen de pagos') || msgLower.includes('resumen pagos')
            || msgLower.includes('cuanto cuesta') || msgLower.includes('cuánto cuesta')
            || msgLower.includes('prima total') || msgLower.includes('primas')
            || msgLower.includes('coste anual')
            || msgLower.includes('coste de seguros') || msgLower.includes('coste seguros')
            || /\bcoste\s+(anual|total|de\s+los\s+seguros)/i.test(msgLower)) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            renderResumenPagos();
            return;
        }

        // ---- Override: si el mensaje menciona explícitamente "siniestros" o "recibos",
        // se trata como consulta directa (no como follow-up de la intent anterior) ----
        if (/\brecibos?\b/i.test(msgLower)) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            const soloPendientes = /\b(pendientes?|impagados?|sin\s+cobrar|no\s+cobrados?|pte\b)/i.test(msgLower);
            renderRecibosCliente({ soloPendientes });
            return;
        }
        if (/\bsiniestros?\b/i.test(msgLower)) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            const esAbierto = /\b(abiertos?|activ[oa]s?|en\s+curso|pendientes?|en\s+tr[aá]mite|vigentes?)\b/i.test(msgLower);
            const esCerrado = /\b(cerrad[oa]s?|anulad[oa]s?|finalizad[oa]s?|resuelt[oa]s?)\b/i.test(msgLower);
            const RAMOS_S = ['autos','auto','moto','motos','hogar','salud','vida','pyme','pymes','comercio','comercios','accidentes','rc','r.c.','responsabilidad civil'];
            const ramoS = RAMOS_S.find(r => new RegExp(`\\b${r.replace(/\./g, '\\.')}\\b`, 'i').test(msgLower));
            const args = {};
            if (esAbierto) args.estado = 'abierto';
            else if (esCerrado) args.estado = 'cerrado';
            if (ramoS) args.ramo = ramoS;
            handleCommand({ command: 'consultar_siniestro', args });
            return;
        }

        // ---- Follow-ups cortos con memoria ligera (< 40 chars) ----
        if (msgLower.length < 40 && window.__lastIntent) {
            const RAMOS = ['autos','auto','moto','motos','hogar','salud','vida','pyme','pymes','comercio','comercios','accidentes','rc','r.c.','responsabilidad civil'];
            const ramoMatch = RAMOS.find(r => new RegExp(`\\b${r.replace(/\./g, '\\.')}\\b`, 'i').test(msgLower));
            const esEstadoAbierto = /\b(abiertos?|activ[oa]s?|en\s+curso|pendientes?|en\s+tr[aá]mite|vigentes?)\b/i.test(msgLower);
            const esEstadoCerrado = /\b(cerrad[oa]s?|anulad[oa]s?|finalizad[oa]s?|resuelt[oa]s?)\b/i.test(msgLower);

            // Siniestros follow-ups
            if (window.__lastIntent.startsWith('consultar_siniestro')) {
                if (esEstadoAbierto) { handleCommand({ command:'consultar_siniestro', args:{ estado:'abierto' } }); return; }
                if (esEstadoCerrado) { handleCommand({ command:'consultar_siniestro', args:{ estado:'cerrado' } }); return; }
                if (ramoMatch)       { handleCommand({ command:'consultar_siniestro', args:{ ramo:ramoMatch } }); return; }
            }
            // Pólizas follow-ups (ramo o estado)
            if (window.__lastIntent.startsWith('consultar_poliza')) {
                if (ramoMatch)       { handleCommand({ command:'consultar_poliza', args:{ ramo:ramoMatch } }); return; }
                if (esEstadoAbierto) { handleCommand({ command:'consultar_poliza', args:{ estado:'activa' } }); return; }
                if (esEstadoCerrado) { handleCommand({ command:'consultar_poliza', args:{ estado:'anulada' } }); return; }
            }
            // Recibos follow-ups
            if (window.__lastIntent.startsWith('consultar_recibo')) {
                if (esEstadoAbierto) { renderRecibosCliente({ soloPendientes: true }); return; }
            }
        }

        // Matrícula suelta (con o sin "y", "ahora", "la", etc.) → consulta pólizas por matrícula
        // Formatos españoles: 4 dígitos + 3 letras, o 1-3 letras + 4 dígitos + 1-2 letras
        const mMatricula = message.match(/\b(\d{4}\s?[A-Z]{3}|[A-Z]{1,3}\d{4}[A-Z]{0,2})\b/i);
        if (mMatricula && (msgLower.length < 40 || window.__lastIntent === 'consultar_poliza')) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            window.__lastIntent = 'consultar_poliza';
            handleCommand({ command: 'consultar_poliza', args: { matricula: mMatricula[0].replace(/\s/g, '').toUpperCase() } });
            return;
        }

        // Recibos pendientes / impagados (override local)
        if (/\brecibos?\b/i.test(msgLower) && /\b(pendientes?|impagados?|sin\s+cobrar|no\s+cobrados?|pte\b)/i.test(msgLower)) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            renderRecibosCliente({ soloPendientes: true });
            return;
        }

        // Agenda (consulta / creación)
        if (/\b(citas?|agenda|eventos?|reuni[oó]n(es)?)\b/i.test(msgLower)) {
            if (!getSelectedClient()) { clienteModal.show(); return; }
            const esNueva = /\b(nueva|nuevo|crear|a[ñn]adir|agendar|registrar|programar)\b/i.test(msgLower);
            handleCommand({ command: esNueva ? 'registrar_agenda' : 'consultar_agenda' });
            return;
        }

        // Abrir selector de cliente
        if (msgLower.includes('buscar un cliente') || msgLower.includes('buscar cliente')
            || msgLower.includes('seleccionar cliente') || msgLower.includes('seleccionar un cliente')
            || msgLower.includes('cambiar cliente') || msgLower.includes('cambiar de cliente')
            || msgLower.includes('otro cliente') || msgLower.includes('elegir cliente')) {
            clienteModal.show();
            return;
        }

        // Buscador global: detectar si es búsqueda de cliente
        const busqueda = buscarClienteEnChat(message);
        if (busqueda) {
            renderBusquedaClientes(busqueda.resultados, busqueda.termino);
            return;
        }

        // Flujo normal: enviar al backend
        addThinkingMessage();

        try {
            const response = await fetch(`${ENV.API_URL}/consulta`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                    'Empresa': ENV.EMPRESA,
                    'Device': ENV.DEVICE
                },
                body: JSON.stringify({
                    consulta: message,
                    cliente: getSelectedClient(),
                }),
            });

            const data = await response.json();
            handleCommand(data);

        } catch (err) {
            console.error(err);
            addMessageToChat('bot', 'Error de conexión con el servidor');
        } finally {
            removeThinkingMessage();
        }
    });

    // --- Sidebar: nav actions (data-command buttons) ---
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-command]');
        if (!btn) return;
        // Ignorar los botones de la ficha cliente (gestionados por su propio handler)
        if (btn.classList.contains('js-ficha-action')) return;

        const command = btn.getAttribute('data-command');

        // Ocultar quick actions tras cualquier acción


        // Si no hay cliente seleccionado, pedir que seleccione primero
        if (!getSelectedClient() && command !== 'cambiar_cliente') {
            clienteModal.show();
            return;
        }

        let args = {};
        if (command === "consultar_poliza") {
            args = { "estado": "activa" };
        } else if (command === "consultar_siniestro") {
            args = { "estado": "abierto" };
        }
        handleCommand({ "command": command, "args": args });

        // Cerrar sidebar en móvil
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.remove();
        }
    });

    // --- Clic en resultado de búsqueda o cliente reciente ---
    document.addEventListener('click', function (e) {
        const searchItem = e.target.closest('.search-result-item, .recent-client-item');
        if (!searchItem) return;
        e.preventDefault();
        const nif = searchItem.getAttribute('data-nif');
        if (nif) fetchCliente(nif);
    });

    // --- Header: cambiar cliente ---
    document.querySelectorAll('.change-client').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            clienteModal.show();
        });
    });

    // --- Exportar chat a PDF ---
    document.getElementById('exportChat').addEventListener('click', (e) => {
        e.preventDefault();

        // Cerrar sidebar en móvil
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.remove();
        }

        const chatBox = document.getElementById('chat-box');
        if (!chatBox.children.length) {
            Swal.fire('Chat vacío', 'No hay mensajes para exportar', 'info');
            return;
        }

        // Construir PDF con contenido limpio (sin clonar estilos problemáticos)
        const clientName = document.getElementById('selected-client')?.textContent || '';
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'padding:20px; font-family:Inter,sans-serif; font-size:12px; color:#333; background:#fff;';

        // Cabecera
        wrapper.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #1a8d4f; padding-bottom:12px; margin-bottom:20px;">
                <div>
                    <div style="font-size:16px; font-weight:700; color:#1a8d4f;">PACCMAN STAFF</div>
                    ${clientName && clientName !== 'Sin seleccionar' ? `<div style="font-size:11px; color:#666; margin-top:2px;">Cliente: ${clientName}</div>` : ''}
                </div>
                <div style="text-align:right; font-size:10px; color:#999;">${dateStr} · ${timeStr}</div>
            </div>`;

        // Recorrer mensajes y generar HTML limpio
        chatBox.querySelectorAll('.message').forEach(msg => {
            const isUser = msg.classList.contains('user');
            const textEl = msg.querySelector('.text');
            if (!textEl) return;

            // Clonar solo el contenido del texto
            const clone = textEl.cloneNode(true);
            clone.querySelectorAll('.message-footer, .message-share-btn, .share-menu, .message-time').forEach(el => el.remove());
            // Abrir details
            clone.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));
            // Quitar botones e inputs
            clone.querySelectorAll('button, input, select, textarea').forEach(el => el.remove());

            const align = isUser ? 'flex-end' : 'flex-start';
            const bg = isUser ? '#dcfce7' : '#f8f9fa';
            const border = isUser ? '1px solid #bbf7d0' : '1px solid #e9ecef';

            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = `display:flex; justify-content:${align}; margin-bottom:10px; page-break-inside:avoid;`;

            const bubble = document.createElement('div');
            bubble.style.cssText = `background:${bg}; border:${border}; border-radius:10px; padding:10px 14px; max-width:85%; font-size:12px; line-height:1.6; color:#333;`;

            // Aplicar estilos inline a elementos internos del clon
            clone.querySelectorAll('.data-panel').forEach(el => {
                el.style.cssText = 'margin:8px 0; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;';
            });
            clone.querySelectorAll('.data-panel__header').forEach(el => {
                el.style.cssText = 'background:#f3f4f6; padding:8px 12px; font-weight:600; font-size:12px; color:#374151; border-bottom:1px solid #e5e7eb;';
            });
            clone.querySelectorAll('.data-panel__count').forEach(el => {
                el.style.cssText = 'background:#e5e7eb; color:#6b7280; font-size:10px; padding:1px 6px; border-radius:9999px; margin-left:6px;';
            });
            clone.querySelectorAll('.data-card').forEach(el => {
                el.style.cssText = 'display:flex; align-items:flex-start; gap:10px; padding:8px 12px; border-bottom:1px solid #f3f4f6;';
            });
            clone.querySelectorAll('.data-card__icon').forEach(el => {
                el.style.cssText = 'color:#1a8d4f; font-size:14px; flex-shrink:0; padding-top:2px;';
            });
            clone.querySelectorAll('.data-card__title').forEach(el => {
                el.style.cssText = 'font-weight:600; font-size:12px; color:#1f2937;';
            });
            clone.querySelectorAll('.data-card__sub').forEach(el => {
                el.style.cssText = 'font-size:11px; color:#6b7280; margin-top:2px;';
            });
            clone.querySelectorAll('.data-card__meta').forEach(el => {
                el.style.cssText = 'font-size:11px; color:#6b7280; margin-top:2px;';
            });
            clone.querySelectorAll('.data-card__meta span').forEach(el => {
                el.style.cssText = 'margin-right:8px;';
            });
            clone.querySelectorAll('.data-card__status').forEach(el => {
                el.style.cssText = 'font-size:11px; margin-top:4px;';
            });
            clone.querySelectorAll('.status-dot--ok').forEach(el => {
                el.style.cssText = 'display:inline-block; width:7px; height:7px; border-radius:50%; background:#22c55e; margin-right:4px; vertical-align:middle;';
            });
            clone.querySelectorAll('.status-dot--ko').forEach(el => {
                el.style.cssText = 'display:inline-block; width:7px; height:7px; border-radius:50%; background:#ef4444; margin-right:4px; vertical-align:middle;';
            });
            clone.querySelectorAll('.data-card__badge').forEach(el => {
                el.style.cssText = 'display:none;';
            });
            // Timeline / trámites
            clone.querySelectorAll('.siniestro-timeline').forEach(el => {
                el.style.cssText = 'padding:6px 0 0 12px; border-left:2px solid #e5e7eb; margin:6px 0 0 6px;';
            });
            clone.querySelectorAll('.timeline-item').forEach(el => {
                el.style.cssText = 'padding:4px 0 8px 10px; font-size:11px; position:relative;';
            });
            clone.querySelectorAll('.timeline-date').forEach(el => {
                el.style.cssText = 'font-size:10px; color:#9ca3af;';
            });
            clone.querySelectorAll('.timeline-traza').forEach(el => {
                el.style.cssText = 'font-weight:500; color:#374151;';
            });
            clone.querySelectorAll('.timeline-mensaje').forEach(el => {
                el.style.cssText = 'color:#6b7280; font-size:11px;';
            });
            // Client card
            clone.querySelectorAll('.client-card').forEach(el => {
                el.style.cssText = 'border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;';
            });
            clone.querySelectorAll('.client-card-header').forEach(el => {
                el.style.cssText = 'background:#f3f4f6; padding:12px; text-align:center;';
            });
            // Tablas
            clone.querySelectorAll('table').forEach(el => {
                el.style.cssText = 'width:100%; border-collapse:collapse; font-size:11px; margin:6px 0;';
            });
            clone.querySelectorAll('th').forEach(el => {
                el.style.cssText = 'background:#f3f4f6; padding:6px 8px; text-align:left; font-weight:600; border-bottom:1px solid #e5e7eb; font-size:11px;';
            });
            clone.querySelectorAll('td').forEach(el => {
                el.style.cssText = 'padding:5px 8px; border-bottom:1px solid #f3f4f6; font-size:11px;';
            });
            // Badges
            clone.querySelectorAll('.badge').forEach(el => {
                el.style.cssText = 'font-size:10px; padding:2px 6px; border-radius:4px; font-weight:500;';
            });
            // Data empty
            clone.querySelectorAll('.data-empty').forEach(el => {
                el.style.cssText = 'text-align:center; padding:12px; color:#9ca3af; font-size:12px;';
            });

            bubble.appendChild(clone);
            msgDiv.appendChild(bubble);
            wrapper.appendChild(msgDiv);
        });

        // Pie de página
        const footer = document.createElement('div');
        footer.style.cssText = 'text-align:center; font-size:9px; color:#ccc; margin-top:20px; padding-top:10px; border-top:1px solid #f3f4f6;';
        footer.textContent = 'Generado por PACCMAN STAFF';
        wrapper.appendChild(footer);

        Swal.fire({ title: 'Generando PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        html2pdf().set({
            margin: [10, 10, 10, 10],
            filename: `chat_paccman_${dateStr.replace(/\//g, '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        }).from(wrapper).save().then(() => {
            Swal.close();
            Swal.fire({ icon: 'success', title: 'PDF exportado', text: 'El chat se ha descargado correctamente', timer: 2000, showConfirmButton: false });
        }).catch(() => {
            Swal.close();
            Swal.fire('Error', 'No se pudo generar el PDF', 'error');
        });
    });

    // --- Botón Ayuda / Funcionalidades ---
    document.getElementById('showHelp').addEventListener('click', (e) => {
        e.preventDefault();
        renderHelp();
        // Cerrar sidebar en móvil
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.remove();
        }
    });

    function renderHelp() {
        const html = `
            <div class="help-panel">
                <div class="help-panel-header">
                    <i class="bi bi-grid-1x2"></i>
                    <span>Funcionalidades disponibles</span>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Cliente</div>
                    <div class="help-item"><i class="bi bi-person-vcard"></i> <strong>Ver datos</strong> — Ficha con stats clickables de pólizas, siniestros, recibos pendientes y recordatorios</div>
                    <div class="help-item"><i class="bi bi-pencil"></i> <strong>Modificar datos</strong> — Cambiar teléfono, email o dirección</div>
                    <div class="help-item"><i class="bi bi-envelope"></i> <strong>Enviar email</strong> — Redactar correo al cliente vía Outlook 365</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Pólizas</div>
                    <div class="help-item"><i class="bi bi-shield-check"></i> <strong>Pólizas activas / anuladas</strong> — Listado filtrable con buscador</div>
                    <div class="help-item"><i class="bi bi-files"></i> <strong>Duplicado</strong> — Descargar copia de póliza en PDF</div>
                    <div class="help-item"><i class="bi bi-wallet2"></i> <strong>Wallet</strong> — Enviar tarjeta Apple/Google Wallet</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Recibos, Pagos y Siniestros</div>
                    <div class="help-item"><i class="bi bi-receipt"></i> <strong>Recibos</strong> — Consultar todos o solo pendientes</div>
                    <div class="help-item"><i class="bi bi-cash-stack"></i> <strong>Resumen de pagos</strong> — Gráfico donut con desglose por ramo y total anual</div>
                    <div class="help-item"><i class="bi bi-exclamation-triangle"></i> <strong>Siniestros</strong> — Ver abiertos o cerrados con trámites</div>
                    <div class="help-item"><i class="bi bi-plus-circle"></i> <strong>Presiniestro</strong> — Registrar nuevo parte con imágenes adjuntas</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Documentos y Agenda</div>
                    <div class="help-item"><i class="bi bi-folder"></i> <strong>Documentos</strong> — Consultar documentos por póliza o siniestro</div>
                    <div class="help-item"><i class="bi bi-upload"></i> <strong>Subir documento</strong> — Adjuntar archivo a póliza o siniestro</div>
                    <div class="help-item"><i class="bi bi-calendar3"></i> <strong>Agenda</strong> — Consultar y crear citas con fecha/hora</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Recordatorios</div>
                    <div class="help-item"><i class="bi bi-bookmark-star"></i> <strong>Recordatorios</strong> — Notas libres sobre el cliente (ej: "es fumador", "prefiere llamadas por la tarde"). Desde la lista puedes crear nuevos, marcar como hechos o eliminarlos.</div>
                    <div class="help-item"><i class="bi bi-plus-lg"></i> <strong>Crear rápido</strong> — Desde el botón + junto al input del chat, o por texto natural: "apunta que...", "recuérdame que...", "nuevo recordatorio: ..."</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Tarificación</div>
                    <div class="help-item"><i class="bi bi-heart-pulse"></i> <strong>Tarificador Salud</strong> — Tarificación automática Asisa / Adeslas por provincia y edades (hasta 6 asegurados)</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Comunicación</div>
                    <div class="help-item"><i class="bi bi-envelope"></i> <strong>Email</strong> — Enviar correo al cliente</div>
                    <div class="help-item"><i class="bi bi-telephone"></i> <strong>Compañías</strong> — Directorio telefónico de aseguradoras</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Accesos rápidos</div>
                    <div class="help-item"><i class="bi bi-plus-lg"></i> <strong>Botón +</strong> — Menú rápido: subir documento, nuevo siniestro, nueva cita, enviar email</div>
                    <div class="help-item"><i class="bi bi-search"></i> <strong>buscar [nombre/NIF]</strong> — Buscar cliente desde el chat</div>
                    <div class="help-item"><i class="bi bi-clock-history"></i> <strong>recientes</strong> — Ver últimos clientes consultados</div>
                    <div class="help-item"><i class="bi bi-question-circle"></i> <strong>ayuda</strong> — Mostrar este panel</div>
                </div>

                <div class="help-tip">
                    <i class="bi bi-lightbulb"></i> Escribe en lenguaje natural o usa las sugerencias que aparecen al escribir.
                </div>
            </div>
        `;
        addMessageToChat('bot', html);
    }

    // --- Instalar App (PWA) ---
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    document.getElementById('installApp').addEventListener('click', (e) => {
        e.preventDefault();

        // Cerrar sidebar en móvil
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.remove();
        }

        // Si hay prompt nativo (Chrome/Edge Android/Desktop)
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
            return;
        }

        // Detectar plataforma y mostrar instrucciones
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/.test(ua);
        const isMac = /Macintosh/.test(ua) && !isIOS;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

        let html = '';
        if (isStandalone) {
            html = `
                <div class="help-panel">
                    <div class="help-panel-header"><i class="bi bi-check-circle"></i> <span>App ya instalada</span></div>
                    <div class="help-section">
                        <div class="help-item">Ya estás usando PACCMAN como aplicación instalada.</div>
                    </div>
                </div>`;
        } else if (isIOS) {
            html = `
                <div class="help-panel">
                    <div class="help-panel-header"><i class="bi bi-phone"></i> <span>Instalar en iPhone / iPad</span></div>
                    <div class="help-section">
                        <div class="help-item"><strong>1.</strong> Abre esta web en <strong>Safari</strong> (no funciona desde Chrome u otros navegadores en iOS)</div>
                        <div class="help-item"><strong>2.</strong> Pulsa el botón <strong>Compartir</strong> <i class="bi bi-box-arrow-up"></i> (abajo en iPhone, arriba en iPad)</div>
                        <div class="help-item"><strong>3.</strong> Desplázate y selecciona <strong>"Añadir a pantalla de inicio"</strong></div>
                        <div class="help-item"><strong>4.</strong> Pulsa <strong>Añadir</strong> — aparecerá el icono de PACCMAN en tu pantalla</div>
                    </div>
                    <div class="help-tip"><i class="bi bi-info-circle"></i> Requiere iOS 16.4 o superior para la mejor experiencia.</div>
                </div>`;
        } else if (isAndroid) {
            html = `
                <div class="help-panel">
                    <div class="help-panel-header"><i class="bi bi-phone"></i> <span>Instalar en Android</span></div>
                    <div class="help-section">
                        <div class="help-item"><strong>1.</strong> Abre esta web en <strong>Chrome</strong></div>
                        <div class="help-item"><strong>2.</strong> Pulsa el menú <i class="bi bi-three-dots-vertical"></i> (arriba a la derecha)</div>
                        <div class="help-item"><strong>3.</strong> Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong></div>
                        <div class="help-item"><strong>4.</strong> Confirma — la app se instalará como una aplicación nativa</div>
                    </div>
                    <div class="help-tip"><i class="bi bi-info-circle"></i> Si no ves la opción, asegúrate de estar usando Chrome actualizado.</div>
                </div>`;
        } else {
            html = `
                <div class="help-panel">
                    <div class="help-panel-header"><i class="bi bi-laptop"></i> <span>Instalar en escritorio</span></div>
                    <div class="help-section">
                        <div class="help-section-title">Chrome / Edge</div>
                        <div class="help-item"><strong>1.</strong> Haz clic en el icono de instalación <i class="bi bi-download"></i> en la barra de direcciones (a la derecha)</div>
                        <div class="help-item"><strong>2.</strong> Confirma <strong>"Instalar"</strong> — se abrirá como ventana independiente</div>
                    </div>
                    <div class="help-section">
                        <div class="help-section-title">Safari (macOS Sonoma+)</div>
                        <div class="help-item"><strong>1.</strong> Ve a <strong>Archivo → Añadir al Dock</strong></div>
                        <div class="help-item"><strong>2.</strong> La app aparecerá en tu Dock como aplicación</div>
                    </div>
                    <div class="help-tip"><i class="bi bi-info-circle"></i> Firefox escritorio no soporta la instalación de aplicaciones web.</div>
                </div>`;
        }
        addMessageToChat('bot', html);
    });

    // --- Logout ---
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        clearStoredToken();
        window.location.href = 'login.html';
    });

    // --- Clientes ---
    initClienteSearch(clienteModal);

    // --- Email cliente (delegado) ---
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('email-cliente')) {
            e.preventDefault();
            renderEmailInline();
        }
    });

    // --- Ver recibos pendientes (desde alerta) ---
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('js-ver-pendientes')) {
            e.preventDefault();
            renderRecibosCliente({ soloPendientes: true });
        }
    });

    // --- Botón + (menú acciones) ---
    const attachMenu = document.getElementById('attach-menu');
    const btnAttach = document.getElementById('btn-attach');

    btnAttach.addEventListener('click', () => {
        if (!getSelectedClient()) {
            clienteModal.show();
            return;
        }
        attachMenu.classList.toggle('hidden');
        // Rotar icono cuando está abierto
        btnAttach.classList.toggle('active');
    });

    // Cerrar menú al hacer clic en una opción (el data-command lo gestiona el handler delegado)
    attachMenu.addEventListener('click', (e) => {
        if (e.target.closest('.attach-menu-item')) {
            attachMenu.classList.add('hidden');
            btnAttach.classList.remove('active');
        }
    });

    // Cerrar menú al escribir en el input
    document.getElementById('chat-message').addEventListener('focus', () => {
        attachMenu.classList.add('hidden');
        btnAttach.classList.remove('active');
    });

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!attachMenu.classList.contains('hidden') &&
            !e.target.closest('#attach-menu') &&
            !e.target.closest('#btn-attach')) {
            attachMenu.classList.add('hidden');
            btnAttach.classList.remove('active');
        }
    });

    // =====================================================================
    // ACTION DOCK — dock flotante con 2 niveles (sustituye al sidebar)
    // =====================================================================
    const actionDock = document.getElementById('action-dock');
    const actionDockSublayer = document.getElementById('action-dock-sublayer');
    const actionDockSublayerInner = actionDockSublayer
        ? actionDockSublayer.querySelector('.action-dock__sublayer-inner')
        : null;
    const btnDockToggle = document.getElementById('btn-dock-toggle');

    if (actionDock && actionDockSublayer && actionDockSublayerInner) {

        // Catálogo de sub-acciones por grupo. Los botones usan data-command
        // (que ya está gestionado por el handler delegado de más arriba) o
        // data-proxy (redirige el click al botón original oculto del sidebar).
        const DOCK_GROUPS = {
            cliente: {
                title: 'Cliente',
                items: [
                    { icon: 'bi-person-vcard', label: 'Ver datos', command: 'consultar_cliente' },
                    { icon: 'bi-pencil', label: 'Modificar', command: 'actualizar_cliente' },
                    { icon: 'bi-send', label: 'Enviar email', command: 'enviar_email' },
                    { icon: 'bi-bookmark-star', label: 'Recordatorios', command: 'consultar_recordatorio' },
                    { icon: 'bi-arrow-repeat', label: 'Cambiar', command: 'cambiar_cliente' },
                    { icon: 'bi-arrow-clockwise', label: 'Recargar', command: 'recargar_cliente' },
                ],
            },
            polizas: {
                title: 'Pólizas y recibos',
                items: [
                    { icon: 'bi-search', label: 'Activas', command: 'consultar_poliza' },
                    { icon: 'bi-files', label: 'Duplicado', command: 'duplicado_poliza' },
                    { icon: 'bi-wallet2', label: 'Wallet', command: 'wallet_poliza' },
                    { icon: 'bi-receipt', label: 'Recibos', command: 'consultar_recibo' },
                ],
            },
            siniestros: {
                title: 'Siniestros',
                items: [
                    { icon: 'bi-search', label: 'Abiertos', command: 'consultar_siniestro' },
                    { icon: 'bi-plus-circle', label: 'Registrar', command: 'registrar_siniestro' },
                ],
            },
            documentos: {
                title: 'Documentos',
                items: [
                    { icon: 'bi-search', label: 'Consultar', command: 'consultar_documento' },
                    { icon: 'bi-upload', label: 'Subir', command: 'registrar_documento' },
                ],
            },
            agenda: {
                title: 'Agenda',
                items: [
                    { icon: 'bi-search', label: 'Consultar', command: 'consultar_agenda' },
                    { icon: 'bi-plus-circle', label: 'Nueva cita', command: 'registrar_agenda' },
                ],
            },
            herramientas: {
                title: 'Herramientas',
                items: [
                    { icon: 'bi-calculator', label: 'Tarif. Salud', command: 'cotizar_salud' },
                    { icon: 'bi-telephone', label: 'Compañías', command: 'consultar_compania' },
                ],
            },
            mas: {
                title: 'Más opciones',
                items: [
                    { icon: 'bi-file-earmark-pdf', label: 'Exportar chat', proxy: 'exportChat' },
                    { icon: 'bi-question-circle', label: 'Ayuda', proxy: 'showHelp' },
                    { icon: 'bi-download', label: 'Instalar app', proxy: 'installApp' },
                    { icon: 'bi-arrow-clockwise', label: 'Actualizar', proxy: 'appVersion', variant: 'warning' },
                    { icon: 'bi-box-arrow-left', label: 'Cerrar sesión', proxy: 'logout', variant: 'danger' },
                ],
            },
        };

        const renderDockSublayer = (groupKey) => {
            const group = DOCK_GROUPS[groupKey];
            if (!group) return;
            const tiles = group.items.map(it => {
                const variantClass = it.variant ? ` action-dock__tile--${it.variant}` : '';
                const attrs = it.command
                    ? `data-command="${it.command}"`
                    : `data-dock-proxy="${it.proxy}"`;
                return `
                    <button type="button" class="action-dock__tile${variantClass}" ${attrs}>
                        <i class="bi ${it.icon}"></i>
                        <span>${it.label}</span>
                    </button>`;
            }).join('');

            actionDockSublayerInner.innerHTML = `
                <div class="action-dock__sublayer-title">
                    <span>${group.title}</span>
                    <button type="button" class="action-dock__sublayer-close" aria-label="Cerrar">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                ${tiles}
            `;
        };

        const closeDockSublayer = () => {
            actionDockSublayer.classList.remove('is-open');
            actionDockSublayer.setAttribute('aria-hidden', 'true');
            actionDock.querySelectorAll('.action-dock__btn.is-open')
                .forEach(b => b.classList.remove('is-open'));
        };

        const openDockSublayer = (btn, groupKey) => {
            renderDockSublayer(groupKey);
            actionDock.querySelectorAll('.action-dock__btn.is-open')
                .forEach(b => b.classList.remove('is-open'));
            btn.classList.add('is-open');
            actionDockSublayer.classList.add('is-open');
            actionDockSublayer.setAttribute('aria-hidden', 'false');
        };

        const showDock = () => {
            actionDock.classList.add('is-visible');
            if (btnDockToggle) btnDockToggle.classList.add('is-open');
        };

        const hideDock = () => {
            closeDockSublayer();
            actionDock.classList.remove('is-visible');
            if (btnDockToggle) btnDockToggle.classList.remove('is-open');
        };

        const toggleDock = () => {
            if (actionDock.classList.contains('is-visible')) hideDock();
            else showDock();
        };

        // Botón trigger en la chat-input-area
        if (btnDockToggle) {
            btnDockToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDock();
                // Si el attach-menu (+) está abierto, lo cerramos para no solapar
                const am = document.getElementById('attach-menu');
                const ba = document.getElementById('btn-attach');
                if (am && !am.classList.contains('hidden')) {
                    am.classList.add('hidden');
                    if (ba) ba.classList.remove('active');
                }
            });
        }

        // Click en un botón del primer nivel
        actionDock.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-dock__btn');
            if (btn) {
                const group = btn.getAttribute('data-dock-group');
                if (btn.classList.contains('is-open')) {
                    closeDockSublayer();
                } else {
                    openDockSublayer(btn, group);
                }
                return;
            }
            // Cerrar sublayer
            if (e.target.closest('.action-dock__sublayer-close')) {
                closeDockSublayer();
                return;
            }
            // Click en tile del segundo nivel
            const tile = e.target.closest('.action-dock__tile');
            if (tile) {
                const proxy = tile.getAttribute('data-dock-proxy');
                if (proxy) {
                    const target = document.getElementById(proxy);
                    if (target) target.click();
                }
                // Si tiene data-command, el handler delegado ya lo captura.
                // Tras ejecutar una acción cerramos el dock completo.
                hideDock();
            }
        });

        // Cerrar al hacer clic fuera del dock o del botón trigger
        document.addEventListener('click', (e) => {
            if (!actionDock.classList.contains('is-visible')) return;
            if (e.target.closest('#action-dock')) return;
            if (e.target.closest('#btn-dock-toggle')) return;
            hideDock();
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (actionDockSublayer.classList.contains('is-open')) {
                closeDockSublayer();
            } else if (actionDock.classList.contains('is-visible')) {
                hideDock();
            }
        });
    }

});
