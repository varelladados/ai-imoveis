"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { estadoInicial, perfilVazio, type Escolha, type EstadoConversa, type Memoria, type PerfilDeBusca, type RespostaConversa } from "@/nucleo/tipos";
import { guardado, type Fala } from "./lib/guardado";
import { Cartao, useFavoritos } from "./lib/Cartao";

export default function Chat() {
  const router = useRouter();
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [contagem, setContagem] = useState<number | null>(null);
  const ref = useRef<{ perfil: PerfilDeBusca; estado: EstadoConversa; memorias: Memoria[]; falas: Fala[] }>({ perfil: perfilVazio(), estado: estadoInicial(), memorias: [], falas: [] });
  const fimRef = useRef<HTMLDivElement>(null);
  const { fav, alternar } = useFavoritos();

  const enviar = useCallback(async (e: { mensagem?: string; escolha?: Escolha; rotulo?: string }) => {
    const s = ref.current;
    const dita = e.mensagem ?? e.rotulo;
    if (dita) { s.falas = [...s.falas, { de: "eu", texto: dita }]; setFalas(s.falas); }
    setOcupado(true);
    try {
      const resp = await fetch("/api/conversa", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mensagem: e.mensagem, escolha: e.escolha, perfil: s.perfil, estado: s.estado, memorias: s.memorias }),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      const r = (await resp.json()) as RespostaConversa;
      s.perfil = r.perfil; s.estado = r.estado;
      if (r.memoriasNovas.length) {
        const termos = new Set(r.memoriasNovas.map((m) => m.termo));
        s.memorias = [...s.memorias.filter((m) => !termos.has(m.termo)), ...r.memoriasNovas];
        guardado.salvarMemorias(s.memorias);
      }
      if (e.escolha?.fluxo === "recomecar" || (r.estado.no === "INTENCAO" && r.perfil.tipo.length === 0 && !r.perfil.intencao && e.mensagem)) {
        if (/começando do zero/i.test(r.blocos[0]?.texto ?? "")) s.falas = [];
      }
      s.falas = [...s.falas, ...r.blocos.map((bloco) => ({ de: "app" as const, bloco }))];
      setFalas(s.falas); setContagem(r.contagem);
      guardado.salvarConversa(s.perfil, s.estado, s.falas);
      if (r.abrirResultados) router.push("/resultados");
    } catch {
      s.falas = [...s.falas, { de: "app", bloco: { texto: "Não consegui falar com o servidor. Tente de novo em instantes." } }];
      setFalas(s.falas);
    } finally { setOcupado(false); }
  }, [router]);

  const iniciou = useRef(false);
  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;
    const s = ref.current;
    s.memorias = guardado.memorias();
    const perfil = guardado.perfil(), estado = guardado.estado(), antigas = guardado.falas();
    if (perfil && estado && antigas.length) {
      s.perfil = perfil; s.estado = estado; s.falas = antigas; setFalas(antigas); setContagem(estado.ultimaContagem);
      if (guardado.mudouNosFiltros()) { guardado.limparSync(); enviar({ escolha: { fluxo: "sincronizar" } }); }
    } else enviar({});
  }, [enviar]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [falas, ocupado]);

  const mandarTexto = () => { const t = texto.trim(); if (!t || ocupado) return; setTexto(""); enviar({ mensagem: t }); };
  const recomecar = () => { guardado.apagarConversa(); ref.current = { ...ref.current, perfil: perfilVazio(), estado: estadoInicial(), falas: [] }; setFalas([]); setContagem(null); enviar({}); };
  const ultimaDoApp = falas.map((f) => f.de).lastIndexOf("eu");

  return (
    <>
      <header className="topo">
        <span className="marca"><b>AÍ!</b> Imóveis</span>
        <span className="espaco" />
        {contagem != null && contagem > 0 && <Link className="acao forte" href="/resultados">Ver {contagem}</Link>}
        <Link className="acao" href="/favoritos" aria-label="Favoritos">♥ {Object.keys(fav).length || ""}</Link>
        <button className="acao" onClick={recomecar}>Nova busca</button>
      </header>
      <main className="conversa" aria-live="polite">
        {falas.map((f, k) => f.de === "eu" ? (
          <div key={k} className="fala eu">{f.texto}</div>
        ) : (
          <div key={k} className="fala app">
            {f.bloco!.texto}
            {f.bloco!.resumo && <dl className="resumo">{f.bloco!.resumo.map((l) => (<div key={l.rotulo} style={{ display: "contents" }}><dt>{l.rotulo}</dt><dd>{l.valor}</dd></div>))}</dl>}
            {f.bloco!.imoveis && <div className="cartoes">{f.bloco!.imoveis.map((i) => <Cartao key={i.id} i={i} favorito={!!fav[i.id]} aoFavoritar={alternar} />)}</div>}
            {f.bloco!.nota && <div className="nota">{f.bloco!.nota}</div>}
            {f.bloco!.chips && (
              <div className="chips">
                {f.bloco!.chips.map((c) => (
                  <button key={c.rotulo} className="chip" disabled={ocupado || k < ultimaDoApp} onClick={() => enviar({ escolha: c.escolha, rotulo: c.rotulo })}>{c.rotulo}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        {ocupado && <div className="digitando">AÍ! está pensando…</div>}
        <div ref={fimRef} />
      </main>
      <p className="aviso">Demonstração: os imóveis são fictícios.</p>
      <form className="entrada" onSubmit={(e) => { e.preventDefault(); mandarTexto(); }}>
        <textarea
          rows={1} value={texto} placeholder="Ex.: apê 2 quartos até 4 mil" aria-label="Sua mensagem"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); mandarTexto(); } }}
        />
        <button type="submit" disabled={ocupado || !texto.trim()} aria-label="Enviar">↑</button>
      </form>
    </>
  );
}
