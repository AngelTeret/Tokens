// Error: Palabras reservadas mal usadas
class Calculadora {
    constructor() {
        this.historial = [];
    }
    
    sumar(a, b) {
        const resultado = a + b;
        this.historial.push(`${a} + ${b} = ${resultado}`);
        return resultado;
    }
    
    restar(a, b) {
        const resultado = a - b;
        this.historial.push(`${a} - ${b} = ${resultado}`);
        return resultado;
    }
    
    obtenerHistorial() {
        return this.historial;
    }
}

// Error: palabra reservada mal usada
const calc = new Calculadora();
console.log("Suma:", calc.sumar(5, 3));
console.log("Resta:", calc.restar(10, 4));
console.log("Historial:", calc.obtenerHistorial());

// Error: sintaxis incorrecta
if (true) {
    let variable = "test";
    console.log(variable);
} else {
    // Error: falta llave de cierre
    console.log("No debería ejecutarse");
