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