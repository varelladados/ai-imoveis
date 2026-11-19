export const normalizar = (s: string) =>
  s.toLowerCase().replace(/²/g, "2").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export const brl = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");

export const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

// Rótulos dos atributos: o que aparece em etiqueta, filtro e resumo.
export const ROTULOS: Record<string, string> = {
  varanda: "varanda", varanda_gourmet: "varanda gourmet", aceita_pet: "aceita pet", mobilia: "mobília",
  dce: "DCE", elevador: "elevador", posicao_solar: "posição solar", vazado: "vazado", vista_livre: "vista livre",
  reformado: "reformado", vaga_coberta: "vaga coberta", vaga_presa: "vaga presa", ar_condicionado: "ar-condicionado",
  armarios: "armários", piscina: "piscina", churrasqueira: "churrasqueira", academia: "academia", quintal: "quintal",
  condominio_fechado: "condomínio fechado", portaria_24h: "portaria 24h", terreo: "térreo", andar_min: "andar",
  duplex: "duplex", sobre_comercio: "sobre comércio", garantia: "garantia", aceita_financiamento: "aceita financiamento",
  aceita_fgts: "aceita FGTS", aceita_permuta: "aceita permuta", andar: "andar", metro_m: "distância do metrô",
};
const VALORES: Record<string, string> = {
  sim: "mobiliado", semi: "semimobiliado", nao: "sem mobília", nascente: "sol da manhã", poente: "sol da tarde",
  norte: "face norte", sul: "face sul", fiador: "fiador", seguro_fianca: "seguro-fiança", caucao: "caução", sem_fiador: "sem fiador",
};
export const rotuloAtributo = (chave: string, valor: unknown): string => {
  if (chave === "andar_min") return `${valor}º andar ou acima`;
  if (typeof valor === "string") return VALORES[valor] ?? `${ROTULOS[chave] ?? chave}: ${valor}`;
  if (valor === false) return `sem ${ROTULOS[chave] ?? chave}`;
  return ROTULOS[chave] ?? chave.replace(/_/g, " ");
};
export const NOME_TIPO: Record<string, string> = {
  apartamento: "apartamento", casa: "casa", kitnet: "kitnet", cobertura: "cobertura", lote: "lote", sala_comercial: "sala comercial",
};
