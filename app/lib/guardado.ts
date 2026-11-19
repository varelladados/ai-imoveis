"use client";
// O que o MVP 1 guarda no aparelho: a conversa, a ficha, as memórias e os favoritos.
// No MVP 2 isto vai para o banco, por usuário.
import type { Bloco, EstadoConversa, Memoria, PerfilDeBusca } from "@/nucleo/tipos";

export interface Fala { de: "eu" | "app"; texto?: string; bloco?: Bloco }
export interface Favorito { nota: string; em: string }

const ler = <T,>(chave: string, padrao: T): T => {
  try { const v = localStorage.getItem(chave); return v ? (JSON.parse(v) as T) : padrao; } catch { return padrao; }
};
const gravar = (chave: string, valor: unknown) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem armazenamento: segue sem guardar */ } };

export const guardado = {
  perfil: () => ler<PerfilDeBusca | null>("ai.perfil", null),
  estado: () => ler<EstadoConversa | null>("ai.estado", null),
  falas: () => ler<Fala[]>("ai.falas", []),
  memorias: () => ler<Memoria[]>("ai.memorias", []),
  favoritos: () => ler<Record<string, Favorito>>("ai.favoritos", {}),
  mudouNosFiltros: () => ler<boolean>("ai.sync", false),
  salvarConversa(perfil: PerfilDeBusca, estado: EstadoConversa, falas: Fala[]) { gravar("ai.perfil", perfil); gravar("ai.estado", estado); gravar("ai.falas", falas.slice(-80)); },
  salvarPerfil(perfil: PerfilDeBusca, mudouNosFiltros: boolean) { gravar("ai.perfil", perfil); gravar("ai.sync", mudouNosFiltros); },
  limparSync() { gravar("ai.sync", false); },
  salvarMemorias(m: Memoria[]) { gravar("ai.memorias", m); },
  salvarFavoritos(f: Record<string, Favorito>) { gravar("ai.favoritos", f); },
  apagarConversa() { for (const k of ["ai.perfil", "ai.estado", "ai.falas", "ai.sync"]) try { localStorage.removeItem(k); } catch {} },
  apagarTudo() { for (const k of ["ai.perfil", "ai.estado", "ai.falas", "ai.sync", "ai.memorias", "ai.favoritos"]) try { localStorage.removeItem(k); } catch {} },
};
