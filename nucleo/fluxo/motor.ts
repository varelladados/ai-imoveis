// Motor de fluxo: a máquina de estados da conversa. Determinístico, sem IA.
// Recebe a mensagem (ou o chip tocado), atualiza a ficha e decide o próximo nó.
import {
  estadoInicial, opSchema, perfilVazio,
  type Bloco, type Chip, type Escolha, type EstadoConversa, type Imovel, type Memoria, type Op,
  type PerfilDeBusca, type RespostaConversa,
} from "../tipos";
import bruto from "../../config/templates/templates.json";
import { aplicarOps } from "../perfil/ops";
import { melhorPergunta, ordenar, precoComparado, resumir } from "../aderencia";
import { bairroDaQuadra, entradaPorTermo } from "../dicionario";
import { brl, NOME_TIPO, plural, ROTULOS, rotuloAtributo } from "../texto";
import type { PropertySource } from "../fontes";
import type { Interpretador } from "../interpretador/regras";

export const FAIXA_UTIL = { min: 5, max: 50 };

interface Template {
  id: string; intencao: string; tipo: string; obrigatorios: string[];
  padroes: Record<string, any>; faixas: Record<string, [number, number]>;
  perguntas: Record<string, { texto: string; opcoes: number[] | "dos_resultados" }>;
  refino: string[];
}
const TEMPLATES = (bruto as any).templates as Template[];

export function templateDe(p: PerfilDeBusca): Template | null {
  if (!p.intencao || !p.tipo.length) return null;
  return TEMPLATES.find((t) => t.intencao === p.intencao && t.tipo === p.tipo[0])
    ?? TEMPLATES.find((t) => t.intencao === p.intencao && t.tipo === "*")!;
}

const preenchido = (p: PerfilDeBusca, campo: string) => {
  const l = p.localizacao;
  if (campo === "localizacao") return l.qualquer || l.regioes.length + l.bairros.length + l.quadras.length + l.referencias.length > 0;
  if (campo === "orcamento.max") return p.orcamento.max != null || p.orcamento.sem_teto;
  if (campo === "porte.quartos_min") return p.porte.quartos_min != null;
  return true;
};

export function camposFaltando(p: PerfilDeBusca): string[] {
  if (!p.intencao) return ["intencao", ...(p.tipo.length ? [] : ["tipo"])];
  if (!p.tipo.length) return ["tipo"];
  return templateDe(p)!.obrigatorios.filter((c) => !preenchido(p, c));
}

function linhasDoResumo(p: PerfilDeBusca) {
  const l = p.localizacao, o = p.orcamento, t = p.porte;
  const linhas: { rotulo: string; valor: string }[] = [];
  linhas.push({ rotulo: "O que", valor: `${p.tipo.map((x) => NOME_TIPO[x]).join(" ou ")} para ${p.intencao === "alugar" ? "alugar" : "comprar"}` });
  const onde = [...l.regioes, ...l.bairros, ...l.quadras];
  const refs = l.referencias.map((r) => `até ${r.raio_m >= 1000 ? (r.raio_m / 1000).toLocaleString("pt-BR") + " km" : r.raio_m + " m"} do ${r.texto}`);
  linhas.push({ rotulo: "Onde", valor: [onde.length ? onde.join(", ") : "qualquer região", ...refs].join(", ") });
  let quanto = o.max != null ? `até ${brl(o.max)}` : "sem teto";
  if (o.min != null) quanto = `de ${brl(o.min)} ${quanto}`;
  if (p.intencao === "alugar" && o.max != null) quanto += o.base === "pacote" ? " por mês, com condomínio e IPTU" : " de aluguel por mês";
  linhas.push({ rotulo: "Quanto", valor: quanto });
  const tam = [];
  if (t.quartos_min) tam.push(`${t.quartos_min} quarto${t.quartos_min > 1 ? "s" : ""} ou mais`);
  if (t.suites_min) tam.push(`${t.suites_min} suíte${t.suites_min > 1 ? "s" : ""} ou mais`);
  if (t.vagas_min) tam.push(`${t.vagas_min} vaga${t.vagas_min > 1 ? "s" : ""} ou mais`);
  if (t.area_min) tam.push(`${t.area_min} m² ou mais`);
  if (t.area_max) tam.push(`até ${t.area_max} m²`);
  if (tam.length) linhas.push({ rotulo: "Tamanho", valor: tam.join(", ") });
  const por = (peso: string) => p.atributos.filter((a) => a.peso === peso).map((a) => rotuloAtributo(a.chave, a.valor)).join(", ");
  if (por("obrigatorio")) linhas.push({ rotulo: "Tem que ter", valor: por("obrigatorio") });
  if (por("desejavel")) linhas.push({ rotulo: "Seria bom", valor: por("desejavel") });
  if (por("excluir")) linhas.push({ rotulo: "Sem", valor: por("excluir") });
  return linhas;
}

function fraseDaOp(op: Op): string | null {
  if (op.op === "set") {
    if (op.caminho === "intencao") return op.valor === "alugar" ? "para alugar" : "para comprar";
    if (op.caminho === "orcamento.max") return `até ${brl(op.valor)}`;
    if (op.caminho === "orcamento.min") return `a partir de ${brl(op.valor)}`;
    if (op.caminho === "orcamento.base" && op.valor === "pacote") return "valor já com condomínio e IPTU";
    if (op.caminho === "orcamento.sem_teto") return "sem teto de preço";
    if (op.caminho === "porte.quartos_min") return op.valor ? `${op.valor} quarto${op.valor > 1 ? "s" : ""} ou mais` : "qualquer número de quartos";
    if (op.caminho === "porte.suites_min") return `${op.valor} suíte${op.valor > 1 ? "s" : ""} ou mais`;
    if (op.caminho === "porte.vagas_min") return `${op.valor} vaga${op.valor > 1 ? "s" : ""} ou mais`;
    if (op.caminho === "porte.area_min") return `${op.valor} m² ou mais`;
    if (op.caminho === "porte.area_max") return `até ${op.valor} m²`;
    if (op.caminho === "localizacao.qualquer") return "em qualquer região";
  }
  if (op.op === "add") {
    if (op.caminho === "tipo") return NOME_TIPO[op.valor];
    if (op.caminho.startsWith("localizacao.") && typeof op.valor === "string") return op.valor;
    if (op.caminho === "localizacao.referencias") return `até ${op.valor.raio_m} m do ${op.valor.texto}`;
  }
  if (op.op === "attr") {
    const r = rotuloAtributo(op.chave, op.valor);
    return op.peso === "excluir" ? `sem ${r}` : op.peso === "desejavel" ? `${r} (seria bom)` : r;
  }
  if (op.op === "rmattr") return `${ROTULOS[op.chave] ?? op.chave}: tanto faz`;
  return null;
}

async function relaxamentos(p: PerfilDeBusca, fonte: PropertySource): Promise<Chip[]> {
  const cand: { rotulo: string; ops: Op[] }[] = [];
  const o = p.orcamento, t = p.porte, l = p.localizacao;
  if (o.max != null) {
    // o menor teto que destrava: o imóvel mais barato que passa em todo o resto
    const semTeto = await fonte.buscar(aplicarOps(p, [{ op: "limpar", caminho: "orcamento.max" }]));
    if (semTeto.length) {
      const passo = o.max >= 100000 ? 10000 : 100;
      const menor = Math.min(...semTeto.map((i) => precoComparado(i, p)));
      const novo = Math.ceil((menor * 1.05) / passo) * passo;
      cand.push({ rotulo: `subir o teto para ${brl(novo)}`, ops: [{ op: "set", caminho: "orcamento.max", valor: novo }] });
    }
  }
  if (o.min != null) cand.push({ rotulo: "tirar o valor mínimo", ops: [{ op: "limpar", caminho: "orcamento.min" }] });
  for (const a of p.atributos.filter((x) => x.peso === "obrigatorio"))
    cand.push({ rotulo: `não exigir ${rotuloAtributo(a.chave, a.valor)}`, ops: [{ op: "rmattr", chave: a.chave }] });
  if (l.quadras.length) {
    const bairros = [...new Set(l.quadras.map(bairroDaQuadra).filter(Boolean))] as string[];
    if (bairros.length) cand.push({
      rotulo: `olhar ${bairros.join(" e ")} inteira, não só a quadra`,
      ops: [{ op: "limpar", caminho: "localizacao.quadras" }, ...bairros.map((b) => ({ op: "add" as const, caminho: "localizacao.bairros", valor: b }))],
    });
  }
  if (l.referencias.length) cand.push({ rotulo: `tirar o limite de distância do ${l.referencias[0].texto}`, ops: [{ op: "limpar", caminho: "localizacao.referencias" }] });
  if (l.bairros.length + l.regioes.length + l.quadras.length) cand.push({
    rotulo: "procurar em qualquer região",
    ops: [{ op: "limpar", caminho: "localizacao.quadras" }, { op: "limpar", caminho: "localizacao.bairros" }, { op: "limpar", caminho: "localizacao.regioes" }, { op: "set", caminho: "localizacao.qualquer", valor: true }],
  });
  if (t.quartos_min && t.quartos_min > 1) cand.push({ rotulo: `aceitar ${t.quartos_min - 1} quarto${t.quartos_min > 2 ? "s" : ""}`, ops: [{ op: "set", caminho: "porte.quartos_min", valor: t.quartos_min - 1 }] });
  if (t.vagas_min) cand.push({ rotulo: "não exigir vaga", ops: [{ op: "limpar", caminho: "porte.vagas_min" }] });
  if (t.suites_min) cand.push({ rotulo: "não exigir suíte", ops: [{ op: "limpar", caminho: "porte.suites_min" }] });
  if (t.area_min) cand.push({ rotulo: "não exigir área mínima", ops: [{ op: "limpar", caminho: "porte.area_min" }] });

  const chips: (Chip & { n: number; preco: boolean })[] = [];
  let jaPreco = false;
  for (const c of cand) {
    const preco = c.rotulo.startsWith("subir o teto");
    if (preco && jaPreco) continue; // só o menor aumento que resolve
    const n = (await fonte.buscar(aplicarOps(p, c.ops))).length;
    if (n > 0) { chips.push({ rotulo: `${c.rotulo} (${n})`, escolha: { ops: c.ops }, n, preco }); if (preco) jaPreco = true; }
  }
  return chips.sort((a, b) => b.n - a.n).slice(0, 4).map(({ rotulo, escolha }) => ({ rotulo, escolha }));
}

export interface Entrada { mensagem?: string; escolha?: Escolha; perfil: PerfilDeBusca; estado: EstadoConversa; memorias: Memoria[] }
export interface Dependencias { fonte: PropertySource; interpretador: Interpretador }

export async function conversar(entrada: Entrada, deps: Dependencias): Promise<RespostaConversa> {
  let p = entrada.perfil;
  let e: EstadoConversa = { ...entrada.estado, refinoPerguntados: [...entrada.estado.refinoPerguntados] };
  const memoriasNovas: Memoria[] = [];
  const blocos: Bloco[] = [];
  const anotado: string[] = [];
  const notas: string[] = [];
  let fluxo: Escolha["fluxo"];
  let entendeu = true;

  // 1. aplica o que chegou
  if (entrada.escolha) {
    const c = entrada.escolha;
    fluxo = c.fluxo;
    if (c.ops) { const ops = opSchema.array().parse(c.ops); p = aplicarOps(p, ops); anotado.push(...ops.map(fraseDaOp).filter(Boolean) as string[]); }
    if (c.memoria) {
      memoriasNovas.push({ termo: c.memoria.termo, contexto: c.memoria.contexto, rotulo: c.memoria.rotulo, ops: c.ops ?? [], ocorrencias: 1, confianca: 1, escopo: "usuario", origem: "aprendida" });
      p = aplicarOps(p, [{ op: "resolver", termo: c.memoria.termo }]);
    }
    if (c.refino && !e.refinoPerguntados.includes(c.refino)) e.refinoPerguntados.push(c.refino);
  } else if (entrada.mensagem?.trim()) {
    const r = await deps.interpretador.interpretar(entrada.mensagem, { perfil: p, memorias: entrada.memorias, aguardando: camposFaltando(p) });
    const ops = opSchema.array().safeParse(r.ops); // saída do interpretador é sempre validada
    const opsMem = opSchema.array().safeParse(r.opsMemoria);
    if (ops.success) { p = aplicarOps(p, ops.data); anotado.push(...ops.data.map(fraseDaOp).filter(Boolean) as string[]); }
    if (opsMem.success && opsMem.data.length) { p = aplicarOps(p, opsMem.data, "memoria"); notas.push(...r.usouMemoria.map((m) => `Usei o que você me disse antes: ${m}.`)); }
    fluxo = r.fluxo;
    entendeu = r.entendeu && ops.success;
  }

  if (fluxo === "recomecar") { p = perfilVazio(); e = estadoInicial(); }
  if (fluxo === "confirmar_previa") e.previaConfirmada = true;
  if (fluxo === "ver_assim_mesmo") { e.previaConfirmada = true; e.verAssimMesmo = true; }

  const prefixo = () => {
    if (fluxo === "sincronizar") return "Você mudou a busca nos filtros. ";
    if (fluxo === "recomecar") return "Começando do zero. ";
    if (!entendeu) return "Essa eu não entendi. ";
    if (anotado.length) return `Anotei: ${[...new Set(anotado)].join(", ")}. `;
    return "";
  };
  const fim = (no: EstadoConversa["no"], contagem: number | null, extra: Partial<RespostaConversa> = {}): RespostaConversa => {
    e.no = no; e.ultimaContagem = contagem;
    if (notas.length && blocos.length) blocos[blocos.length - 1].nota = [blocos[blocos.length - 1].nota, ...notas].filter(Boolean).join(" ");
    return { perfil: p, estado: e, blocos, contagem, memoriasNovas, interpretador: deps.interpretador.id, ...extra };
  };

  // 2. intenção e tipo
  if (!p.intencao || !p.tipo.length) {
    if (!p.intencao) blocos.push({
      texto: prefixo() + (entrada.mensagem || entrada.escolha ? "Você quer alugar ou comprar?" : "Oi! Eu sou o AÍ!. Me conta o imóvel que você procura, do seu jeito. Para começar: é para alugar ou comprar?"),
      chips: [{ rotulo: "Alugar", escolha: { ops: [{ op: "set", caminho: "intencao", valor: "alugar" }] } }, { rotulo: "Comprar", escolha: { ops: [{ op: "set", caminho: "intencao", valor: "comprar" }] } }],
    });
    if (!p.tipo.length) blocos.push({
      texto: (blocos.length ? "" : prefixo()) + "Que tipo de imóvel?",
      chips: ["apartamento", "casa", "kitnet", "cobertura"].map((t) => ({ rotulo: NOME_TIPO[t][0].toUpperCase() + NOME_TIPO[t].slice(1), escolha: { ops: [{ op: "add", caminho: "tipo", valor: t }] } })),
    });
    return fim(!p.intencao ? "INTENCAO" : "TIPO", null);
  }

  const tpl = templateDe(p)!;
  if (p.orcamento.base == null && tpl.padroes["orcamento.base"]) p = aplicarOps(p, [{ op: "set", caminho: "orcamento.base", valor: tpl.padroes["orcamento.base"] }], "padrao_do_template");

  // 3. termo ambíguo sem memória
  if (p.pendentes.length) {
    const termo = p.pendentes[0].termo;
    const ent = entradaPorTermo(termo);
    if (!ent?.opcoes) p = aplicarOps(p, [{ op: "resolver", termo }]);
    else {
      blocos.push({
        texto: prefixo() + ent.pergunta!,
        chips: ent.opcoes.map((o) => ({ rotulo: o.rotulo, escolha: { ops: o.ops, memoria: { termo, rotulo: o.rotulo, contexto: ent.contexto ?? "" } } })),
        nota: "Vou lembrar da sua resposta nas próximas buscas.",
      });
      return fim("AMBIGUIDADE", null);
    }
  }

  // 4. obrigatórios do template (no máximo duas perguntas por vez)
  const faltando = tpl.obrigatorios.filter((c) => !preenchido(p, c));
  if (faltando.length) {
    for (const campo of faltando.slice(0, 2)) {
      const q = tpl.perguntas[campo];
      let chips: Chip[] = [];
      if (campo === "localizacao") {
        const cont = new Map<string, number>();
        for (const i of await deps.fonte.buscar(p)) cont.set(i.bairro, (cont.get(i.bairro) ?? 0) + 1);
        chips = [...cont.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([b]) => ({ rotulo: b, escolha: { ops: [{ op: "add", caminho: "localizacao.bairros", valor: b }] } }));
        chips.push({ rotulo: "Tanto faz", escolha: { ops: [{ op: "set", caminho: "localizacao.qualquer", valor: true }] } });
      } else if (campo === "orcamento.max") {
        chips = (q.opcoes as number[]).map((v) => ({ rotulo: `até ${brl(v)}`, escolha: { ops: [{ op: "set", caminho: "orcamento.max", valor: v }] } }));
        chips.push({ rotulo: "Sem teto", escolha: { ops: [{ op: "set", caminho: "orcamento.sem_teto", valor: true }] } });
      } else if (campo === "porte.quartos_min") {
        chips = (q.opcoes as number[]).map((v) => ({ rotulo: `${v}`, escolha: { ops: [{ op: "set", caminho: "porte.quartos_min", valor: v }] } }));
        chips.push({ rotulo: "Tanto faz", escolha: { ops: [{ op: "set", caminho: "porte.quartos_min", valor: tpl.padroes["porte.quartos_min"] ?? 0 }] } });
      }
      blocos.push({ texto: (blocos.length ? "" : prefixo()) + q.texto, chips });
    }
    return fim(faltando[0] === "localizacao" ? "LOCALIZACAO" : faltando[0] === "orcamento.max" ? "ORCAMENTO" : "PORTE", null);
  }

  // 5. consulta a base
  const achados: Imovel[] = await deps.fonte.buscar(p);
  const n = achados.length;
  const nomeN = (k: number) => plural(k, "imóvel", "imóveis");

  if (n === 0) {
    const chips = await relaxamentos(p, deps.fonte);
    blocos.push({
      texto: prefixo() + (chips.length
        ? "Com tudo isso junto não achei nenhum imóvel na base. Dá para destravar mudando uma coisa (entre parênteses, quantos aparecem):"
        : "Com tudo isso junto não achei nenhum imóvel, e mudar uma coisa só não resolve. Me diga o que posso flexibilizar, ou recomece."),
      chips: [...chips, { rotulo: "Recomeçar", escolha: { fluxo: "recomecar" } }],
    });
    return fim("INCOMPATIVEL", 0);
  }

  if (fluxo === "ver_resultados") return fim("BUSCA_FINAL", n, { abrirResultados: true, blocos: [{ texto: `Abrindo os ${n}.` }] });
  if (fluxo === "ajustar") {
    blocos.push({ texto: "O que você quer mudar? Pode escrever do seu jeito: \"até 4.500\", \"sem térreo\", \"pode ser no Sudoeste também\", \"tanto faz a varanda\"." });
    return fim(e.no === "INICIO" ? "PREVIA" : e.no, n);
  }

  const top = ordenar(achados, p);

  // 6. prévia para alinhar
  if (!e.previaConfirmada) {
    const k = Math.min(3, n);
    blocos.push({
      texto: prefixo() + (n <= 3 ? `Achei ${nomeN(n)} assim:` : `Achei ${nomeN(n)} assim. Olha ${k === 3 ? "três" : k}, só para ver se estou no caminho:`),
      imoveis: top.slice(0, k).map((a) => resumir(a, p)),
      chips: [{ rotulo: "É isso", escolha: { fluxo: "confirmar_previa" } }, { rotulo: "Quero ajustar", escolha: { fluxo: "ajustar" } }],
    });
    return fim("PREVIA", n);
  }

  // 7. refinar: pergunta o atributo que melhor divide os resultados
  if (!e.verAssimMesmo && (n > FAIXA_UTIL.max || (n > 15 && e.refinoPerguntados.length < 2))) {
    const q = melhorPergunta(achados, p, e.refinoPerguntados, tpl.refino);
    if (q) {
      const r = ROTULOS[q.chave];
      const attr = (peso: "obrigatorio" | "desejavel" | "excluir"): Escolha => ({ ops: [{ op: "attr", chave: q.chave, valor: true, peso }], refino: q.chave });
      blocos.push({
        texto: prefixo() + `${n > FAIXA_UTIL.max ? `Ainda são ${n}, é muita coisa para olhar` : `São ${n}`}. ${q.tem} deles têm ${r}. Isso pesa para você?`,
        chips: [
          { rotulo: "Tem que ter", escolha: attr("obrigatorio") }, { rotulo: "Seria bom", escolha: attr("desejavel") },
          { rotulo: "Tanto faz", escolha: { refino: q.chave } }, { rotulo: "Prefiro sem", escolha: attr("excluir") },
          { rotulo: `Ver os ${n} assim mesmo`, escolha: { fluxo: "ver_assim_mesmo" } },
        ],
      });
      return fim("REFINAR", n);
    }
  }

  // 8. resumo antes da busca final
  e.resumoPronto = true;
  const assumidos = Object.entries(p.origem_dos_campos).filter(([c, o]) => o === "memoria").map(([c]) => c);
  blocos.push({
    texto: prefixo() + "Fechei sua busca. Confere:",
    resumo: linhasDoResumo(p),
    chips: [{ rotulo: `Ver ${n === 1 ? "o imóvel" : `os ${n}`}`, escolha: { fluxo: "ver_resultados" } }, { rotulo: "Mudar algo", escolha: { fluxo: "ajustar" } }],
    nota: [
      `${n === 1 ? "É 1 imóvel" : `São ${n} imóveis`}.`,
      n < FAIXA_UTIL.min ? "É pouco: se quiser mais opções, flexibilize algum item." : "",
      assumidos.length ? "Parte da busca veio do que você já tinha me dito em outra conversa." : "",
    ].filter(Boolean).join(" "),
  });
  return fim("RESUMO", n);
}
