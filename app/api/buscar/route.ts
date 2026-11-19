import { NextResponse } from "next/server";
import { z } from "zod";
import { fontePadrao } from "@/nucleo/fontes";
import { filtrosDinamicos, ordenar, resumir } from "@/nucleo/aderencia";
import { perfilSchema, perfilVazio } from "@/nucleo/tipos";

// perfil -> resultados ordenados + filtros dinâmicos; ids -> resumos (favoritos)
const corpo = z.object({ perfil: perfilSchema.optional(), ids: z.array(z.string()).max(200).optional() });

export async function POST(req: Request) {
  const lido = corpo.safeParse(await req.json().catch(() => null));
  if (!lido.success) return NextResponse.json({ erro: "pedido inválido" }, { status: 400 });
  const fonte = await fontePadrao();
  const perfil = lido.data.perfil ?? perfilVazio();
  if (lido.data.ids) {
    const achados = (await Promise.all(lido.data.ids.map((id) => fonte.porId(id)))).filter((x) => x != null);
    return NextResponse.json({ itens: ordenar(achados, perfil).map((a) => resumir(a, perfil)), ausentes: lido.data.ids.filter((id) => !achados.some((x) => x.id === id)) });
  }
  const achados = await fonte.buscar(perfil);
  return NextResponse.json({
    contagem: achados.length,
    itens: ordenar(achados, perfil).map((a) => resumir(a, perfil)),
    filtros: filtrosDinamicos(achados),
  });
}
