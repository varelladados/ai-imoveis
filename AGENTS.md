# ai-imoveis

Projeto do CentralizAI, graduado em 2026-11-19 do protótipo `26.11.19-PRO-DIG-001-ai-imoveis-plano-mvps-b878` do trem **projetos**
(repositório `varelladados/ai-imoveis`, **público**). Este arquivo só diz o que é próprio daqui; as regras do
método estão em prosa em `varelladados/centralizai` (`metodo/regras.md`) e, para o Claude Code,
no plugin `centralizai`. Qualquer IA lê este arquivo (`CLAUDE.md` é só `@AGENTS.md`).

## O que é

**AÍ! Imóveis, seu buscador definitivo de imóveis.** Web app de celular (PWA) em que comprador ou locatário procura imóvel por conversa guiada: o app pergunta de volta o que mais filtra, mostra prévia, aprende o vocabulário de quem usa e explica a aderência de cada imóvel. Mercado inicial: Brasília/DF. Está pronto, em cada MVP, quando os critérios de "pronto quando" de [prototipo/plano-3-mvps.md](prototipo/plano-3-mvps.md) passam.

## Estado

Plano aprovado pelo dono em 2026-11-19. **MVP 1 em construção** (versão 0.2.0): núcleo, testes e telas existem; falta o deploy. O plano está em `prototipo/` e fica como história.

## A regra que não se quebra

**A IA propõe, o determinístico decide.** A máquina de estados em `nucleo/fluxo/` controla a conversa. A IA só interpreta a mensagem e redige texto, sempre com saída estruturada e validada. Ela nunca lista imóvel: quem lista é a `PropertySource`.

## Como rodar

Em PowerShell, na raiz do repositório. O app abre em http://localhost:3210.

```powershell
npm install
```

```powershell
npm run dev
```

```powershell
npm test
```

Regerar o seed de imóveis fictícios (determinístico):

```powershell
npm run seed
```

## Onde está cada coisa

| Pasta | O que tem |
|---|---|
| `nucleo/` | TypeScript puro, sem tela nem rede: `tipos.ts` (ficha de busca), `fluxo/motor.ts` (máquina de estados), `interpretador/` (regras e IA), `aderencia.ts` (filtro, pontuação, etiquetas, filtros dinâmicos), `fontes/` (`PropertySource`) |
| `config/` | `dicionario/termos.json`, `templates/templates.json`, `prompts/extrair.ts`: editáveis sem mexer no código |
| `dados/seed/` | 300 imóveis fictícios, gerados por `scripts/gerar-seed.mjs` |
| `dados/privado/` | fora do git: a fonte privada do dono, ligada por `AI_FONTE_PRIVADA=1` |
| `app/` | telas (chat, resultados, imóvel, favoritos) e as rotas `api/conversa` e `api/buscar` |
| `testes/` | unidade do núcleo e as 10 conversas roteirizadas |

## IA

`AI_PROVIDER` escolhe quem interpreta a mensagem: `regras` (padrão, sem chave), `anthropic` ou `gateway`. Ver `env.exemplo`. Com IA ligada, qualquer falha cai nas regras. O caminho com IA ainda não foi testado com chave real.

## Convenções deste projeto

- `backlog.md` é a lista de trabalho: `- [ ]` abre, `- [x]` fecha; nunca se apaga linha.
- Versão em `LEIA-ME.md`; decisão tomada vira linha em `docs/decisoes.md`.
- **O repositório é público.** Commit nominal ao fim de cada artefato, avisando. Push e deploy são publicação: só com autorização do dono, um a um.
- Nunca segredo em commit (`.env`, chave, token). As chaves de IA ficam no painel da Vercel e no `.env.local`.
- **Dado real de anúncio de portal não entra no git.** A fonte privada mora em `dados/privado/`, que está no `.gitignore`. O seed versionado é fictício.
- Dado de terceiro não entra em arquivo versionado; na dúvida, pergunta em `pendencias/`.
- Templates de busca, dicionário e prompts são arquivos de configuração em `config/`, editáveis sem mexer no código.
- Comandos de terminal em PowerShell.
- Ideia nova para este projeto chega do trem como linha no `backlog.md` (`→repo:ai-imoveis#backlog`); o que nasce aqui dentro fica aqui.
