// app.js
import { getStoredToken, storeToken, clearStoredToken, getSelectedClient } from './storage.js';
import { login, storeUser } from './auth.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage, showApiError, clearApiError } from './chat.js';
import { renderClientesSelect, handleClienteSelection, storeClientesList, renderFichaCliente, renderModCliente } from './clientes.js';
import { renderPolizasSelect, descargaPoliza, renderPolizasCliente } from './polizas.js';
import { renderRecibosCliente } from './recibos.js';
import { renderSiniestrosCliente, renderSiniestrosTramites } from './siniestros.js';
import { renderTelefonosCompanias } from './companias.js';
import { renderAgenda } from './agenda.js';
import { renderSubirDocumentacion } from './docs.js';
import { updateHeaderClient } from './header.js';

const apiUrl = ENV.API_URL;
const SESSION_DURATION = 2 * 60 * 60 * 1000;

document.addEventListener('DOMContentLoaded', () => {

    updateHeaderClient(); // Actualiza la cabecera al cargar la página

    // --- Modales ---
    const userModal = new bootstrap.Modal(document.getElementById('userModal'), { backdrop: 'static', keyboard: false });
    const clienteModal = new bootstrap.Modal(document.getElementById('clienteModal'));
    const duplicadoPolizaModal = new bootstrap.Modal(document.getElementById('duplicadoPolizaModal'));
    const preSiniestroModal = new bootstrap.Modal(document.getElementById('preSiniestroModal'));

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
            case 'duplicado_poliza':
                renderPolizasSelect($select_polizas, polizas);
                duplicadoPolizaModal.show();
                break;
            case 'ver_cliente':
                renderFichaCliente();
                break;
            case 'mod_cliente':
                renderModCliente();
                break;
            case 'ver_cliente_polizas':
                renderPolizasCliente();
                break;
            case 'ver_cliente_recibos':
                renderRecibosCliente();
                break;
            case 'ver_cliente_siniestros':
                renderSiniestrosCliente();
                break;
            case 'ver_siniestro_tramites':
                renderSiniestrosTramites();
                break;
            case 'pre_siniestro':
                renderPolizasSelect($select_polizas, polizas);
                preSiniestroModal.show();
                break;
            case 'telefonos_companias':
                renderTelefonosCompanias(d.data);
                break;
            case 'agenda_hoy':
                renderAgenda(d);
                break;
            case 'subir_documentacion':
                renderSubirDocumentacion(d);
                break;
            default:
                if (d.message) addMessageToChat('bot', d.message);
                else addMessageToChat('bot', d.error || 'Error en la respuesta del servidor');
        }
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
            const modal = new bootstrap.Modal(document.getElementById('emailClienteModal'));
            modal.show();
        }
    });
});
