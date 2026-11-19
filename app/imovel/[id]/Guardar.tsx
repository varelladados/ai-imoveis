"use client";
import { useFavoritos } from "../../lib/Cartao";

export function Guardar({ id }: { id: string }) {
  const { fav, alternar, anotar } = useFavoritos();
  const f = fav[id];
  return (
    <div>
      <button className="botao claro" onClick={() => alternar(id)} aria-pressed={!!f}>{f ? "♥ Guardado nos favoritos" : "♡ Guardar nos favoritos"}</button>
      {f && <textarea className="nota-fav" rows={2} placeholder="Sua anotação sobre este imóvel" aria-label="Anotação" value={f.nota} onChange={(e) => anotar(id, e.target.value)} />}
    </div>
  );
}
