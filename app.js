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

// Operadores
    const op=leerOperador(linea,j);
    if(op){
      let subtipo="OPERADOR_ARITMETICO";
      const rel = new Set(["<",">","<=",">=","==","===","!=","!=="]);
      const log = new Set(["&&","||","!"]);
      const asg = new Set(["=","+=","-=","*=","/=","%=","&=","|=","^=","**=","<<=",">>=","&&=","||=","??="]);
      const tern = new Set(["?",":"]);
      const arrow = new Set(["=>"]);
      const spread = new Set(["..."]);
      const optional = new Set(["?.","?.."]);
      const nullish = new Set(["??"]);
      
      if(rel.has(op.op)) subtipo="OPERADOR_RELACIONAL";
      else if(log.has(op.op)) subtipo="OPERADOR_LOGICO";
      else if(asg.has(op.op)) subtipo="OPERADOR_ASIGNACION";
      else if(tern.has(op.op)) subtipo="OPERADOR_TERNARIO";
      else if(arrow.has(op.op)) subtipo="OPERADOR_ARROW";
      else if(spread.has(op.op)) subtipo="OPERADOR_SPREAD";
      else if(optional.has(op.op)) subtipo="OPERADOR_OPTIONAL";
      else if(nullish.has(op.op)) subtipo="OPERADOR_NULLISH";
      
      push("OPERADOR", op.op, col, {subtipo}); j=op.next; continue;
    }

    // Carácter desconocido
    push("ERROR", ch, col); j++;
  }

  estado.ultimoSignificativo = ultimoSignificativo;
  return {tokens,estado};
}