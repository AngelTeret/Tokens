const palabrasReservadas = new Set([
  "if","else","switch","case","default","break","continue","do","while","for","return",
  "try","catch","finally","throw",
  "function","class","extends","constructor","super","import","from","export","new",
  "var","let","const","in","instanceof","typeof","void","delete","this","yield","await","with",
  "implements","interface","package","private","protected","public","static","enum",
  "abstract","boolean","byte","char","double","final","float","goto","int","long",
  "native","short","synchronized","throws","transient","volatile"
]);

const literalesPalabra = new Map([
  ["true","LITERAL_BOOLEANO"], ["false","LITERAL_BOOLEANO"],
  ["null","LITERAL_NULL"], ["undefined","LITERAL_UNDEFINED"]
]);

const relacionales = new Set(["<",">","<=",">=","==","!=","===","!=="]);
const logicos      = new Set(["&&","||","!","??"]);
const aritmeticos  = new Set(["+","-","*","/","%","**"]);
const asignacion   = new Set(["=","+=","-=","*=","/=","%=","**=","<<=",">>=",">>>=","&=","|=","^=","&&=","||=","??="]);
const funcion = new Set(["=>"]);
const bitABit      = new Set(["&","|","^","~","<<",">>",">>>"]);
const ternario     = new Set(["?",":"]);
const delimitadores = new Set(["(",")","{","}","[","]",",",";",".",":"]);

const esLetra  = c => /[A-Za-z_$]/.test(c);
const esDigito = c => /[0-9]/.test(c);
const escaparRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listaSombras = [...palabrasReservadas, ...Array.from(literalesPalabra.keys())]
  .sort((a,b)=>b.length-a.length);
const regexSombra = new RegExp(`^(${listaSombras.map(escaparRegex).join("|")})([A-Za-z0-9_$]+)$`);
function esSombraDeReservada(lexema){
  const m = lexema.match(regexSombra);
  return m ? { base:m[1], sufijo:m[2] } : null;
}

function pushError(arr, numLinea, col, lexema, descripcion) {
  arr.push({ tipo: "ERROR", valor: lexema, linea: numLinea, columna: col, mensaje: descripcion });
}

// 6) Tokenización de una línea
function lexLinea(texto, numLinea){
  const res = [];
  const N = texto.length;
  let i = 0;
  const push = (tipo, valor, col) => res.push({ tipo, valor, linea:numLinea, columna:col });

  while(i < N){
    const ch = texto[i];
    if (ch === " " || ch === "\t"){ i++; continue; }
    const col = i + 1;

    // Comentario de línea
    if (ch === "/" && i+1<N && texto[i+1]==="/"){
      push("COMENTARIO_LINEA", texto.slice(i), col);
      break;
    }
    // Comentario de bloque (en la misma línea)
    if (ch === "/" && i+1<N && texto[i+1]==="*"){
      let j=i+2, cerrado=false;
      while(j<N){ if(texto[j]==="*" && j+1<N && texto[j+1]==="/"){ cerrado=true; j+=2; break; } j++; }
      push("COMENTARIO_BLOQUE", texto.slice(i, cerrado?j:N), col);
      i = cerrado? j : N; continue;
    }

    // Delimitadores simples
    if (delimitadores.has(ch)){ push("DELIMITADOR", ch, col); i++; continue; }

    // Cadenas: '...'  "..."  `...`
    if (ch === "'" || ch === '"' || ch === "`"){
      const q=ch; let j=i+1, val=q;
      while(j<N){
        const cj=texto[j]; val+=cj;
        if (cj==="\\"){ if (j+1<N){ val+=texto[j+1]; j+=2; continue; } j++; continue; }
        if (cj===q){ j++; break; }
        j++;
      }
      push("LITERAL_CADENA", val, col);
      i=j; continue;
    }

    // Números: enteros o decimales (con exponente)
    if (esDigito(ch)){
      let j=i+1; while(j<N && esDigito(texto[j])) j++;
      let decimal=false;
      if (j<N && texto[j]==="."){ decimal=true; j++; while(j<N && esDigito(texto[j])) j++; }
      if (j<N && (texto[j]==="e"||texto[j]==="E")){
        decimal=true; j++; if(texto[j]==="+"||texto[j]==="-") j++; while(j<N && esDigito(texto[j])) j++;
      }
      const lex=texto.slice(i,j);
      push(decimal?"LITERAL_DECIMAL":"LITERAL_ENTERO", lex, col);
      i=j; continue;
    }

    // Identificador / reservada / literal-palabra / sombra
    if (esLetra(ch)){
      let j=i+1; while(j<N && /[A-Za-z0-9_$]/.test(texto[j])) j++;
      const lex=texto.slice(i,j);
      const sombra = esSombraDeReservada(lex);
      if (sombra){ 
        pushError(res, numLinea, col, lex, `Identificador inválido (empieza con reservada "${sombra.base}")`);
        i=j; continue; 
      }
      if (literalesPalabra.has(lex)){ push(literalesPalabra.get(lex), lex, col); i=j; continue; }
      if (palabrasReservadas.has(lex)){ push("PALABRA_RESERVADA", lex, col); i=j; continue; }
      push("IDENTIFICADOR", lex, col); i=j; continue;
    }

    // Operadores (greedy 3→2→1)
    const a=texto[i]||"", b=texto[i+1]||"", c=texto[i+2]||"";
    const t3=a+b+c, t2=a+b, t1=a;

    if (["===", "!==", ">>>"].includes(t3)){ clasificarOperador(t3, col); i+=3; continue; }
    if ([
      "==","!=",">>","<<","<=",">=","&&","||","+=","-=","*=","/=","%=","=>","&=","|=","^=","??","&&=","||=","??="
    ].includes(t2)){ clasificarOperador(t2, col); i+=2; continue; }
    if (["+","-","*","/","%","<",">","=","!","&","|","^","~","?",":"].includes(t1)){
      clasificarOperador(t1, col); i+=1; continue;
    }

    // Carácter no reconocido
    pushError(res, numLinea, col, ch, "Símbolo no reconocido");
    i++;
  }

  return res;

  function clasificarOperador(op, col){
    if (relacionales.has(op)) return push("OPERADOR_RELACIONAL", op, col);
    if (logicos.has(op))     return push("OPERADOR_LOGICO", op, col);
    if (aritmeticos.has(op)) return push("OPERADOR_ARITMETICO", op, col);
    if (asignacion.has(op))  return push("OPERADOR_ASIGNACION", op, col);
    if (funcion.has(op)) return push("OPERADOR_EXPRESION_FUNCION", op,col);
    if (bitABit.has(op))     return push("OPERADOR_BIT_A_BIT", op, col);
    if (ternario.has(op))    return push("OPERADOR_TERNARIO", op, col);
    // Operador no válido
    pushError(res, numLinea, col, op, "Operador inválido");
  }
}