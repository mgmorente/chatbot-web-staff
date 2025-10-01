// app.js
import { getStoredToken, clearStoredToken, getSelectedClient } from './storage.js';
import { handleLogin } from './auth.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage, showApiError, clearApiError } from './chat.js';
import { renderClientesSelect, handleClienteSelection, storeClientesList, renderFichaCliente, renderModCliente } from './clientes.js';
import { renderPolizasSelect, descargaPoliza, renderPolizasCliente } from './polizas.js';
import { renderRecibosCliente } from './recibos.js';
import { renderSiniestrosCliente } from './siniestros.js';
import { renderTelefonosCompanias } from './companias.js';
import { renderAgenda } from './agenda.js';
import { renderSubirDocumento, renderDocumentos } from './docs.js';
import { updateHeaderClient } from './header.js';

const apiUrl = ENV.API_URL;


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
            Swal.fire({
                title: 'Cargando datos...',
                html: 'Por favor espera mientras se cargan los datos del usuario.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            await handleLogin(usuario_pacc, password);

            Swal.close();
            userModal.hide();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message || 'Error de conexión'
            });
        } finally {
            spinner.classList.add('d-none');
            buttonText.textContent = "Entrar";
            submitButton.disabled = false;
        }
    });

    // --- Handle Menu ---
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
                renderSiniestrosCliente(d);
                break;
            case 'consultar_documento':
                renderDocumentos();
                break;
            case 'consultar_compania':
                renderTelefonosCompanias(d);
                break;
            case 'registrar_siniestro':
                renderPolizasSelect($select_polizas, polizas);
                preSiniestroModal.show();
                break;
            case 'consultar_agenda':
                renderAgenda();
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

    // --- Modal enviar email ---
    function enviarEmail() {
        const modal = new bootstrap.Modal(document.getElementById('emailClienteModal'));
        modal.show();

        const data = localStorage.getItem('clienteData')
            ? JSON.parse(localStorage.getItem('clienteData'))
            : null;

        document.getElementById('email_to').value = data.cliente.email;
    }

    // --- Enviar email ---
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

    // --- Menu offcanvas
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-command]');
        if (btn) {
            const command = btn.getAttribute('data-command');
            // argumentos
            let args = {};
            if (command == "consultar_poliza") {
                args = { "estado": "activa" };
            } else if (command == "consultar_siniestro") {
                args = { "estado": "abierto" };
            }
            handleCommand({ "command": command, "args": args });
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

    // --- Boton enviar email
    $('#sendEmailButton').on('click', function () {
        let form = document.getElementById("emailClienteForm");
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }
        const to = $('#email_to').val().trim();
        const subject = $('#subject').val().trim();
        const body = $('#body').val().trim();
        const $alertBox = $('#sendMailAlert');

        $alertBox.addClass('d-none').text('');

        if (!to || !subject || !body) {
            $alertBox.text('❌ Por favor, complete todos los campos obligatorios.').removeClass('d-none');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            $alertBox.text('❌ El correo electrónico no tiene un formato válido.').removeClass('d-none');
            return;
        }

        // 🔹 Mostrar alerta de "Enviando..."
        Swal.fire({
            title: 'Enviando...',
            text: 'Por favor espere mientras se envía el correo.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        fetch(`${apiUrl}/send-email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'empresa': 'pacc',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, subject, body })
        })
            .then(response => {
                if (!response.ok) throw new Error('Error en el envío');
                return response.json();
            })
            .then(() => {
                Swal.close(); // 🔹 Cerrar el "Enviando..."
                $('#emailClienteModal').modal('hide');
                $('#subject, #body').val('');
                $alertBox.removeClass('alert-danger d-none').addClass('alert-success')
                    .text('✅ Correo enviado correctamente.');
                Swal.fire('✅ Enviado', 'El correo se envió correctamente.', 'success');
            })
            .catch(err => {
                Swal.close(); // 🔹 Cerrar el "Enviando..."
                $alertBox.text('❌ No se pudo enviar el correo.').removeClass('d-none');
                Swal.fire('❌ Error', 'No se pudo enviar el correo.', 'error');
                console.error(err);
            });
    });


});
