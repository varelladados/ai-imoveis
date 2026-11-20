# Backlog — ai-imoveis

Uma linha por item; `- [ ]` abre, `- [x]` fecha; nunca se apaga linha. O que chega do trem
traz o identificador de origem entre parênteses. **Essencial** marca o que define a versão.
O detalhe de cada MVP está em [prototipo/plano-3-mvps.md](prototipo/plano-3-mvps.md).

## Agora

- [x] Dizer em `AGENTS.md` e `LEIA-ME.md` o que este projeto é, para quem, e como se sabe que está pronto (origem: `26.11.19-PRO-DIG-001-ai-imoveis-plano-mvps-b878`)
- [x] Decidir o que do `prototipo/` vira código vivo e o que fica como história: tudo em `prototipo/` é história; o código nasce nas pastas descritas em `etapa-0-arquitetura.md`
- [x] **Essencial** Ok do dono no plano e na etapa 0 (2026-11-19)

## MVP 1: a conversa funciona (0.2.0)

- [x] **Essencial** Projeto base Next.js + TypeScript, com testes
- [x] **Essencial** Schema da ficha de busca e validação (`nucleo/perfil/`)
- [x] **Essencial** Seed de 300 imóveis fictícios gerado por script
- [x] **Essencial** `PropertySource` com fonte do seed e encaixe para fonte privada fora do git
- [x] **Essencial** Templates de busca: aluguel e compra de apartamento, casa e kitnet
- [x] **Essencial** Motor de fluxo (máquina de estados) com testes da árvore e do critério de parada
- [x] **Essencial** Dicionário de ~150 termos do DF
- [x] **Essencial** Interpretador por regras; implementações `anthropic` e `gateway` escritas e desligadas
- [ ] Instalar `ai` e `@ai-sdk/anthropic` e testar a IA com chave real (o registro do npm não respondeu em 2026-11-19)
- [x] **Essencial** Tela de chat: mensagens, chips, prévia, resumo da ficha
- [x] **Essencial** Resultados: aderência, etiquetas, filtros dinâmicos sincronizados com o chat
- [x] Página do imóvel com valores detalhados e botão de WhatsApp
- [x] Favoritos com anotação e memória de ambiguidade, no aparelho
- [x] Manifesto de PWA
- [x] **Essencial** 10 conversas roteirizadas em teste automático
- [x] Deploy na Vercel: https://ai-imoveis.vercel.app (2026-11-20)
- [ ] Conferir as telas no tema claro e num celular de verdade
- [ ] Conferir a fonte privada (`AI_FONTE_PRIVADA=1`) rodando local
- [ ] Ícones PNG para instalação no iPhone (hoje o ícone é SVG)

## MVP 2: o produto completo (0.3.0)

- [ ] Supabase: Postgres, login por e-mail, regras de acesso por papel
- [ ] Papéis de usuário modelados (seis papéis; três com tela)
- [ ] Favoritos e anotações sincronizados
- [ ] Extração e redação com IA por tool use, com validação e reserva por regras
- [ ] Prompts em arquivos versionados
- [ ] Memória por usuário e global, com origem registrada
- [ ] Tela de admin do dicionário
- [ ] LGPD: consentimento e apagar tudo
- [ ] Pergunta por ganho de informação, com medição
- [ ] PWA completo: ícones, offline, instalação
- [ ] Testes de ponta a ponta no navegador
- [ ] Fonte privada visível só para o admin logado

## MVP 3: paridade e dado real (0.4.0)

- [ ] Salvar busca e alertas (e-mail e push)
- [ ] Mapa: busca e página do imóvel
- [ ] Voz no chat
- [ ] Compartilhar imóvel e lista de favoritos
- [ ] Comparar imóveis lado a lado
- [ ] Histórico de conversas
- [ ] Primeira fonte real pela `PropertySource`
- [ ] Simulação de financiamento
- [ ] Pedido de visita pelo WhatsApp
- [ ] Métricas de funil

## Depois

- [ ] Entregável 4: profissionais (gestão de imóveis, leads, CRECI, página de imobiliária, agenda de visitas)
- [ ] Entregável 5: anunciante (anunciar por conversa, cruzamento com buscas salvas)
- [ ] Backlog longo: ver [prototipo/benchmark-e-backlog.md](prototipo/benchmark-e-backlog.md)

## Ideias que chegaram do trem
