// auth.js
export async function login(apiUrl, usuario_pacc, password) {
    const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Empresa': 'pacc',
            'Device': 'web'
        },
        body: JSON.stringify({ usuario_pacc, password }),
    });

    return response.json();
}
