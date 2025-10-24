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

// =====================
// Chequeos sintácticos mínimos (post-lex)
// =====================

function siguienteTokenValido(tokens, i){
  let k=i+1; while(k<tokens.length && (tokens[k].tipo==="WS" || tokens[k].tipo==="COMENTARIO")) k++;
  return {tok: tokens[k] || null, idx:k};
}

// ---- Helpers para reglas adicionales ----
function esPrimario(t) {
  // Tokens que por sí solos pueden iniciar/ser una expresión
  return t && (
    t.tipo === "IDENTIFICADOR" ||
    t.tipo === "LITERAL" ||
    t.tipo === "CADENA" ||
    t.tipo === "REGEX" ||
    (t.tipo === "DELIMITADOR" && ["(","[","{"].includes(t.lexema))
  );
}

function esTokenValidoEnSecuencia(t, sig, estado = {}) {
  // Verifica si dos tokens pueden aparecer consecutivamente
  if (!t || !sig) return true;
  
  // Si estamos dentro de un template literal, permitir más secuencias
  if (estado.enTemplate) {
    // En template literals, casi cualquier secuencia es válida
    return true;
  }
  
  // Casos válidos específicos
  const casosValidos = [
    // Parámetros de función: ( identificador/literal/cadena/objeto
    t.tipo === "DELIMITADOR" && t.lexema === "(" && (sig.tipo === "IDENTIFICADOR" || sig.tipo === "LITERAL" || sig.tipo === "CADENA" || sig.tipo === "DELIMITADOR"),
    
    // Llamadas de función: identificador (
    t.tipo === "IDENTIFICADOR" && sig.tipo === "DELIMITADOR" && sig.lexema === "(",
    
    // Array/objeto: [ literal/identificador/cadena/objeto
    t.tipo === "DELIMITADOR" && t.lexema === "[" && (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA" || sig.tipo === "DELIMITADOR"),
    
    // Objeto literal: { identificador
    t.tipo === "DELIMITADOR" && t.lexema === "{" && sig.tipo === "IDENTIFICADOR",
    
    // Objeto literal en parámetros: ( {
    t.tipo === "DELIMITADOR" && t.lexema === "(" && sig.tipo === "DELIMITADOR" && sig.lexema === "{",
    
    // Objeto literal en arrays: [ { identificador
    t.tipo === "DELIMITADOR" && t.lexema === "[" && sig.tipo === "DELIMITADOR" && sig.lexema === "{",
    
    // Operador ternario: ? literal/identificador/cadena
    t.tipo === "OPERADOR" && t.lexema === "?" && (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA"),
    
    // Operador ternario: : literal/identificador/cadena
    t.tipo === "OPERADOR" && t.lexema === ":" && (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA"),
    
    // Coma en arrays/objetos: , literal/identificador/cadena/objeto
    t.tipo === "DELIMITADOR" && t.lexema === "," && (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA" || sig.tipo === "DELIMITADOR"),
    
    // Punto en notación de objeto: . identificador
    t.tipo === "DELIMITADOR" && t.lexema === "." && sig.tipo === "IDENTIFICADOR",
    
    // Acceso a arrays: identificador [
    t.tipo === "IDENTIFICADOR" && sig.tipo === "DELIMITADOR" && sig.lexema === "[",
    
    // Acceso a arrays: [ literal
    t.tipo === "DELIMITADOR" && t.lexema === "[" && sig.tipo === "LITERAL",
    
    // Operadores unarios: ! literal/identificador/cadena
    t.tipo === "OPERADOR" && t.lexema === "!" && (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA"),
    
    // Operadores unarios: - literal/identificador/cadena
    t.tipo === "OPERADOR" && t.lexema === "-" && (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA"),
    
    // Operadores unarios: + literal/identificador/cadena
    t.tipo === "OPERADOR" && t.lexema === "+" && (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA"),
    
    // Palabras reservadas seguidas de identificador (return, throw, new, etc.)
    t.tipo === "PALABRA_RESERVADA" && ["return", "throw", "new", "typeof", "void", "delete"].includes(t.lexema) && 
    (sig.tipo === "IDENTIFICADOR" || sig.tipo === "LITERAL" || sig.tipo === "CADENA"),
    
    // Palabras reservadas seguidas de ( (if, for, while, etc.)
    t.tipo === "PALABRA_RESERVADA" && ["if", "for", "while", "switch", "catch"].includes(t.lexema) && 
    sig.tipo === "DELIMITADOR" && sig.lexema === "(",
    
    // Palabras reservadas seguidas de { (function, class, etc.)
    t.tipo === "PALABRA_RESERVADA" && ["function", "class", "if", "else", "for", "while", "switch", "try", "catch", "finally"].includes(t.lexema) && 
    sig.tipo === "DELIMITADOR" && sig.lexema === "{",
    
    // Palabras reservadas seguidas de identificador (let, const, var)
    t.tipo === "PALABRA_RESERVADA" && ["let", "const", "var"].includes(t.lexema) && sig.tipo === "IDENTIFICADOR",
    
    // Declaraciones de clase: class identificador
    t.tipo === "PALABRA_RESERVADA" && t.lexema === "class" && sig.tipo === "IDENTIFICADOR",
    
    // Declaraciones de clase: identificador {
    t.tipo === "IDENTIFICADOR" && sig.tipo === "DELIMITADOR" && sig.lexema === "{",
    
    // Destructuring: { identificador
    t.tipo === "DELIMITADOR" && t.lexema === "{" && sig.tipo === "IDENTIFICADOR",
    
    // Destructuring: [ identificador
    t.tipo === "DELIMITADOR" && t.lexema === "[" && sig.tipo === "IDENTIFICADOR",
    
    // Arrow function: ) =>
    t.tipo === "DELIMITADOR" && t.lexema === ")" && sig.tipo === "OPERADOR" && sig.lexema === "=>",
    
    // Arrow function: identificador =>
    t.tipo === "IDENTIFICADOR" && sig.tipo === "OPERADOR" && sig.lexema === "=>",
    
    // Async/await: async function/identificador
    t.tipo === "PALABRA_RESERVADA" && t.lexema === "async" && (sig.tipo === "PALABRA_RESERVADA" || sig.tipo === "IDENTIFICADOR"),
    
    // Await: await identificador/literal/cadena
    t.tipo === "PALABRA_RESERVADA" && t.lexema === "await" && (sig.tipo === "IDENTIFICADOR" || sig.tipo === "LITERAL" || sig.tipo === "CADENA"),
    
    // Import/export: import/export { identificador
    t.tipo === "PALABRA_RESERVADA" && ["import", "export"].includes(t.lexema) && 
    sig.tipo === "DELIMITADOR" && sig.lexema === "{",
    
    // From: } from
    t.tipo === "DELIMITADOR" && t.lexema === "}" && sig.tipo === "PALABRA_RESERVADA" && sig.lexema === "from",
    
    // As: identificador as
    t.tipo === "IDENTIFICADOR" && sig.tipo === "PALABRA_RESERVADA" && sig.lexema === "as",
    
    // Of: } of
    t.tipo === "DELIMITADOR" && t.lexema === "}" && sig.tipo === "PALABRA_RESERVADA" && sig.lexema === "of",
    
    // Template literal: ` contenido
    t.tipo === "CADENA" && t.lexema === "`" && (sig.tipo === "CADENA" || sig.tipo === "DELIMITADOR"),
    
    // Template literal: } texto (después de expresión en template)
    t.tipo === "DELIMITADOR" && t.lexema === "}" && sig.tipo === "CADENA",
    
    // Template literal: literal texto (después de literal en template)
    t.tipo === "LITERAL" && sig.tipo === "CADENA",
    
    // Template literal: identificador texto (después de identificador en template)
    t.tipo === "IDENTIFICADOR" && sig.tipo === "CADENA",
    
    // Template expression: ${ identificador/literal/cadena
    t.tipo === "DELIMITADOR" && t.lexema === "${" && (sig.tipo === "IDENTIFICADOR" || sig.tipo === "LITERAL" || sig.tipo === "CADENA"),
    
    // Optional chaining: ?. identificador
    t.tipo === "OPERADOR" && t.lexema === "?." && sig.tipo === "IDENTIFICADOR",
    
    // Nullish coalescing: ?? literal/identificador/cadena
    t.tipo === "OPERADOR" && t.lexema === "??" && (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA"),
    
    // Spread operator: ... identificador/literal/cadena
    t.tipo === "OPERADOR" && t.lexema === "..." && (sig.tipo === "IDENTIFICADOR" || sig.tipo === "LITERAL" || sig.tipo === "CADENA"),
    
    // Operadores de comparación seguidos de literal/identificador/cadena/objeto
    t.tipo === "OPERADOR" && ["<", ">", "<=", ">=", "==", "===", "!=", "!=="].includes(t.lexema) && 
    (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA" || sig.tipo === "DELIMITADOR"),
    
    // Operadores aritméticos seguidos de literal/identificador/cadena/objeto
    t.tipo === "OPERADOR" && ["+", "-", "*", "/", "%", "**"].includes(t.lexema) && 
    (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA" || sig.tipo === "DELIMITADOR"),
    
    // Operadores lógicos seguidos de literal/identificador/cadena/objeto
    t.tipo === "OPERADOR" && ["&&", "||"].includes(t.lexema) && 
    (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA" || sig.tipo === "DELIMITADOR"),
    
    // Operadores de asignación seguidos de literal/identificador/cadena/objeto
    t.tipo === "OPERADOR" && ["=", "+=", "-=", "*=", "/=", "%=", "**=", "&&=", "||=", "??="].includes(t.lexema) && 
    (sig.tipo === "LITERAL" || sig.tipo === "IDENTIFICADOR" || sig.tipo === "CADENA" || sig.tipo === "DELIMITADOR"),
    
    // Concatenación de strings: cadena + cadena
    t.tipo === "CADENA" && sig.tipo === "OPERADOR" && sig.lexema === "+",
    
    // Concatenación de strings: cadena + literal/identificador
    t.tipo === "CADENA" && sig.tipo === "OPERADOR" && ["+", "-", "*", "/", "%"].includes(sig.lexema),
    
    // Concatenación de strings: literal/identificador + cadena
    (t.tipo === "LITERAL" || t.tipo === "IDENTIFICADOR") && sig.tipo === "OPERADOR" && sig.lexema === "+" && 
    sig.tipo === "CADENA",
    
    // Strings en comparaciones: cadena == cadena
    t.tipo === "CADENA" && sig.tipo === "OPERADOR" && ["==", "===", "!=", "!==", "<", ">", "<=", ">="].includes(sig.lexema),
    
    // Strings en operadores lógicos: cadena && cadena
    t.tipo === "CADENA" && sig.tipo === "OPERADOR" && ["&&", "||"].includes(sig.lexema)
  ];
  
  return casosValidos.some(caso => caso);
}

function esInicioDeSentencia(flat, i) {
  if (i === 0) return true;
  let k = i - 1;
  while (k >= 0 && (flat[k].tipo === "WS" || flat[k].tipo === "COMENTARIO")) k--;
  if (k < 0) return true;
  const p = flat[k];
  return (p.tipo === "DELIMITADOR" && (p.lexema === "{" || p.lexema === ";")) ||
        (p.tipo === "PALABRA_RESERVADA" && p.lexema === "return");
}

function validarSintaxisMinima(tokensPorLinea){
  const flat = tokensPorLinea.flat().filter(t => t.tipo!=="WS" && t.tipo!=="COMENTARIO");

  for(let i=0;i<flat.length;i++){
    const t=flat[i];

    // let/const/var → IDENTIFICADOR y luego algo permitido (= , ; ) in of)
    if(t.tipo==="PALABRA_RESERVADA" && ["let","const","var"].includes(t.lexema)){
      const {tok:n1, idx:i1} = siguienteTokenValido(flat, i);
      if(!n1 || n1.tipo!=="IDENTIFICADOR"){
        return {linea:(n1||t).linea, columna:(n1||t).columna, lexema:`Se esperaba IDENTIFICADOR después de "${t.lexema}"`};
      }
      const {tok:n2} = siguienteTokenValido(flat, i1);
      const okDespuesDecl = n2 &&
        (
          (n2.tipo==="OPERADOR" && n2.lexema==="=") ||
          (n2.tipo==="DELIMITADOR" && (n2.lexema==="," || n2.lexema===";" || n2.lexema===")")) ||
          (n2.tipo==="PALABRA_RESERVADA" && (n2.lexema==="in" || n2.lexema==="of"))
        );
      if(!n2 || !okDespuesDecl){
        return {linea:(n2||n1).linea, columna:(n2||n1).columna, lexema:`Después de la declaración debe venir "=", ",", ";", ")" o "in/of"`};
      }
    }

    // function: en declaración exige nombre
    if(t.tipo==="PALABRA_RESERVADA" && t.lexema==="function"){
      const prev = flat[i-1];
      const esExpresion = prev && (
        (prev.tipo==="DELIMITADOR" && [":",",","(","{"].includes(prev.lexema)) ||
        (prev.tipo==="OPERADOR" && prev.lexema==="=") ||
        (prev.tipo==="PALABRA_RESERVADA" && prev.lexema==="return")
      );
      const {tok} = siguienteTokenValido(flat, i);
      if(!esExpresion){
        if(tok && tok.tipo==="DELIMITADOR" && tok.lexema==="("){
          return {linea: tok.linea, columna: tok.columna, lexema:`Falta nombre de función (se obtuvo "(" inmediatamente después de "function")`};
        }
        if(!tok || tok.tipo!=="IDENTIFICADOR"){
          return {linea:(tok||t).linea, columna:(tok||t).columna, lexema:`Se esperaba nombre de función después de "function"`};
        }
      }
    }

    //fin persona 2
    
    // if → requiere "("
    if(t.tipo==="PALABRA_RESERVADA" && t.lexema==="if"){
      const {tok} = siguienteTokenValido(flat, i);
      if(!tok || tok.tipo!=="DELIMITADOR" || tok.lexema!=="("){
        return {linea:(tok||t).linea, columna:(tok||t).columna, lexema:`Se esperaba "(" después de "if"`};
      }
    }

    // patrón inválido específico: "===!"
    if(t.tipo==="OPERADOR" && t.lexema==="==="){
      const {tok} = siguienteTokenValido(flat, i);
      if(tok && tok.tipo==="OPERADOR" && tok.lexema==="!"){
        return {linea: tok.linea, columna: tok.columna, lexema:`Secuencia de operadores inválida "===!"`};
      }
    }


    if (esPrimario(t)) {
      const { tok: sig } = siguienteTokenValido(flat, i);
      if (sig && esPrimario(sig)) {
        // Determinar si estamos en template literal
        const estado = { enTemplate: false };
        let enTemplate = false;
        for (let j = 0; j < i; j++) {
          if (flat[j].tipo === "CADENA" && flat[j].lexema === "`") {
            enTemplate = !enTemplate;
          }
        }
        estado.enTemplate = enTemplate;
        
        if (!esTokenValidoEnSecuencia(t, sig, estado)) {
          return {
            linea: sig.linea,
            columna: sig.columna,
            lexema: `Se esperaba operador o delimitador entre "${t.lexema}" y "${sig.lexema}"`
          };
        }
      }
    }


    if(t.tipo==="IDENTIFICADOR" && esInicioDeSentencia(flat, i)){
      const {tok:p1, idx:i1} = siguienteTokenValido(flat, i);
      const {tok:p2} = siguienteTokenValido(flat, i1);
      if(p1 && p2 &&
        p1.tipo==="DELIMITADOR" && p1.lexema==="." &&
        p2.tipo==="IDENTIFICADOR" && p2.lexema==="log" &&
        t.lexema !== "console"){
        return {linea: t.linea, columna: t.columna, lexema:`Llamada a ".log" sobre "${t.lexema}". ¿Quisiste decir "console.log"?`};
      }
    }
  }
  return null;
}

function analizarTextoCompleto(texto){
  const lineas = texto.split("\n");
  const tokensPorLinea = [];
  const estado = { enComentarioBloque:false, enTemplate:false, stack:[], ultimoSignificativo:null };

  let primerError = null;

  for(let i=0;i<lineas.length;i++){
    const res = lexLinea(lineas[i], i+1, estado);
    tokensPorLinea.push(res.tokens);
    for(const t of res.tokens){ if(t.tipo==="ERROR"){ primerError=t; break; } }
    if(primerError) break;
  }

  if(!primerError && (estado.enComentarioBloque || estado.enTemplate)){
    const lineaFinal = lineas.length || 1;
    const lex = estado.enComentarioBloque
      ? "Fin del código: El comentario de bloque '/*' nunca se cerró."
      : "Fin del código: La plantilla literal '`' nunca se cerró.";
    primerError = { tipo:"ERROR", lexema:lex, linea:lineaFinal, columna:1 };
    if(!tokensPorLinea[lineaFinal-1]) tokensPorLinea[lineaFinal-1]=[];
    tokensPorLinea[lineaFinal-1].push(primerError);
  }

  if(!primerError && estado.stack.length>0){
    const top = estado.stack[estado.stack.length-1];
    const lex = `Fin del código: Falta cerrar "${parCierra(top.abre)}" (abierto en línea ${top.linea}, col ${top.columna}).`;
    const lineaFinal = lineas.length || 1;
    primerError = { tipo:"ERROR", lexema:lex, linea:lineaFinal, columna:1 };
    if(!tokensPorLinea[lineaFinal-1]) tokensPorLinea[lineaFinal-1]=[];
    tokensPorLinea[lineaFinal-1].push(primerError);
  }

  if(!primerError){
    const err = validarSintaxisMinima(tokensPorLinea);
    if(err){
      primerError = { tipo:"ERROR", lexema: err.lexema, linea: err.linea, columna: err.columna };
      const idx = Math.max(0, err.linea-1);
      if(!tokensPorLinea[idx]) tokensPorLinea[idx]=[];
      tokensPorLinea[idx].push(primerError);
    }
  }

  return { tokensPorLinea, primerError, lineas };
}

function getTipoDetallado(token) {
  switch (token.tipo) {
    case "PALABRA_RESERVADA": return "PALABRA_RESERVADA";
    case "IDENTIFICADOR":     return "IDENTIFICADOR";
    case "DELIMITADOR":       return "DELIMITADOR";
    case "CADENA":            return "LITERAL_CADENA";
    case "REGEX":             return "LITERAL_REGEX";
    case "COMENTARIO":        return token.lexema.startsWith("//") ? "COMENTARIO_LINEA" : "COMENTARIO_BLOQUE";
    case "OPERADOR":          return token.subtipo || "OPERADOR";
    case "LITERAL":
      if (token.lexema === "true" || token.lexema === "false") return "LITERAL_BOOLEANO";
      if (token.lexema === "null") return "LITERAL_NULL";
      if (/^\d/.test(token.lexema) && token.lexema.includes('.')) return "LITERAL_DECIMAL";
      return "LITERAL_ENTERO";
    case "ERROR":             return `ERROR: ${token.lexema}`;
    default:                  return token.tipo;
  }
}

function construirReporte(tokensPorLinea, lineas) {
  let reporte = "REPORTE DE TOKENS Y LEXEMAS\n";
  reporte += "============================================================\n\n";

  const allTokens = tokensPorLinea.flat();

  lineas.forEach((linea, i) => {
    reporte += `Línea ${i + 1}: ${linea}\n`;
    const tl = (tokensPorLinea[i] || []).filter(t => t.tipo !== "WS");
    if (tl.length === 0) reporte += "  (sin tokens)\n\n";
    else {
      tl.forEach(t => { reporte += `    "${t.lexema}"  ->  ${getTipoDetallado(t)}\n`; });
      reporte += "\n";
    }
  });

  reporte += "RESUMEN DE CONTEO POR PALABRA\n";
  reporte += "------------------------------------------------------------\n";

  const counts = {};
  allTokens.forEach(t => {
    const tipo = getTipoDetallado(t);
    if (t.tipo === 'WS' || t.tipo === 'ERROR') return;
    if (!counts[tipo]) counts[tipo] = {};
    counts[tipo][t.lexema] = (counts[tipo][t.lexema] || 0) + 1;
  });

  const fmt = (title, cat) => {
    if (!counts[cat] || !Object.keys(counts[cat]).length) return;
    reporte += `** ${title}\n`;
    Object.entries(counts[cat]).sort((a,b)=>b[1]-a[1]).forEach(([lex, n])=>{
      reporte += `- ${lex} → ${n}\n`;
    });
    reporte += "\n";
  };

  fmt("Palabras Reservadas", "PALABRA_RESERVADA");
  fmt("Identificadores", "IDENTIFICADOR");
  fmt("Literales (Enteros)", "LITERAL_ENTERO");
  fmt("Literales (Decimales)", "LITERAL_DECIMAL");
  fmt("Literales (Cadenas)", "LITERAL_CADENA");
  fmt("Literales (Booleanos)", "LITERAL_BOOLEANO");
  fmt("Literales (Null)", "LITERAL_NULL");
  fmt("Literales (Regex)", "LITERAL_REGEX");
  fmt("Delimitadores", "DELIMITADOR");
  fmt("Operadores Relacionales", "OPERADOR_RELACIONAL");
  fmt("Operadores Lógicos", "OPERADOR_LOGICO");
  fmt("Operadores Aritméticos", "OPERADOR_ARITMETICO");
  fmt("Operadores de Asignación", "OPERADOR_ASIGNACION");
  fmt("Operador Ternario", "OPERADOR_TERNARIO");
  fmt("Operador Arrow", "OPERADOR_ARROW");
  fmt("Operador Spread", "OPERADOR_SPREAD");
  fmt("Operador Optional Chaining", "OPERADOR_OPTIONAL");
  fmt("Operador Nullish Coalescing", "OPERADOR_NULLISH");

  return reporte;
}

// =====================
// Render coloreado
// =====================
function renderPreview(tokensPorLinea){
  const preview=document.getElementById("preview");
  const frag=document.createDocumentFragment();
  for(const tokens of tokensPorLinea){
    const line=document.createElement("div"); line.className="line";
    for(const t of tokens){
      if(t.tipo==="WS"){ line.append(document.createTextNode(t.lexema)); continue; }
      const span=document.createElement("span");
      span.className=`token ${claseToken(t)}`;
      span.innerHTML=escaparHTML(t.lexema);
      line.append(span);
    }
    if(tokens.length===0) line.append(document.createTextNode(""));
    frag.append(line);
  }
  preview.innerHTML=""; preview.append(frag);
}

// =====================
// UI (DOM)
// =====================
const $ = s => document.querySelector(s);
const $archivo   = $("#archivo");
const $entrada   = $("#entrada");
const $reporte   = $("#reporte");
const $preview   = $("#preview");
const $btnAnal   = $("#btn-analizar");
const $btnDesc   = $("#btn-descargar");
const $btnLimp   = $("#btn-limpiar");
const $fileStatus = $("#file-status");

function limpiar(){
  if ($archivo) $archivo.value="";
  if ($entrada){
    $entrada.value="";
    $entrada.placeholder = "Pega tu código aquí…";
  }
  if ($reporte) $reporte.value="";
  if ($preview) $preview.innerHTML="";
  if ($btnDesc) $btnDesc.disabled=true;
  if ($fileStatus) $fileStatus.textContent = "Ningún archivo seleccionado";
}
if ($btnLimp) $btnLimp.addEventListener("click", limpiar);

// Carga de archivo en <textarea> al seleccionar
if ($archivo) {
  $archivo.addEventListener('change', async e => {
    const [f] = e.target.files || [];
    if(!f) {
      // Si no hay archivo seleccionado, actualizar estado
      if ($fileStatus) $fileStatus.textContent = "Ningún archivo seleccionado";
      return;
    }
    
    // Actualizar estado del archivo con el nombre
    if ($fileStatus) $fileStatus.textContent = `Hay un archivo seleccionado: ${f.name}`;
    
    try{
      const text = await f.text();
      $entrada.value = text;
      $entrada.placeholder = "";
      e.target.value = ''; // permitir re-seleccionar el mismo archivo
    }catch{
      (window.Swal
        ? Swal.fire('Error', 'No se pudo leer el archivo.', 'error')
        : alert('No se pudo leer el archivo.'));
      // En caso de error, mantener el estado de archivo seleccionado
      if ($fileStatus) $fileStatus.textContent = `Error al leer archivo: ${f.name}`;
    }
  });
}

// Actualizar estado del archivo cuando el usuario pegue código directamente
if ($entrada) {
  $entrada.addEventListener('input', () => {
    // Solo actualizar si hay contenido y no hay archivo seleccionado
    if ($entrada.value.trim() && $fileStatus && $fileStatus.textContent === "Ningún archivo seleccionado") {
      $fileStatus.textContent = "Código pegado directamente";
    } else if (!$entrada.value.trim() && $fileStatus && $fileStatus.textContent === "Código pegado directamente") {
      $fileStatus.textContent = "Ningún archivo seleccionado";
    }
  });
}

// Analizar SIEMPRE lo que está en el textarea (refleja cambios del usuario)
if ($btnAnal) $btnAnal.addEventListener("click", ()=>{
  const codigo = ($entrada.value || '').trim();

  if (!codigo) {
    (window.Swal
      ? Swal.fire({icon:'warning', title:'Falta contenido', text:'Selecciona un archivo o pega tu código antes de analizar.'})
      : alert('Selecciona un archivo o pega tu código antes de analizar.'));
    return;
  }

  const {tokensPorLinea, primerError, lineas}=analizarTextoCompleto(codigo);
  renderPreview(tokensPorLinea);

  const rep=construirReporte(tokensPorLinea, lineas);
  $reporte.value=rep;

  if(primerError){
    $btnDesc.disabled=true;
    (window.Swal
      ? Swal.fire({icon:"error", title:"Contenido inválido", text:`Línea ${primerError.linea}, columna ${primerError.columna}`, footer:`Detalle: ${primerError.lexema}`})
      : alert(`Contenido inválido. Línea ${primerError.linea}, columna ${primerError.columna}\n${primerError.lexema}`));
    $reporte.focus();
    return;
  }

  $btnDesc.disabled=false;
  (window.Swal
    ? Swal.fire("Éxito","Contenido válido. Se coloreó y generó el reporte.","success")
    : console.log("Contenido válido."));
  $reporte.focus();
});

// Descargar reporte
if ($btnDesc) $btnDesc.addEventListener("click", ()=>{
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
  const blob=new Blob([$reporte.value], {type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=`Salida-${stamp}.txt`; document.body.appendChild(a); a.click();
  URL.revokeObjectURL(url); a.remove();
});
