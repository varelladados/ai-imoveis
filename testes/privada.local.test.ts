import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { fontePadrao } from "../nucleo/fontes";
const tem = existsSync("dados/privado/imoveis.json");
describe.skipIf(!tem)("fonte privada (só local)", () => {
  it("soma os reais aos 300 fictícios quando ligada", async () => {
    process.env.AI_FONTE_PRIVADA = "1";
    const f = await fontePadrao();
    const todos = await f.todos();
    expect(todos.length).toBeGreaterThan(300);
  });
});
