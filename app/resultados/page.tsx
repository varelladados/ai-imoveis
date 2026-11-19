"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { perfilVazio, type ImovelResumo, type Op, type PerfilDeBusca } from "@/nucleo/tipos";
import type { FiltroDinamico } from "@/nucleo/aderencia";
import { aplicarOps } from "@/nucleo/perfil/ops";
import { brl, rotuloAtributo } from "@/nucleo/texto";
import { guardado } from "../lib/guardado";
import { Cartao, useFavoritos } from "../lib/Cartao";

interface Ativo { rotulo: string; ops: Op[] }

// Os chips do topo saem da ficha de busca; tirar um chip muda a ficha.
function ativosDe(p: PerfilDeBusca): Ativo[] {
  const a: Ativo[] = [];
  const limpaLocal = (campo: "regioes" | "bairros" | "quadras", v: string): Op[] => {
    const resto = p.localizacao[campo].filter((x) => x !== v);
    return [{ op: "limpar", caminho: `localizacao.${campo}` }, ...resto.map((x) => ({ op: "add" as const, caminho: `localizacao.${campo}`, valor: x }))];
  };
  for (const v of p.localizacao.regioes) a.push({ rotulo: v, ops: limpaLocal("regioes", v) });
  for (const v of p.localizacao.bairros) a.push({ rotulo: v, ops: limpaLocal("bairros", v) });
  for (const v of p.localizacao.quadras) a.push({ rotulo: v, ops: limpaLocal("quadras", v) });
  for (const r of p.localizacao.referencias) a.push({ rotulo: `${r.texto} até ${r.raio_m} m`, ops: [{ op: "limpar", caminho: "localizacao.referencias" }] });
  if (p.orcamento.max != null) a.push({ rotulo: `até ${brl(p.orcamento.max)}${p.orcamento.base === "pacote" ? " no total" : ""}`, ops: [{ op: "limpar", caminho: "orcamento.max" }, { op: "set", caminho: "orcamento.sem_teto", valor: true }] });
  if (p.orcamento.min != null) a.push({ rotulo: `a partir de ${brl(p.orcamento.min)}`, ops: [{ op: "limpar", caminho: "orcamento.min" }] });
  if (p.porte.quartos_min) a.push({ rotulo: `${p.porte.quartos_min}+ quartos`, ops: [{ op: "set", caminho: "porte.quartos_min", valor: 0 }] });
  if (p.porte.suites_min) a.push({ rotulo: `${p.porte.suites_min}+ suítes`, ops: [{ op: "limpar", caminho: "porte.suites_min" }] });
  if (p.porte.vagas_min) a.push({ rotulo: `${p.porte.vagas_min}+ vagas`, ops: [{ op: "limpar", caminho: "porte.vagas_min" }] });
  if (p.porte.area_min) a.push({ rotulo: `${p.porte.area_min}+ m²`, ops: [{ op: "limpar", caminho: "porte.area_min" }] });
  if (p.porte.area_max) a.push({ rotulo: `até ${p.porte.area_max} m²`, ops: [{ op: "limpar", caminho: "porte.area_max" }] });
  for (const x of p.atributos) {
    const r = rotuloAtributo(x.chave, x.valor);
    a.push({ rotulo: x.peso === "excluir" ? `sem ${r}` : x.peso === "desejavel" ? `${r} (seria bom)` : r, ops: [{ op: "rmattr", chave: x.chave }] });
  }
  return a;
}

// Tocar numa opção de filtro vira uma operação na mesma ficha que o chat usa.
function opsDoFiltro(chave: string, valor: any): Op[] | null {
  if (chave === "bairro") return [{ op: "add", caminho: "localizacao.bairros", valor }];
  if (chave === "quartos") return [{ op: "set", caminho: "porte.quartos_min", valor }];
  if (chave === "vagas") return valor === 0 ? null : [{ op: "set", caminho: "porte.vagas_min", valor }];
  if (chave === "faixa_metro") { const raio = valor === "até 400 m" ? 400 : valor === "até 800 m" ? 800 : valor === "até 1,2 km" ? 1200 : 0; return raio ? [{ op: "add", caminho: "localizacao.referencias", valor: { texto: "metrô", raio_m: raio } }] : null; }
  if (chave === "faixa_andar") return valor === "térreo" ? [{ op: "attr", chave: "terreo", valor: true, peso: "obrigatorio" }] : valor === "4º a 9º" ? [{ op: "attr", chave: "andar_min", valor: 4, peso: "obrigatorio" }] : valor === "10º ou acima" ? [{ op: "attr", chave: "andar_min", valor: 10, peso: "obrigatorio" }] : null;
  return [{ op: "attr", chave, valor, peso: "obrigatorio" }];
}

export default function Resultados() {
  const [perfil, setPerfil] = useState<PerfilDeBusca | null>(null);
  const [itens, setItens] = useState<ImovelResumo[] | null>(null);
  const [filtros, setFiltros] = useState<FiltroDinamico[]>([]);
  const { fav, alternar } = useFavoritos();

  const buscar = useCallback(async (p: PerfilDeBusca) => {
    const r = await fetch("/api/buscar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ perfil: p }) });
    const d = await r.json();
    setItens(d.itens ?? []); setFiltros(d.filtros ?? []);
  }, []);

  useEffect(() => { const p = guardado.perfil() ?? perfilVazio(); setPerfil(p); buscar(p); }, [buscar]);

  const mudar = (ops: Op[]) => {
    if (!perfil) return;
    const novo = aplicarOps(perfil, ops);
    setPerfil(novo); guardado.salvarPerfil(novo, true); buscar(novo);
  };

  if (!perfil) return null;
  const ativos = ativosDe(perfil);
  const usados = new Set(perfil.atributos.map((a) => a.chave));

  return (
    <>
      <header className="topo">
        <Link className="acao" href="/">← Conversa</Link>
        <span className="espaco" />
        <Link className="acao" href="/favoritos">♥ {Object.keys(fav).length || ""}</Link>
      </header>
      <main className="pagina">
        <h1>{itens == null ? "Buscando…" : `${itens.length} ${itens.length === 1 ? "imóvel" : "imóveis"}`}</h1>
        <p className="sub">{perfil.tipo.length ? perfil.tipo.join(" ou ").replace("_", " ") : "imóveis"}{perfil.intencao ? ` para ${perfil.intencao}` : ""}, por ordem de aderência à sua busca.</p>
        <div className="ativos" aria-label="Sua busca">
          {ativos.map((a) => (
            <button key={a.rotulo} className="ativo" onClick={() => mudar(a.ops)} aria-label={`Tirar ${a.rotulo}`}>{a.rotulo}<span aria-hidden>×</span></button>
          ))}
        </div>
        {filtros.length > 0 && (
          <details className="filtros">
            <summary>Filtrar pelo que existe nestes resultados <span aria-hidden>▾</span></summary>
            {filtros.filter((f) => !usados.has(f.chave) && f.opcoes.length > 1).map((f) => (
              <div className="grupo" key={f.chave}>
                <h4>{f.rotulo}</h4>
                <div className="opcoes">
                  {f.opcoes.map((o) => {
                    const ops = opsDoFiltro(f.chave, o.valor);
                    return <button key={String(o.valor)} className="opcao" disabled={!ops} onClick={() => ops && mudar(ops)}>{o.rotulo}<small>{o.n}</small></button>;
                  })}
                </div>
              </div>
            ))}
          </details>
        )}
        <div className="cartoes lista">
          {itens?.map((i) => <Cartao key={i.id} i={i} favorito={!!fav[i.id]} aoFavoritar={alternar} />)}
        </div>
        {itens?.length === 0 && <p className="vazio">Nenhum imóvel com tudo isso junto. Tire um dos itens acima ou <Link href="/" style={{ textDecoration: "underline" }}>volte à conversa</Link>.</p>}
      </main>
    </>
  );
}
