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