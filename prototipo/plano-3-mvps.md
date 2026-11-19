# AÍ! Imóveis: plano dos três MVPs

> Seu buscador definitivo de imóveis. Plano de 2026-11-19.

## A ideia em uma tela

Um web app de celular em que a pessoa procura imóvel conversando. O app pergunta de volta o que mais filtra, mostra uma prévia para alinhar, aprende o vocabulário de quem usa e explica por que cada imóvel apareceu.

A regra de construção é uma só: **a IA propõe, o determinístico decide**. Uma máquina de estados controla a conversa. A IA só interpreta o que a pessoa escreveu e redige as perguntas. Ela nunca escolhe o caminho e nunca mostra imóvel que não está na base.

## Os três MVPs

| | MVP 1: a conversa funciona | MVP 2: o produto completo | MVP 3: paridade e dado real |
|---|---|---|---|
| Prazo proposto | hoje, 19/11 | até 26/11 | até 10/12 |
| Pergunta que responde | A conversa guiada leva a um imóvel aderente? | Dá para usar de verdade, com conta e memória? | Tem o que os portais têm, com imóvel real? |
| Quem usa | o dono e quem receber o link | usuários convidados, com login | público aberto |
| Interpretação do texto | regras + dicionário, sem IA paga | Claude API ou Vercel AI Gateway, com regras de reserva | a mesma |
| Dados | 300 imóveis fictícios | os mesmos, no Postgres | primeira fonte real |
| Onde guarda | no aparelho | Supabase | Supabase |
| Briefing coberto | etapas 1, 2, 4, 5 e parte da 3 | etapas 3, 6, 7 e 8 | entregável 2 e parte do 3 |

Os prazos do MVP 2 e do MVP 3 são propostas. O do MVP 1 é o pedido do dono.

## MVP 1: a conversa funciona (hoje)

**Objetivo.** Provar a experiência central no celular, num link público, sem conta e sem custo de IA.

**Entra:**

1. Projeto Next.js + TypeScript, publicado na Vercel.
2. Seed de 300 imóveis fictícios de Brasília, gerado por script, com atributos esparsos (posição solar, andar, DCE) para exercitar os filtros.
3. Interface `PropertySource`, com a fonte do seed e um encaixe para fonte extra.
4. Templates de busca em arquivos JSON: aluguel e compra de apartamento, casa e kitnet.
5. Motor de fluxo, a máquina de estados, sem IA e coberto por testes.
6. Dicionário de sinônimos com cerca de 150 termos do DF, em arquivo JSON.
7. Interpretador por regras: transforma a mensagem em ficha de busca usando o dicionário e padrões de texto ("2 quartos", "até 4 mil", "SQN 312").
8. Tela de chat: mensagens, opções clicáveis, prévia de resultados com contagem, resumo da ficha.
9. Tela de resultados: ordenação por aderência, etiquetas ("atende tudo", "não tem vaga"), filtros dinâmicos sincronizados com o chat.
10. Página do imóvel: fotos, descrição, valores (aluguel + condomínio + IPTU), botão de WhatsApp.
11. Favoritos com anotação e memória de termos ambíguos, guardados no aparelho.
12. Manifesto de PWA, para instalar na tela inicial.

**Fica de fora, de propósito:** login, banco de dados, IA paga, tela de admin, memória global.

**Pronto para as outras duas opções de IA.** O interpretador é uma interface com três implementações, escolhidas por variável de ambiente: `regras` (padrão, hoje), `anthropic` (Claude API) e `gateway` (Vercel AI Gateway). As duas últimas nascem escritas e desligadas. Ligar é pôr a chave no painel da Vercel.

**Pronto quando:**

- 10 conversas roteirizadas passam em teste automático: pedido vago, pedido detalhado de uma vez, correção no meio, termo ambíguo, orçamento incompatível.
- Os filtros só mostram valores presentes nos resultados atuais.
- O chat só mostra imóvel que veio da base.
- A conversa completa funciona num celular, pelo link.

**Limite conhecido.** Sem IA, o interpretador entende o que o dicionário e os padrões cobrem. Frase fora disso cai numa pergunta com opções clicáveis. É menos fluido do que será com a Claude, mas não inventa.

## MVP 2: o produto completo (proposta: até 26/11)

**Objetivo.** Cumprir os critérios de aceite do briefing inteiros.

1. Supabase: Postgres, login por e-mail com link mágico, regras de acesso por papel.
2. Papéis modelados: visitante, comprador/locatário, corretor, administrador de imóveis, imobiliária/PJ e admin. Só visitante, logado e admin têm tela.
3. Favoritos e anotações sincronizados entre aparelhos.
4. Extração e redação com a Claude por tool use, com saída validada por schema. Se a validação falhar, tenta de novo e depois cai nas regras.
5. Prompts em arquivos separados e versionados.
6. Memória de desambiguação por usuário (vale na hora) e global (entra por recorrência ou aprovação do admin), com origem registrada: seed, manual ou aprendida.
7. Tela de admin do dicionário.
8. LGPD: consentimento para guardar memória e histórico, botão de apagar tudo.
9. Pergunta escolhida por ganho de informação sobre os resultados atuais, com medição.
10. PWA completo: ícones, tela offline, instalação.
11. Testes de ponta a ponta no navegador, com as 10 conversas.
12. Fonte privada para o admin logado (ver "Os 69 anúncios reais").

**Pronto quando:** todos os critérios de aceite da seção 6 do briefing passam, e um termo esclarecido não é perguntado de novo ao mesmo usuário em outro aparelho.

## MVP 3: paridade com os portais e primeiro dado real (proposta: até 10/12)

**Objetivo.** Ter o que os portais têm de básico e sair do dado fictício.

1. Salvar busca e alertas de imóvel novo, por e-mail e push, com frequência configurável.
2. Mapa: busca por mapa e mapa na página do imóvel.
3. Voz no chat.
4. Compartilhar imóvel e lista de favoritos.
5. Comparar imóveis lado a lado.
6. Histórico de conversas: retomar a busca de onde parou.
7. Primeira fonte real pela `PropertySource`: cadastro próprio ou feed XML de imobiliária parceira.
8. Simulação de financiamento, com cálculo determinístico.
9. Pedido de visita pelo WhatsApp, já com o resumo da busca.
10. Métricas de funil: conversa, prévia, busca final, favorito, contato.

**Pronto quando:** existe ao menos uma fonte real no ar e o funil é medido de ponta a ponta.

## Depois dos três

| Entregável | O que é |
|---|---|
| 4. Profissionais | gestão de imóveis, leads com a ficha de busca do cliente, painel de anúncios, verificação de CRECI, página de imobiliária |
| 5. Anunciante | anunciar por conversa guiada (mesma árvore, sentido inverso) e cruzamento automático com buscas salvas |
| Backlog | ver [benchmark-e-backlog.md](benchmark-e-backlog.md) |

## Os 69 anúncios reais

O dono pediu fictícios mais os 69 anúncios reais da busca de aluguel, e também link público. As duas coisas juntas não cabem: esses anúncios foram coletados de portais para uso pessoal, e o briefing diz "sem scraping". Republicar em site e repositório públicos é outra decisão.

O plano resolve assim:

- **MVP 1:** o site público mostra só os fictícios. Os 69 reais entram como fonte extra num arquivo fora do repositório e aparecem quando o app roda no computador do dono.
- **MVP 2:** com login, a fonte privada aparece só para o admin logado.

Se o dono quiser os reais no link público mesmo assim, é uma decisão dele, registrada em [duvidas.md](duvidas.md).

## Stack

Fica a sugerida no briefing: Next.js + TypeScript, PWA, Supabase, Claude API, Vercel. Uma mudança só: o Supabase entra no MVP 2, não no MVP 1. Hoje ele não prova nada sobre a conversa e custa metade do dia.

Comandos de terminal sempre em PowerShell.

## Documentos que o projeto mantém

`LEIA-ME.md`, `docs/decisoes.md` e `backlog.md`, atualizado a cada item novo.
