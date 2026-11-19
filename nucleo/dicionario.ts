// Lê config/dicionario/termos.json e prepara a busca por forma de superfície.
import bruto from "../config/dicionario/termos.json";
import type { Op, Peso } from "./tipos";
import { normalizar } from "./texto";

export interface OpcaoAmbigua { rotulo: string; ops: Op[] }
export interface Entrada {
  t: string; v: string[]; r: "jargao" | "popular";
  k: "intencao" | "tipo" | "bairro" | "regiao" | "attr" | "set" | "ambiguo";
  val?: any; chave?: string; caminho?: string; peso?: Peso;
  contexto?: string; pergunta?: string; opcoes?: OpcaoAmbigua[]; nota?: string;
}
export interface Forma { forma: string; entrada: Entrada }

export const ENTRADAS = (bruto as any).termos as Entrada[];

// formas mais longas primeiro: "varanda gourmet" ganha de "varanda"
export const FORMAS: Forma[] = ENTRADAS
  .flatMap((e) => [e.t, ...e.v].map((f) => ({ forma: normalizar(f), entrada: e })))
  .filter((f, i, l) => f.forma && l.findIndex((x) => x.forma === f.forma) === i)
  .sort((a, b) => b.forma.length - a.forma.length);

export const totalDeFormas = () => FORMAS.length;

export function entradaPorTermo(termo: string): Entrada | undefined {
  const n = normalizar(termo);
  return ENTRADAS.find((e) => normalizar(e.t) === n);
}

// sigla de quadra -> bairro (para sugerir "ficar no bairro" quando a quadra não tem nada)
export function bairroDaQuadra(quadra: string): string | null {
  const sigla = normalizar(quadra).split(" ")[0];
  const f = FORMAS.find((x) => x.forma === sigla && x.entrada.k === "bairro");
  return f ? f.entrada.val : null;
}
