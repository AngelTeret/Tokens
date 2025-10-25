// Funciones asíncronas y promesas
async function obtenerDatos(usuarioId) {
    try {
        const respuesta = await fetch(`/api/usuarios/${usuarioId}`);
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }
        const datos = await respuesta.json();
        return datos;
    } catch (error) {
        console.error("Error al obtener datos:", error.message);
        return null;
    }
}

// Función con promesas
function procesarUsuarios(usuarios) {
    return Promise.all(
        usuarios.map(async (usuario) => {
            const datos = await obtenerDatos(usuario.id);
            return {
                ...usuario,
                datosCompletos: datos
            };
        })
    );
}

// Uso
const usuarios = [
    { id: 1, nombre: "Ana" },
    { id: 2, nombre: "Carlos" }
];

procesarUsuarios(usuarios).then(resultado => {
    console.log("Usuarios procesados:", resultado);
});
