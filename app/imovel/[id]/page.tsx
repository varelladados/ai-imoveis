import Link from "next/link";
import { notFound } from "next/navigation";
import { fontePadrao } from "@/nucleo/fontes";
import { custoMensal } from "@/nucleo/aderencia";
import { brl, NOME_TIPO, ROTULOS, rotuloAtributo } from "@/nucleo/texto";
import { Guardar } from "./Guardar";

export default async function PaginaDoImovel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = await (await fontePadrao()).porId(id);
  if (!i) notFound();
  const nome = NOME_TIPO[i.tipo];
  const titulo = `${nome[0].toUpperCase()}${nome.slice(1)} · ${i.endereco}`;
  const aluguel = i.intencao === "alugar";
  const msg = `Olá! Vi no AÍ! Imóveis o anúncio ${i.id} (${titulo}, ${i.bairro}) e queria mais informações.`;
  const carac: [string, string][] = [];
  if (i.quartos) carac.push(["Quartos", String(i.quartos)]);
  if (i.suites) carac.push(["Suítes", String(i.suites)]);
  carac.push(["Área", `${i.area} m²`], ["Vagas", i.vagas ? String(i.vagas) : "sem vaga"]);
  for (const [k, v] of Object.entries(i.atributos)) {
    if (k === "andar") carac.push(["Andar", v === 0 ? "térreo" : `${v}º`]);
    else if (k === "metro_m") carac.push(["Metrô", `a ${v} m`]);
    else if (typeof v === "boolean") carac.push([ROTULOS[k]?.replace(/^./, (c) => c.toUpperCase()) ?? k, v ? "sim" : "não"]);
    else carac.push([ROTULOS[k]?.replace(/^./, (c) => c.toUpperCase()) ?? k, rotuloAtributo(k, v)]);
  }
  return (
    <>
      <header className="topo">
        <Link className="acao" href="/resultados">← Resultados</Link>
        <span className="espaco" />
        <Link className="acao" href="/">Conversa</Link>
      </header>
      <main className="pagina">
        <div className={`capa foto ${i.tipo}`}>{i.fonte === "seed" ? "Imóvel fictício · sem foto" : nome}</div>
        <h1>{titulo}</h1>
        <p className="sub">{i.bairro}{i.regiao !== i.bairro ? ` · ${i.regiao}` : ""} · anúncio {i.id}</p>
        <div className="valores">
          <div><span>{aluguel ? "Aluguel" : "Valor"}</span><span>{brl(i.preco)}{aluguel ? "/mês" : ""}</span></div>
          <div><span>Condomínio</span><span>{i.condominio ? `${brl(i.condominio)}/mês` : "não tem"}</span></div>
          <div><span>IPTU</span><span>{brl(i.iptu)}{aluguel ? "/mês" : "/ano"}</span></div>
          {aluguel && <div className="total"><span>Total por mês</span><span>{brl(custoMensal(i))}</span></div>}
        </div>
        <p>{i.descricao}</p>
        <div className="caracteristicas">
          {carac.map(([k, v]) => <div key={k}><small>{k}</small>{v}</div>)}
        </div>
        <p className="sub">Anunciante: {i.anunciante}. O que não aparece acima o anúncio não informa.</p>
        <Guardar id={i.id} />
        {i.url
          ? <a className="botao" href={i.url} target="_blank" rel="noopener noreferrer">Ver o anúncio original</a>
          : <a className="botao" href={`https://wa.me/${i.whatsapp}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>}
        {i.fonte === "seed" && <p className="aviso">Demonstração: o número é fictício e não pertence a ninguém.</p>}
      </main>
    </>
  );
}
