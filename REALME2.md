# Analizador y Coloreador Léxico para JavaScript

![Banner del Analizador Léxico](https://i.imgur.com/8i2N3gV.png)

Este proyecto es una herramienta web sofisticada que realiza un **análisis léxico** y **coloreado de sintaxis** para código JavaScript. Ha sido desarrollado desde cero utilizando exclusivamente **HTML, CSS y JavaScript puro (Vanilla JS)**, sin depender de frameworks o librerías externas para su lógica central.

La aplicación permite a los usuarios cargar un archivo `.js` o pegar código directamente. Al analizarlo, la herramienta descompone el código fuente en una secuencia de unidades léxicas llamadas *tokens*. Posteriormente, utiliza esta información para renderizar una vista previa del código con resaltado de sintaxis y generar un informe exhaustivo del análisis.

## 🌟 Características Destacadas

Este analizador va más allá de una simple clasificación de tokens, incorporando una lógica robusta para manejar las complejidades del lenguaje JavaScript.

* **Análisis Léxico Profundo**: Identifica y clasifica con precisión una amplia gama de tokens de JavaScript:
    * **Palabras Reservadas**: `function`, `let`, `if`, `class`, `import`, `async`, etc.
    * **Identificadores**: Nombres de variables, funciones y clases.
    * **Literales**:
        * Numéricos (enteros y decimales, incluyendo notación científica).
        * Cadenas de texto (con comillas simples y dobles).
        * Plantillas literales (template strings) con expresiones incrustadas (` `${...}` `).
        * Booleanos (`true`, `false`).
        * Valores especiales como `null`, `undefined`, `NaN`, y `Infinity`.
    * **Operadores**: Un conjunto completo que incluye aritméticos, lógicos, relacionales, de asignación, ternarios y operadores modernos de ES6+ como el *spread* (`...`), *optional chaining* (`?.`) y *nullish coalescing* (`??`).
    * **Delimitadores**: Paréntesis, llaves, corchetes, comas y puntos y comas, con validación de balanceo.
    * **Comentarios**: Reconoce tanto comentarios de una sola línea (`//`) como de bloque (`/* ... */`).
    * **Expresiones Regulares**: Distingue inteligentemente los literales de expresiones regulares de los operadores de división.

* **Coloreado de Sintaxis Dinámico**: Renderiza una vista previa del código analizado en el DOM, asignando colores específicos a cada tipo de token para mejorar drásticamente la legibilidad y facilitar la depuración visual.

* **Detección de Errores Léxicos y Sintácticos**:
    * Identifica errores comunes como cadenas de texto o comentarios de bloque sin cerrar.
    * Utiliza una pila para verificar el correcto balanceo de delimitadores (`()`, `{}`, `[]`), reportando cierres inesperados o faltantes.
    * Realiza una validación post-análisis para detectar patrones sintácticos inválidos, como dos identificadores consecutivos sin un operador.

* **Generación de Reportes Completos**:
    * **Desglose por Línea**: Muestra cada línea del código fuente seguida de una lista detallada de los tokens encontrados en ella.
    * **Resumen Agregado**: Proporciona un conteo total para cada lexema, agrupado por su categoría (Palabras Reservadas, Identificadores, Operadores, etc.), permitiendo un análisis cuantitativo del código.

* **Interfaz de Usuario Intuitiva y Moderna**:
    * Permite cargar archivos locales (`.js`, `.txt`) o pegar código directamente.
    * Diseño responsivo con un tema oscuro estético y profesional.
    * Utiliza notificaciones interactivas de `SweetAlert2` para comunicar el estado del análisis (éxito, error, advertencia) de forma amigable.
    * Funcionalidad para **Limpiar** la interfaz y **Descargar** el reporte generado como un archivo de texto.

## 🛠️ Pila Tecnológica

La filosofía de este proyecto es demostrar el poder del "Vanilla Stack", construyendo una aplicación compleja con las tecnologías fundamentales de la web.

* **HTML5**: Utilizado para la estructura semántica de la aplicación, asegurando la accesibilidad y una base sólida.
* **CSS3**: Responsable de todo el estilo visual. Se emplean características modernas como:
    * **Variables CSS (Custom Properties)**: Para una fácil gestión de la paleta de colores y el temario.
    * **Flexbox**: Para crear un layout fluido y responsivo que se adapta a cualquier tamaño de pantalla.
    * **Estilización Avanzada**: Efectos de `hover`, transiciones y un diseño cuidado de los elementos de formulario y botones.
* **JavaScript (ES6+)**: Es el motor de la aplicación. Toda la lógica de análisis y manipulación del DOM está escrita en JavaScript puro, utilizando características modernas como:
    * **`Set`**: Para un almacenamiento y búsqueda de alta eficiencia de palabras reservadas, operadores y literales.
    * **`const` y `let`**: Para una gestión de variables más segura y predecible.
    * **Funciones Flecha, Template Literals y Spread/Rest Operators**: Para un código más conciso y legible.
* **SweetAlert2**: La única librería externa, utilizada para mejorar la experiencia del usuario con alertas modales elegantes y personalizables.

## ⚙️ ¿Cómo Funciona? Una Inmersión Profunda en el Analizador

El corazón de la aplicación reside en el archivo `app.js`. El proceso de análisis se puede descomponer en los siguientes pasos:

1.  **Entrada de Texto**: El código, ya sea de un archivo o pegado directamente, se divide en un array de líneas.

2.  **El Escáner (`lexLinea`)**: La función principal itera sobre cada línea, carácter por carácter, para identificar tokens. Mantiene un objeto `estado` que persiste entre líneas para manejar contextos multilínea.
    * **Gestión de Estado**: El objeto `estado` rastrea si el analizador se encuentra actualmente dentro de un comentario de bloque (`enComentarioBloque`) o de una plantilla literal (`enTemplate`). También contiene la pila (`stack`) para el balanceo de delimitadores.
    * **Prioridad de Tokens**: En cada posición, el escáner intenta hacer coincidir los patrones en un orden específico y lógico: espacios en blanco, comentarios, cadenas, números, identificadores, operadores y delimitadores.

3.  **Lógica Contextual (El Desafío de `/`)**: Uno de los retos del análisis léxico de JavaScript es el carácter `/`. Puede ser un operador de división o el inicio de una expresión regular.
    * La función `puedeIniciarRegex` implementa una **heurística avanzada** que analiza el último token significativo para decidir el contexto. Por ejemplo, después de un número o un identificador, `/` es probablemente una división. Después de un `(`, `=`, o una palabra clave como `return`, es probablemente una expresión regular.

4.  **Manejo de Operadores "Greedy"**: Para manejar operadores de múltiples caracteres (ej. `===`, `!==`, `>>=`), la función `leerOperador` adopta un enfoque "greedy" (codicioso). Primero intenta hacer coincidir el operador más largo posible (4 caracteres), luego 3, luego 2 y finalmente 1. Esto asegura que `===` no sea tokenizado incorrectamente como `==` seguido de `=`.

5.  **Validación Post-Léxica (`validarSintaxisMinima`)**: Una vez que todos los tokens han sido identificados, se realiza una segunda pasada sobre la lista de tokens aplanada. Esta fase busca patrones sintácticos que, aunque léxicamente válidos, son incorrectos. Un ejemplo es la secuencia `let 5;` o `nombre apellido;` (dos identificadores seguidos).

6.  **Renderizado y Reporte**:
    * Si no se encuentran errores, la lista de tokens por línea se pasa a `renderPreview`, que genera los `<span>` de HTML con las clases CSS correspondientes para el coloreado.
    * Simultáneamente, se pasa a `construirReporte` para generar el informe de texto detallado.

## 🚀 Instalación y Uso

Este proyecto no requiere un servidor, un proceso de compilación ni dependencias de Node.js. Funciona directamente en el navegador.

1.  **Clona o descarga el repositorio**:
    ```bash
    git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
    ```

2.  **Navega al directorio del proyecto**:
    ```bash
    cd tu-repositorio
    ```

3.  **Abre `index.html`**:
    Simplemente abre el archivo `index.html` en tu navegador web preferido (Google Chrome, Mozilla Firefox, Microsoft Edge, etc.).

4.  **¡Listo para Analizar!**: Carga un archivo o pega tu código JavaScript y presiona el botón "Analizar".

## 📂 Estructura del Código

El código en `app.js` está organizado de manera lógica para facilitar su comprensión y mantenimiento:

1.  **Definiciones Globales**: Constantes (`Set`) para palabras clave, operadores, etc.
2.  **Funciones de Ayuda (Helpers)**: Funciones puras y pequeñas para tareas como escapar HTML o verificar espacios.
3.  **Funciones de Lectura de Tokens**: Funciones especializadas como `leerCadena`, `leerNumero`, `leerOperador`, etc.
4.  **Núcleo del Analizador**: La función principal `lexLinea` y la lógica de estado.
5.  **Validación Sintáctica**: La función `validarSintaxisMinima`.
6.  **Generación de Salida**: Las funciones `construirReporte` y `renderPreview`.
7.  **Manejadores de Eventos (UI)**: El código que conecta los botones y los campos de entrada del DOM con la lógica del analizador.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si tienes ideas para nuevas características, mejoras en el algoritmo de análisis o correcciones de errores, no dudes en abrir un *issue* para discutirlo o enviar un *pull request*.
