// Calcula el IMC y devuelve categoría
function calcularIMC(peso, altura) {
    if (peso <= 0 || altura <= 0) {
        return "Valores inválidos";
    }
    let imc = peso / (altura * altura);
    if (imc < 18.5) return "Bajo peso";
    else if (imc >= 18.5 && imc < 25) return "Normal";
    else if (imc >= 25 && imc < 30) return "Sobrepeso";
    else return "Obesidad";
}
