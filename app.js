const PALABRAS_RESERVADAS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else",
  "export", "extends", "finally", "for", "function", "if", "import", "in", "instanceof", "let", "new",
  "return", "super", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield",
  "async", "await", "from", "as", "of"
]);

const LITERALES = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);


const TIPOS_REPORTE = new Set([
  "PALABRA_RESERVADA", "IDENTIFICADOR", "LITERAL", "LITERAL_ENTERO", "LITERAL_DECIMAL",
  "LITERAL_CADENA", "LITERAL_BOOLEANO", "LITERAL_NULL", "LITERAL_REGEX", "DELIMITADOR",
  "OPERADOR", "OPERADOR_ARITMETICO", "OPERADOR_RELACIONAL", "OPERADOR_LOGICO",
  "OPERADOR_ASIGNACION", "OPERADOR_TERNARIO", "OPERADOR_ARROW", "OPERADOR_SPREAD",
  "OPERADOR_OPTIONAL", "OPERADOR_NULLISH", "CADENA", "REGEX", "COMENTARIO",
  "COMENTARIO_LINEA", "COMENTARIO_BLOQUE", "WS", "ERROR", "FUNCION"
]);


const DELIMITADORES = new Set(["(", ")", "[", "]", "{", "}", ";", ",", "."]);

const OPS4 = new Set([">>>="]);
const OPS3 = new Set(["===", "!==", ">>>", "**=", "<<=", ">>=", "&&=", "||=", "??=", "...", "?.."]);
const OPS2 = new Set([
  "++", "--", "**", "&&", "||", "??", "?.", "<=", ">=", "==", "!=", "=>", "<<", ">>",
  "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "??", "?.", ".."
]);
const OPS1 = new Set([
  "+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "<", ">", "=", "?", ";", ":", "."
]);

const OP_LOGICOS_REL = new Set(["&&", "||", "!", "<", ">", "<=", ">=", "==", "===", "!=", "!=="]);


function esEspacio(ch) { return ch === " " || ch === "\t" || ch === "\r"; }
function escaparHTML(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function esperadoPara(c) { return c === "}" ? "{" : c === ")" ? "(" : c === "]" ? "[" : "?"; }

function parCierra(a) { return a === "{" ? "}" : a === "(" ? ")" : a === "[" ? "]" : a === "${" ? "}" : "?"; }

const reNumero = /^(\d+\.?\d*|\d*\.\d+)([eE][-+]?\d+)?(n)?/;
const reIdent = /^[$A-Za-z_][0-9$A-Za-z_]*/;

function leerCadena(linea, j, comilla) {
  let i = j + 1;
  while (i < linea.length) {
    const c = linea[i];
    if (c === "\\") { i += 2; continue; }
    if (c === comilla) { return { lex: linea.slice(j, i + 1), next: i + 1, cerrada: true }; }
    i++;
  }
  return { lex: linea.slice(j), next: linea.length, cerrada: false };
}

// Cuerpo de template a partir de la posición actual (ya estamos dentro del template)
function leerTemplateLinea(linea, j) {
  let i = j;
  while (i < linea.length) {
    const c = linea[i];
    if (c === "\\") { i += 2; continue; }
    if (c === "`") { return { lex: linea.slice(j, i + 1), next: i + 1, tipo: "CIERRE_TPL" }; }
    if (c === "$" && i + 1 < linea.length && linea[i + 1] === "{") {
      return { lex: linea.slice(j, i + 2), next: i + 2, tipo: "INICIO_EXPR_TPL" };
    }
    i++;
  }
  return { lex: linea.slice(j), next: linea.length, tipo: "CUERPO_TPL" };
}

function leerComentarioBloqueLinea(linea, j) {
  const cierre = linea.indexOf("*/", j + 2);
  if (cierre === -1) return { lex: linea.slice(j), next: linea.length, cerrada: false };
  return { lex: linea.slice(j, cierre + 2), next: cierre + 2, cerrada: true };
}

function leerOperador(linea, j) {
  const s4 = linea.slice(j, j + 4); if (OPS4.has(s4)) return { op: s4, next: j + 4 };
  const s3 = linea.slice(j, j + 3); if (OPS3.has(s3)) return { op: s3, next: j + 3 };
  const s2 = linea.slice(j, j + 2); if (OPS2.has(s2)) return { op: s2, next: j + 2 };
  const s1 = linea[j]; if (OPS1.has(s1)) return { op: s1, next: j + 1 };
  return null;
}

/** Heurística mejorada: ¿puede comenzar un literal RegExp aquí? */
function puedeIniciarRegex(ultimo) {
  if (!ultimo) return true;

  // Nunca después de estos tokens
  if (ultimo.tipo === "IDENTIFICADOR" || ultimo.tipo === "LITERAL" || ultimo.tipo === "REGEX" || ultimo.tipo === "CADENA")
    return false;

  // Nunca después de cierres de agrupación
  if (ultimo.tipo === "DELIMITADOR" && [")", "]", "}"].includes(ultimo.lexema))
    return false;

  // Siempre después de estos delimitadores
  if (ultimo.tipo === "DELIMITADOR" && ["(", "[", "{", ",", ";", "?", ":"].includes(ultimo.lexema))
    return true;

  // Después de operadores de comparación, asignación, lógicos
  if (ultimo.tipo === "OPERADOR" && ["==", "===", "!=", "!==", "<", ">", "<=", ">=", "=", "+=", "-=", "*=", "/=", "%=", "&&", "||", "!", "+", "-", "*", "/", "%"].includes(ultimo.lexema))
    return true;

  // Después de palabras reservadas específicas
  if (ultimo.tipo === "PALABRA_RESERVADA") {
    return ["return", "throw", "new", "typeof", "void", "delete", "in", "of", "case", "yield", "if", "while", "for", "switch"].includes(ultimo.lexema);
  }

  return true;
}

// /.../flags — soporta clases [..], escapes, y flags a-z
function leerRegexLiteral(linea, j) {
  let i = j + 1, enClase = false;
  while (i < linea.length) {
    const c = linea[i];
    if (c === "\\") { i += 2; continue; }
    if (enClase) { if (c === "]") { enClase = false; } i++; continue; }
    if (c === "[") { enClase = true; i++; continue; }
    if (c === "/") {
      i++;
      let k = i;
      while (k < linea.length && /[a-z]/i.test(linea[k])) k++;
      return { lex: linea.slice(j, k), next: k, cerrada: true };
    }
    i++;
  }
  return { lex: linea.slice(j), next: linea.length, cerrada: false };
}

// ------------ Coloreado según tu paleta / clases del CSS ------------
function claseToken(t) {
  // Verificar si es un tipo de reporte (palabra reservada del reporte)
  if (TIPOS_REPORTE.has(t.lexema)) {
    return "report-type";  // Color especial para tipos de reporte
  }

  switch (t.tipo) {
    case "PALABRA_RESERVADA": return "keyword";        // Azul
    case "LITERAL":
    case "REGEX": return "literal";        // Anaranjado
    case "CADENA": return "string";         // Verde claro
    case "IDENTIFICADOR": return "identifier";     // Rosado
    case "COMENTARIO": return "comment";        // Gris
    case "DELIMITADOR": return "grouping";       // Blanco
    case "OPERADOR":
      if (t.subtipo === 'OPERADOR_RELACIONAL' || t.subtipo === 'OPERADOR_LOGICO' || OP_LOGICOS_REL.has(t.lexema))
        return "oplogic";                               // Amarillo
      if (t.subtipo === 'OPERADOR_ARROW' || t.subtipo === 'OPERADOR_SPREAD' || t.subtipo === 'OPERADOR_OPTIONAL' || t.subtipo === 'OPERADOR_NULLISH')
        return "oplogic";                               // Amarillo para operadores modernos
      return "";                                        // otros operadores: color base
    case "ERROR": return "error";          // Rojo fondo, texto blanco
    default: return "";
  }
}


function lexLinea(linea, numLinea, estado) {
  const tokens = [];
  let j = 0;
  let ultimoSignificativo = estado.ultimoSignificativo || null;

  const push = (tipo, lexema, col, ext = {}) => {
    const tok = { tipo, lexema, linea: numLinea, columna: col, ...ext };
    tokens.push(tok);
    if (tipo !== "WS" && tipo !== "COMENTARIO") ultimoSignificativo = tok;
  };

  while (j < linea.length) {
    const col = j + 1, ch = linea[j];

    // Dentro de template
    if (estado.enTemplate) {
      const tpl = leerTemplateLinea(linea, j);
      if (tpl.tipo === "INICIO_EXPR_TPL") {
        push("DELIMITADOR", "${", col);
        estado.stack.push({ abre: "${", linea: numLinea, columna: col });
        estado.enTemplate = false; // ahora tokens normales dentro de ${...}
      } else if (tpl.tipo === "CIERRE_TPL") {
        push("CADENA", "`", col);
        estado.enTemplate = false; // termina el template
      } else {
        push("CADENA", tpl.lex, col);
      }
      j = tpl.next; continue;
    }


    // Comentario de bloque abierto
    if (estado.enComentarioBloque) {
      const cmt = leerComentarioBloqueLinea(linea, j);
      push("COMENTARIO", cmt.lex, col);
      j = cmt.next;
      if (cmt.cerrada) estado.enComentarioBloque = false;
      continue;
    }

    // Espacios
    if (esEspacio(ch)) {
      let k = j + 1; while (k < linea.length && esEspacio(linea[k])) k++;
      push("WS", linea.slice(j, k), col); j = k; continue;
    }

    // Comentarios //, /* */ o posible regex
    if (ch === "/" && j + 1 < linea.length) {
      const nxt = linea[j + 1];
      if (nxt === "/") { push("COMENTARIO", linea.slice(j), col); j = linea.length; continue; }
      if (nxt === "*") {
        const cmt = leerComentarioBloqueLinea(linea, j);
        push("COMENTARIO", cmt.lex, col);
        j = cmt.next; if (!cmt.cerrada) estado.enComentarioBloque = true; continue;
      }
      if (puedeIniciarRegex(ultimoSignificativo)) {
        const rx = leerRegexLiteral(linea, j);
        push(rx.cerrada ? "REGEX" : "ERROR", rx.lex, col);
        j = rx.next; continue;
      }
      // si no es regex, caerá como operador más abajo
    }

    // Cadenas
    if (ch === "'" || ch === "\"") {
      const cad = leerCadena(linea, j, ch);
      push(cad.cerrada ? "CADENA" : "ERROR", cad.lex, col);
      j = cad.next; continue;
    }

    // Inicio de template
    if (ch === "`") {
      push("CADENA", "`", col); j++; estado.enTemplate = true; continue;
    }

    // Números
    const mNum = linea.slice(j).match(reNumero);
    if (mNum) { const lex = mNum[0]; push("LITERAL", lex, col); j += lex.length; continue; }

    // Identificadores / reservadas
    const mId = linea.slice(j).match(reIdent);
    if (mId) {
      const lex = mId[0];
      if (PALABRAS_RESERVADAS.has(lex)) push("PALABRA_RESERVADA", lex, col);
      else if (LITERALES.has(lex)) push("LITERAL", lex, col);
      else push("IDENTIFICADOR", lex, col);
      j += lex.length; continue;
    }

    // Delimitadores con balanceo (incluye casos de template ${ ... })
    if (DELIMITADORES.has(ch)) {
      if (ch === "(" || ch === "[" || ch === "{") {
        estado.stack.push({ abre: ch, linea: numLinea, columna: col });
      } else if (ch === ")" || ch === "]" || ch === "}") {
        const top = estado.stack[estado.stack.length - 1];
        const esperado = top ? parCierra(top.abre) : esperadoPara(ch);
        if (!top || esperado !== ch) {
          push("ERROR", `${ch} ← Cierre inesperado`, col);
          j++; return { tokens, estado: { ...estado, ultimoSignificativo } };
        }
        // caso especial: cierre de ${ ... } dentro de template
        if (top.abre === "${" && ch === "}") {
          estado.stack.pop();
          estado.enTemplate = true; // volvemos al cuerpo del template
          push("DELIMITADOR", ch, col);
          j++; continue;
        }
        estado.stack.pop();
      }
      push("DELIMITADOR", ch, col); j++; continue;
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

// 8) Descarga del archivo de salida
function descargar(nombre, contenido) {
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// 9) UI
const entradaArchivo = document.getElementById("entradaArchivo");
const entradaManual = document.getElementById("entradaManual");
const botonAnalizarArchivo = document.getElementById("botonAnalizarArchivo");
const botonAnalizarManual = document.getElementById("botonAnalizarManual");
const botonDescargar = document.getElementById("botonDescargar");
const salida = document.getElementById("salida");
let ultimoReporte = "";

botonAnalizarArchivo.addEventListener("click", () => {
  const f = entradaArchivo.files && entradaArchivo.files[0];
  if (!f) return alert("Selecciona un archivo (.txt o .js).");
  const lector = new FileReader();
  lector.onload = () => {
    ultimoReporte = analizar(String(lector.result || ""));
    salida.value = ultimoReporte;
    botonDescargar.disabled = false;
  };
  lector.readAsText(f, "utf-8");
});

botonAnalizarManual.addEventListener("click", () => {
  const texto = String(entradaManual.value || "").trim();
  if (!texto) return alert("Escribe código para analizar.");
  ultimoReporte = analizar(texto);
  salida.value = ultimoReporte;
  botonDescargar.disabled = false;
});

botonDescargar.addEventListener("click", () => {
  if (!ultimoReporte) return;
  descargar("Salida.txt", ultimoReporte);
});