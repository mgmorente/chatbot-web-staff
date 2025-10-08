// app.js
import { getStoredToken, clearStoredToken, getSelectedClient } from './storage.js';
import { handleLogin } from './auth.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage, clearApiError } from './chat.js';
import { renderClientesSelect, handleClienteSelection, recargarDatosCliente, renderFichaCliente, renderModCliente } from './clientes.js';
import { renderPolizasSelect, descargaPoliza, walletPoliza, renderPolizasCliente } from './polizas.js';
import { renderRecibosCliente } from './recibos.js';
import { renderSiniestrosCliente } from './siniestros.js';
import { renderTelefonosCompanias } from './companias.js';
import { renderAgenda } from './agenda.js';
import { renderSubirDocumento, renderDocumentos } from './docs.js';
import { updateHeaderClient } from './header.js';
import { showLoading } from './utils.js';

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
            submitButton.disabled = false;
        }
    });

    // --- Handle Menu ---
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
                renderPolizasSelect($presiniestro_poliza_select, '#preSiniestroModal');
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
                renderPolizasSelect($duplicado_poliza_select, '#duplicadoPolizaModal');
                duplicadoPolizaModal.show();
                break;
            case 'wallet':
            case 'wallet_poliza':
                renderPolizasSelect($wallet_poliza_select, '#walletPolizaModal');
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
            const response = await fetch(`${ENV.API_URL}/consulta`, {
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

    // --- Fecha max hoy en input fecha ocurrencia ---
    const inputFecha = document.getElementById("fecha-ocurrencia");
    const hoy = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    inputFecha.setAttribute("max", hoy);

    // --- Clientes ---
    const $select_clientes = $('#client-select');
    renderClientesSelect($select_clientes);
    handleClienteSelection($select_clientes, clienteModal);

    // --- Pólizas ---
    const $duplicado_poliza_select = $('#duplicado-poliza-select');
    const $wallet_poliza_select = $('#wallet-poliza-select');
    const $presiniestro_poliza_select = $('#presiniestro-poliza-select');

    document.getElementById('duplicadoPolizaForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const selectPolizas = $duplicado_poliza_select.val();
        if (selectPolizas) {
            duplicadoPolizaModal.hide();
            descargaPoliza(selectPolizas);
        }
    });

    document.getElementById('walletPolizaForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const selectPolizas = $wallet_poliza_select.val();
        if (selectPolizas) {
            walletPolizaModal.hide();
            walletPoliza(selectPolizas);
        }
    });

    // --- Presiniestro ---
    document.getElementById('preSiniestroForm').addEventListener('submit', function (e) {
        e.preventDefault();

        let form = this; // referencia al form
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const datos = {
            "poliza": $presiniestro_poliza_select.val(),
            "fecha": $('#fecha-ocurrencia').val(),
            "causa": $('#causa-select').val(),
            "descripcion": $('#descripcion').val().trim(),
        };

        showLoading();

        fetch(`${ENV.API_URL}/presiniestro`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'empresa': 'pacc',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        })
            .then(response => {
                if (!response.ok) throw new Error('Error en el envío');
                return response.json();
            })
            .then(() => {
                Swal.close();
                $('#preSiniestroModal').modal('hide');
                // $('#subject, #body').val('');
                Swal.fire('Grabado', 'El presiniestro se registro correctamente', 'success');
            })
            .catch(err => {
                Swal.close();
                Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
                console.error(err);
            });

    });

    // Modificar causas siniestro segun tipo poliza
    $('#presiniestro-poliza-select').on('change', function (e) {

        let valor = $(this).val();

        const polizas = localStorage.getItem('clienteData')
            ? JSON.parse(localStorage.getItem('clienteData')).polizas
            : [];

        const poliza = polizas.find(p => p.poliza === valor);
        if (!poliza) return;

        const descriptores = localStorage.getItem('descriptores')
            ? JSON.parse(localStorage.getItem('descriptores'))
            : [];

        const $causa_select = $('#causa-select');
        // Destruir Select2 si ya estaba inicializado
        if ($causa_select.hasClass("select2-hidden-accessible")) {
            $causa_select.select2('destroy');
        }
        // Vaciar opciones
        $causa_select.empty();
        $causa_select.append('<option value="" selected disabled>Seleccione una opción</option>');
        $causa_select.select2();
        // agregar opciones segun tipo poliza
        const datos = descriptores.filter(d => d.tipo.includes(poliza.ramo_tipo));
        datos.forEach(item => {
            $causa_select.append(new Option(item.nombre, item.codigo));
        });
        // reactivar select2
        $causa_select.select2({
            theme: 'bootstrap-5',
            allowClear: true,
            closeOnSelect: true,
        });
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

    document.getElementById('modClienteForm').addEventListener('submit', function (e) {
        e.preventDefault();

        let form = this; // referencia al form
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const nif = JSON.parse(localStorage.getItem('clienteData')).cliente.nif;
        const movil = $('#movil').val().trim();
        const email = $('#email').val().trim();

        showLoading();

        fetch(`${ENV.API_URL}/update-cliente`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'empresa': 'pacc',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nif, movil, email })
        })
            .then(response => {
                if (!response.ok) throw new Error('Error en el envío');
                return response.json();
            })
            .then(() => {
                Swal.close();
                $('#modClienteModal').modal('hide');
                $('#movil, #email').val('');
                Swal.fire('Grabado', 'Los datos han sido modificados', 'success');
            })
            .catch(err => {
                Swal.close(); 
                Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
                console.error(err);
            });

    });

    // --- Boton enviar email
    document.getElementById('emailClienteForm').addEventListener('submit', function (e) {
        e.preventDefault();

        let form = this; // referencia al form
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }
        const to = $('#email_to').val().trim();
        const subject = $('#subject').val().trim();
        const body = $('#body').val().trim();

        showLoading();

        fetch(`${ENV.API_URL}/send-email`, {
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
                Swal.fire('Enviado', 'El correo se envió correctamente', 'success');
            })
            .catch(err => {
                Swal.close(); // 🔹 Cerrar el "Enviando..."
                Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
                console.error(err);
            });
    });

    // --- Boton nueva agenda
    document.getElementById('nuevaAgendaForm').addEventListener('submit', function (e) {
        e.preventDefault();

        let form = this; // referencia al form
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const data = {
            nif: JSON.parse(localStorage.getItem('clienteData')).cliente.nif,
            subject: $("#agenda-asunto").val(),
            start: $("#agenda-datetime").val(),
            tipo: 'cita',
        };

        showLoading();

        fetch(`${ENV.API_URL}/agenda`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'empresa': 'pacc',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (!response.ok) throw new Error('Error en el envío');
                return response.json();
            })
            .then(() => {
                Swal.close();
                $('#agendaModal').modal('hide');
                $('#agenda-datetime, #agenda-asunto').val('');
                Swal.fire('Grabado', 'La agenda se registro correctamente', 'success');
            })
            .catch(err => {
                Swal.close();
                Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
                console.error(err);
            });
    });


});
