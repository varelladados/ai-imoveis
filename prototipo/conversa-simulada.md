# Conversa simulada

Uma busca de aluguel do começo ao fim. À esquerda, o que aparece na tela. À direita, o que o sistema fez. Os imóveis e as contagens são ilustrativos.

## 1. Pedido vago

> **Usuário:** quero um apê pra alugar na asa norte

| Passo | O que acontece |
|---|---|
| Interpretador | "apê" → `tipo: apartamento` (dicionário, termo popular). "alugar" → `intencao: alugar`. "asa norte" → `localizacao.bairros: [Asa Norte]` |
| Motor | template `aluguel-apartamento`. Faltam `orcamento.max` e `porte.quartos_min`. Próximo nó: `ORCAMENTO`, e junta `PORTE` na mesma mensagem (limite de duas perguntas) |

> **AÍ!:** Apartamento para alugar na Asa Norte, anotado. Duas coisas para eu começar:
> **Até quanto de aluguel por mês?** `até 2.000` `até 3.000` `até 4.000` `até 6.000`
> **Quantos quartos, no mínimo?** `1` `2` `3` `4`

## 2. Resposta com termo ambíguo

> **Usuário:** até 4 mil, 2 quartos, perto do metrô

| Passo | O que acontece |
|---|---|
| Interpretador | "até 4 mil" → `orcamento.max: 4000`. "2 quartos" → `porte.quartos_min: 2`. "perto do metrô" → termo ambíguo, sem memória para este usuário. Vai para `pendentes` |
| Motor | Obrigatórios preenchidos, mas há pendente. Próximo nó: `AMBIGUIDADE` |

> **AÍ!:** Para mim, "perto do metrô" pode ser várias coisas. Para você é:
> `até 5 min a pé (400 m)` `até 10 min a pé (800 m)` `até 15 min a pé (1,2 km)`
>
> *Vou lembrar da sua resposta nas próximas buscas.*

> **Usuário:** *(toca em* `até 10 min a pé (800 m)` *)*

| Passo | O que acontece |
|---|---|
| Memória | grava: termo "perto do metrô", contexto localização, significado raio de 800 m, escopo usuário |
| Motor | Sem pendentes. Próximo nó: `PREVIA` |

## 3. Prévia para alinhar

> **AÍ!:** Achei **87 apartamentos** assim. Olha três, só para ver se estou no caminho:
>
> 🏠 **SQN 410, 2 quartos, 58 m²** · R$ 3.400 + R$ 620 de condomínio · `atende tudo`
> 🏠 **SQN 106, 2 quartos, 72 m²** · R$ 3.900 + R$ 890 de condomínio · `atende tudo`
> 🏠 **CLN 208, 2 quartos, 55 m²** · R$ 2.800 + R$ 450 de condomínio · `sobre comércio`
>
> É por aí? `É isso` `Quero ajustar`

| Passo | O que acontece |
|---|---|
| Fonte | `PropertySource.buscar(ficha)` devolve 87 |
| Pontuador | ordena por aderência; a etiqueta "sobre comércio" vem do atributo do próprio imóvel |
| Motor | 87 é mais que 50. Depois da confirmação, vai para `REFINAR` |

## 4. Correção no meio

> **Usuário:** é isso, mas esses 4 mil são com condomínio junto

| Passo | O que acontece |
|---|---|
| Interpretador | correção: `orcamento.base: pacote` (aluguel + condomínio + IPTU) |
| Motor | recalcula. A contagem cai de 87 para 41. Agora está na faixa útil, mas ainda vale uma pergunta de refino porque um atributo divide bem |
| Ganho de informação | varanda: 20 têm, 21 não (divide bem). Elevador: 39 têm (não vale perguntar). Vaga: 12 têm, 29 não. Escolhida: varanda |

> **AÍ!:** Entendi, R$ 4.000 no total do mês. Ficaram **41**.
> Metade deles tem varanda. Isso pesa para você?
> `Tem que ter` `Seria bom` `Tanto faz` `Prefiro sem`

> **Usuário:** seria bom. e tenho um cachorro

| Passo | O que acontece |
|---|---|
| Interpretador | "seria bom" → `varanda`, peso `desejavel`. "tenho um cachorro" → `aceita_pet`, peso `obrigatorio` (regra do dicionário: ter animal é eliminatório) |
| Motor | 41 → 23. Faixa útil e obrigatórios completos. Próximo nó: `RESUMO` |

## 5. Resumo antes da busca final

> **AÍ!:** Fechei sua busca. Confere:
>
> | | |
> |---|---|
> | O que | apartamento para alugar |
> | Onde | Asa Norte, até 800 m do metrô |
> | Quanto | até R$ 4.000 por mês, com condomínio e IPTU |
> | Tamanho | 2 quartos ou mais |
> | Tem que ter | aceita pet |
> | Seria bom | varanda |
>
> São **23 apartamentos**. `Ver os 23` `Mudar algo`

> **Usuário:** *(toca em* `Ver os 23` *)*

## 6. Resultados

A tela de resultados abre com os chips da ficha no topo, cada um removível:

`Asa Norte ✕` `até R$ 4.000 no total ✕` `2+ quartos ✕` `aceita pet ✕` `metrô 800 m ✕`

Filtros disponíveis, só com o que existe nos 23, com contagem:

- Varanda: sim (11), não (12)
- Vaga: 1 (7), sem vaga (16)
- Andar: térreo (3), 1º a 3º (14), 4º a 6º (6)
- Posição solar: nascente (5), poente (4), não informado (14)

Cada cartão mostra as etiquetas: `atende tudo`, `sem varanda`, `R$ 150 abaixo do teto`.

Remover um chip na tela muda a ficha, e o chat registra: "Você tirou o limite do metrô. Agora são 38."

## Variações que os testes cobrem

| Caso | O que deve acontecer |
|---|---|
| Pedido detalhado de uma vez ("2q com varanda e vaga na 312 norte até 4.500, aceito pet") | pula todos os nós respondidos e vai direto à prévia |
| Orçamento incompatível ("casa de 4 quartos no Lago Sul para alugar por 2 mil") | nó `INCOMPATIVEL`: diz que não há nenhum e mostra o que flexibilizar, com contagens ("até R$ 9.000 aparecem 6", "no Jardim Botânico aparecem 4") |
| Mesmo usuário, nova busca com "perto do metrô" | não pergunta de novo; usa os 800 m da memória e avisa no resumo que assumiu |
| Frase que o interpretador não entende | não chuta: pergunta com opções clicáveis do nó atual |
| Pedido de imóvel específico que não existe | responde com o que há na base; nunca descreve um imóvel inexistente |
