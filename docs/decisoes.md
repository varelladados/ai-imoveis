# Decisões

Uma linha por decisão, da mais antiga para a mais nova. Não se apaga linha; decisão revista ganha linha nova.

| Data | Decisão | Quem | Por quê |
|---|---|---|---|
| 2026-11-19 | Projeto novo, B2C, em vez de acoplar ao `ohubimob` | dono | o `ohubimob` é o portal B2B do corretor |
| 2026-11-19 | Repositório público | dono | pedido do dono |
| 2026-11-19 | Três MVPs em vez de um | dono | um precisa sair no mesmo dia |
| 2026-11-19 | MVP 1 sem IA paga: interpretador por regras, pronto para Claude API e Vercel AI Gateway | dono | sem chave no dia |
| 2026-11-19 | Publicação na Vercel, link público | dono | abrir e instalar no celular |
| 2026-11-19 | A IA propõe, o determinístico decide: máquina de estados controla o fluxo; IA só interpreta e redige | briefing | a IA nunca inventa imóvel nem escolhe o caminho |
| 2026-11-19 | Supabase entra no MVP 2, não no MVP 1 | dono aprovou o plano | hoje não prova nada sobre a conversa |
| 2026-11-19 | Site público só com imóveis fictícios; anúncios reais coletados de portais ficam em `dados/privado/`, fora do git | dono aprovou o plano | repositório público e briefing "sem scraping" |
| 2026-11-19 | Atributos do imóvel em JSON, sem tabela mestre | dono aprovou o plano | os filtros dinâmicos leem o que existe nos resultados |
| 2026-11-19 | Plano dos três MVPs aprovado; trabalho em `C:\Central\ai-imoveis` | dono | "segue no C:\Central\ai-imoveis e começa o MVP 1" |
| 2026-11-19 | A ficha só muda por operações (`set`, `add`, `attr`, `rmattr`, `limpar`), vindas do interpretador ou de um chip | construção | um caminho só para regras, IA, chat e filtros; tudo validado por schema |
| 2026-11-19 | Templates num arquivo só (`config/templates/templates.json`), não um arquivo por combinação | construção | seis templates curtos; mais fácil de comparar e editar |
| 2026-11-19 | IA pela AI SDK (`ai` + `@ai-sdk/anthropic`), que atende Claude API direta e Vercel AI Gateway com o mesmo código | construção | o dono pediu as duas opções prontas |
| 2026-11-19 | Atributo obrigatório que o anúncio não informa não passa no filtro; desejável não informado vira etiqueta "não informa" | construção | o app não promete o que o anúncio não diz |
| 2026-11-19 | Fonte privada ligada por `AI_FONTE_PRIVADA=1` e lida de `dados/privado/imoveis.json` | construção | os anúncios reais ficam só no computador do dono |
| 2026-11-20 | MVP 1 publicado na Vercel (time `mr-brinks`, plano Hobby), endereço https://ai-imoveis.vercel.app, deploy automático a cada push na `master` | dono | "Sim, publica" |
| 2026-11-20 | Deploy feito pela CLI da Vercel, com `npx.cmd`; `.vercelignore` impede `dados/privado/` de subir | construção | a conexão MCP da Vercel não ganhou acesso ao time, mesmo após duas aprovações; o PowerShell bloqueia `npx.ps1` |
