// js/docs.js
// documentos
import { addMessageToChat } from './chat.js';
import { renderPolizasSelect } from './polizas.js';
import { renderSiniestrosSelect } from './siniestros.js';
import { getStoredToken } from './storage.js';
import { showLoading } from './utils.js';

// Función para abrir el modal
export function renderSubirDocumento() {

    const modalElement = document.getElementById('subirDocModal');
    const modal = new bootstrap.Modal(modalElement);

    const $subir_doc_poliza_select = $('#subir-doc-poliza-select');
    renderPolizasSelect($subir_doc_poliza_select, '#subirDocModal');

    const $subir_doc_siniestro_select = $('#subir-doc-siniestro-select');
    renderSiniestrosSelect($subir_doc_siniestro_select, '#subirDocModal');

    // Inicializar inputs vacíos
    document.getElementById('doc-entidad').value = '';
    document.getElementById('doc-descripcion').value = '';
    document.getElementById('doc-fichero').value = '';

    modal.show();

    const form = document.getElementById('formSubirDoc');
    form.onsubmit = async function (e) {
        e.preventDefault();

        let form = this; // referencia al form
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const tokenData = getStoredToken();
        let userToken = tokenData?.token || '';
        if (!userToken) {
            Swal.fire('Error', 'No se encontró el token de usuario.', 'error');
            return;
        }

        // Mostrar Swal de "Enviando..."
        showLoading('Enviando documento, por favor espere...');

        const nif = JSON.parse(localStorage.getItem('clienteData')).cliente.nif;
        const entidad = document.getElementById('doc-entidad').value;
        const descripcion = document.getElementById('doc-descripcion').value.trim();
        const fichero = document.getElementById('doc-fichero').files[0];
        const poliza = document.getElementById('subir-doc-poliza-select').value;
        const siniestro = document.getElementById('subir-doc-siniestro-select').value;

        // Preparar FormData
        const formData = new FormData();
        formData.append('nif', nif);
        formData.append('entidad', entidad);
        formData.append('descripcion', descripcion);
        formData.append('fichero', fichero);

        // Añadir los valores condicionalmente
        if (entidad === 'poliza') {
            formData.append('poliza', poliza);
        } else if (entidad === 'siniestro') {
            formData.append('siniestro', siniestro);
            formData.append('tramite', true);
        }

        try {

            fetch(`${ENV.API_URL}/upload-doc`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Empresa': 'pacc',
                    'Device': 'web'
                },
                body: formData
            }).then(response => {
                if (!response.ok) throw new Error('Error en la subida');
                return response.json();
            })
                .then(() => {
                    Swal.close(); // 🔹 Cerrar el "Enviando..."
                    Swal.fire('Enviado', 'El documento se ha subido correctamente', 'success');
                })
                .catch(err => {
                    Swal.close(); // 🔹 Cerrar el "Enviando..."
                    Swal.fire('Error', 'No se pudo realizar el proceso', 'error');
                    console.error(err);
                });

            // Oculta el modal si todo va bien
            modal.hide();

            // Limpieza del formulario
            form.reset();

            // Si usas Select2, reinicia
            if (window.jQuery) {
                $('#doc-entidad').val('').trigger('change');
                $('#subir-doc-poliza-select').val('').trigger('change');
                $('#subir-doc-siniestro-select').val('').trigger('change');
            }
        } catch (error) {
            console.error('❌ Error al subir el documento:', error);
            alert('Error al subir el documento.');
        }

    };
}

export function renderDocumentos(id = null) {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.documentos || !data.documentos.length) {
        addMessageToChat('bot', '<div>No hay documentos disponibles.</div>');
        return;
    }

    // filtrar por siniestro si corresponde
    const docsFiltrados = id
        ? data.documentos.filter(d => d.documento == id)
        : data.documentos;

    if (!docsFiltrados.length) {
        addMessageToChat('bot', `<div>No hay documentos disponibles.</div>`);
        return;
    }

    // Agrupar por entidad+documento
    const grouped = docsFiltrados.reduce((acc, d) => {
        const key = `${d.entidad}-${d.documento}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(d);
        return acc;
    }, {});

    // Construir HTML
    let html = '<div><small class="text-success fst-italic">Documentos</small></div>'; // texto encima de todo

    Object.entries(grouped).forEach(([key, docs]) => {
        const [entidad, documento] = key.split('-');

        const itemsHtml = docs.map(s => `
            <li class="list-group-item">
                <div class="d-flex justify-content-between w-100">
                    <small><a href="#">${s.descripcion}</a></small>
                    <span class="small text-muted">${s.fecha}</span>
                </div>
            </li>
        `).join('');

        html += `
            <div>
                <div><small class="fw-bold">${entidad.toUpperCase()} ${documento}</small></div>
                <ul class="list-group list-group-flush">${itemsHtml}</ul>
            </div>
        `;
    });

    addMessageToChat('bot', html);
}

document.addEventListener('DOMContentLoaded', function () {
    // --- Form subir documento ---
    const entidadSelect = document.getElementById('doc-entidad');
    const polizaSelect = document.getElementById('subir-doc-poliza-select');
    const siniestroSelect = document.getElementById('subir-doc-siniestro-select');

    // Si el formulario no está presente, salimos
    if (!entidadSelect || !polizaSelect || !siniestroSelect) return;

    const polizaGroup = polizaSelect.closest('.mb-3');
    const siniestroGroup = siniestroSelect.closest('.mb-3');

    // Ocultar ambos al inicio y quitar required
    polizaGroup.style.display = 'none';
    siniestroGroup.style.display = 'none';
    polizaSelect.removeAttribute('required');
    siniestroSelect.removeAttribute('required');

    entidadSelect.addEventListener('change', function () {
        const valor = entidadSelect.value;

        // Ocultamos ambos por defecto y quitamos required
        polizaGroup.style.display = 'none';
        siniestroGroup.style.display = 'none';
        polizaSelect.removeAttribute('required');
        siniestroSelect.removeAttribute('required');

        // Limpiar valores
        polizaSelect.value = '';
        siniestroSelect.value = '';

        // Si usas Select2, reinicia también el plugin
        if (window.jQuery && $(polizaSelect).data('select2')) {
            $(polizaSelect).val('').trigger('change');
        }
        if (window.jQuery && $(siniestroSelect).data('select2')) {
            $(siniestroSelect).val('').trigger('change');
        }

        // Mostrar según selección y aplicar required
        if (valor === 'poliza') {
            polizaGroup.style.display = '';
            polizaSelect.setAttribute('required', 'required');
        } else if (valor === 'siniestro') {
            siniestroGroup.style.display = '';
            siniestroSelect.setAttribute('required', 'required');
        }
    });
});

