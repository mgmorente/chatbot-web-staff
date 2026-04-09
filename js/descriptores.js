
// Función para obtener y almacenar descriptores desde la API
export async function storeDescriptoresList() {
    const token = localStorage.getItem('userToken');
    const data = await fetchDescriptoresList(token); // <-- await aquí
    if (data) {
        localStorage.setItem('descriptores', JSON.stringify(data));
    }
}

// Llamada a la API para obtener la lista de descriptores
async function fetchDescriptoresList(token) {
    try {
        const response = await fetch(`${ENV.API_URL}/descriptores`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Empresa': ENV.EMPRESA,
                'Device': ENV.DEVICE
            }
        });
        if (!response.ok) throw new Error('Error al obtener datos de descriptores');
        return await response.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}




