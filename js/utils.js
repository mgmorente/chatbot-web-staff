// Normalizar texto: quita tildes y pasa a minúsculas (para búsquedas)
export function norm(text) {
    return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

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

// Redirige al login cuando la sesión ha expirado
function handleSessionExpired() {
    if (window._redirectingLogin) return;
    window._redirectingLogin = true;
    localStorage.removeItem('userToken');
    localStorage.removeItem('userTokenExpiry');
    Swal.fire({
        icon: 'warning',
        title: 'Sesión expirada',
        text: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
        confirmButtonText: 'Ir al login',
        allowOutsideClick: false,
        allowEscapeKey: false,
    }).then(() => {
        window.location.href = 'login.html';
    });
}

// Interceptor global de fetch: detecta sesión inválida y redirige al login
const _originalFetch = window.fetch;
window.fetch = async function (...args) {
    const response = await _originalFetch.apply(this, args);

    // Solo interceptar llamadas a nuestra API, no recursos externos
    const url = (typeof args[0] === 'string' ? args[0] : args[0]?.url) || '';
    const isApiCall = typeof window.ENV !== 'undefined'
        && (url.startsWith(window.ENV.API_URL) || url.startsWith(window.ENV.API_URL_PRODUCCION));

    if (!isApiCall) return response;

    // 401/403 → sesión expirada
    if (response.status === 401 || response.status === 403) {
        handleSessionExpired();
        return response;
    }

    // Algunas respuestas 200/500 traen error de sesión en el body (ej: "usuario_pacc on null")
    // Clonamos para poder leer sin consumir el body original
    if (isApiCall && response.status >= 400) {
        try {
            const clone = response.clone();
            const body = await clone.json();
            const errMsg = (body.errors || body.error || '').toString().toLowerCase();
            if (errMsg.includes('usuario_pacc') || errMsg.includes('unauthenticated') || errMsg.includes('token')) {
                handleSessionExpired();
            }
        } catch { /* no es JSON, ignorar */ }
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