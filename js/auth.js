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

export function storeUser(user) {
    if (user) {
        localStorage.setItem('user', user.name);
        document.getElementById('user-name').innerHTML = user.name;
    }
}
