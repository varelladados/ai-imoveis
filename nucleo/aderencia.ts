// Filtro, pontuação, etiquetas e filtros dinâmicos. Tudo determinístico, sem IA.
import type { Imovel, PerfilDeBusca, ImovelResumo, ValorAtributo } from "./tipos";
import { brl, normalizar, rotuloAtributo, ROTULOS, NOME_TIPO } from "./texto";

export function custoMensal(i: Imovel) { return i.preco + i.condominio + i.iptu; }

export function precoComparado(i: Imovel, p: PerfilDeBusca) {
  return i.intencao === "alugar" && p.orcamento.base === "pacote" ? custoMensal(i) : i.preco;
}

// true = tem; false = não tem; null = o anúncio não informa
export function atende(i: Imovel, chave: string, valor: ValorAtributo): boolean | null {
  const a = i.atributos;
  if (chave === "terreo") return a.andar === undefined ? null : a.andar === 0;
  if (chave === "andar_min") return a.andar === undefined ? null : Number(a.andar) >= Number(valor);
  if (a[chave] === undefined) return null;
  return a[chave] === valor;
}

function naLocalizacao(i: Imovel, p: PerfilDeBusca) {
  const l = p.localizacao;
  if (l.regioes.length + l.bairros.length + l.quadras.length > 0) {
    const q = normalizar(i.endereco);
    const ok = l.regioes.includes(i.regiao) || l.bairros.includes(i.bairro) ||
      l.quadras.some((x) => q.startsWith(normalizar(x) + " ") || q === normalizar(x));
    if (!ok) return false;
  }
  for (const r of l.referencias) {
    const d = i.atributos.metro_m;
    if (typeof d !== "number" || d > r.raio_m) return false;
  }
  return true;
}

export function passa(i: Imovel, p: PerfilDeBusca): boolean {
  if (p.intencao && i.intencao !== p.intencao) return false;
  if (p.tipo.length && !p.tipo.includes(i.tipo)) return false;
  if (!naLocalizacao(i, p)) return false;
  const preco = precoComparado(i, p);
  if (p.orcamento.max != null && preco > p.orcamento.max) return false;
  if (p.orcamento.min != null && preco < p.orcamento.min) return false;
  const t = p.porte;
  if (t.quartos_min != null && i.quartos < t.quartos_min) return false;
  if (t.suites_min != null && i.suites < t.suites_min) return false;
  if (t.vagas_min != null && i.vagas < t.vagas_min) return false;
  if (t.area_min != null && i.area < t.area_min) return false;
  if (t.area_max != null && i.area > t.area_max) return false;
  for (const a of p.atributos) {
    const r = atende(i, a.chave, a.valor);
    if (a.peso === "obrigatorio" && r !== true) return false;
    if (a.peso === "excluir" && r === true) return false;
  }
  return true;
}

export const filtrar = (itens: Imovel[], p: PerfilDeBusca) => itens.filter((i) => passa(i, p));

export interface Avaliado { imovel: Imovel; aderencia: number; etiquetas: string[] }

export function avaliar(i: Imovel, p: PerfilDeBusca): Avaliado {
  const desej = p.atributos.filter((a) => a.peso === "desejavel");
  const etiquetas: string[] = [];
  let tem = 0;
  for (const a of desej) {
    const r = atende(i, a.chave, a.valor);
    if (r === true) tem++;
    else etiquetas.push(r === null ? `não informa ${ROTULOS[a.chave] ?? a.chave}` : `sem ${rotuloAtributo(a.chave, a.valor)}`);
  }
  let pontos = 60 + (desej.length ? (tem / desej.length) * 30 : 30);
  if (p.orcamento.max != null) {
    const folga = p.orcamento.max - precoComparado(i, p);
    pontos += Math.max(0, Math.min(10, (folga / p.orcamento.max) * 40));
    if (folga >= p.orcamento.max * 0.05) etiquetas.push(`${brl(folga)} abaixo do teto`);
  } else pontos += 5;
  if (!etiquetas.some((e) => e.startsWith("sem ") || e.startsWith("não informa"))) etiquetas.unshift("atende tudo");
  if (i.atributos.sobre_comercio === true) etiquetas.push("sobre comércio");
  return { imovel: i, aderencia: Math.round(pontos), etiquetas: etiquetas.slice(0, 3) };
}

export function ordenar(itens: Imovel[], p: PerfilDeBusca): Avaliado[] {
  return itens.map((i) => avaliar(i, p)).sort((a, b) => b.aderencia - a.aderencia || a.imovel.preco - b.imovel.preco);
}

export function resumir(a: Avaliado, p: PerfilDeBusca): ImovelResumo {
  const i = a.imovel;
  const partes = [];
  if (i.quartos) partes.push(`${i.quartos} quarto${i.quartos > 1 ? "s" : ""}`);
  partes.push(`${i.area} m²`);
  if (i.vagas) partes.push(`${i.vagas} vaga${i.vagas > 1 ? "s" : ""}`);
  const preco = i.intencao === "alugar"
    ? `${brl(i.preco)}/mês` + (i.condominio ? ` + ${brl(i.condominio)} de condomínio` : "")
    : brl(i.preco);
  const nome = NOME_TIPO[i.tipo];
  return {
    id: i.id, tipo: i.tipo,
    titulo: `${nome[0].toUpperCase()}${nome.slice(1)} · ${i.endereco}`,
    linha: `${i.bairro} · ${partes.join(" · ")}`,
    preco, etiquetas: a.etiquetas, aderencia: a.aderencia,
  };
}

// Filtros dinâmicos: só o que existe nos resultados atuais, com contagem.
export interface FiltroDinamico { chave: string; rotulo: string; opcoes: { valor: ValorAtributo; rotulo: string; n: number }[] }

export function filtrosDinamicos(itens: Imovel[]): FiltroDinamico[] {
  const mapa = new Map<string, Map<string, { valor: ValorAtributo; n: number }>>();
  const soma = (chave: string, valor: ValorAtributo) => {
    if (!mapa.has(chave)) mapa.set(chave, new Map());
    const m = mapa.get(chave)!; const k = String(valor);
    m.set(k, { valor, n: (m.get(k)?.n ?? 0) + 1 });
  };
  for (const i of itens) {
    soma("bairro", i.bairro);
    if (i.tipo !== "lote") soma("quartos", i.quartos);
    soma("vagas", Math.min(i.vagas, 3));
    for (const [k, v] of Object.entries(i.atributos)) {
      if (k === "metro_m" || k === "andar") continue; // contínuos: viram faixa abaixo
      soma(k, v);
    }
    if (typeof i.atributos.andar === "number") soma("faixa_andar", i.atributos.andar === 0 ? "térreo" : i.atributos.andar <= 3 ? "1º a 3º" : i.atributos.andar <= 9 ? "4º a 9º" : "10º ou acima");
    if (typeof i.atributos.metro_m === "number") soma("faixa_metro", i.atributos.metro_m <= 400 ? "até 400 m" : i.atributos.metro_m <= 800 ? "até 800 m" : i.atributos.metro_m <= 1200 ? "até 1,2 km" : "mais de 1,2 km");
  }
  const rot = (chave: string, v: ValorAtributo) => {
    if (chave === "quartos") return v === 0 ? "sem quarto" : `${v} quarto${v === 1 ? "" : "s"}`;
    if (chave === "vagas") return v === 0 ? "sem vaga" : v === 3 ? "3 ou mais" : `${v} vaga${v === 1 ? "" : "s"}`;
    if (typeof v === "boolean") return v ? "sim" : "não";
    if (chave === "bairro" || chave.startsWith("faixa_")) return String(v);
    return rotuloAtributo(chave, v);
  };
  const nomes: Record<string, string> = { bairro: "Bairro", quartos: "Quartos", vagas: "Vagas", faixa_andar: "Andar", faixa_metro: "Metrô" };
  return [...mapa.entries()]
    .map(([chave, m]) => ({
      chave,
      rotulo: nomes[chave] ?? (ROTULOS[chave] ? ROTULOS[chave][0].toUpperCase() + ROTULOS[chave].slice(1) : chave),
      opcoes: [...m.values()].sort((a, b) => b.n - a.n).map((o) => ({ valor: o.valor, rotulo: rot(chave, o.valor), n: o.n })),
    }))
    .sort((a, b) => (a.chave === "bairro" ? -1 : b.chave === "bairro" ? 1 : a.rotulo.localeCompare(b.rotulo, "pt-BR")));
}

// Ganho de informação: qual atributo melhor divide os resultados atuais.
// Entropia de "tem / não tem / não informa"; perto de 50/50 vale mais.
export function melhorPergunta(itens: Imovel[], p: PerfilDeBusca, jaPerguntados: string[], preferidos: string[]): { chave: string; tem: number; total: number } | null {
  const usados = new Set([...p.atributos.map((a) => a.chave), ...jaPerguntados]);
  const cont = new Map<string, number>();
  for (const i of itens) for (const [k, v] of Object.entries(i.atributos)) if (v === true) cont.set(k, (cont.get(k) ?? 0) + 1);
  let melhor: { chave: string; tem: number; total: number; g: number } | null = null;
  for (const [chave, tem] of cont) {
    if (usados.has(chave) || !ROTULOS[chave]) continue;
    const q = tem / itens.length;
    if (q < 0.15 || q > 0.85) continue;
    const g = -(q * Math.log2(q) + (1 - q) * Math.log2(1 - q)) + (preferidos.includes(chave) ? 0.08 : 0);
    if (!melhor || g > melhor.g) melhor = { chave, tem, total: itens.length, g };
  }
  return melhor;
}
