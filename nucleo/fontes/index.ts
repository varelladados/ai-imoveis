// PropertySource: de onde vêm os imóveis. Trocar a fonte não muda o resto.
import type { Imovel, PerfilDeBusca } from "../tipos";
import { filtrar } from "../aderencia";
import seed from "../../dados/seed/imoveis.json";

export interface PropertySource {
  id: string;
  todos(): Promise<Imovel[]>;
  buscar(perfil: PerfilDeBusca): Promise<Imovel[]>;
  porId(id: string): Promise<Imovel | null>;
}

export class FonteEmMemoria implements PropertySource {
  constructor(public id: string, private itens: Imovel[]) {}
  async todos() { return this.itens; }
  async buscar(perfil: PerfilDeBusca) { return filtrar(this.itens, perfil); }
  async porId(id: string) { return this.itens.find((x) => x.id === id) ?? null; }
}

export class FonteComposta implements PropertySource {
  id = "composta";
  constructor(private fontes: PropertySource[]) {}
  async todos() { return (await Promise.all(this.fontes.map((f) => f.todos()))).flat(); }
  async buscar(perfil: PerfilDeBusca) { return filtrar(await this.todos(), perfil); }
  async porId(id: string) {
    for (const f of this.fontes) { const x = await f.porId(id); if (x) return x; }
    return null;
  }
}

export const fonteSeed = (): PropertySource => new FonteEmMemoria("seed", seed as unknown as Imovel[]);

// Fonte privada: dados/privado/imoveis.json, fora do git. Só existe no computador
// do dono; no site público o arquivo não existe e a fonte simplesmente não entra.
async function fontePrivada(): Promise<PropertySource | null> {
  if (process.env.AI_FONTE_PRIVADA !== "1") return null;
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const txt = await readFile(join(process.cwd(), "dados", "privado", "imoveis.json"), "utf-8");
    return new FonteEmMemoria("privada", JSON.parse(txt) as Imovel[]);
  } catch { return null; }
}

let cache: PropertySource | null = null;
export async function fontePadrao(): Promise<PropertySource> {
  if (cache) return cache;
  const privada = await fontePrivada();
  cache = privada ? new FonteComposta([fonteSeed(), privada]) : fonteSeed();
  return cache;
}
