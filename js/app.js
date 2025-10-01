// app.js
import { getStoredToken, storeToken, clearStoredToken, getSelectedClient } from './storage.js';
import { login, storeUser } from './auth.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage, showApiError, clearApiError } from './chat.js';
import { renderClientesSelect, handleClienteSelection, storeClientesList, renderFichaCliente, renderModCliente } from './clientes.js';
import { renderPolizasSelect, descargaPoliza, renderPolizasCliente } from './polizas.js';
import { renderRecibosCliente } from './recibos.js';
import { renderSiniestrosCliente } from './siniestros.js';
import { renderTelefonosCompanias, storeCompaniasList } from './companias.js';
import { renderAgenda } from './agenda.js';
import { renderSubirDocumento, renderDocumentos } from './docs.js';
import { updateHeaderClient } from './header.js';

const apiUrl = ENV.API_URL;
const SESSION_DURATION = 2 * 60 * 60 * 1000;

document.addEventListener('DOMContentLoaded', () => {

    updateHeaderClient(); // Actualiza la cabecera al cargar la página

    // --- Modales ---
    const userModal = new bootstrap.Modal(document.getElementById('userModal'), { backdrop: 'static', keyboard: false });
    const clienteModal = new bootstrap.Modal(document.getElementById('clienteModal'));
    const duplicadoPolizaModal = new bootstrap.Modal(document.getElementById('duplicadoPolizaModal'));
    const walletPolizaModal = new bootstrap.Modal(document.getElementById('walletPolizaModal'));
    const preSiniestroModal = new bootstrap.Modal(document.getElementById('preSiniestroModal'));
    const agendaModal = new bootstrap.Modal(document.getElementById('agendaModal'));

    const offcanvasEl = document.getElementById('offcanvasRespuestas');
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);

    // --- Comprobar sesión ---
    const tokenData = getStoredToken();
    let userToken = tokenData?.token || '';
    if (!tokenData || !tokenData.token || tokenData.expiry < Date.now()) {
        document.getElementById('selected-client').textContent = '';
        clearStoredToken();
        userModal.show(); // <<--- abrir login si no hay sesión
    }

    // --- Login ---
    document.getElementById('user-data-form').addEventListener('submit', async (e) => {

        e.preventDefault();
        clearApiError();

        const usuario_pacc = document.getElementById('usuario_pacc').value.trim();
        const password = document.getElementById('password').value.trim();

        const submitButton = document.getElementById('submitButton');
        const spinner = document.getElementById('spinner');
        const buttonText = document.getElementById('buttonText');
        spinner.classList.remove('d-none');
        buttonText.textContent = "Procesando...";
        submitButton.disabled = true;

        try {
            // Limpiar sesión previa
            clearStoredToken();

            const data = await login(apiUrl, usuario_pacc, password);

            if (data.access_token) {
                userToken = data.access_token;
                storeToken(userToken, SESSION_DURATION);
                storeClientesList();
                storeCompaniasList();
                storeUser(data.user);
                userModal.hide();
            } else {
                showApiError(data.error || 'Error al autenticar');
            }
        } catch (err) {
            showApiError('Error de conexión');
            console.error(err);
        } finally {
            spinner.classList.add('d-none');
            buttonText.textContent = "Entrar";
            submitButton.disabled = false;
        }
    });

    // --- Función para manejar comandos especiales ---
    function handleCommand(d) {
        const polizas = localStorage.getItem('clienteData')
            ? JSON.parse(localStorage.getItem('clienteData')).polizas
            : [];

        switch (d.command) {
            case 'consultar_cliente':
                renderFichaCliente();
                break;
            case 'actualizar_cliente':
                renderModCliente();
                break;
            case 'consultar_poliza':
                renderPolizasCliente(d);
                break;
            case 'consultar_recibo':
                renderRecibosCliente();
                break;
            case 'consultar_siniestro':
                renderSiniestrosCliente();
                break;
            case 'consultar_documento':
                renderDocumentos();
                break;
            case 'consultar_compania':
                renderTelefonosCompanias();
                break;
            case 'registrar_siniestro':
                renderPolizasSelect($select_polizas, polizas);
                preSiniestroModal.show();
                break;
            case 'agenda_hoy':
                renderAgenda(d);
                break;
            case 'registrar_agenda':
                agendaModal.show();
                break;
            case 'registrar_documento':
            case 'registrar_documento_cliente':
            case 'registrar_documento_poliza':
                renderSubirDocumento();
                break;
            case 'enviar_email':
            case 'enviar_email_cliente':
                enviarEmail();
                break;
            case 'duplicado':
            case 'duplicado_poliza':
                renderPolizasSelect($select_polizas, polizas);
                duplicadoPolizaModal.show();
                break;
            case 'wallet':
            case 'wallet_poliza':
                renderPolizasSelect($select_polizas, polizas);
                walletPolizaModal.show();
                break;
            default:
                if (d.message) addMessageToChat('bot', d.message);
                else addMessageToChat('bot', d.error || 'Error en la respuesta del servidor');
        }
    }

    function enviarEmail() {
        const modal = new bootstrap.Modal(document.getElementById('emailClienteModal'));
        modal.show();

        const data = localStorage.getItem('clienteData')
            ? JSON.parse(localStorage.getItem('clienteData'))
            : null;

        document.getElementById('email_to').value = data.cliente.email;
    }

    // --- Función principal de envío de mensaje ---
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const messageInput = document.getElementById('chat-message');
        const message = messageInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message);
        addThinkingMessage();

        try {
            const response = await fetch(`${apiUrl}/consulta`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                    'Empresa': 'pacc',
                    'Device': 'web'
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
            messageInput.value = '';
        }
    });

    // --- Menu: cambiar cliente ---
    document.querySelectorAll('.change-client').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault(); // evita que haga scroll hacia arriba por el #
            clienteModal.show();
        });
    });

    // --- Menu: logout ---
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        clearStoredToken();
        location.reload();
    });

    // --- Clientes ---
    const $select_clientes = $('#client-select');
    renderClientesSelect($select_clientes);
    handleClienteSelection($select_clientes, clienteModal);

    // --- Pólizas ---
    const $select_polizas = $('#policy-select');

    document.getElementById('duplicadoPolizaForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const selectPolizas = $select_polizas.val();
        if (selectPolizas) {
            duplicadoPolizaModal.hide();
            descargaPoliza(selectPolizas);
        }
    });

    // --- Email cliente ---
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('email-cliente')) {
            e.preventDefault();
            enviarEmail();
        }
    });

    // --- Menu herramientas offcanvas
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-command]');
        if (btn) {
            const command = btn.getAttribute('data-command');
            // aquí llamas a tu función que envía el comando
            handleCommand({ "command": command });
            $("#offcanvasRespuestas").offcanvas('hide'); // cerrar panel
        }
    });

    // --- Boton abrir opciones rapidas
    document.getElementById('btnOffcanvas').addEventListener('click', function (e) {
        if (!getSelectedClient()) {
            e.preventDefault();  // evita el toggle del offcanvas
            clienteModal.show();
            return;
        }
        // Si hay cliente, abrir el offcanvas
        offcanvas.show();
    });

});
