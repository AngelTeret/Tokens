// Error: Operadores mal formados
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

// Error: operador mal formado
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

// Error: sintaxis incorrecta en operador
const usuarios = [
    { id: 1, nombre: "Ana" },
    { id: 2, nombre: "Carlos" }
];

// Error: operador ternario mal formado
const resultado = usuarios.length > 0 ? procesarUsuarios(usuarios) : [];
console.log("Usuarios procesados:", resultado);
