# Etapa 0: arquitetura, modelo de dados e ficha de busca

## Componentes

```
mensagem do usuário
      │
      ▼
┌──────────────┐   usa   ┌─────────────────────────┐
│ Interpretador│────────▶│ Dicionário + memórias    │
│ (regras | IA)│         └─────────────────────────┘
└──────┬───────┘
       │ ficha parcial (JSON validado)
       ▼
┌──────────────┐   lê    ┌─────────────────────────┐
│ Motor de     │────────▶│ Template (intenção×tipo) │
│ fluxo        │         └─────────────────────────┘
└──────┬───────┘
       │ consulta           ┌─────────────────────┐
       ├───────────────────▶│ PropertySource      │
       │ imóveis + contagem └─────────────────────┘
       ▼
┌──────────────┐
│ Pontuador de │  aderência, etiquetas, filtros dinâmicos
│ aderência    │
└──────┬───────┘
       │ próximo nó + dados
       ▼
┌──────────────┐
│ Redator      │  texto da pergunta ou do resumo (modelo fixo | IA)
└──────────────┘
```

| Componente | O que faz | Tem IA? |
|---|---|---|
| Interpretador | transforma a mensagem em pedaços da ficha de busca | MVP 1: não. MVP 2: sim, com as regras de reserva |
| Motor de fluxo | calcula o que falta e escolhe o próximo nó | nunca |
| `PropertySource` | devolve imóveis para uma ficha | nunca |
| Pontuador | ordena por aderência e gera etiquetas e filtros | nunca |
| Redator | escreve a pergunta ou o resumo | MVP 1: frases dos templates. MVP 2: IA, só o texto |

O interpretador e o redator são as duas únicas portas por onde a IA entra. Os dois devolvem dado estruturado, validado por schema. Se a validação falha, o sistema tenta de novo e depois usa a versão por regras.

### As três opções de IA

```
AI_PROVIDER=regras      (padrão; nenhuma chave)
AI_PROVIDER=anthropic   (ANTHROPIC_API_KEY)
AI_PROVIDER=gateway     (AI_GATEWAY_API_KEY, pela conta da Vercel)
AI_MODEL=...            (o modelo, por variável; nada fixo no código)
```

As chaves ficam só no painel da Vercel e no `.env.local`, que não entra no git.

## Pastas do projeto

```
ai-imoveis/
  app/                    telas (chat, resultados, imóvel, favoritos)
  app/api/conversa/       a rota que recebe a mensagem e devolve o próximo passo
  nucleo/
    perfil/               schema da ficha de busca e validação
    fluxo/                máquina de estados, completude, ganho de informação
    interpretador/        regras.ts, anthropic.ts, gateway.ts
    aderencia/            pontuação, etiquetas, filtros dinâmicos
    fontes/               PropertySource, seed, fonte extra
  config/
    templates/            aluguel-apartamento.json, compra-casa.json ...
    dicionario/           termos.json (seed de ~150 termos)
    prompts/              arquivos .md versionados (MVP 2)
  dados/seed/             imoveis.json, gerado por script
  dados/privado/          fora do git: a fonte extra do dono
  testes/                 unidade do núcleo e as 10 conversas roteirizadas
  docs/                   decisoes.md
  backlog.md
```

Tudo em `nucleo/` é TypeScript puro, sem depender de tela nem de rede. É o que os testes cobrem.

## Máquina de estados

```
INICIO
  │
  ▼
INTENCAO ──▶ TIPO ──▶ LOCALIZACAO ──▶ ORCAMENTO ──▶ PORTE
  (cada nó é pulado se a ficha já tem a resposta)       │
                                                        ▼
                                              ┌── PREVIA ◀─────────────┐
                                              │    │                   │
                          resultado demais    │    │ faixa útil        │
                                 ▼            │    ▼                   │
                             REFINAR ─────────┘  RESUMO ──▶ BUSCA_FINAL
                                                   ▲
       AMBIGUIDADE (termo com dois sentidos) ──────┤  volta ao nó de origem
       INCOMPATIVEL (zero resultado) ──────────────┘  sugere o que flexibilizar
       CORRECAO: de qualquer nó, a ficha muda e a prévia recalcula
```

| Nó | Entra quando | Sai quando |
|---|---|---|
| `INTENCAO`, `TIPO`, `LOCALIZACAO`, `ORCAMENTO`, `PORTE` | o campo obrigatório do template está vazio | o campo foi preenchido, ou assumiu o valor padrão do template |
| `AMBIGUIDADE` | o interpretador marcou um termo com mais de um sentido e não há memória | o usuário escolheu; a escolha vira memória |
| `PREVIA` | os obrigatórios mínimos estão preenchidos | sempre, depois de mostrar até 5 imóveis e a contagem |
| `REFINAR` | a contagem passa de 50 | o usuário respondeu ou pediu para ver assim mesmo |
| `INCOMPATIVEL` | a contagem é zero | o usuário flexibilizou algum campo |
| `RESUMO` | completude atingida: obrigatórios preenchidos e contagem entre 5 e 50 | o usuário confirma ou corrige |
| `BUSCA_FINAL` | resumo confirmado | abre a tela de resultados |

Regras do motor:

- No máximo duas perguntas por mensagem, sempre com opções clicáveis além do texto livre.
- A ordem dos nós é a do template, mas qualquer nó já respondido é pulado.
- No `REFINAR`, a pergunta é a do atributo que melhor divide os resultados atuais. O cálculo é a entropia de cada atributo sobre o conjunto: um atributo que 50% têm e 50% não têm vale mais do que um que 95% têm. Atributo que o usuário já respondeu não volta.
- No `INCOMPATIVEL`, o motor testa relaxar um campo de cada vez e sugere o que devolve mais resultados ("com até R$ 4.500 aparecem 12").

## Ficha de busca (perfil): o schema

```json
{
  "versao": 1,
  "intencao": "alugar",
  "tipo": ["apartamento"],
  "localizacao": {
    "regioes": ["Plano Piloto"],
    "bairros": ["Asa Norte"],
    "quadras": ["SQN 312"],
    "referencias": [{ "texto": "perto do metrô", "raio_m": 800 }]
  },
  "orcamento": {
    "min": null,
    "max": 4000,
    "base": "aluguel",
    "financiamento": null,
    "fgts": null
  },
  "porte": {
    "quartos_min": 2,
    "suites_min": null,
    "vagas_min": null,
    "area_min": 55,
    "area_max": null
  },
  "atributos": [
    { "chave": "varanda", "valor": true, "peso": "desejavel" },
    { "chave": "aceita_pet", "valor": true, "peso": "obrigatorio" },
    { "chave": "andar", "valor": "terreo", "peso": "excluir" }
  ],
  "contexto": {
    "prazo_mudanca": null,
    "para_quem": null,
    "observacoes": []
  },
  "origem_dos_campos": {
    "orcamento.max": "usuario",
    "orcamento.base": "padrao_do_template"
  },
  "pendentes": [
    { "termo": "perto do metrô", "motivo": "ambiguo" }
  ]
}
```

| Campo | Valores | Observação |
|---|---|---|
| `intencao` | `alugar`, `comprar` | obrigatório |
| `tipo` | `apartamento`, `casa`, `kitnet`, `cobertura`, `lote`, `sala_comercial` | obrigatório; aceita mais de um |
| `orcamento.base` | `aluguel`, `pacote` (aluguel + condomínio + IPTU), `venda` | no aluguel, o app pergunta qual dos dois quando o teto está apertado |
| `atributos[].peso` | `obrigatorio` (elimina), `desejavel` (pontua), `excluir` (elimina quem tem) | é a diferença entre "tem que ter" e "seria bom" |
| `origem_dos_campos` | `usuario`, `padrao_do_template`, `memoria` | deixa o resumo dizer o que foi assumido |
| `pendentes` | termos não resolvidos | alimenta o nó `AMBIGUIDADE` |

As chaves de `atributos` são as chaves canônicas do dicionário. Um atributo novo no dicionário não exige mudança no schema.

## Template de busca: exemplo

```json
{
  "id": "aluguel-apartamento",
  "intencao": "alugar",
  "tipo": "apartamento",
  "obrigatorios": ["localizacao", "orcamento.max", "porte.quartos_min"],
  "padroes": { "orcamento.base": "aluguel", "porte.quartos_min": 1 },
  "faixas": { "orcamento.max": [500, 50000], "porte.area_min": [15, 1000] },
  "perguntas": {
    "localizacao": { "texto": "Em que região você quer morar?", "opcoes": "dos_resultados" },
    "orcamento.max": { "texto": "Até quanto de aluguel por mês?", "opcoes": [2000, 3000, 4000, 6000] },
    "porte.quartos_min": { "texto": "Quantos quartos, no mínimo?", "opcoes": [1, 2, 3, 4] }
  },
  "opcionais": ["varanda", "vaga", "aceita_pet", "mobiliado", "andar", "posicao_solar", "dce", "elevador"]
}
```

## Dicionário e memória

```json
{
  "termo": "jk",
  "variantes": ["kitnet", "quitinete", "kit", "studio"],
  "registro": "jargao",
  "canonico": { "campo": "tipo", "valor": "kitnet" },
  "ambiguo_com": [],
  "praca": "DF",
  "origem": "seed"
}
```

```json
{
  "termo": "perto do metrô",
  "contexto": "localizacao",
  "significado": { "campo": "localizacao.referencias", "valor": { "texto": "metrô", "raio_m": 800 } },
  "ocorrencias": 1,
  "confianca": 1.0,
  "escopo": "usuario",
  "origem": "aprendida"
}
```

No MVP 1 a memória fica no aparelho. No MVP 2 vai para o banco, com escopo `usuario` ou `global`. A global só entra por recorrência ou aprovação do admin.

## Modelo de dados (MVP 2, Postgres)

| Tabela | Campos principais |
|---|---|
| `usuarios` | id, e-mail, papel, consentimento_memoria, criado_em |
| `imoveis` | id, fonte, intencao, tipo, bairro, quadra, preco, condominio, iptu, quartos, suites, vagas, area, atributos (JSON), fotos, contato, atualizado_em |
| `favoritos` | usuario_id, imovel_id, anotacao, criado_em |
| `conversas` | id, usuario_id, perfil (JSON), estado, criado_em |
| `mensagens` | conversa_id, autor, texto, extraido (JSON), criado_em |
| `dicionario` | termo, variantes, registro, canonico (JSON), praca, origem |
| `memorias` | termo, contexto, significado (JSON), ocorrencias, confianca, escopo, usuario_id, origem |

Papéis em `usuarios.papel`: `visitante`, `usuario`, `corretor`, `administrador_imoveis`, `imobiliaria`, `admin`. No MVP 2 só `usuario` e `admin` têm tela. Os outros existem no banco e nas regras de acesso.

Os atributos do imóvel ficam em JSON de propósito: os filtros dinâmicos leem as chaves que existem nos resultados, sem tabela mestre.

## Interface `PropertySource`

```ts
interface PropertySource {
  id: string;
  buscar(perfil: PerfilDeBusca): Promise<Imovel[]>;
  porId(id: string): Promise<Imovel | null>;
}
```

Fontes previstas: `seed` (MVP 1), `privada` (arquivo fora do git, MVP 1 local e MVP 2 para o admin), `postgres` (MVP 2), `feed-xml` e `cadastro` (MVP 3).

## Aderência e etiquetas

1. Elimina quem viola um `obrigatorio` ou tem um `excluir`.
2. Pontua de 0 a 100: cada `desejavel` atendido soma, e o preço dentro da faixa soma mais quanto mais folga tem.
3. Gera até três etiquetas por imóvel a partir do que bateu e do que faltou: "atende tudo", "não tem vaga", "R$ 200 acima do teto".

A etiqueta sai do cálculo, não de texto de IA.

## Garantia de que a IA não inventa imóvel

A IA nunca recebe a tarefa de listar imóveis. Ela devolve só a ficha. Quem lista é a `PropertySource`, e a tela mostra o que veio dela. Um teste automático confere que todo imóvel exibido tem id existente na base.
