// Tipos centrais: o imóvel, a ficha de busca (perfil) e o que a conversa troca.
import { z } from "zod";

export type Intencao = "alugar" | "comprar";
export type TipoImovel = "apartamento" | "casa" | "kitnet" | "cobertura" | "lote" | "sala_comercial";
export type ValorAtributo = string | number | boolean;

export interface Imovel {
  id: string;
  fonte: string;
  intencao: Intencao;
  tipo: TipoImovel;
  regiao: string;
  bairro: string;
  quadra: string | null;
  endereco: string;
  preco: number; // aluguel mensal ou valor de venda
  condominio: number;
  iptu: number; // mensal no aluguel, anual na venda
  quartos: number;
  suites: number;
  vagas: number;
  area: number;
  atributos: Record<string, ValorAtributo>; // esparso de propósito
  descricao: string;
  anunciante: string;
  whatsapp: string;
  url?: string;
  fotos?: string[];
}

export const PESOS = ["obrigatorio", "desejavel", "excluir"] as const;
export type Peso = (typeof PESOS)[number];

const atributoSchema = z.object({
  chave: z.string().min(1),
  valor: z.union([z.string(), z.number(), z.boolean()]),
  peso: z.enum(PESOS),
});

export const perfilSchema = z.object({
  versao: z.literal(1),
  intencao: z.enum(["alugar", "comprar"]).nullable(),
  tipo: z.array(z.enum(["apartamento", "casa", "kitnet", "cobertura", "lote", "sala_comercial"])),
  localizacao: z.object({
    qualquer: z.boolean(),
    regioes: z.array(z.string()),
    bairros: z.array(z.string()),
    quadras: z.array(z.string()),
    referencias: z.array(z.object({ texto: z.string(), raio_m: z.number().positive() })),
  }),
  orcamento: z.object({
    min: z.number().nonnegative().nullable(),
    max: z.number().positive().nullable(),
    sem_teto: z.boolean(),
    base: z.enum(["aluguel", "pacote", "venda"]).nullable(),
    financiamento: z.boolean().nullable(),
    fgts: z.boolean().nullable(),
  }),
  porte: z.object({
    quartos_min: z.number().int().nonnegative().nullable(),
    suites_min: z.number().int().nonnegative().nullable(),
    vagas_min: z.number().int().nonnegative().nullable(),
    area_min: z.number().positive().nullable(),
    area_max: z.number().positive().nullable(),
  }),
  atributos: z.array(atributoSchema),
  contexto: z.object({
    prazo_mudanca: z.string().nullable(),
    para_quem: z.string().nullable(),
    observacoes: z.array(z.string()),
  }),
  origem_dos_campos: z.record(z.string(), z.enum(["usuario", "padrao_do_template", "memoria"])),
  pendentes: z.array(z.object({ termo: z.string(), motivo: z.string() })),
});

export type PerfilDeBusca = z.infer<typeof perfilSchema>;
export type AtributoPerfil = z.infer<typeof atributoSchema>;

export function perfilVazio(): PerfilDeBusca {
  return {
    versao: 1,
    intencao: null,
    tipo: [],
    localizacao: { qualquer: false, regioes: [], bairros: [], quadras: [], referencias: [] },
    orcamento: { min: null, max: null, sem_teto: false, base: null, financiamento: null, fgts: null },
    porte: { quartos_min: null, suites_min: null, vagas_min: null, area_min: null, area_max: null },
    atributos: [],
    contexto: { prazo_mudanca: null, para_quem: null, observacoes: [] },
    origem_dos_campos: {},
    pendentes: [],
  };
}

// Operações sobre a ficha. É a única forma de mudar o perfil: o interpretador
// (regras ou IA) devolve uma lista destas, e os chips também.
export const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set"), caminho: z.string(), valor: z.any() }),
  z.object({ op: z.literal("add"), caminho: z.string(), valor: z.any() }),
  z.object({ op: z.literal("attr"), chave: z.string(), valor: z.union([z.string(), z.number(), z.boolean()]), peso: z.enum(PESOS) }),
  z.object({ op: z.literal("rmattr"), chave: z.string() }),
  z.object({ op: z.literal("pendente"), termo: z.string() }),
  z.object({ op: z.literal("resolver"), termo: z.string() }),
  z.object({ op: z.literal("limpar"), caminho: z.string() }),
]);
export type Op = z.infer<typeof opSchema>;

export interface Memoria {
  termo: string;
  contexto: string;
  rotulo: string;
  ops: Op[];
  ocorrencias: number;
  confianca: number;
  escopo: "usuario" | "global";
  origem: "seed" | "manual" | "aprendida";
}

export type No =
  | "INICIO" | "INTENCAO" | "TIPO" | "LOCALIZACAO" | "ORCAMENTO" | "PORTE"
  | "AMBIGUIDADE" | "PREVIA" | "REFINAR" | "INCOMPATIVEL" | "RESUMO" | "BUSCA_FINAL";

export interface EstadoConversa {
  no: No;
  previaConfirmada: boolean;
  resumoPronto: boolean;
  refinoPerguntados: string[];
  verAssimMesmo: boolean;
  ultimaContagem: number | null;
}

export function estadoInicial(): EstadoConversa {
  return { no: "INICIO", previaConfirmada: false, resumoPronto: false, refinoPerguntados: [], verAssimMesmo: false, ultimaContagem: null };
}

export interface Escolha {
  ops?: Op[];
  fluxo?: "confirmar_previa" | "ajustar" | "ver_resultados" | "ver_assim_mesmo" | "sincronizar" | "recomecar";
  memoria?: { termo: string; rotulo: string; contexto: string };
  refino?: string; // chave do atributo perguntado no REFINAR
}

export interface Chip { rotulo: string; escolha: Escolha }

export interface ImovelResumo {
  id: string; titulo: string; linha: string; preco: string; etiquetas: string[]; aderencia: number; tipo: TipoImovel;
}

export interface Bloco {
  texto: string;
  chips?: Chip[];
  imoveis?: ImovelResumo[];
  resumo?: { rotulo: string; valor: string }[];
  nota?: string;
}

export interface RespostaConversa {
  perfil: PerfilDeBusca;
  estado: EstadoConversa;
  blocos: Bloco[];
  contagem: number | null;
  memoriasNovas: Memoria[];
  interpretador: string;
  abrirResultados?: boolean;
}
