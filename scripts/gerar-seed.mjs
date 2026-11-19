// Gera dados/seed/imoveis.json: 300 imóveis FICTÍCIOS de Brasília.
// Determinístico (mesma semente, mesmo arquivo). Rode com: npm run seed
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
let s = 20261119;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const entre = (a, b) => a + rnd() * (b - a);
const int = (a, b) => Math.floor(entre(a, b + 1));
const um = (l) => l[Math.floor(rnd() * l.length)];
const chance = (p) => rnd() < p;
const arred = (n, p) => Math.round(n / p) * p;

// aluguel e venda por m² (R$), só para dar distribuição realista; não é pesquisa de preço
const BAIRROS = [
  { b: "Asa Norte", r: "Plano Piloto", al: 52, vd: 11500, metro: false, peso: 34, tipos: ["apartamento", "kitnet", "cobertura"], q: () => `${um(["SQN", "SQN", "SQN", "CLN", "SHCGN"])} ${um([1, 2, 3, 4])}${String(int(2, 16)).padStart(2, "0")}` },
  { b: "Asa Sul", r: "Plano Piloto", al: 54, vd: 12000, metro: true, peso: 32, tipos: ["apartamento", "kitnet", "cobertura"], q: () => `${um(["SQS", "SQS", "SQS", "CLS", "SHIGS"])} ${um([1, 2, 3, 4])}${String(int(2, 16)).padStart(2, "0")}` },
  { b: "Sudoeste", r: "Plano Piloto", al: 58, vd: 13500, metro: false, peso: 28, tipos: ["apartamento", "kitnet", "cobertura"], q: () => `${um(["SQSW", "CCSW", "QRSW", "QMSW"])} ${int(1, 8)}` },
  { b: "Noroeste", r: "Plano Piloto", al: 66, vd: 15500, metro: false, peso: 18, tipos: ["apartamento", "cobertura"], q: () => `${um(["SQNW", "CLNW"])} ${int(102, 311)}` },
  { b: "Cruzeiro", r: "Plano Piloto", al: 44, vd: 8500, metro: false, peso: 14, tipos: ["apartamento", "casa"], q: () => `${um(["SHCES Quadra", "Cruzeiro Velho Quadra"])} ${int(1, 12) * 100 + int(1, 9)}` },
  { b: "Vila Planalto", r: "Plano Piloto", al: 42, vd: 8000, metro: false, peso: 6, tipos: ["casa", "apartamento", "kitnet"], q: () => `Rua ${int(1, 9)}` },
  { b: "Lago Sul", r: "Lago Sul", al: 48, vd: 12500, metro: false, peso: 16, tipos: ["casa", "casa", "lote"], q: () => `SHIS QI ${int(1, 29)}` },
  { b: "Lago Norte", r: "Lago Norte", al: 44, vd: 10500, metro: false, peso: 14, tipos: ["casa", "apartamento", "lote"], q: () => `${um(["SHIN QI", "SHIN QL", "CA"])} ${int(1, 16)}` },
  { b: "Jardim Botânico", r: "Jardim Botânico", al: 30, vd: 6200, metro: false, peso: 12, tipos: ["casa", "lote"], q: () => `Condomínio ${um(["Solar", "Mirante", "Bosque", "Estância", "Jardins"])} ${um(["das Paineiras", "do Lago", "do Cerrado", "da Serra", "Imperial"])}` },
  { b: "Águas Claras", r: "Águas Claras", al: 42, vd: 8800, metro: true, peso: 40, tipos: ["apartamento", "kitnet", "cobertura"], q: () => `${um(["Rua", "Avenida", "Quadra"])} ${int(1, 37)} ${um(["Norte", "Sul"])}` },
  { b: "Guará", r: "Guará", al: 38, vd: 7600, metro: true, peso: 24, tipos: ["apartamento", "casa", "kitnet"], q: () => `${um(["QE", "QI", "AE"])} ${int(1, 46)}` },
  { b: "Taguatinga", r: "Taguatinga", al: 30, vd: 5600, metro: true, peso: 26, tipos: ["apartamento", "casa", "kitnet", "sala_comercial"], q: () => `${um(["QNA", "QNB", "QSA", "CNB", "QNL"])} ${int(1, 30)}` },
  { b: "Park Sul", r: "Guará", al: 62, vd: 14000, metro: false, peso: 10, tipos: ["apartamento", "cobertura"], q: () => `SMAS Trecho ${int(1, 4)}` },
  { b: "Sobradinho", r: "Sobradinho", al: 24, vd: 4300, metro: false, peso: 12, tipos: ["casa", "apartamento"], q: () => `Quadra ${int(1, 18)}` },
  { b: "Setor Comercial Sul", r: "Plano Piloto", al: 48, vd: 6500, metro: true, peso: 6, tipos: ["sala_comercial"], q: () => `SCS Quadra ${int(1, 8)}` },
  { b: "Vicente Pires", r: "Vicente Pires", al: 22, vd: 3900, metro: false, peso: 8, tipos: ["casa", "lote"], q: () => `Rua ${int(1, 12)} Chácara ${int(10, 320)}` },
];
const sorteiaBairro = () => {
  const total = BAIRROS.reduce((a, x) => a + x.peso, 0);
  let r = rnd() * total;
  for (const x of BAIRROS) { if ((r -= x.peso) <= 0) return x; }
  return BAIRROS[0];
};

const ANUNCIANTES = ["Imobiliária Ipê Amarelo (fictícia)", "Cerrado Imóveis (fictícia)", "Buriti Negócios Imobiliários (fictícia)", "Paranoá Corretora (fictícia)", "Proprietário (fictício)", "Corretora Candanga (fictícia)", "Eixo Monumental Imóveis (fictícia)"];

function gerar(n) {
  const b = sorteiaBairro();
  const tipo = b.tipos.includes("apartamento") && chance(0.5) ? "apartamento" : um(b.tipos);
  const intencao = tipo === "lote" ? "comprar" : chance(0.58) ? "alugar" : "comprar";
  let quartos = 0, area = 0, suites = 0, vagas = 0;
  if (tipo === "kitnet") { quartos = chance(0.8) ? 1 : 0; area = int(22, 42); }
  else if (tipo === "apartamento") { quartos = um([1, 2, 2, 2, 3, 3, 4]); area = Math.round(20 + quartos * entre(18, 28)); }
  else if (tipo === "cobertura") { quartos = um([2, 3, 3, 4]); area = Math.round(90 + quartos * entre(30, 55)); }
  else if (tipo === "casa") { quartos = um([2, 3, 3, 4, 4, 5]); area = Math.round(60 + quartos * entre(35, 80)); }
  else if (tipo === "lote") { area = arred(entre(300, 2000), 10); }
  else { area = int(25, 140); }
  if (quartos >= 2) suites = chance(0.55) ? int(1, Math.min(quartos, 3)) : 0;
  if (tipo === "casa") vagas = int(1, 4);
  else if (tipo === "lote") vagas = 0;
  else if (["Asa Norte", "Asa Sul", "Cruzeiro"].includes(b.b)) vagas = chance(0.35) ? 1 : 0; // prédio antigo do Plano raramente tem
  else vagas = chance(0.85) ? int(1, quartos >= 3 ? 2 : 1) : 0;

  const fator = entre(0.72, 1.38) * (tipo === "cobertura" ? 1.15 : 1) * (tipo === "lote" ? 0.22 : 1);
  const preco = intencao === "alugar"
    ? Math.max(700, arred(area * b.al * fator * (area > 120 ? 0.72 : 1), 50))
    : Math.max(90000, arred(area * b.vd * fator, 5000));
  const semCond = tipo === "lote" || (tipo === "casa" && !b.b.includes("Jardim") && !chance(0.3));
  const condominio = semCond ? 0 : arred(area * entre(6, 13), 10);
  const iptu = intencao === "alugar" ? arred(area * entre(0.8, 2.2), 5) : arred(area * entre(12, 30), 10);

  const a = {};
  const predio = ["apartamento", "kitnet", "cobertura", "sala_comercial"].includes(tipo);
  // atributos esparsos: nem todo anúncio informa tudo
  if (predio && chance(0.8)) { a.andar = tipo === "cobertura" ? int(6, 22) : int(0, b.b.startsWith("Asa") || b.b === "Sudoeste" ? 6 : 24); }
  if (predio && chance(0.85)) a.elevador = b.b === "Cruzeiro" || (b.b === "Sudoeste" && chance(0.3)) ? false : chance(0.9);
  if (tipo !== "lote" && chance(0.42)) a.posicao_solar = um(["nascente", "nascente", "poente", "norte", "sul"]);
  if (tipo !== "lote" && tipo !== "sala_comercial" && chance(0.75)) a.varanda = chance(tipo === "casa" ? 0.8 : 0.5);
  if (a.varanda && chance(0.25)) a.varanda_gourmet = true;
  if (tipo !== "lote" && tipo !== "sala_comercial" && intencao === "alugar" && chance(0.7)) a.aceita_pet = chance(0.62);
  if (tipo !== "lote" && chance(0.7)) a.mobilia = um(["nao", "nao", "nao", "semi", "semi", "sim"]);
  if (quartos >= 2 && chance(0.5)) a.dce = chance(0.45);
  if (tipo !== "lote" && chance(0.5)) a.reformado = chance(0.5);
  if (predio && chance(0.45)) a.vista_livre = chance(0.5);
  if (predio && chance(0.5)) a.vazado = chance(0.55);
  if (vagas > 0 && chance(0.7)) a.vaga_coberta = chance(0.75);
  if (vagas > 1 && chance(0.6)) a.vaga_presa = chance(0.4);
  if (tipo !== "lote" && chance(0.55)) a.ar_condicionado = chance(0.5);
  if (tipo !== "lote" && chance(0.6)) a.armarios = chance(0.75);
  if (tipo === "casa" || (predio && ["Águas Claras", "Noroeste", "Park Sul", "Sudoeste"].includes(b.b))) {
    if (chance(0.7)) a.piscina = chance(tipo === "casa" ? 0.45 : 0.65);
    if (chance(0.7)) a.churrasqueira = chance(0.6);
    if (predio && chance(0.7)) a.academia = chance(0.7);
  }
  if (tipo === "casa" && chance(0.6)) a.quintal = chance(0.75);
  if (tipo === "casa" && chance(0.5)) a.condominio_fechado = b.b === "Jardim Botânico" ? true : chance(0.3);
  if (predio && chance(0.6)) a.portaria_24h = chance(0.6);
  if (b.metro && chance(0.85)) a.metro_m = arred(entre(150, 2400), 50);
  if (b.r === "Plano Piloto" && chance(0.4)) a.sobre_comercio = chance(0.2);
  if (intencao === "comprar" && chance(0.75)) a.aceita_financiamento = chance(0.8);
  if (intencao === "comprar" && chance(0.5)) a.aceita_fgts = chance(0.7);
  if (intencao === "comprar" && chance(0.3)) a.aceita_permuta = chance(0.35);
  if (intencao === "alugar" && chance(0.5)) a.garantia = um(["fiador", "seguro_fianca", "caucao", "sem_fiador"]);
  if (tipo === "apartamento" && chance(0.12)) a.duplex = true;

  const quadra = b.q();
  const bloco = predio && chance(0.8) ? ` Bloco ${um("ABCDEFGHIJKLMNOP".split(""))}` : "";
  const nomeTipo = { apartamento: "Apartamento", casa: "Casa", kitnet: "Kitnet", cobertura: "Cobertura", lote: "Lote", sala_comercial: "Sala comercial" }[tipo];
  const partes = [];
  if (quartos) partes.push(`${quartos} quarto${quartos > 1 ? "s" : ""}${suites ? `, ${suites} suíte${suites > 1 ? "s" : ""}` : ""}`);
  if (a.reformado) partes.push("reformado");
  if (a.vazado) partes.push("vazado");
  if (a.vista_livre) partes.push("vista livre");
  if (a.varanda) partes.push(a.varanda_gourmet ? "varanda gourmet" : "varanda");
  if (a.posicao_solar) partes.push(`sol ${a.posicao_solar === "nascente" ? "da manhã" : a.posicao_solar === "poente" ? "da tarde" : "face " + a.posicao_solar}`);
  if (a.dce) partes.push("DCE");
  if (a.mobilia === "sim") partes.push("mobiliado"); else if (a.mobilia === "semi") partes.push("semimobiliado");
  if (vagas) partes.push(`${vagas} vaga${vagas > 1 ? "s" : ""}`);
  if (a.metro_m && a.metro_m <= 800) partes.push(`a ${a.metro_m} m do metrô`);
  if (a.aceita_pet) partes.push("aceita pet");
  const descricao = `${nomeTipo} de ${area} m² em ${b.b}${partes.length ? ": " + partes.join(", ") : ""}. Imóvel fictício, criado para demonstração.`;

  return {
    id: `F${String(n).padStart(4, "0")}`,
    fonte: "seed",
    intencao, tipo, regiao: b.r, bairro: b.b, quadra,
    endereco: `${quadra}${bloco}`,
    preco, condominio, iptu, quartos, suites, vagas, area,
    atributos: a, descricao,
    anunciante: um(ANUNCIANTES),
    whatsapp: `55619${int(8000, 9999)}0000`, // padrão 9xxxx-0000: não pertence a ninguém
  };
}

const imoveis = Array.from({ length: 300 }, (_, i) => gerar(i + 1));
const destino = join(raiz, "dados", "seed", "imoveis.json");
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, JSON.stringify(imoveis, null, 1), "utf-8");
const cont = (f) => imoveis.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
console.log(imoveis.length, "imóveis", cont((x) => x.intencao), cont((x) => x.tipo));
