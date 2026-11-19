// As 10 conversas roteirizadas do critério de aceite. Rodam de ponta a ponta
// pelo mesmo motor que a tela usa, com o interpretador por regras e o seed.
import { describe, expect, it } from "vitest";
import { conversar } from "../nucleo/fluxo/motor";
import { interpretadorRegras } from "../nucleo/interpretador/regras";
import { fonteSeed } from "../nucleo/fontes";
import { estadoInicial, perfilVazio, type Escolha, type Imovel, type Memoria, type RespostaConversa } from "../nucleo/tipos";
import { passa } from "../nucleo/aderencia";
import seed from "../dados/seed/imoveis.json";

const base = seed as unknown as Imovel[];
const ids = new Set(base.map((x) => x.id));

class Sessao {
  perfil = perfilVazio(); estado = estadoInicial(); memorias: Memoria[]; ultima!: RespostaConversa; nos: string[] = [];
  constructor(memorias: Memoria[] = []) { this.memorias = memorias; }
  private async passo(e: { mensagem?: string; escolha?: Escolha }) {
    const r = await conversar({ ...e, perfil: this.perfil, estado: this.estado, memorias: this.memorias }, { fonte: fonteSeed(), interpretador: interpretadorRegras });
    this.perfil = r.perfil; this.estado = r.estado; this.memorias.push(...r.memoriasNovas); this.ultima = r; this.nos.push(r.estado.no);
    // garantia: todo imóvel mostrado existe na base e passa na ficha atual
    for (const b of r.blocos) for (const i of b.imoveis ?? []) {
      expect(ids.has(i.id)).toBe(true);
      expect(passa(base.find((x) => x.id === i.id)!, r.perfil)).toBe(true);
    }
    expect(r.blocos.filter((b) => b.chips?.length).length).toBeLessThanOrEqual(2); // no máximo duas perguntas por vez
    return r;
  }
  diz(mensagem: string) { return this.passo({ mensagem }); }
  async toca(rotulo: string | RegExp) {
    const chip = this.ultima.blocos.flatMap((b) => b.chips ?? []).find((c) => (typeof rotulo === "string" ? c.rotulo === rotulo : rotulo.test(c.rotulo)));
    if (!chip) throw new Error(`chip não encontrado: ${rotulo}. Há: ${this.ultima.blocos.flatMap((b) => b.chips ?? []).map((c) => c.rotulo).join(" | ")}`);
    return this.passo({ escolha: chip.escolha });
  }
  // responde ao refino com "Tanto faz" até chegar ao resumo
  async ateOResumo() { for (let k = 0; k < 6 && this.estado.no === "REFINAR"; k++) await this.toca("Tanto faz"); }
  get texto() { return this.ultima.blocos.map((b) => b.texto).join(" "); }
}

describe("10 conversas roteirizadas", () => {
  it("1. pedido vago: o app pergunta o que falta, duas coisas por vez", async () => {
    const s = new Sessao();
    await s.diz("quero um apê pra alugar na asa sul");
    expect(s.estado.no).toBe("ORCAMENTO");
    expect(s.ultima.blocos).toHaveLength(2);
    await s.diz("até 5 mil, 2 quartos");
    expect(s.estado.no).toBe("PREVIA");
    expect(s.ultima.blocos[0].imoveis!.length).toBeGreaterThan(0);
    await s.toca("É isso");
    await s.ateOResumo();
    expect(s.estado.no).toBe("RESUMO");
    const r = await s.toca(/^Ver /);
    expect(r.abrirResultados).toBe(true);
    expect(s.perfil).toMatchObject({ intencao: "alugar", tipo: ["apartamento"], orcamento: { max: 5000 }, porte: { quartos_min: 2 } });
  });

  it("2. pedido detalhado de uma vez: pula os nós respondidos e vai à prévia", async () => {
    const s = new Sessao();
    await s.diz("apartamento de 2 quartos para alugar em Águas Claras até 4.500, com vaga, tenho gato");
    expect(s.nos).toEqual(["PREVIA"]);
    expect(s.perfil.porte.vagas_min).toBe(1);
    expect(s.perfil.atributos).toContainEqual({ chave: "aceita_pet", valor: true, peso: "obrigatorio" });
  });

  it("3. correção no meio: a ficha muda e a contagem recalcula", async () => {
    const s = new Sessao();
    await s.diz("apartamento para alugar em qualquer lugar do plano piloto, 2 quartos, até 5 mil");
    const antes = s.ultima.contagem!;
    await s.toca("É isso");
    await s.diz("na verdade esses 5 mil são com condomínio");
    expect(s.perfil.orcamento.base).toBe("pacote");
    expect(s.ultima.contagem!).toBeLessThan(antes);
    await s.diz("pode ser até 6 mil");
    expect(s.perfil.orcamento.max).toBe(6000);
    expect(s.perfil.orcamento.base).toBe("pacote"); // a correção anterior continua valendo
  });

  it("4. termo ambíguo: pergunta, guarda a resposta e segue", async () => {
    const s = new Sessao();
    await s.diz("kitnet pra alugar em águas claras perto do metrô, até 3 mil");
    expect(s.estado.no).toBe("AMBIGUIDADE");
    await s.toca("até 10 min a pé (800 m)");
    expect(s.perfil.localizacao.referencias).toEqual([{ texto: "metrô", raio_m: 800 }]);
    expect(s.perfil.pendentes).toEqual([]);
    expect(s.memorias).toHaveLength(1);
    expect(s.memorias[0]).toMatchObject({ termo: "perto do metrô", escopo: "usuario", origem: "aprendida" });
  });

  it("5. termo já esclarecido não é perguntado de novo ao mesmo usuário", async () => {
    const a = new Sessao();
    await a.diz("apartamento pra alugar no guará perto do metrô");
    await a.toca("até 5 min a pé (400 m)");
    const b = new Sessao(a.memorias); // nova conversa, mesma memória
    await b.diz("apartamento pra alugar em águas claras perto do metrô, 2 quartos, até 5 mil");
    expect(b.nos).not.toContain("AMBIGUIDADE");
    expect(b.perfil.localizacao.referencias).toEqual([{ texto: "metrô", raio_m: 400 }]);
    expect(b.perfil.origem_dos_campos["localizacao.referencias"]).toBe("memoria");
  });

  it("6. orçamento incompatível: diz com clareza e sugere o que flexibilizar", async () => {
    const s = new Sessao();
    await s.diz("casa de 4 quartos no lago sul para alugar por até 2 mil");
    expect(s.estado.no).toBe("INCOMPATIVEL");
    expect(s.ultima.contagem).toBe(0);
    const chips = s.ultima.blocos[0].chips!;
    expect(chips.some((c) => /subir o teto/.test(c.rotulo))).toBe(true);
    await s.toca(/subir o teto|qualquer região|aceitar/);
    expect(s.ultima.contagem!).toBeGreaterThan(0);
  });

  it("7. quadra sem imóvel: sugere olhar o bairro inteiro", async () => {
    const s = new Sessao();
    await s.diz("apartamento para alugar na SQN 999, 1 quarto, até 20 mil");
    expect(s.estado.no).toBe("INCOMPATIVEL");
    await s.toca(/Asa Norte inteira/);
    expect(s.perfil.localizacao).toMatchObject({ quadras: [], bairros: ["Asa Norte"] });
    expect(s.ultima.contagem!).toBeGreaterThan(0);
  });

  it("8. busca larga: refina pelo atributo que melhor divide, e respeita o peso escolhido", async () => {
    const s = new Sessao();
    await s.diz("apartamento para alugar, tanto faz onde, sem teto, 1 quarto");
    await s.toca("Tanto faz"); // localização
    await s.toca("Sem teto");
    expect(s.estado.no).toBe("PREVIA");
    expect(s.ultima.contagem!).toBeGreaterThan(50);
    await s.toca("É isso");
    expect(s.estado.no).toBe("REFINAR");
    const antes = s.ultima.contagem!;
    await s.toca("Tem que ter");
    expect(s.ultima.contagem!).toBeLessThan(antes);
    expect(s.perfil.atributos[0].peso).toBe("obrigatorio");
    await s.toca("Seria bom");
    expect(s.perfil.atributos[1].peso).toBe("desejavel");
    expect(new Set(s.estado.refinoPerguntados).size).toBe(s.estado.refinoPerguntados.length); // não repete pergunta
  });

  it("9. frase que o interpretador não entende: não chuta, repete a pergunta com opções", async () => {
    const s = new Sessao();
    await s.diz("apartamento para alugar");
    const antes = structuredClone(s.perfil);
    await s.diz("ah sei lá, o que você acha melhor pra mim?");
    expect(s.perfil).toEqual(antes);
    expect(s.texto).toMatch(/não entendi/i);
    expect(s.ultima.blocos.some((b) => b.chips?.length)).toBe(true);
  });

  it("10. compra com jargão: financiamento, FGTS, DCE, e resumo fiel à ficha", async () => {
    const s = new Sessao();
    await s.diz("quero comprar um apto de 3 quartos com suíte no sudoeste ou noroeste, até 2 milhões, que aceite financiamento, DCE se possível");
    expect(s.nos).toEqual(["PREVIA"]);
    expect(s.perfil).toMatchObject({ intencao: "comprar", orcamento: { max: 2000000, base: "venda" }, porte: { quartos_min: 3, suites_min: 1 } });
    expect(s.perfil.localizacao.bairros.sort()).toEqual(["Noroeste", "Sudoeste"]);
    expect(s.perfil.atributos).toContainEqual({ chave: "aceita_financiamento", valor: true, peso: "obrigatorio" });
    expect(s.perfil.atributos).toContainEqual({ chave: "dce", valor: true, peso: "desejavel" });
    await s.toca("É isso");
    await s.ateOResumo();
    const resumo = s.ultima.blocos[0].resumo!;
    expect(resumo.find((l) => l.rotulo === "Onde")!.valor).toMatch(/Sudoeste/);
    expect(resumo.find((l) => l.rotulo === "Seria bom")!.valor).toMatch(/DCE/);
  });

  it("recomeçar zera a ficha", async () => {
    const s = new Sessao();
    await s.diz("casa para comprar no lago norte");
    await s.diz("recomeçar");
    expect(s.perfil).toEqual(perfilVazio());
    expect(s.estado.no).toBe("INTENCAO");
  });
});
