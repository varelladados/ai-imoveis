// Converte um catálogo próprio (JSON) para dados/privado/imoveis.json, a fonte privada.
// O destino está no .gitignore: anúncio real nunca entra no repositório.
// Uso: node scripts/importar-privado.mjs C:\caminho\dados.json
// Depois, rode o app com AI_FONTE_PRIVADA=1.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const origem = process.argv[2];
if (!origem) { console.error("Informe o caminho do JSON de origem."); process.exit(1); }
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const itens = JSON.parse(readFileSync(origem, "utf-8"));
const REGIAO = { "Asa Norte": "Plano Piloto", "Asa Sul": "Plano Piloto", Sudoeste: "Plano Piloto", Noroeste: "Plano Piloto", Cruzeiro: "Plano Piloto", "Vila Planalto": "Plano Piloto" };

const saida = itens.map((x, n) => {
  const atributos = {};
  if (x.v === "sim") atributos.varanda = true; else if (x.v === "nao") atributos.varanda = false;
  if (x.mob === true) atributos.mobilia = "sim";
  const d = (x.desc ?? "").toLowerCase();
  if (/reformad/.test(d)) atributos.reformado = true;
  if (/vazad/.test(d)) atributos.vazado = true;
  if (/vista livre/.test(d)) atributos.vista_livre = true;
  if (/elevador/.test(d) && !/sem elevador/.test(d)) atributos.elevador = true;
  if (/sem elevador/.test(d)) atributos.elevador = false;
  if (/dce|depend[êe]ncia/.test(d)) atributos.dce = true;
  if (/aceita pet/.test(d)) atributos.aceita_pet = true;
  if (/n[ãa]o aceita pet/.test(d)) atributos.aceita_pet = false;
  if (/arm[áa]rio/.test(d)) atributos.armarios = true;
  const quadra = (x.end ?? "").split(/ bloco /i)[0];
  return {
    id: `P${String(n + 1).padStart(4, "0")}`,
    fonte: "privada", intencao: "alugar", tipo: "apartamento",
    regiao: REGIAO[x.bairro] ?? x.bairro, bairro: x.bairro, quadra, endereco: x.end,
    preco: Math.round(x.al), condominio: Math.round(x.cond ?? 0), iptu: Math.round((x.iptu ?? 0) / 12),
    quartos: 2, suites: 0, vagas: Number(x.vagas ?? 0), area: Math.round(x.area ?? 0),
    atributos, descricao: x.desc ?? "", anunciante: x.an ?? "",
    whatsapp: "", url: x.links?.[0]?.[1], fotos: x.fotos ?? [],
  };
});
const destino = join(raiz, "dados", "privado", "imoveis.json");
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, JSON.stringify(saida, null, 1), "utf-8");
console.log(saida.length, "imóveis gravados em", destino);
