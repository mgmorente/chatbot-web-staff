// app.js
import { getStoredToken, clearStoredToken, getSelectedClient } from './storage.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage } from './chat.js';
import { initClienteSearch, recargarDatosCliente, renderFichaCliente, buscarClienteEnChat, renderBusquedaClientes, renderClientesRecientes, fetchCliente } from './clientes.js';
import { renderPolizasCliente, renderDuplicadoInline, renderWalletInline } from './polizas.js';
import { renderModClienteInline, renderAgendaInline, renderEmailInline, renderPresiniestroInline, renderSubirDocInline } from './forms.js';
import { renderRecibosCliente } from './recibos.js';
import { renderSiniestrosCliente } from './siniestros.js';
import { renderTelefonosCompanias } from './companias.js';
import { renderAgenda } from './agenda.js';
import { renderDocumentos, renderDocumentosConFiltro } from './docs.js';
import { updateHeaderClient } from './header.js';
import { showLoading } from './utils.js';
import { initAutocomplete } from './autocomplete.js';

document.addEventListener('DOMContentLoaded', () => {

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

    // --- Tema: cargar preferencia guardada ---
    const savedTheme = localStorage.getItem('staff-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('staff-theme', next);
    }

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

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

    // --- Quick actions: fijos ---
    const quickActions = [
        { command: 'consultar_cliente', icon: 'bi-person-vcard', label: 'Ficha cliente' },
        { command: 'consultar_poliza', icon: 'bi-shield-check', label: 'Pólizas' },
        { command: 'consultar_siniestro', icon: 'bi-exclamation-triangle', label: 'Siniestros' },
        { command: 'consultar_recibo', icon: 'bi-receipt', label: 'Recibos' },
    ];
    const quickContainer = document.getElementById('quick-actions');
    let quickActionsVisible = true;

    function renderQuickActions() {
        quickContainer.innerHTML = quickActions.map(q =>
            `<button class="quick-btn" data-command="${q.command}"><i class="bi ${q.icon}"></i> ${q.label}</button>`
        ).join('');
        quickContainer.style.display = 'flex';
        quickActionsVisible = true;
    }

    function hideQuickActions() {
        quickContainer.style.display = 'none';
        quickActionsVisible = false;
    }

    renderQuickActions();

    // Mostrar quick actions de nuevo al cambiar de cliente + controlar agenda
    document.addEventListener('clienteChanged', (e) => {
        renderQuickActions();
        const agendaOk = e.detail?.agendaDisponible ?? (localStorage.getItem('agendaDisponible') === '1');
        updateAgendaAvailability(agendaOk);

        // Aviso de recibos pendientes
        const data = JSON.parse(localStorage.getItem('clienteData') || 'null');
        if (data?.recibos) {
            const pendientes = data.recibos.filter(r => r.situacion !== 'Cobrado');
            if (pendientes.length > 0) {
                const total = pendientes.reduce((sum, r) => sum + (parseFloat(r.prima_total) || 0), 0);
                addMessageToChat('bot', `
                    <div class="alert-recibos">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                        <span>Este cliente tiene <strong>${pendientes.length} recibo${pendientes.length > 1 ? 's' : ''} pendiente${pendientes.length > 1 ? 's' : ''}</strong> por un total de <strong>${total.toFixed(2)}€</strong></span>
                        <button class="alert-recibos-btn js-ver-pendientes">Ver recibos</button>
                    </div>
                `);
            }
        }
    });

    function updateAgendaAvailability(disponible) {
        // Sidebar: deshabilitar botones de agenda
        document.querySelectorAll('[data-command="consultar_agenda"], [data-command="registrar_agenda"]').forEach(btn => {
            btn.disabled = !disponible;
            btn.style.opacity = disponible ? '' : '0.4';
            btn.style.pointerEvents = disponible ? '' : 'none';
        });
        // Autocomplete: marcar agenda como no disponible
        window._agendaDisponible = disponible;
    }

    // Restaurar estado de agenda al cargar (si ya había un cliente seleccionado)
    if (getSelectedClient()) {
        const savedAgenda = localStorage.getItem('agendaDisponible');
        if (savedAgenda !== null) {
            updateAgendaAvailability(savedAgenda === '1');
        }
    }

    // --- Scroll-to-bottom button ---
    const chatBox = document.getElementById('chat-box');
    const btnScrollDown = document.getElementById('btn-scroll-down');
    const scrollThreshold = 150;

    chatBox.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = chatBox;
        const isScrolledUp = (scrollHeight - scrollTop - clientHeight) > scrollThreshold;
        btnScrollDown.classList.toggle('hidden', !isScrolledUp);
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

    // --- Handle Command ---
    function handleCommand(d) {
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
            case 'consultar_recibo':
                renderRecibosCliente();
                break;
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
            default:
                if (d.message) addMessageToChat('bot', d.message);
                else addMessageToChat('bot', d.error || 'Error en la respuesta del servidor');
        }
    }

    // --- Autocomplete ---
    const chatInput = document.getElementById('chat-message');
    initAutocomplete(chatInput, (text, command) => {
        // Mostrar el texto como mensaje del usuario
        addMessageToChat('user', text);
        if (quickActionsVisible) hideQuickActions();

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
        if (quickActionsVisible) hideQuickActions();

        // Comandos locales del chat
        const msgLower = message.toLowerCase().trim();
        if (msgLower === 'recientes' || msgLower.includes('clientes recientes') || msgLower === 'historial') {
            renderClientesRecientes();
            return;
        }
        if (msgLower === 'ayuda' || msgLower === 'help' || msgLower.includes('funcionalidades')) {
            renderHelp();
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

        const command = btn.getAttribute('data-command');

        // Ocultar quick actions tras cualquier acción
        if (quickActionsVisible) hideQuickActions();

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
                    <div class="help-item"><i class="bi bi-search"></i> <strong>Consultar</strong> — Ficha completa del cliente</div>
                    <div class="help-item"><i class="bi bi-pencil"></i> <strong>Modificar datos</strong> — Cambiar teléfono o email</div>
                    <div class="help-item"><i class="bi bi-arrow-repeat"></i> <strong>Cambiar cliente</strong> — Seleccionar otro cliente</div>
                    <div class="help-item"><i class="bi bi-arrow-clockwise"></i> <strong>Recargar datos</strong> — Actualizar info desde servidor</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Pólizas</div>
                    <div class="help-item"><i class="bi bi-search"></i> <strong>Pólizas activas</strong> — Listado con detalle</div>
                    <div class="help-item"><i class="bi bi-files"></i> <strong>Duplicado</strong> — Descargar copia en PDF</div>
                    <div class="help-item"><i class="bi bi-wallet2"></i> <strong>Wallet</strong> — Enviar tarjeta Apple/Google</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Recibos y Siniestros</div>
                    <div class="help-item"><i class="bi bi-receipt"></i> <strong>Recibos</strong> — Consultar estado de recibos</div>
                    <div class="help-item"><i class="bi bi-search"></i> <strong>Siniestros</strong> — Ver siniestros abiertos</div>
                    <div class="help-item"><i class="bi bi-plus-circle"></i> <strong>Presiniestro</strong> — Registrar nuevo parte</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Documentos y Agenda</div>
                    <div class="help-item"><i class="bi bi-folder"></i> <strong>Documentos</strong> — Ver y subir documentos</div>
                    <div class="help-item"><i class="bi bi-calendar3"></i> <strong>Agenda</strong> — Consultar y crear citas</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Comunicación</div>
                    <div class="help-item"><i class="bi bi-envelope"></i> <strong>Email</strong> — Enviar correo al cliente</div>
                    <div class="help-item"><i class="bi bi-telephone"></i> <strong>Compañías</strong> — Directorio telefónico</div>
                </div>

                <div class="help-section">
                    <div class="help-section-title">Atajos del chat</div>
                    <div class="help-item"><i class="bi bi-search"></i> <strong>buscar [nombre/NIF]</strong> — Buscar cliente</div>
                    <div class="help-item"><i class="bi bi-clock-history"></i> <strong>recientes</strong> — Clientes recientes</div>
                    <div class="help-item"><i class="bi bi-question-circle"></i> <strong>ayuda</strong> — Mostrar este panel</div>
                </div>

                <div class="help-tip">
                    <i class="bi bi-lightbulb"></i> También puedes escribir preguntas en lenguaje natural en el chat.
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

});
