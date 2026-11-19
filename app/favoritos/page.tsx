"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ImovelResumo } from "@/nucleo/tipos";
import { guardado } from "../lib/guardado";
import { Cartao, useFavoritos } from "../lib/Cartao";

export default function Favoritos() {
  const { fav, alternar, anotar } = useFavoritos();
  const [itens, setItens] = useState<ImovelResumo[] | null>(null);
  const [ausentes, setAusentes] = useState<string[]>([]);
  const ids = Object.keys(fav).join(",");

  useEffect(() => {
    const lista = Object.keys(guardado.favoritos());
    if (!lista.length) { setItens([]); return; }
    fetch("/api/buscar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: lista, perfil: guardado.perfil() ?? undefined }) })
      .then((r) => r.json()).then((d) => { setItens(d.itens ?? []); setAusentes(d.ausentes ?? []); });
  }, []);

  const apagarTudo = () => {
    if (!confirm("Apagar deste aparelho a conversa, os favoritos e o que o AÍ! aprendeu com você?")) return;
    guardado.apagarTudo(); location.href = "/";
  };
  const visiveis = itens?.filter((i) => ids.split(",").includes(i.id)) ?? [];

  return (
    <>
      <header className="topo">
        <Link className="acao" href="/">← Conversa</Link>
        <span className="espaco" />
        <span className="marca">Favoritos</span>
      </header>
      <main className="pagina">
        <h1>{itens == null ? "Abrindo…" : `${visiveis.length} ${visiveis.length === 1 ? "imóvel guardado" : "imóveis guardados"}`}</h1>
        <p className="sub">Ficam só neste aparelho. Toque no coração para tirar.</p>
        <div className="cartoes lista">
          {visiveis.map((i) => (
            <Cartao key={i.id} i={i} favorito aoFavoritar={alternar}>
              <textarea className="nota-fav" rows={1} placeholder="Sua anotação" aria-label={`Anotação sobre ${i.titulo}`} value={fav[i.id]?.nota ?? ""} onChange={(e) => anotar(i.id, e.target.value)} />
            </Cartao>
          ))}
        </div>
        {ausentes.length > 0 && <p className="sub" style={{ marginTop: 12 }}>{ausentes.length} favorito(s) saíram da base e não aparecem mais.</p>}
        {itens?.length === 0 && <p className="vazio">Nada guardado ainda. Na lista de resultados, toque no coração de um imóvel.</p>}
        <button className="botao claro" style={{ marginTop: 28 }} onClick={apagarTudo}>Apagar tudo deste aparelho</button>
      </main>
    </>
  );
}
