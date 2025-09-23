// app.js
import { getStoredToken, storeToken, clearStoredToken } from './storage.js';
import { login } from './auth.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage, showApiError, clearApiError } from './chat.js';
import { renderClientesSelect, handleClienteSelection } from './clientes.js';
import { renderPolizasSelect, descargaPoliza } from './polizas.js';
import { updateHeaderClient } from './header.js';

const apiUrl = ENV.API_URL;
const SESSION_DURATION = 2 * 60 * 60 * 1000;

document.addEventListener('DOMContentLoaded', () => {

    updateHeaderClient(); // Actualiza la cabecera al cargar la página

    // --- Modales ---
    const userModal = new bootstrap.Modal(document.getElementById('userModal'), { backdrop: 'static', keyboard: false });
    const clientModal = new bootstrap.Modal(document.getElementById('clientModal'));
    const polizaModal = new bootstrap.Modal(document.getElementById('policyModal'));

    // --- Comprobar sesión ---
    const tokenData = getStoredToken();
    let userToken = tokenData?.token || '';
    if (!tokenData || !tokenData.token || tokenData.expiry < Date.now()) {
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
            const data = await login(apiUrl, usuario_pacc, password);

            if (data.access_token) {
                userToken = data.access_token;
                storeToken(userToken, SESSION_DURATION);
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

    // --- Chat ---
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
                body: JSON.stringify({ consulta: message, cliente: localStorage.getItem('selectedClient') || '' }),
            });

            const data = await response.json();
            removeThinkingMessage();

            // Manejo de comandos especiales
            if (data.command === 'duplicado_poliza') {
                renderPolizasSelect($select_polizas, localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')).polizas : []);
                polizaModal.show();
                return;
            }

            if (response.ok && data.message) {
                addMessageToChat('bot', data.message);
            } else {
                addMessageToChat('bot', data.error || 'Error en la respuesta del servidor');
            }
        } catch (err) {
            removeThinkingMessage();
            addMessageToChat('bot', 'Error de conexión con el servidor');
            console.error(err);
        } finally {
            messageInput.value = '';
        }
    });

    // --- Clientes ---
    const $select_clientes = $('#client-select');
    renderClientesSelect($select_clientes);
    handleClienteSelection($select_clientes, clientModal);

    document.getElementById('change-client').addEventListener('click', (e) => {
        e.preventDefault();
        clientModal.show();
    });

    // --- Pólizas ---
    const $select_polizas = $('#policy-select');
    
    document.getElementById('policy-form').addEventListener('submit', function(e){
        e.preventDefault();
        const selectedPolicy = $select_polizas.val();
        if (selectedPolicy) {
            polizaModal.hide();
            descargaPoliza(selectedPolicy);
        }
    });
});
