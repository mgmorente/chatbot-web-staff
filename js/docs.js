// js/docs.js
// documentos
import { addMessageToChat } from './chat.js';

// Función para abrir el modal
export function renderSubirDocumento() {

    const modalElement = document.getElementById('subirDocModal');
    const modal = new bootstrap.Modal(modalElement);

    // Inicializar inputs vacíos
    document.getElementById('doc-entidad').value = '';
    document.getElementById('doc-descripcion').value = '';
    document.getElementById('doc-fichero').value = '';
    document.getElementById('error-subida').innerText = '';

    modal.show();

    const form = document.getElementById('formSubirDoc');
    form.onsubmit = async function(e) {
        e.preventDefault();

        const entidad = document.getElementById('doc-entidad').value;
        const descripcion = document.getElementById('doc-descripcion').value.trim();
        const fichero = document.getElementById('doc-fichero').files[0];
        const errorDiv = document.getElementById('error-subida');
        errorDiv.innerText = '';

        // Validaciones
        if (!entidad) {
            errorDiv.innerText = 'Debes seleccionar una entidad';
            return;
        }
        if (!descripcion) {
            errorDiv.innerText = 'La descripción es obligatoria';
            return;
        }
        if (!fichero) {
            errorDiv.innerText = 'Debes seleccionar un archivo';
            return;
        }

        // Preparar FormData
        const formData = new FormData();
        formData.append('entidad', entidad);
        formData.append('descripcion', descripcion);
        formData.append('fichero', fichero);

        try {
            console.log('Datos a subir:', entidad, descripcion, fichero.name);

            // Aquí iría la llamada a tu API
            // await fetch('/api/subir-documento', { method: 'POST', body: formData });

            modal.hide();
        } catch (error) {
            errorDiv.innerText = 'Error al subir el archivo';
            console.error(error);
        }
    };
}

export function renderDocumentos(id = null) {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.documentos || !data.documentos.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay documentos disponibles.</div>');
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

