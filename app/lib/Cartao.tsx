"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ImovelResumo } from "@/nucleo/tipos";
import { guardado } from "./guardado";

const NOME: Record<string, string> = { apartamento: "Apto", casa: "Casa", kitnet: "Kitnet", cobertura: "Cobert.", lote: "Lote", sala_comercial: "Sala" };

export function useFavoritos() {
  const [fav, setFav] = useState<Record<string, { nota: string; em: string }>>({});
  useEffect(() => setFav(guardado.favoritos()), []);
  const alternar = (id: string) => setFav((f) => {
    const n = { ...f };
    if (n[id]) delete n[id]; else n[id] = { nota: "", em: new Date().toISOString() };
    guardado.salvarFavoritos(n); return n;
  });
  const anotar = (id: string, nota: string) => setFav((f) => {
    if (!f[id]) return f;
    const n = { ...f, [id]: { ...f[id], nota } }; guardado.salvarFavoritos(n); return n;
  });
  return { fav, alternar, anotar };
}

export function Cartao({ i, favorito, aoFavoritar, children }: { i: ImovelResumo; favorito?: boolean; aoFavoritar?: (id: string) => void; children?: React.ReactNode }) {
  return (
    <div className="cartao">
      <Link href={`/imovel/${i.id}`} className={`foto ${i.tipo}`} aria-hidden tabIndex={-1}>{NOME[i.tipo]}</Link>
      <div className="corpo">
        <h3><Link href={`/imovel/${i.id}`}>{i.titulo}</Link></h3>
        <p className="linha">{i.linha}</p>
        <div className="preco">{i.preco}</div>
        <div className="etiquetas">
          {i.etiquetas.map((e) => <span key={e} className={`etiqueta ${e.startsWith("sem ") || e.startsWith("não informa") ? "falta" : ""}`}>{e}</span>)}
        </div>
        {children}
      </div>
      {aoFavoritar && (
        <button className={`coracao ${favorito ? "sim" : ""}`} onClick={() => aoFavoritar(i.id)} aria-pressed={!!favorito} aria-label={favorito ? "Tirar dos favoritos" : "Guardar nos favoritos"}>
          {favorito ? "♥" : "♡"}
        </button>
      )}
    </div>
  );
}
