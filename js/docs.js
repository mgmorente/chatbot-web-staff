import { addMessageToChat } from './chat.js';

// Función para abrir el modal
export function renderSubirDocumento() {

    const modalElement = document.getElementById('modalSubirDoc');
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

// documentos
export function renderDocumentos() {
    const data = localStorage.getItem('clienteData') ? JSON.parse(localStorage.getItem('clienteData')) : null;
    if (!data || !data.documentos || !data.documentos.length) {
        addMessageToChat('bot', '<div class="text-danger">No hay documentos disponibles.</div>');
        return;
    }

    const htmlParts = data.documentos.map(s => {

        return `
            <li class="list-group-item">
                <div class="d-flex justify-content-between w-100">
                    <strong class="small">${s.entidad.toUpperCase()} ${s.documento}</strong>
                    <span class="small text-muted">${s.fecha}</span>
                </div>
                <small class="d-block"><a href="#">${s.descripcion}</a></small>
            </li>
        `;
    });

    const html = `<ul class="list-group list-group-flush">${htmlParts.join('')}</ul>`;
    addMessageToChat('bot', html);
}
