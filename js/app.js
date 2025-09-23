// app.js
import { getStoredToken, storeToken, clearStoredToken, storeClientes } from './storage.js';
import { login } from './auth.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage, showApiError, clearApiError } from './chat.js';
import { renderClientesSelect, handleClienteSelection, storeClientesList, renderFichaCliente } from './clientes.js';
import { renderPolizasSelect, descargaPoliza, renderPolizasCliente } from './polizas.js';
import { renderRecibosCliente } from './recibos.js';
import { renderSiniestrosCliente } from './siniestros.js';
import { renderTelefonosCompanias } from './companias.js';
import { renderAgenda } from './agenda.js';
import { updateHeaderClient } from './header.js';

const apiUrl = ENV.API_URL;
const SESSION_DURATION = 2 * 60 * 60 * 1000;

document.addEventListener('DOMContentLoaded', () => {

    updateHeaderClient(); // Actualiza la cabecera al cargar la página

    // --- Modales ---
    const userModal = new bootstrap.Modal(document.getElementById('userModal'), { backdrop: 'static', keyboard: false });
    const clienteModal = new bootstrap.Modal(document.getElementById('clienteModal'));
    const polizaModal = new bootstrap.Modal(document.getElementById('polizaModal'));
    const preSiniestroModal = new bootstrap.Modal(document.getElementById('preSiniestroModal'));

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
                storeClientesList();
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
    function handleCommand(data) {
        const polizas = localStorage.getItem('clienteData')
            ? JSON.parse(localStorage.getItem('clienteData')).polizas
            : [];

        switch (data.command) {
            case 'duplicado_poliza':
                renderPolizasSelect($select_polizas, polizas);
                polizaModal.show();
                break;
            case 'ficha_cliente':
                renderFichaCliente();
                break;
            case 'polizas_cliente':
                renderPolizasCliente();
                break;
            case 'recibos_cliente':
                renderRecibosCliente();
                break;    
            case 'siniestros_cliente':
                renderSiniestrosCliente();
                break;
            case 'pre_siniestro':
                renderPolizasSelect($select_polizas, polizas);
                preSiniestroModal.show();
                break;
            case 'telefonos_companias':
                renderTelefonosCompanias(data.data);
                break;
            case 'agenda_hoy':
                renderAgenda(data.data);
                break;
            default:
                if (data.message) addMessageToChat('bot', data.message);
                else addMessageToChat('bot', data.error || 'Error en la respuesta del servidor');
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
                    cliente: localStorage.getItem('selectedClient') || ''
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

    //     // --- Chat ---
    //     document.getElementById('chat-form').addEventListener('submit', async (e) => {
    //         e.preventDefault();

    //         const messageInput = document.getElementById('chat-message');
    //         const message = messageInput.value.trim();
    //         if (!message) return;

    //         addMessageToChat('user', message);
    //         addThinkingMessage();

    //         try {
    //             const response = await fetch(`${apiUrl}/consulta`, {
    //                 method: 'POST',
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                     'Authorization': `Bearer ${userToken}`,
    //                     'Empresa': 'pacc',
    //                     'Device': 'web'
    //                 },
    //                 body: JSON.stringify({ consulta: message, cliente: localStorage.getItem('selectedClient') || '' }),
    //             });

    //             const data = await response.json();
    //             removeThinkingMessage();

    //             // Manejo de comandos especiales
    //             if (data.command === 'duplicado_poliza') {
    //                 renderPolizasSelect($select_polizas, localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')).polizas : []);
    //                 polizaModal.show();
    //                 return;
    //             } else if (data.command === 'ficha_cliente') {
    //                 let data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;

    // if (data && data.cliente) {
    //     let c = data.cliente;

    //     // Clase opcional para destacar algo
    //     let textoClase = ''; // o 'text-danger' si quieres resaltar

    //     let html = `
    //     <div class="row row-cols-1 g-2">
    //         <div class="col">
    //             <div class="card shadow-sm h-100 border-0 p-2">
    //                 <div class="d-flex flex-column ${textoClase}">
    //                     <strong class="small d-block">
    //                         ${c.nombre} · ${c.nif}
    //                     </strong>

    //                     <small class="d-block text-secondary mb-1">
    //                         <i class="bi bi-geo-alt"></i> ${c.domicilio} ·
    //                         <i class="bi bi-telephone"></i> ${c.telefono} ·
    //                         <i class="bi bi-envelope"></i> ${c.email}
    //                     </small>

    //                     <small class="d-block text-secondary">
    //                         ${c.tipo || 'N/A'} ·
    //                         ${c.cliente_fiel ? '<i class="bi bi-heart-fill text-danger"></i> Cliente fiel' : 'No fiel'} ·
    //                         <i class="bi bi-star-fill"></i> ${c.cod_importancia}€
    //                     </small>
    //                 </div>
    //             </div>
    //         </div>
    //     </div>
    //     `;

    //     addMessageToChat('bot', html);

    // } 

    //                 return;
    //             }

    //             if (response.ok && data.message) {
    //                 addMessageToChat('bot', data.message);
    //             } else {
    //                 addMessageToChat('bot', data.error || 'Error en la respuesta del servidor');
    //             }
    //         } catch (err) {
    //             removeThinkingMessage();
    //             addMessageToChat('bot', 'Error de conexión con el servidor');
    //             console.error(err);
    //         } finally {
    //             messageInput.value = '';
    //         }
    //     });

    // --- Clientes ---
    const $select_clientes = $('#client-select');
    renderClientesSelect($select_clientes);
    handleClienteSelection($select_clientes, clienteModal);

    document.getElementById('change-client').addEventListener('click', (e) => {
        e.preventDefault();
        clienteModal.show();
    });

    // --- Logout ---
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        clearStoredToken();
        location.reload();
    });

    // --- Pólizas ---
    const $select_polizas = $('#policy-select');

    document.getElementById('policy-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const selectedPolicy = $select_polizas.val();
        if (selectedPolicy) {
            polizaModal.hide();
            descargaPoliza(selectedPolicy);
        }
    });
});
