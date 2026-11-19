// Aplica operações na ficha de busca. É o único lugar que muda o perfil.
import { perfilSchema, type Op, type PerfilDeBusca } from "../tipos";

type Origem = "usuario" | "padrao_do_template" | "memoria";

function pai(obj: any, caminho: string): [any, string] {
  const partes = caminho.split(".");
  let o = obj;
  for (const k of partes.slice(0, -1)) { if (o[k] == null) throw new Error(`caminho inválido: ${caminho}`); o = o[k]; }
  return [o, partes[partes.length - 1]];
}

export function aplicarOps(perfil: PerfilDeBusca, ops: Op[], origem: Origem = "usuario"): PerfilDeBusca {
  const p: PerfilDeBusca = structuredClone(perfil);
  for (const op of ops) {
    try {
      if (op.op === "set") {
        const [o, k] = pai(p, op.caminho);
        if (!(k in o)) continue;
        o[k] = op.valor; p.origem_dos_campos[op.caminho] = origem;
        if (op.caminho === "orcamento.max") p.orcamento.sem_teto = false;
        if (op.caminho === "intencao" && op.valor === "comprar") p.orcamento.base = "venda";
        if (op.caminho === "intencao" && op.valor === "alugar" && p.orcamento.base === "venda") p.orcamento.base = null;
      } else if (op.op === "add") {
        const [o, k] = pai(p, op.caminho);
        if (!Array.isArray(o[k])) continue;
        if (op.caminho === "localizacao.referencias") o[k] = o[k].filter((r: any) => r.texto !== op.valor.texto);
        if (!o[k].some((x: any) => JSON.stringify(x) === JSON.stringify(op.valor))) o[k].push(op.valor);
        if (op.caminho.startsWith("localizacao.")) p.localizacao.qualquer = false;
        p.origem_dos_campos[op.caminho] = origem;
      } else if (op.op === "limpar") {
        const [o, k] = pai(p, op.caminho);
        if (!(k in o)) continue;
        o[k] = Array.isArray(o[k]) ? [] : null;
        delete p.origem_dos_campos[op.caminho];
      } else if (op.op === "attr") {
        p.atributos = p.atributos.filter((a) => a.chave !== op.chave);
        p.atributos.push({ chave: op.chave, valor: op.valor, peso: op.peso });
        p.origem_dos_campos[`atributos.${op.chave}`] = origem;
      } else if (op.op === "rmattr") {
        p.atributos = p.atributos.filter((a) => a.chave !== op.chave);
      } else if (op.op === "pendente") {
        if (!p.pendentes.some((x) => x.termo === op.termo)) p.pendentes.push({ termo: op.termo, motivo: "ambiguo" });
      } else if (op.op === "resolver") {
        p.pendentes = p.pendentes.filter((x) => x.termo !== op.termo);
      }
    } catch { /* op inválida é ignorada: a ficha nunca fica quebrada */ }
  }
  const ok = perfilSchema.safeParse(p);
  return ok.success ? ok.data : perfil; // se o resultado não valida, fica como estava
}
