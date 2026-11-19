// Interpretador com IA, pela AI SDK. Fica desligado até AI_PROVIDER mudar.
//   anthropic: Claude API direta, chave em ANTHROPIC_API_KEY
//   gateway:   Vercel AI Gateway, chave em AI_GATEWAY_API_KEY (ou a identidade do projeto na Vercel)
// A saída é estruturada e validada duas vezes: pelo schema abaixo e, depois, pelo
// schema de operações do motor. Termo ambíguo e memória seguem o mesmo caminho das regras.
// NÃO TESTADO em 2026-11-19: sem chave e sem os pacotes instalados. Ver docs/decisoes.md.
import { z } from "zod";
import { opSchema, type Op } from "../tipos";
import { ENTRADAS } from "../dicionario";
import { normalizar } from "../texto";
import { promptDeExtracao } from "../../config/prompts/extrair";
import type { Contexto, Interpretacao, Interpretador } from "./regras";

const saida = z.object({
  ops: z.array(z.object({
    op: z.enum(["set", "add", "attr", "rmattr", "limpar"]),
    caminho: z.string().nullable(),
    chave: z.string().nullable(),
    valor: z.union([z.string(), z.number(), z.boolean()]).nullable(),
    peso: z.enum(["obrigatorio", "desejavel", "excluir"]).nullable(),
  })).max(20),
  ambiguos: z.array(z.string()).max(5),
  fluxo: z.enum(["confirmar_previa", "ver_resultados", "ver_assim_mesmo", "recomecar"]).nullable(),
  entendeu: z.boolean(),
});

const CAMINHOS_SET = new Set(["intencao", "orcamento.max", "orcamento.min", "orcamento.base", "orcamento.sem_teto", "porte.quartos_min", "porte.suites_min", "porte.vagas_min", "porte.area_min", "porte.area_max", "localizacao.qualquer"]);
const CAMINHOS_ADD = new Set(["tipo", "localizacao.bairros", "localizacao.regioes", "localizacao.quadras"]);
const ATRIBUTOS = new Map<string, Set<string>>();
for (const e of ENTRADAS) if (e.k === "attr") { if (!ATRIBUTOS.has(e.chave!)) ATRIBUTOS.set(e.chave!, new Set()); ATRIBUTOS.get(e.chave!)!.add(String(e.val)); }
const LUGARES = new Set(ENTRADAS.filter((e) => e.k === "bairro" || e.k === "regiao").map((e) => e.val as string));
const AMBIGUOS = ENTRADAS.filter((e) => e.k === "ambiguo");

// Só passa o que o vocabulário conhece: a IA não cria campo, bairro nem atributo.
function limpar(bruto: z.infer<typeof saida>["ops"]): Op[] {
  const ops: Op[] = [];
  for (const o of bruto) {
    if (o.op === "set" && o.caminho && CAMINHOS_SET.has(o.caminho) && o.valor != null) ops.push({ op: "set", caminho: o.caminho, valor: o.valor });
    else if (o.op === "add" && o.caminho && CAMINHOS_ADD.has(o.caminho) && typeof o.valor === "string") {
      if ((o.caminho === "localizacao.bairros" || o.caminho === "localizacao.regioes") && !LUGARES.has(o.valor)) continue;
      ops.push({ op: "add", caminho: o.caminho, valor: o.valor });
    } else if (o.op === "attr" && o.chave && ATRIBUTOS.has(o.chave) && o.valor != null) ops.push({ op: "attr", chave: o.chave, valor: o.valor, peso: o.peso ?? "obrigatorio" });
    else if (o.op === "rmattr" && o.chave && ATRIBUTOS.has(o.chave)) ops.push({ op: "rmattr", chave: o.chave });
    else if (o.op === "limpar" && o.caminho && (CAMINHOS_SET.has(o.caminho) || CAMINHOS_ADD.has(o.caminho) || o.caminho === "localizacao.referencias")) ops.push({ op: "limpar", caminho: o.caminho });
  }
  return opSchema.array().parse(ops);
}

// Os pacotes "ai" e "@ai-sdk/anthropic" ainda NÃO estão no package.json: em 2026-11-19 o registro
// do npm não respondeu. Para ligar a IA: npm install ai @ai-sdk/anthropic, e troque estas duas
// chamadas por import estático. Sem os pacotes, a chamada falha e o app usa as regras.
const opcional = (modulo: string): Promise<any> => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ modulo);

export function criarInterpretadorIA(provedor: "anthropic" | "gateway"): Interpretador {
  return {
    id: provedor,
    async interpretar(texto: string, ctx: Contexto): Promise<Interpretacao> {
      const { generateObject } = await opcional("ai");
      let model: any;
      if (provedor === "anthropic") {
        const { anthropic } = await opcional("@ai-sdk/anthropic");
        model = anthropic(process.env.AI_MODEL ?? "claude-haiku-5-5");
      } else {
        // no gateway o modelo é uma string "criador/modelo"; o nome exato sai do painel da Vercel
        if (!process.env.AI_MODEL) throw new Error("defina AI_MODEL com o nome do modelo no AI Gateway");
        model = process.env.AI_MODEL;
      }
      const { object } = await generateObject({
        model, schema: saida, temperature: 0,
        system: promptDeExtracao({
          chavesDeAtributo: [...ATRIBUTOS].map(([k, v]) => `${k}: ${[...v].join("|")}`).join("; "),
          bairros: [...LUGARES].join(", "),
          termosAmbiguos: AMBIGUOS.map((e) => `"${e.t}"`).join(", "),
          perfilAtual: JSON.stringify(ctx.perfil),
          aguardando: ctx.aguardando.join(", ") || "nenhum",
        }),
        prompt: texto,
      });
      const lido = saida.parse(object);
      const ops = limpar(lido.ops);
      const opsMemoria: Op[] = [], usouMemoria: string[] = [], ambiguos = [];
      for (const t of lido.ambiguos) {
        const e = AMBIGUOS.find((x) => normalizar(x.t) === normalizar(t));
        if (!e) continue;
        const mem = ctx.memorias.find((m) => normalizar(m.termo) === normalizar(e.t));
        if (mem) { opsMemoria.push(...mem.ops); usouMemoria.push(`${e.t} = ${mem.rotulo}`); }
        else { ops.push({ op: "pendente", termo: e.t }); ambiguos.push(e); }
      }
      return { ops, opsMemoria, usouMemoria, ambiguos, fluxo: lido.fluxo ?? undefined, entendeu: ops.length + opsMemoria.length > 0 || !!lido.fluxo };
    },
  };
}
