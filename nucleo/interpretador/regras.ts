// Interpretador por regras: transforma a mensagem em operações na ficha,
// usando o dicionário e padrões de texto. Sem IA. O que não entende, não chuta.
import type { Escolha, Memoria, Op, Peso, PerfilDeBusca } from "../tipos";
import { FORMAS, type Entrada } from "../dicionario";
import { normalizar } from "../texto";

export interface Contexto { perfil: PerfilDeBusca; memorias: Memoria[]; aguardando: string[] }
export interface Interpretacao {
  ops: Op[];
  opsMemoria: Op[]; // vieram de memória: entram com origem "memoria"
  fluxo?: Escolha["fluxo"];
  ambiguos: Entrada[];
  usouMemoria: string[];
  entendeu: boolean;
}
export interface Interpretador { id: string; interpretar(texto: string, ctx: Contexto): Promise<Interpretacao> }

const EXTENSO: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5 };
const num = (s: string) => EXTENSO[s] ?? parseInt(s, 10);
const NUM = String.raw`(\d+(?:[.,]\d+)*)\s*(milhoes|milhao|mil|mi|k)?`;
const NAO_E_DINHEIRO = String.raw`(?!\s*(?:m2|m\b|metros|mts|min|km|quartos?|qts?|q\b|suites?|vagas?|dormitorios?|andar|o andar))`;

function valor(n: string, unidade: string | undefined, intencao: string | null): number {
  let v: number;
  if (unidade) {
    v = parseFloat(n.replace(/\./g, "").replace(",", "."));
    if (/^\d+\.\d{1,2}$/.test(n)) v = parseFloat(n); // "1.2 milhão"
    v *= unidade.startsWith("mil") && unidade !== "mil" ? 1e6 : unidade === "mi" ? 1e6 : 1e3;
  } else {
    v = parseFloat(n.replace(/\.(?=\d{3})/g, "").replace(",", "."));
    if (intencao === "comprar" && v < 10000) v *= 1000; // "até 800" na compra = 800 mil
    else if (v < 100) v *= 1000; // "até 4" no aluguel = 4 mil
  }
  return Math.round(v);
}

class Texto {
  usado: boolean[];
  constructor(public t: string) { this.usado = new Array(t.length).fill(false); }
  livre(i: number, n: number) { for (let k = i; k < i + n; k++) if (this.usado[k]) return false; return true; }
  marca(i: number, n: number) { for (let k = i; k < i + n; k++) this.usado[k] = true; }
  // aplica um regex só em trechos ainda não usados
  cada(re: RegExp, f: (m: RegExpExecArray) => boolean | void) {
    const r = new RegExp(re.source, "g"); let m: RegExpExecArray | null;
    while ((m = r.exec(this.t))) {
      if (m[0].length === 0) { r.lastIndex++; continue; }
      if (!this.livre(m.index, m[0].length)) continue;
      if (f(m) !== false) this.marca(m.index, m[0].length);
    }
  }
  sobra() { return this.t.split("").filter((_, i) => !this.usado[i]).join("").replace(/\s+/g, " ").trim(); }
}

const CUE_EXCLUIR = /(?:\bsem|\bnao quero|\bnada de|\bnao pode ter|\bexceto|\bmenos|\bnao gosto de|\bprefiro sem|\bodeio)\s+(?:\w+\s+){0,2}$/;
const CUE_REMOVER = /(?:\btanto faz|\bnao precisa(?: de| ter)?|\bnao faco questao(?: de)?|\btira|\bremove|\besquece|\bdeixa pra la)\s+(?:\w+\s+){0,2}$/;
const CUE_DESEJAVEL_ANTES = /(?:\bse possivel|\bde preferencia|\bpreferencia por|\bprefiro|\bseria bom|\bse tiver|\bse der|\bquem sabe|\btalvez|\bidealmente|\bgostaria(?: de)?|\bqueria|\bum plus)\s+(?:\w+\s+){0,3}$/;
const CUE_DESEJAVEL_DEPOIS = /^\s*(?:\w+\s+){0,1}(?:seria bom|se possivel|de preferencia|se tiver|se der|seria otimo|seria legal|e um plus)/;
const CUE_OBRIGATORIO = /(?:\btem que ter|\bprecisa ter|\bpreciso de|\bobrigatorio|\bessencial|\bnao abro mao de|\bindispensavel|\bfaco questao de|\bso serve com)\s+(?:\w+\s+){0,2}$/;

function pesoPeloContexto(t: string, i: number, n: number, padrao: Peso | undefined): Peso | "remover" {
  const ini = Math.max(t.lastIndexOf(",", i - 1), t.lastIndexOf(".", i - 1), t.lastIndexOf(";", i - 1), t.lastIndexOf(" e ", i - 1)) + 1;
  const antes = t.slice(Math.max(ini, 0), i);
  const antesLongo = t.slice(Math.max(0, i - 30), i);
  let fim = t.slice(i + n).search(/[,.;]/); fim = fim < 0 ? t.length : i + n + fim;
  const depois = t.slice(i + n, fim);
  if (CUE_REMOVER.test(antesLongo)) return "remover";
  if (CUE_EXCLUIR.test(antes)) return "excluir";
  if (CUE_OBRIGATORIO.test(antesLongo)) return "obrigatorio";
  if (CUE_DESEJAVEL_ANTES.test(antes) || CUE_DESEJAVEL_DEPOIS.test(depois)) return "desejavel";
  return padrao ?? "obrigatorio";
}

export function interpretarPorRegras(textoOriginal: string, ctx: Contexto): Interpretacao {
  const ops: Op[] = [], opsMemoria: Op[] = [], ambiguos: Entrada[] = [], usouMemoria: string[] = [];
  const tx = new Texto(normalizar(textoOriginal));
  const t = tx.t;
  let fluxo: Escolha["fluxo"];

  // 0. resposta solta a uma pergunta: "tanto faz", "qualquer um"
  if (/^(tanto faz|qualquer(?: um| uma| lugar)?|nao sei|nao importa|indiferente|sem preferencia)$/.test(t) && ctx.aguardando.length) {
    const c = ctx.aguardando[0];
    if (c === "localizacao") ops.push({ op: "set", caminho: "localizacao.qualquer", valor: true });
    if (c === "orcamento.max") ops.push({ op: "set", caminho: "orcamento.sem_teto", valor: true });
    if (c === "porte.quartos_min") ops.push({ op: "set", caminho: "porte.quartos_min", valor: 0 });
    return { ops, opsMemoria, ambiguos, usouMemoria, entendeu: ops.length > 0 };
  }

  // 1. quadras: "SQN 312", "312 norte", "QRSW 7"
  tx.cada(/\b(sqnw|sqsw|sqn|sqs|clnw|cln|cls|ccsw|qrsw|qmsw|shcgn|shces)\s*(\d{1,3})\b/, (m) => {
    ops.push({ op: "add", caminho: "localizacao.quadras", valor: `${m[1].toUpperCase()} ${m[2]}` });
  });
  tx.cada(/\b(?:na |da |quadra )?(\d{3})\s*(norte|sul)\b/, (m) => {
    ops.push({ op: "add", caminho: "localizacao.quadras", valor: `${m[2] === "norte" ? "SQN" : "SQS"} ${m[1]}` });
  });

  // 2. porte: quartos, suítes, vagas, área (antes do dinheiro, para não confundir números)
  tx.cada(/\b(\d+|um|dois|tres|quatro|cinco)\s*(?:ou mais\s*)?(?:quartos?|qts?|q|dormitorios?|dorms?)\b/, (m) => { ops.push({ op: "set", caminho: "porte.quartos_min", valor: num(m[1]) }); });
  tx.cada(/\b(\d+|uma|duas|tres)\s*suites?\b/, (m) => { ops.push({ op: "set", caminho: "porte.suites_min", valor: num(m[1]) }); });
  tx.cada(/\b(\d+|uma|duas|tres)\s*vagas?\b/, (m) => { ops.push({ op: "set", caminho: "porte.vagas_min", valor: num(m[1]) }); });
  tx.cada(/\b(ate\s+)?(\d{2,4})\s*(?:m2|metros quadrados|metros|mts|m)\b(?!\s*(?:do|da|de|a pe))/, (m) => {
    ops.push({ op: "set", caminho: m[1] ? "porte.area_max" : "porte.area_min", valor: parseInt(m[2], 10) });
  });

  // 3. dinheiro
  const it = ctx.perfil.intencao ?? (/\b(compra|comprar|venda|financ)/.test(t) ? "comprar" : null);
  tx.cada(new RegExp(String.raw`\b(?:entre|de)\s*(?:r\$\s*)?${NUM}\s*(?:e|a|ate)\s*(?:r\$\s*)?${NUM}${NAO_E_DINHEIRO}`), (m) => {
    const u1 = m[2] ?? (parseFloat(m[1].replace(",", ".")) < 1000 ? m[4] : undefined);
    ops.push({ op: "set", caminho: "orcamento.min", valor: valor(m[1], u1, it) }, { op: "set", caminho: "orcamento.max", valor: valor(m[3], m[4], it) });
  });
  tx.cada(new RegExp(String.raw`\b(?:ate|maximo(?: de)?|no maximo|teto(?: de)?|por ate|menos de|abaixo de|limite(?: de)?)\s*(?:uns\s*)?(?:r\$\s*)?${NUM}${NAO_E_DINHEIRO}`), (m) => {
    ops.push({ op: "set", caminho: "orcamento.max", valor: valor(m[1], m[2], it) });
  });
  tx.cada(new RegExp(String.raw`\b(?:a partir de|acima de|mais de|minimo(?: de)?)\s*(?:r\$\s*)?${NUM}${NAO_E_DINHEIRO}`), (m) => {
    ops.push({ op: "set", caminho: "orcamento.min", valor: valor(m[1], m[2], it) });
  });
  tx.cada(new RegExp(String.raw`(?:r\$\s*${NUM}|\b(\d+(?:[.,]\d+)?)\s*(milhoes|milhao|mil|mi|k)\b|\b(\d{1,3}\.\d{3}(?:\.\d{3})?)\b)${NAO_E_DINHEIRO}`), (m) => {
    const v = m[1] ? valor(m[1], m[2], it) : m[3] ? valor(m[3], m[4], it) : valor(m[5], undefined, it);
    ops.push({ op: "set", caminho: "orcamento.max", valor: v });
  });

  // 4. dicionário, formas mais longas primeiro
  for (const { forma, entrada: e } of FORMAS) {
    let de = 0;
    for (;;) {
      const i = t.indexOf(forma, de);
      if (i < 0) break;
      de = i + 1;
      const antes = i === 0 ? " " : t[i - 1], depois = t[i + forma.length] ?? " ";
      if (/[a-z0-9]/.test(antes) || /[a-z0-9]/.test(depois) || !tx.livre(i, forma.length)) continue;
      tx.marca(i, forma.length);
      if (e.k === "intencao") ops.push({ op: "set", caminho: "intencao", valor: e.val });
      else if (e.k === "tipo") ops.push({ op: "add", caminho: "tipo", valor: e.val });
      else if (e.k === "bairro") ops.push({ op: "add", caminho: "localizacao.bairros", valor: e.val });
      else if (e.k === "regiao") ops.push({ op: "add", caminho: "localizacao.regioes", valor: e.val });
      else if (e.k === "set") ops.push({ op: "set", caminho: e.caminho!, valor: e.val });
      else if (e.k === "attr") {
        const peso = pesoPeloContexto(t, i, forma.length, e.peso);
        if (peso === "remover") ops.push({ op: "rmattr", chave: e.chave! });
        else if (peso === "excluir" && e.val === false) ops.push({ op: "attr", chave: e.chave!, valor: true, peso: "obrigatorio" });
        else ops.push({ op: "attr", chave: e.chave!, valor: e.val, peso });
      } else if (e.k === "ambiguo") {
        const mem = ctx.memorias.find((x) => normalizar(x.termo) === normalizar(e.t));
        if (mem) { opsMemoria.push(...mem.ops); usouMemoria.push(`${e.t} = ${mem.rotulo}`); }
        else { ops.push({ op: "pendente", termo: e.t }); ambiguos.push(e); }
      }
    }
  }

  // 5. número solto respondendo a uma pergunta ("4000", "2")
  const solto = /^(?:r\$\s*)?(\d+(?:[.,]\d+)*)\s*(milhoes|milhao|mil|mi|k)?$/.exec(t);
  if (solto && ctx.aguardando.length) {
    const n = parseFloat(solto[1].replace(/\./g, "").replace(",", "."));
    const semDinheiro = ops.filter((o) => !(o.op === "set" && o.caminho.startsWith("orcamento.")));
    if (ctx.aguardando.includes("porte.quartos_min") && !solto[2] && n <= 9 && !ctx.aguardando[0].startsWith("orcamento")) {
      ops.length = 0; ops.push(...semDinheiro, { op: "set", caminho: "porte.quartos_min", valor: n });
    } else if (ctx.aguardando.includes("orcamento.max") && !ops.some((o) => o.op === "set" && o.caminho === "orcamento.max")) {
      ops.push({ op: "set", caminho: "orcamento.max", valor: valor(solto[1], solto[2], it) });
    }
  }

  // 6. comandos de fluxo
  const resto = tx.sobra();
  if (/\b(recomecar|comecar de novo|nova busca|zerar|do zero)\b/.test(t)) fluxo = "recomecar";
  else if (/\b(ver (?:os |todos|tudo|resultados?|a lista)|mostra(?:r)? (?:os |todos|tudo|resultados?|a lista)|pode buscar|busca final)\b/.test(t)) fluxo = "ver_resultados";
  else if (/\b(ver assim mesmo|assim mesmo|pode mostrar)\b/.test(t)) fluxo = "ver_assim_mesmo";
  else if (/^(e isso|isso|isso mesmo|sim|pode ser|ok|perfeito|ta otimo|ta bom|ta certo|exato|certo|beleza|show|fechou)\b/.test(resto) || (ops.length > 0 && /^(e isso|isso mesmo|sim)\b/.test(t))) fluxo = "confirmar_previa";

  return { ops, opsMemoria, fluxo, ambiguos, usouMemoria, entendeu: ops.length + opsMemoria.length > 0 || !!fluxo };
}

export const interpretadorRegras: Interpretador = {
  id: "regras",
  async interpretar(texto, ctx) { return interpretarPorRegras(texto, ctx); },
};
