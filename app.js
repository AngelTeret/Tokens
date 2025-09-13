const palabrasReservadas = new Set([
  "if", "else", "switch", "case", "default", "break", "continue", "do", "while", "for", "return",
  "try", "catch", "finally", "throw",
  "function", "class", "extends", "constructor", "super", "import", "from", "export", "new",
  "var", "let", "const", "in", "instanceof", "typeof", "void", "delete", "this", "yield", "await", "with",
  "implements", "interface", "package", "private", "protected", "public", "static", "enum",
  "abstract", "boolean", "byte", "char", "double", "final", "float", "goto", "int", "long",
  "native", "short", "synchronized", "throws", "transient", "volatile"
]);

const literalesPalabra = new Map([
  ["true", "LITERAL_BOOLEANO"], ["false", "LITERAL_BOOLEANO"],
  ["null", "LITERAL_NULL"], ["undefined", "LITERAL_UNDEFINED"]
]);

const relacionales = new Set(["<", ">", "<=", ">=", "==", "!=", "===", "!=="]);
const logicos = new Set(["&&", "||", "!", "??"]);
const aritmeticos = new Set(["+", "-", "*", "/", "%", "**"]);
const asignacion = new Set(["=", "+=", "-=", "*=", "/=", "%=", "**=", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "&&=", "||=", "??="]);
const funcion = new Set(["=>"]);
const bitABit = new Set(["&", "|", "^", "~", "<<", ">>", ">>>"]);
const ternario = new Set(["?", ":"]);
const delimitadores = new Set(["(", ")", "{", "}", "[", "]", ",", ";", ".", ":"]);

const esLetra = c => /[A-Za-z_$]/.test(c);
const esDigito = c => /[0-9]/.test(c);
const escaparRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listaSombras = [...palabrasReservadas, ...Array.from(literalesPalabra.keys())]
  .sort((a, b) => b.length - a.length);
const regexSombra = new RegExp(`^(${listaSombras.map(escaparRegex).join("|")})([A-Za-z0-9_$]+)$`);
function esSombraDeReservada(lexema) {
  const m = lexema.match(regexSombra);
  return m ? { base: m[1], sufijo: m[2] } : null;
}

function pushError(arr, numLinea, col, lexema, descripcion) {
  arr.push({ tipo: "ERROR", valor: lexema, linea: numLinea, columna: col, mensaje: descripcion });
}

// 6) Tokenización de una línea
function lexLinea(texto, numLinea) {
  const res = [];
  const N = texto.length;
  let i = 0;
  const push = (tipo, valor, col) => res.push({ tipo, valor, linea: numLinea, columna: col });

  while (i < N) {
    const ch = texto[i];
    if (ch === " " || ch === "\t") { i++; continue; }
    const col = i + 1;

    // Comentario de línea
    if (ch === "/" && i + 1 < N && texto[i + 1] === "/") {
      push("COMENTARIO_LINEA", texto.slice(i), col);
      break;
    }
    // Comentario de bloque (en la misma línea)
    if (ch === "/" && i + 1 < N && texto[i + 1] === "*") {
      let j = i + 2, cerrado = false;
      while (j < N) { if (texto[j] === "*" && j + 1 < N && texto[j + 1] === "/") { cerrado = true; j += 2; break; } j++; }
      push("COMENTARIO_BLOQUE", texto.slice(i, cerrado ? j : N), col);
      i = cerrado ? j : N; continue;
    }

    // Delimitadores simples
    if (delimitadores.has(ch)) { push("DELIMITADOR", ch, col); i++; continue; }

    // Cadenas: '...'  "..."  `...`
    if (ch === "'" || ch === '"' || ch === "`") {
      const q = ch; let j = i + 1, val = q;
      while (j < N) {
        const cj = texto[j]; val += cj;
        if (cj === "\\") { if (j + 1 < N) { val += texto[j + 1]; j += 2; continue; } j++; continue; }
        if (cj === q) { j++; break; }
        j++;
      }
      push("LITERAL_CADENA", val, col);
      i = j; continue;
    }

    // Números: enteros o decimales (con exponente)
    if (esDigito(ch)) {
      let j = i + 1; while (j < N && esDigito(texto[j])) j++;
      let decimal = false;
      if (j < N && texto[j] === ".") { decimal = true; j++; while (j < N && esDigito(texto[j])) j++; }
      if (j < N && (texto[j] === "e" || texto[j] === "E")) {
        decimal = true; j++; if (texto[j] === "+" || texto[j] === "-") j++; while (j < N && esDigito(texto[j])) j++;
      }
      const lex = texto.slice(i, j);
      push(decimal ? "LITERAL_DECIMAL" : "LITERAL_ENTERO", lex, col);
      i = j; continue;
    }

    // Identificador / reservada / literal-palabra / sombra
    if (esLetra(ch)) {
      let j = i + 1; while (j < N && /[A-Za-z0-9_$]/.test(texto[j])) j++;
      const lex = texto.slice(i, j);
      const sombra = esSombraDeReservada(lex);
      if (sombra) {
        pushError(res, numLinea, col, lex, `Identificador inválido (empieza con reservada "${sombra.base}")`);
        i = j; continue;
      }
      if (literalesPalabra.has(lex)) { push(literalesPalabra.get(lex), lex, col); i = j; continue; }
      if (palabrasReservadas.has(lex)) { push("PALABRA_RESERVADA", lex, col); i = j; continue; }
      push("IDENTIFICADOR", lex, col); i = j; continue;
    }

    // Operadores (greedy 3→2→1)
    const a = texto[i] || "", b = texto[i + 1] || "", c = texto[i + 2] || "";
    const t3 = a + b + c, t2 = a + b, t1 = a;

    if (["===", "!==", ">>>"].includes(t3)) { clasificarOperador(t3, col); i += 3; continue; }
    if ([
      "==", "!=", ">>", "<<", "<=", ">=", "&&", "||", "+=", "-=", "*=", "/=", "%=", "=>", "&=", "|=", "^=", "??", "&&=", "||=", "??="
    ].includes(t2)) { clasificarOperador(t2, col); i += 2; continue; }
    if (["+", "-", "*", "/", "%", "<", ">", "=", "!", "&", "|", "^", "~", "?", ":"].includes(t1)) {
      clasificarOperador(t1, col); i += 1; continue;
    }

    // Carácter no reconocido
    pushError(res, numLinea, col, ch, "Símbolo no reconocido");
    i++;
  }

  return res;

  function clasificarOperador(op, col) {
    if (relacionales.has(op)) return push("OPERADOR_RELACIONAL", op, col);
    if (logicos.has(op)) return push("OPERADOR_LOGICO", op, col);
    if (aritmeticos.has(op)) return push("OPERADOR_ARITMETICO", op, col);
    if (asignacion.has(op)) return push("OPERADOR_ASIGNACION", op, col);
    if (funcion.has(op)) return push("OPERADOR_EXPRESION_FUNCION", op, col);
    if (bitABit.has(op)) return push("OPERADOR_BIT_A_BIT", op, col);
    if (ternario.has(op)) return push("OPERADOR_TERNARIO", op, col);
    // Operador no válido
    pushError(res, numLinea, col, op, "Operador inválido");
  }
}


// 7) Análisis completo y construcción de reporte (incluye Resumen Detallado)
function analizar(texto) {
  const lineas = texto.split(/\r?\n/);
  const tokens = [];
  for (let i = 0; i < lineas.length; i++) tokens.push(...lexLinea(lineas[i], i + 1));

  // Conteos generales para el enunciado
  const conteos = { if: 0, while: 0, for: 0, variables: 0, llaves_abiertas: 0, parentesis_abiertos: 0, errores: 0 };

  // Mapas de “lexema → conteo” por tipo de token
  const mapa = {};
  const inc = (k, x) => { if (!mapa[k]) mapa[k] = new Map(); mapa[k].set(x, (mapa[k].get(x) || 0) + 1); };

  for (const t of tokens) {
    if (t.tipo === "PALABRA_RESERVADA") {
      if (t.valor === "if") conteos.if++;
      else if (t.valor === "while") conteos.while++;
      else if (t.valor === "for") conteos.for++;
      inc("PALABRA_RESERVADA", t.valor);
    } else if (t.tipo === "IDENTIFICADOR") {
      conteos.variables++; inc("IDENTIFICADOR", t.valor);
    } else if (t.tipo === "DELIMITADOR") {
      if (t.valor === "{") conteos.llaves_abiertas++;
      if (t.valor === "(") conteos.parentesis_abiertos++;
      inc("DELIMITADOR", t.valor);
    } else if (t.tipo === "OPERADOR_RELACIONAL") {
      inc("OPERADOR_RELACIONAL", t.valor);
    } else if (t.tipo === "OPERADOR_LOGICO") {
      inc("OPERADOR_LOGICO", t.valor);
    } else if (t.tipo === "OPERADOR_ARITMETICO") {
      inc("OPERADOR_ARITMETICO", t.valor);
    } else if (t.tipo === "OPERADOR_ASIGNACION") {
      inc("OPERADOR_ASIGNACION", t.valor);
    } else if (t.tipo === "OPERADOR_EXPRESION_FUNCION") {
      inc("OPERADOR_EXPRESION_FUNCION", t.valor);
    } else if (t.tipo === "OPERADOR_BIT_A_BIT") {
      inc("OPERADOR_BIT_A_BIT", t.valor);
    } else if (t.tipo === "OPERADOR_TERNARIO") {
      inc("OPERADOR_TERNARIO", t.valor);
    } else if (t.tipo === "LITERAL_ENTERO") {
      inc("LITERAL_ENTERO", t.valor);
    } else if (t.tipo === "LITERAL_DECIMAL") {
      inc("LITERAL_DECIMAL", t.valor);
    } else if (t.tipo === "LITERAL_CADENA") {
      inc("LITERAL_CADENA", t.valor);
    } else if (t.tipo === "LITERAL_BOOLEANO") {
      inc("LITERAL_BOOLEANO", t.valor);
    } else if (t.tipo === "LITERAL_NULL") {
      inc("LITERAL_NULL", t.valor);
    } else if (t.tipo === "LITERAL_UNDEFINED") {
      inc("LITERAL_UNDEFINED", t.valor);
    } else if (t.tipo === "COMENTARIO_LINEA") {
      inc("COMENTARIO_LINEA", "//");
    } else if (t.tipo === "COMENTARIO_BLOQUE") {
      inc("COMENTARIO_BLOQUE", "/* */");
    } else if (t.tipo === "ERROR") {
      conteos.errores++;
      const clave = `${t.mensaje}: ${t.valor}`;
      inc("ERROR", clave);
    }
  }

  // Agrupar tokens por línea para el detalle
  const porLinea = new Map();
  for (const t of tokens) { if (!porLinea.has(t.linea)) porLinea.set(t.linea, []); porLinea.get(t.linea).push(t); }

  // Construir Salida.txt
  const out = [];
  out.push("REPORTE DE TOKENS Y LEXEMAS");
  out.push("=".repeat(60)); out.push("");

  for (let i = 1; i <= lineas.length; i++) {
    out.push(`Línea ${i}: ${lineas[i - 1]}`);
    const lst = porLinea.get(i) || [];
    if (lst.length === 0) {
      out.push("  (sin tokens)");
    } else {
      for (const t of lst) {
        if (t.tipo === "ERROR") {
          out.push(`  [ERROR] Línea ${t.linea} — ${t.mensaje}: ${JSON.stringify(t.valor)}`);
        } else {
          out.push(`    ${JSON.stringify(t.valor)}  ->  ${t.tipo}`);
        }
      }
    }
    out.push("");
  }



  // === Resumen detallado por categoría ===
  const imprimirMapa = (titulo, m) => {
    if (!m || m.size === 0) return;
    out.push(`** ${titulo}`);
    const arr = Array.from(m.entries()).sort((a, b) => b[1] - a[1] || ("" + a[0]).localeCompare("" + b[0]));
    for (const [lex, c] of arr) out.push(`- ${lex} → ${c}`);
    out.push("");
  };

  out.push("RESUMEN DE CONTEO POR PALABRA");
  out.push("-".repeat(60));

  imprimirMapa("Palabras Reservadas", mapa["PALABRA_RESERVADA"]);

  // Literales
  const fusionar = (...tipos) => {
    const m = new Map();
    for (const t of tipos) {
      if (!mapa[t]) continue;
      for (const [lex, c] of mapa[t].entries()) m.set(lex, (m.get(lex) || 0) + c);
    }
    return m;
  };
  imprimirMapa("Literales (Enteros)", mapa["LITERAL_ENTERO"]);
  imprimirMapa("Literales (Decimales)", mapa["LITERAL_DECIMAL"]);
  imprimirMapa("Literales (Cadenas)", mapa["LITERAL_CADENA"]);
  imprimirMapa("Literales (Booleanos/Null/Undefined)", fusionar("LITERAL_BOOLEANO", "LITERAL_NULL", "LITERAL_UNDEFINED"));

  imprimirMapa("Identificadores (Variables/Funciones)", mapa["IDENTIFICADOR"]);
  imprimirMapa("Signos de Agrupación / Delimitadores", mapa["DELIMITADOR"]);
  imprimirMapa("Operadores Relacionales", mapa["OPERADOR_RELACIONAL"]);
  imprimirMapa("Operadores Lógicos", mapa["OPERADOR_LOGICO"]);
  imprimirMapa("Operadores Aritméticos", mapa["OPERADOR_ARITMETICO"]);
  imprimirMapa("Operadores de Asignación", mapa["OPERADOR_ASIGNACION"]);
  imprimirMapa("Operadores de Expresion de Funcion", mapa["OPERADOR_EXPRESION_FUNCION"])
  imprimirMapa("Operadores Bit a Bit", mapa["OPERADOR_BIT_A_BIT"]);
  imprimirMapa("Operador Ternario", mapa["OPERADOR_TERNARIO"]);
  imprimirMapa("Comentarios de Línea", mapa["COMENTARIO_LINEA"]);
  imprimirMapa("Comentarios de Bloque", mapa["COMENTARIO_BLOQUE"]);
  imprimirMapa("Errores detectados", mapa["ERROR"]);

  return out.join("\n");
}