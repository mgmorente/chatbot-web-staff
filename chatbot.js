const apiUrl = `${ENV.API_URL}`;
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 horas en ms

document.addEventListener('DOMContentLoaded', () => {
    const userModalEl = document.getElementById('userModal');
    const userModal = new bootstrap.Modal(userModalEl, {
        backdrop: 'static',
        keyboard: false
    });

    // --- Gestión Token y sesión ---
    const tokenData = getStoredToken();

    if (!tokenData || !tokenData.token || tokenData.expiry < Date.now()) {
        // Token no existe o expirado
        clearStoredToken();
        userModal.show();
    }

    // --- Funciones auxiliares de token ---
    function getStoredToken() {
        try {
            const token = localStorage.getItem('userToken');
            const expiry = parseInt(localStorage.getItem('userTokenExpiry'), 10);
            if (!token || !expiry) return null;
            return { token, expiry };
        } catch {
            return null;
        }
    }

    function storeToken(token) {
        localStorage.setItem('userToken', token);
        localStorage.setItem('userTokenExpiry', (Date.now() + SESSION_DURATION).toString());


        const clientes = [
    { id: '44368770E', text: 'Manuel Gajete' },
    { id: 'B02545671', text: 'Estructuras metalicas ...' },
    { id: '30489877L', text: 'Rafael López' },
    // { id: 'ana_martinez', text: 'Ana Martínez' },
    // { id: 'luis_rodriguez', text: 'Luis Rodríguez' }
];

// Guardar en LocalStorage
localStorage.setItem('clientes', JSON.stringify(clientes));

    }

    function clearStoredToken() {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userTokenExpiry');
    }

    // --- Variables para token en sesión ---
    let userToken = tokenData?.token || '';

    // --- Login ---
    document.getElementById('user-data-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearApiError();

        const submitButton = document.getElementById('submitButton');
        const spinner = document.getElementById('spinner');
        const buttonText = document.getElementById('buttonText');

        spinner.classList.remove('d-none');
        buttonText.textContent = "Procesando...";
        submitButton.disabled = true;

        const usuario_pacc = document.getElementById('usuario_pacc').value.trim();
        const password = document.getElementById('password').value.trim();

        try {
            const response = await fetch(`${apiUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Empresa': 'pacc',
                    'Device': 'web'
                },
                body: JSON.stringify({ usuario_pacc, password }),
            });

            const data = await response.json();

            // if (response.ok && data.token) {
            if (data.access_token) {
                userToken = data.access_token;
                storeToken(userToken);
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

    // --- Enviar mensaje de chat ---
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const messageInput = document.getElementById('chat-message');
        const message = messageInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message);
        addMessageToChatThinking();

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

            if (data.command === 'duplicado_poliza') {
                // Manejar comando especial si es necesario
                console.log('Comando duplicado_poliza recibido');
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

    // --- Eventos para botones "order" ---
    document.querySelectorAll('button.order').forEach(button => {
        button.addEventListener('click', () => {
            submitChatMessage(button.textContent);
        });
    });

    // --- Delegación para elementos con data-solicitud ---
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-solicitud]');
        if (!btn) return;

        e.preventDefault();

        const solicitud = btn.getAttribute('data-solicitud');
        if (solicitud) {
            const parts = solicitud.split('#');
            if (parts.length === 3 && parts[0] === 'ecliente') {
                const [, entidad, id] = parts;
                window.open(`${eclienteUrl}/access/${entidad}/${userToken}/${id}`);
                return;
            }
            // Si no es ecliente, enviar texto al chat
            submitChatMessage(solicitud);
        }
    });

    // --- Funciones reutilizables ---
    function submitChatMessage(text) {
        const chatInput = document.getElementById('chat-message');
        chatInput.value = text;

        const chatForm = document.getElementById('chat-form');
        chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    function addMessageToChat(type, message, thinking = false) {
        const chatBox = document.getElementById('chat-box');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        if (thinking) messageDiv.classList.add('thinking');

        const textDiv = document.createElement('div');
        textDiv.classList.add('text');
        if (type === 'bot') textDiv.classList.add('w-100');
        textDiv.innerHTML = message;

        messageDiv.appendChild(textDiv);
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addMessageToChatThinking() {
        const thinkingHTML = `
            <div id="loading" class="d-flex align-items-center">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>`;
        addMessageToChat('bot', thinkingHTML, true);
    }

    function removeThinkingMessage() {
        document.querySelectorAll('.thinking').forEach(el => el.remove());
    }

    function showApiError(msg) {
        const errorDiv = document.getElementById('api-errors');
        errorDiv.textContent = msg;
        errorDiv.classList.remove('d-none');
    }

    function clearApiError() {
        const errorDiv = document.getElementById('api-errors');
        if (!errorDiv.classList.contains('d-none')) {
            errorDiv.classList.add('d-none');
        }
    }








// Array de pólizas para un cliente
const polizasGuardadas = [
    {
        id: "140101236448",
        text: "POL-001 - Seguros Alfa",
        aseguradora: "Seguros Alfa",
        fecha_inicio: "01-01-2024",
        fecha_fin: "31-12-2024",
        tipo: "Auto"
    },
    {
        id: "140101236448",
        text: "POL-002 - Seguros Beta",
        aseguradora: "Seguros Beta",
        fecha_inicio: "15-03-2024",
        fecha_fin: "14-03-2025",
        tipo: "Hogar"
    },
    {
        id: "140101236448",
        text: "POL-003 - Seguros Gamma",
        aseguradora: "Seguros Gamma",
        fecha_inicio: "01-02-2024",
        fecha_fin: "31-01-2025",
        tipo: "Vida"
    }
];

    const $select_polizas = $('#policy-select');
    $select_polizas.empty();
    $select_polizas.append('<option value="">Selecciona un poliza</option>');
    polizasGuardadas.forEach(c => {
        $select_polizas.append(new Option(c.text, c.id));
    });

    // Inicializar Select2 una sola vez
    $select_polizas.select2({
        dropdownParent: $('#policyModal'),
        width: '100%'
    });

// Instancia única del modal
    const polizaModalEl = document.getElementById('policyModal');
    const polizaModal = new bootstrap.Modal(polizaModalEl);

    
// Guardar poliza seleccionado
    document.getElementById('policy-form').addEventListener('submit', function(e){
        e.preventDefault();
        const selectedPolicy = $select_polizas.val();
        if(selectedPolicy){
            polizaModal.hide(); // cerrar correctamente
            console.log('poliza seleccionado:', selectedPolicy);
descargaPoliza(selectedPolicy)


            




        }
    });


    // Función para enviar consulta al backend
 function descargaPoliza(poliza) {
    try {
          fetch(`https://pacconline.grupo-pacc.es/api/api/eiac/duplicado?contrato=${poliza}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/pdf',
            },
            
        }).then(response => {
                        const contentType = response.headers.get('Content-Type');
                        if (contentType && contentType.includes('application/json')) {
                            return response.json().then(data => {
                                console.log('Respuesta:', data); // Log para depurar
                                addMessageToChat('bot', 'Error de conexión con el servidor');
                            });
                        } else {
                            return response.blob().then(blob => {
                                // Crear un enlace temporal para descargar el archivo
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `duplicado_${poliza}.pdf`; // Cambia la extensión según corresponda
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                window.URL.revokeObjectURL(url);
                            });
                        }
                    }).catch(error => {
                        console.error('Error al procesar la respuesta:', error.message);
                    });



        
    } catch (err) {
        addMessageToChat('bot', 'Error de conexión con el servidor');
        console.error(err);
    } finally {

    }
}






    // Clientes desde localStorage
    const clientesGuardados = JSON.parse(localStorage.getItem('clientes')) || [];

    const $select_clientes = $('#client-select');
    $select_clientes.empty();
    $select_clientes.append('<option value="">Selecciona un cliente</option>');
    clientesGuardados.forEach(c => {
        $select_clientes.append(new Option(c.text, c.id));
    });

    // Inicializar Select2 una sola vez
    $select_clientes.select2({
        dropdownParent: $('#clientModal'),
        width: '100%'
    });

    // Instancia única del modal
    const clientModalEl = document.getElementById('clientModal');
    const clientModal = new bootstrap.Modal(clientModalEl);

    // Abrir modal al pulsar "Cambiar cliente"
    document.getElementById('change-client').addEventListener('click', function(e){
        e.preventDefault();
        clientModal.show();
    });

    // Guardar cliente seleccionado
    document.getElementById('client-form').addEventListener('submit', function(e){
        e.preventDefault();
        const selectedClient = $select_clientes.val();
        if(selectedClient){
            localStorage.setItem('selectedClient', selectedClient);
            clientModal.hide(); // cerrar correctamente
            console.log('Cliente seleccionado:', selectedClient);




let cadena = `
<div class="container mt-4">
  <h2>Cliente: Juan Pérez</h2>

  <div class="accordion" id="clientAccordion">

    <!-- Datos del Cliente -->
    <div class="accordion-item">
      <h2 class="accordion-header" id="headingDatos">
        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDatos" aria-expanded="true" aria-controls="collapseDatos">
          Datos del Cliente
        </button>
      </h2>
      <div id="collapseDatos" class="accordion-collapse collapse show" aria-labelledby="headingDatos" data-bs-parent="#clientAccordion">
        <div class="accordion-body">
          <p><strong>NIF:</strong> 12345678A<br>
             <strong>Teléfono:</strong> 600123456<br>
             <strong>Email:</strong> juan.perez@example.com</p>
        </div>
      </div>
    </div>

    <!-- Lista Pólizas -->
    <div class="accordion-item">
      <h2 class="accordion-header" id="headingPolizas">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapsePolizas" aria-expanded="false" aria-controls="collapsePolizas">
          Pólizas
        </button>
      </h2>
      <div id="collapsePolizas" class="accordion-collapse collapse" aria-labelledby="headingPolizas" data-bs-parent="#clientAccordion">
        <div class="accordion-body">
          <table class="table table-sm table-striped">
            <thead>
              <tr>
                <th>Póliza</th>
                <th>Aseguradora</th>
                <th>Inicio</th>
                <th>Fin</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>POL-001</td><td>Seguros Alfa</td><td>01-01-2024</td><td>31-12-2024</td></tr>
              <tr><td>POL-002</td><td>Seguros Beta</td><td>15-03-2024</td><td>14-03-2025</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Lista Recibos -->
    <div class="accordion-item">
      <h2 class="accordion-header" id="headingRecibos">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseRecibos" aria-expanded="false" aria-controls="collapseRecibos">
          Recibos
        </button>
      </h2>
      <div id="collapseRecibos" class="accordion-collapse collapse" aria-labelledby="headingRecibos" data-bs-parent="#clientAccordion">
        <div class="accordion-body">
          <table class="table table-sm table-striped">
            <thead>
              <tr>
                <th>Recibo</th>
                <th>Importe</th>
                <th>Fecha emisión</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>REC-001</td><td>200 €</td><td>01-01-2024</td><td>Pagado</td></tr>
              <tr><td>REC-002</td><td>180 €</td><td>01-07-2024</td><td>Pendiente</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Lista Siniestros -->
    <div class="accordion-item">
      <h2 class="accordion-header" id="headingSiniestros">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseSiniestros" aria-expanded="false" aria-controls="collapseSiniestros">
          Siniestros
        </button>
      </h2>
      <div id="collapseSiniestros" class="accordion-collapse collapse" aria-labelledby="headingSiniestros" data-bs-parent="#clientAccordion">
        <div class="accordion-body">
          <table class="table table-sm table-striped">
            <thead>
              <tr>
                <th>Siniestro</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>SIN-001</td><td>05-02-2024</td><td>Accidente</td><td>Abierto</td></tr>
              <tr><td>SIN-002</td><td>12-03-2024</td><td>Robo</td><td>Cerrado</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</div>
`;

addMessageToChat('bot', cadena);




        }
    });
});



