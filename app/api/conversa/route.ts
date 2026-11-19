import { NextResponse } from "next/server";
import { z } from "zod";
import { conversar } from "@/nucleo/fluxo/motor";
import { fontePadrao } from "@/nucleo/fontes";
import { interpretadorPadrao } from "@/nucleo/interpretador";
import { estadoInicial, opSchema, perfilSchema, perfilVazio } from "@/nucleo/tipos";

const corpo = z.object({
  mensagem: z.string().max(600).optional(),
  escolha: z.object({
    ops: opSchema.array().max(12).optional(),
    fluxo: z.enum(["confirmar_previa", "ajustar", "ver_resultados", "ver_assim_mesmo", "sincronizar", "recomecar"]).optional(),
    memoria: z.object({ termo: z.string(), rotulo: z.string(), contexto: z.string() }).optional(),
    refino: z.string().optional(),
  }).optional(),
  perfil: perfilSchema.optional(),
  estado: z.object({
    no: z.string(), previaConfirmada: z.boolean(), resumoPronto: z.boolean(),
    refinoPerguntados: z.array(z.string()), verAssimMesmo: z.boolean(), ultimaContagem: z.number().nullable(),
  }).optional(),
  memorias: z.array(z.object({
    termo: z.string(), contexto: z.string(), rotulo: z.string(), ops: opSchema.array().max(6),
    ocorrencias: z.number(), confianca: z.number(), escopo: z.enum(["usuario", "global"]), origem: z.enum(["seed", "manual", "aprendida"]),
  })).max(100).optional(),
});

export async function POST(req: Request) {
  const lido = corpo.safeParse(await req.json().catch(() => null));
  if (!lido.success) return NextResponse.json({ erro: "pedido inválido" }, { status: 400 });
  const d = lido.data;
  const resposta = await conversar(
    { mensagem: d.mensagem, escolha: d.escolha, perfil: d.perfil ?? perfilVazio(), estado: (d.estado as any) ?? estadoInicial(), memorias: d.memorias ?? [] },
    { fonte: await fontePadrao(), interpretador: await interpretadorPadrao() },
  );
  return NextResponse.json(resposta);
}
