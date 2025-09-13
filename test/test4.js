function verificarAcceso(usuario, edad, registrado) {
    // Acceso permitido si es mayor de edad y está registrado
    if (edad >= 18 && registrado === true && usuario !== "") {
        return "Acceso permitido";
    } else {
        return "Acceso denegado";
    }
}

let resultado = verificarAcceso("Ana", 22, true);
console.log(resultado);
