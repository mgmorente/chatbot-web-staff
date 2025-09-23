// polizas.js
export function renderPolizasSelect($select, polizas) {
    $select.empty();
    $select.append('<option value="">Selecciona una póliza</option>');
    polizas.forEach(p => {
        $select.append(new Option(`${p.cia_poliza} ${p.compania} ${p.objeto}`, p.poliza));
    });
}

export async function descargaPoliza(polizaId) {
    try {
        const response = await fetch(
            `https://pacconline.grupo-pacc.es/api/api/eiac/duplicado?contrato=${polizaId}`,
            { method: 'GET', headers: { 'Content-Type': 'application/pdf' } }
        );

        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
            return await response.json(); // error del backend
        } else {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `duplicado_${polizaId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        }
    } catch (err) {
        console.error('Error descargaPoliza:', err);
    }
}
