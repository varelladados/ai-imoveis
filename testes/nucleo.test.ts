import { describe, expect, it } from "vitest";
import { perfilVazio, perfilSchema, type Imovel, type PerfilDeBusca } from "../nucleo/tipos";
import { interpretarPorRegras } from "../nucleo/interpretador/regras";
import { aplicarOps } from "../nucleo/perfil/ops";
import { filtrar, filtrosDinamicos, melhorPergunta, ordenar } from "../nucleo/aderencia";
import { totalDeFormas, ENTRADAS } from "../nucleo/dicionario";
import seed from "../dados/seed/imoveis.json";

const base = seed as unknown as Imovel[];
const ler = (texto: string, perfil: PerfilDeBusca = perfilVazio(), aguardando: string[] = []) => {
  const r = interpretarPorRegras(texto, { perfil, memorias: [], aguardando });
  return { r, p: aplicarOps(perfil, r.ops) };
};

describe("seed", () => {
  it("tem 300 imóveis fictícios com id único", () => {
    expect(base).toHaveLength(300);
    expect(new Set(base.map((x) => x.id)).size).toBe(300);
    expect(base.every((x) => x.descricao.includes("fictício"))).toBe(true);
  });
  it("tem atributos esparsos (nem todo imóvel informa tudo)", () => {
    const comSol = base.filter((x) => x.atributos.posicao_solar !== undefined).length;
    expect(comSol).toBeGreaterThan(30);
    expect(comSol).toBeLessThan(250);
  });
});

describe("dicionário", () => {
  it("tem pelo menos 150 termos, com jargão e termo popular", () => {
    expect(totalDeFormas()).toBeGreaterThanOrEqual(150);
    expect(ENTRADAS.some((e) => e.r === "jargao")).toBe(true);
    expect(ENTRADAS.some((e) => e.r === "popular")).toBe(true);
  });
});

describe("interpretador por regras", () => {
  it("entende pedido vago com gíria", () => {
    const { p } = ler("quero um apê pra alugar na asa norte");
    expect(p.intencao).toBe("alugar");
    expect(p.tipo).toEqual(["apartamento"]);
    expect(p.localizacao.bairros).toEqual(["Asa Norte"]);
  });
  it("entende jargão do DF: JK, DCE, SQN, nascente", () => {
    const { p } = ler("JK na SQN 312 com sol da manhã, ou um 3 quartos com DCE");
    expect(p.tipo).toContain("kitnet");
    expect(p.localizacao.quadras).toEqual(["SQN 312"]);
    expect(p.localizacao.bairros).toEqual([]); // a quadra é mais específica que o bairro
    expect(p.atributos.find((a) => a.chave === "posicao_solar")?.valor).toBe("nascente");
    expect(p.atributos.find((a) => a.chave === "dce")?.valor).toBe(true);
  });
  it("lê dinheiro em vários formatos", () => {
    expect(ler("até 4 mil").p.orcamento.max).toBe(4000);
    expect(ler("no máximo R$ 4.500").p.orcamento.max).toBe(4500);
    expect(ler("3,5k").p.orcamento.max).toBe(3500);
    const faixa = ler("entre 3 e 4 mil").p.orcamento;
    expect([faixa.min, faixa.max]).toEqual([3000, 4000]);
    const compra = ler("comprar casa até 1,2 milhão").p;
    expect(compra.orcamento.max).toBe(1200000);
    expect(compra.orcamento.base).toBe("venda");
    expect(ler("apartamento para comprar até 800").p.orcamento.max).toBe(800000);
  });
  it("não confunde quartos, área e distância com dinheiro", () => {
    const { p } = ler("2 quartos, 70 m2, 1 vaga, até 4000");
    expect(p.porte.quartos_min).toBe(2);
    expect(p.porte.area_min).toBe(70);
    expect(p.porte.vagas_min).toBe(1);
    expect(p.orcamento.max).toBe(4000);
  });
  it("separa obrigatório, desejável e excluir", () => {
    const { p } = ler("tem que ter elevador, varanda seria bom, sem piscina");
    const peso = (c: string) => p.atributos.find((a) => a.chave === c)?.peso;
    expect(peso("elevador")).toBe("obrigatorio");
    expect(peso("varanda")).toBe("desejavel");
    expect(peso("piscina")).toBe("excluir");
  });
  it("ter animal é eliminatório", () => {
    const a = ler("tenho um cachorro").p.atributos[0];
    expect(a).toEqual({ chave: "aceita_pet", valor: true, peso: "obrigatorio" });
  });
  it("valor com condomínio vira pacote", () => {
    expect(ler("até 4 mil com condomínio").p.orcamento.base).toBe("pacote");
  });
  it("marca termo ambíguo como pendente em vez de chutar", () => {
    const { p, r } = ler("perto do metrô");
    expect(p.pendentes.map((x) => x.termo)).toEqual(["perto do metrô"]);
    expect(p.localizacao.referencias).toEqual([]);
    expect(r.ambiguos).toHaveLength(1);
  });
  it("número solto responde à pergunta em aberto", () => {
    expect(ler("4500", perfilVazio(), ["orcamento.max"]).p.orcamento.max).toBe(4500);
    expect(ler("2", perfilVazio(), ["porte.quartos_min"]).p.porte.quartos_min).toBe(2);
  });
  it("frase fora do dicionário não é entendida, e a ficha não muda", () => {
    const { r, p } = ler("me fala do tempo em brasília amanhã");
    expect(r.entendeu).toBe(false);
    expect(p).toEqual(perfilVazio());
  });
});

describe("ficha de busca", () => {
  it("toda ficha produzida valida no schema", () => {
    const { p } = ler("apê 2q na 312 norte até 4.500 com varanda e vaga, aceito pet");
    expect(perfilSchema.safeParse(p).success).toBe(true);
  });
  it("op inválida não quebra a ficha", () => {
    const p = aplicarOps(perfilVazio(), [{ op: "set", caminho: "orcamento.max", valor: "caro" } as any, { op: "set", caminho: "nao.existe", valor: 1 }]);
    expect(p).toEqual(perfilVazio());
  });
});

describe("aderência e filtros", () => {
  const perfil = ler("apartamento para alugar até 6 mil, 2 quartos, varanda seria bom").p;
  const achados = filtrar(base, perfil);
  it("filtra pelo que é eliminatório", () => {
    expect(achados.length).toBeGreaterThan(5);
    expect(achados.every((x) => x.intencao === "alugar" && x.tipo === "apartamento" && x.preco <= 6000 && x.quartos >= 2)).toBe(true);
  });
  it("ordena por aderência e etiqueta o que falta", () => {
    const o = ordenar(achados, perfil);
    expect(o[0].aderencia).toBeGreaterThanOrEqual(o[o.length - 1].aderencia);
    const semVaranda = o.find((x) => x.imovel.atributos.varanda === false)!;
    expect(semVaranda.etiquetas).toContain("sem varanda");
    const comVaranda = o.find((x) => x.imovel.atributos.varanda === true)!;
    expect(comVaranda.etiquetas).toContain("atende tudo");
  });
  it("obrigatório não informado no anúncio não passa", () => {
    const p = ler("apartamento para alugar, tem que ter varanda").p;
    expect(filtrar(base, p).every((x) => x.atributos.varanda === true)).toBe(true);
  });
  it("filtros dinâmicos só mostram valores presentes nos resultados", () => {
    for (const f of filtrosDinamicos(achados)) {
      for (const o of f.opcoes) expect(o.n).toBeGreaterThan(0);
      if (f.chave === "bairro") expect(f.opcoes.map((o) => o.valor).sort()).toEqual([...new Set(achados.map((x) => x.bairro))].sort());
      if (f.chave === "piscina") expect(achados.some((x) => x.atributos.piscina !== undefined)).toBe(true);
    }
    const soLotes = filtrosDinamicos(base.filter((x) => x.tipo === "lote"));
    expect(soLotes.find((f) => f.chave === "varanda")).toBeUndefined();
    expect(soLotes.find((f) => f.chave === "quartos")).toBeUndefined();
  });
  it("a pergunta de refino é a do atributo que melhor divide", () => {
    const q = melhorPergunta(achados, perfil, [], [])!;
    const fracao = q.tem / q.total;
    expect(fracao).toBeGreaterThanOrEqual(0.15);
    expect(fracao).toBeLessThanOrEqual(0.85);
    expect(q.chave).not.toBe("varanda"); // já está na ficha
    expect(melhorPergunta(achados, perfil, [q.chave], [])?.chave).not.toBe(q.chave);
  });
});
