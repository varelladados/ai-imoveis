// Escolhe o interpretador pela variável AI_PROVIDER:
//   regras     (padrão)  dicionário + padrões, sem IA e sem chave
//   anthropic            Claude API direta       (ANTHROPIC_API_KEY)
//   gateway              Vercel AI Gateway       (AI_GATEWAY_API_KEY)
// Com IA ligada, qualquer falha (rede, chave, saída inválida) cai nas regras.
import { interpretadorRegras, type Interpretador } from "./regras";

export function provedorConfigurado(): "regras" | "anthropic" | "gateway" {
  const p = (process.env.AI_PROVIDER ?? "regras").toLowerCase();
  return p === "anthropic" || p === "gateway" ? p : "regras";
}

export async function interpretadorPadrao(): Promise<Interpretador> {
  const provedor = provedorConfigurado();
  if (provedor === "regras") return interpretadorRegras;
  const { criarInterpretadorIA } = await import("./ia");
  const ia = criarInterpretadorIA(provedor);
  return {
    id: ia.id,
    async interpretar(texto, ctx) {
      try { return await ia.interpretar(texto, ctx); }
      catch (erro) {
        console.error("[interpretador] IA falhou, usando regras:", (erro as Error).message);
        return interpretadorRegras.interpretar(texto, ctx);
      }
    },
  };
}
