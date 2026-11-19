# Dúvidas e decisões

## Já decidido pelo dono (2026-11-19)

| Decisão | Resposta |
|---|---|
| Onde nasce | passa pelo trem de projetos e gradua em repositório público |
| IA no MVP de hoje | sem chave: interpretador por regras, pronto para Claude API e Vercel AI Gateway |
| Dados | fictícios mais os 69 reais |
| Publicação | Vercel, link público |

## Dúvidas que bloqueiam o MVP 1

Nenhuma. Com o ok no plano, dá para construir.

## Dúvidas que não bloqueiam, com o que o plano assume

1. **Os 69 anúncios reais no link público.**
   - O plano assume: site público só com fictícios; os reais aparecem só rodando no computador do dono, e no MVP 2 só para o admin logado.
   - Por quê: vieram de coleta em portais para uso pessoal, e o repositório é público.
   - Se a resposta for outra: publicar os reais passa a ser decisão explícita do dono.

2. **Conta da Vercel e nome do endereço.**
   - O plano assume: projeto `ai-imoveis` na conta do dono, endereço padrão da Vercel.
   - O deploy é publicação, então pede um ok na hora.

3. **Contato dos imóveis fictícios.**
   - O plano assume: o botão de WhatsApp abre com um número no padrão `9xxxx-0000`, que não pertence a ninguém, e a mensagem já redigida.

4. **Prazos do MVP 2 (26/11) e do MVP 3 (10/12).**
   - São propostas. Mudam sem afetar o MVP 1.

5. **Fonte real do MVP 3.**
   - O plano assume: cadastro próprio primeiro, feed XML quando houver imobiliária parceira.
   - Depende de conversa do dono com parceiros.

6. **Custo de IA no MVP 2.**
   - O modelo fica em variável de ambiente. A escolha entre Claude API direta e Vercel AI Gateway pode esperar o MVP 2.

## O que muda em relação ao briefing

| Briefing | Plano | Motivo |
|---|---|---|
| um MVP em 9 etapas | três MVPs | pedido do dono: um saindo hoje |
| Supabase desde a etapa 1 | Supabase no MVP 2 | hoje não prova nada sobre a conversa |
| extração com LLM na etapa 3 | regras no MVP 1, LLM no MVP 2 | o dono está sem chave hoje |
| entregável 2 e 3 separados | juntos no MVP 3, sem a agenda completa de visita | fecha a paridade com os portais num corte só |
| `docs/backlog.md` | `backlog.md` na raiz | é a convenção dos projetos do CentralizAI |
