# ai-imoveis

Projeto do CentralizAI, graduado em 2026-11-19 do protótipo `26.11.19-PRO-DIG-001-ai-imoveis-plano-mvps-b878` do trem **projetos**
(repositório `varelladados/ai-imoveis`, **público**). Este arquivo só diz o que é próprio daqui; as regras do
método estão em prosa em `varelladados/centralizai` (`metodo/regras.md`) e, para o Claude Code,
no plugin `centralizai`. Qualquer IA lê este arquivo (`CLAUDE.md` é só `@AGENTS.md`).

## O que é

**AÍ! Imóveis, seu buscador definitivo de imóveis.** Web app de celular (PWA) em que comprador ou locatário procura imóvel por conversa guiada: o app pergunta de volta o que mais filtra, mostra prévia, aprende o vocabulário de quem usa e explica a aderência de cada imóvel. Mercado inicial: Brasília/DF. Está pronto, em cada MVP, quando os critérios de "pronto quando" de [prototipo/plano-3-mvps.md](prototipo/plano-3-mvps.md) passam.

## Estado

Plano aprovado? **Ainda não.** O plano dos três MVPs e a etapa 0 estão em `prototipo/` esperando o ok do dono. Nenhum código de aplicação existe ainda.

## A regra que não se quebra

**A IA propõe, o determinístico decide.** A máquina de estados em `nucleo/fluxo/` controla a conversa. A IA só interpreta a mensagem e redige texto, sempre com saída estruturada e validada. Ela nunca lista imóvel: quem lista é a `PropertySource`.

## Como rodar

Ainda não há o que rodar. Quando houver (MVP 1), em PowerShell:

```powershell
npm install
```

```powershell
npm run dev
```

```powershell
npm test
```

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
