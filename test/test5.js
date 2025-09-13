// Objeto persona
let persona = {
    nombre: "Carlos",
    edad: 30,
    direccion: {
        ciudad: "Guatemala",
        pais: "Guatemala"
    },
    saludar: function () {
        return "Hola, mi nombre es " + this.nombre;
    }
};

console.log(persona.saludar());
