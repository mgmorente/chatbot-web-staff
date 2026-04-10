// Función para mostrar el modal de "Procesando..."
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

// Interceptor global de fetch: detecta 401 y redirige al login
const _originalFetch = window.fetch;
window.fetch = async function (...args) {
    const response = await _originalFetch.apply(this, args);

    if (response.status === 401) {
        // Evitar múltiples redirecciones simultáneas
        if (!window._redirecting401) {
            window._redirecting401 = true;
            localStorage.removeItem('userToken');
            localStorage.removeItem('userTokenExpiry');
            Swal.fire({
                icon: 'warning',
                title: 'Sesion expirada',
                text: 'Tu sesion ha caducado. Vuelve a iniciar sesion.',
                confirmButtonText: 'Ir al login',
                allowOutsideClick: false,
                allowEscapeKey: false,
            }).then(() => {
                window.location.href = 'login.html';
            });
        }
    }

    return response;
};