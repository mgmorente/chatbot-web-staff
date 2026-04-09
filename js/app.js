// app.js
import { getStoredToken, clearStoredToken, getSelectedClient } from './storage.js';
import { addMessageToChat, addThinkingMessage, removeThinkingMessage } from './chat.js';
import { renderClientesSelect, handleClienteSelection, recargarDatosCliente, renderFichaCliente, renderModCliente, buscarClienteEnChat, renderBusquedaClientes, renderClientesRecientes, fetchCliente } from './clientes.js';
import { renderPolizasSelect, descargaPoliza, walletPoliza, renderPolizasCliente } from './polizas.js';
import { renderRecibosCliente } from './recibos.js';
import { renderSiniestrosCliente } from './siniestros.js';
import { renderTelefonosCompanias } from './companias.js';
import { renderAgenda } from './agenda.js';
import { renderSubirDocumento, renderDocumentos } from './docs.js';
import { updateHeaderClient } from './header.js';
import { showLoading } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {

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
    document.getElementById('themeToggleHeader').addEventListener('click', toggleTheme);

    // --- Comprobar sesión: redirigir a login si no hay token ---
    const tokenData = getStoredToken();
    let userToken = tokenData?.token || '';
    if (!tokenData || !tokenData.token || tokenData.expiry < Date.now()) {
        clearStoredToken();
        window.location.href = 'login.html';
        return;
    }

    updateHeaderClient();

    // --- Modales ---
    const clienteModal = new bootstrap.Modal(document.getElementById('clienteModal'));
    const duplicadoPolizaModal = new bootstrap.Modal(document.getElementById('duplicadoPolizaModal'));
    const walletPolizaModal = new bootstrap.Modal(document.getElementById('walletPolizaModal'));
    const preSiniestroModal = new bootstrap.Modal(document.getElementById('preSiniestroModal'));
    const agendaModal = new bootstrap.Modal(document.getElementById('agendaModal'));

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

    // --- Form chat ---
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const messageInput = document.getElementById('chat-message');
        const message = messageInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message);
        messageInput.value = '';

        // Comandos locales del chat
        const msgLower = message.toLowerCase().trim();
        if (msgLower === 'recientes' || msgLower === 'clientes recientes' || msgLower === 'historial') {
            renderClientesRecientes();
            return;
        }
        if (msgLower === 'ayuda' || msgLower === 'help' || msgLower === 'funcionalidades') {
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

    // --- Logout ---
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        clearStoredToken();
        window.location.href = 'login.html';
    });

    // --- Fecha max hoy en input fecha ocurrencia ---
    const inputFecha = document.getElementById("fecha-ocurrencia");
    const hoy = new Date().toISOString().split("T")[0];
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

        let form = this;
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
                'empresa': ENV.EMPRESA,
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
        if ($causa_select.hasClass("select2-hidden-accessible")) {
            $causa_select.select2('destroy');
        }
        $causa_select.empty();
        $causa_select.append('<option value="" selected disabled>Seleccione una opción</option>');
        $causa_select.select2();
        const datos = descriptores.filter(d => d.tipo.includes(poliza.ramo_tipo));
        datos.forEach(item => {
            $causa_select.append(new Option(item.nombre, item.codigo));
        });
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

    // --- Modificar cliente ---
    document.getElementById('modClienteForm').addEventListener('submit', function (e) {
        e.preventDefault();

        let form = this;
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
                'empresa': ENV.EMPRESA,
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

    // --- Enviar email ---
    document.getElementById('emailClienteForm').addEventListener('submit', function (e) {
        e.preventDefault();

        let form = this;
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const $alertBox = $('#sendMailAlert');
        $alertBox.addClass('d-none').text('');

        const to = $('#email_to').val().trim();
        const subject = $('#subject').val().trim();
        const body = $('#body').val().trim();
        const attachment = $('#attachment')[0].files[0] || null;

        const formData = new FormData();
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('body', body);
        if (attachment) {
            formData.append('attachment', attachment);
        }

        if (attachment) {
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
            const maxSize = 5 * 1024 * 1024;

            const extension = attachment.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(extension)) {
                $alertBox.text('Tipo de archivo no permitido. Solo JPG, PNG, PDF, DOC, XLS...').removeClass('d-none');
                $('#attachment').val('');
                return;
            }

            if (attachment.size > maxSize) {
                $alertBox.text('El archivo es demasiado grande. Máximo 5 MB.').removeClass('d-none');
                $('#attachment').val('');
                return;
            }
        }

        showLoading();

        fetch(`${ENV.API_URL}/send-email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Empresa': ENV.EMPRESA,
                'Device': ENV.DEVICE
            },
            body: formData
        })
            .then(response => {
                if (!response.ok) throw new Error('Error en el envío');
                return response.json();
            })
            .then(() => {
                Swal.close();
                $('#emailClienteModal').modal('hide');
                $('#subject, #body, #attachment').val('');
                Swal.fire('Enviado', 'El correo se envió correctamente', 'success');
            })
            .catch(err => {
                Swal.close();
                Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
                console.error(err);
            });
    });

    // --- Nueva agenda ---
    document.getElementById('nuevaAgendaForm').addEventListener('submit', function (e) {
        e.preventDefault();

        let form = this;
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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`,
                'Empresa': ENV.EMPRESA,
                'Device': ENV.DEVICE
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
