// 🔹 Función para mostrar el modal de "Procesando..."
export function showLoading(message = 'Por favor espere mientras se realiza el proceso.') {
    Swal.fire({
        title: 'Procesando...',
        text: message,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}