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

// Interceptor global de fetch: detecta 401 SOLO en llamadas API y redirige al login
const _originalFetch = window.fetch;
window.fetch = async function (...args) {
    const response = await _originalFetch.apply(this, args);

    // Solo interceptar llamadas a nuestra API, no recursos externos
    const url = (typeof args[0] === 'string' ? args[0] : args[0]?.url) || '';
    const isApiCall = typeof window.ENV !== 'undefined' && url.startsWith(window.ENV.API_URL);

    if (response.status === 401 && isApiCall) {
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

// Verificar token antes de llamar al API (uso compartido)
export function isTokenValid() {
    const token = localStorage.getItem('userToken');
    const expiry = parseInt(localStorage.getItem('userTokenExpiry'), 10);
    if (!token || !expiry || expiry < Date.now()) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userTokenExpiry');
        return false;
    }
    return true;
}