# 🤖 Reconocedor de Tokens de JavaScript  

Un **analizador léxico simple** para código **JavaScript**, diseñado con fines educativos.  
Este proyecto muestra cómo los compiladores o intérpretes procesan el código fuente en su primera etapa: la **tokenización**.  

Convierte tu código en una lista de componentes básicos —palabras clave, identificadores, operadores y literales— y genera un reporte detallado.  

---

## 🛠️ Tecnologías utilizadas
- **HTML** → estructura de la interfaz.  
- **CSS** → estilos visuales, con paleta inspirada en **Dracula**.  
- **JavaScript** → lógica principal para el análisis y la interacción.  

---

## ✨ Características principales
- 🔎 **Análisis de código** línea por línea.  
- 📝 **Modos de entrada**:
  - Subir archivo `.txt` o `.js`.  
  - Escribir/pegar código en el área de texto.  
- 🧩 **Clasificación de tokens**:
  - `PALABRA_RESERVADA` → *if, for, function…*  
  - `IDENTIFICADOR` → variables y funciones  
  - `LITERAL_*` → cadenas, números, booleanos, null, undefined  
  - `OPERADOR_*` → aritméticos, lógicos, asignación…  
  - `DELIMITADOR` → paréntesis, llaves, punto y coma  
  - `COMENTARIO_*` → línea y bloque  
- ⚠️ **Detección de errores**: identificadores inválidos que comienzan con palabras reservadas.  
- 📊 **Reporte detallado**:  
  - Lista de tokens con tipo y valor.  
  - Resumen de conteo por categoría.  
- 💾 **Descarga de reporte** como `Salida.txt`.  

---

## 🚀 Cómo usarlo
1. Abre **`index.html`** en tu navegador.  
2. Elige tu modo de análisis:  
   - 📂 **Subir archivo**: selecciona un `.js` o `.txt` y presiona *Analizar archivo*.  
   - ✍️ **Escribir código**: pega tu código y presiona *Analizar texto*.  
3. Revisa el reporte generado en el área de salida.  
4. Si lo deseas, descarga el resultado como **`Salida.txt`**.  

---

## ⚙️ Estructura del proyecto
- **`index.html`** → interfaz de usuario.  
- **`styles.css`** → estilos y paleta temática.  
- **`app.js`** → lógica del analizador:  
  - Listas de palabras reservadas y literales.  
  - `lexLinea(texto, numLinea)` → procesa tokens línea a línea.  
  - `analizar(texto)` → análisis completo y generación de reporte.  
  - Eventos conectados a los botones (*analizar, descargar*).  

---

## 📝 Notas importantes
- Este analizador es **léxico no-contextual** → solo identifica tokens, no interpreta gramática.  
- Los operadores se detectan con una estrategia **greedy** (ejemplo: `===` antes que `==`).  
- Los comentarios de bloque sin cierre se toman como un único token hasta el fin de línea.  
- No cubre casos avanzados de JavaScript (ej. expresiones regulares literales o *template strings* con `${}`).  
- Está pensado como una **implementación simplificada y didáctica**.  

---

## 🎯 Objetivo
Ofrecer una herramienta sencilla para **aprender cómo funciona la primera fase de un compilador**, mostrando de forma clara cómo se identifican y clasifican los tokens en un lenguaje de programación.  
