// Función para abrir el modal
export function renderSubirDocumentacion() {

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

