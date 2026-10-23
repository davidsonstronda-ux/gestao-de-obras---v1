# PRD Backend — Gestão de Obras (nome provisório)

> Especificação dos dados e das permissões. Lido na etapa de criar o banco no Supabase.
> O SQL não está aqui: ele é escrito na hora de construir, a partir desta descrição.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.
> Revisado em 20/10/2026 com as decisões do Davidson (acesso da arquiteta, fotos do cliente nascem não liberadas, cliente vê só a data prometida, Medição na segunda entrega). A v1 tem 13 tabelas.

## Convenções

- Tabelas no plural, em minúsculo, sem acento, com underline: `diarios`.
- Colunas em minúsculo com underline: `data_inicio`, `responsavel_id`.
- Toda tabela tem `id` (uuid gerado pelo banco) e `created_at`.
- Chave estrangeira termina em `_id`.
- Campo de lista fechada vira CHECK, e o texto tem que ser **idêntico** ao usado na interface (com acento e maiúscula, como está aqui).
- Datas como `date` ou `timestamptz`. Dinheiro como `numeric(14,2)`.
- Foto vai para o Storage; o banco guarda só o caminho.

---

## Unidade principal

**Obra** — vai existir mais de uma: **sim**. Tabela `obras`, coluna `obra_id` em toda tabela que pertence a uma obra, e tabela `membros` (obra, pessoa) dizendo quem trabalha em qual. Nenhuma consulta devolve dado de uma obra em que a pessoa não é membro. O engenheiro também acessa por ser membro (é vinculado automaticamente a toda obra que cria).

**Papel:** o perfil (Engenheiro, Mestre, Arquiteta, Cliente) é da pessoa, em `profiles.role`, e vale igual em todas as obras dela. `membros` só diz em quais obras ela entra.

---

## Tabela `profiles`

Liga o login à pessoa e guarda o perfil dela. É ela que manda nas permissões.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave; é o próprio código do login (a mesma pessoa) |
| nome | text | sim | |
| email | text | sim | único |
| role | text | sim | CHECK: `Engenheiro`, `Mestre`, `Arquiteta`, `Cliente`, `Pendente`; padrão `Pendente` |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

Criado automaticamente por um gatilho quando alguém se cadastra, já com `role = Pendente`.

---

## Tabela `obras`

Para que serve: cada obra, com o cliente e a data de entrega prometida.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | |
| codigo | text | sim | código/apelido curto (ex.: `RABV`); único |
| cliente_nome | text | sim | |
| endereco | text | não | |
| data_inicio | date | sim | |
| data_entrega | date | sim | data-meta de entrega prometida ao cliente; ≥ data_inicio |
| situacao | text | sim | CHECK: `Em andamento`, `Parada`, `Concluída`; padrão `Em andamento` |
| created_at | timestamptz | sim | automático |

**Regra do seletor (20/10/2026):** `Concluída` sai do seletor de obra; `Parada` continua nele.

**Relações:** tem vários membros, ambientes, empreiteiros, frentes, diários, fotos, pendências, medições.
**Regra de negócio:** quem cria vira membro automaticamente.

---

## Tabela `membros`

Para que serve: diz quem trabalha em qual obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| pessoa_id | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** par (obra_id, pessoa_id) único.

---

## Tabela `ambientes`

Para que serve: os cômodos/áreas da obra (Sala, Cozinha, Suíte master…), base do avanço que o cliente vê.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| nome | text | sim | único dentro da obra |
| ordem | integer | sim | ordem no painel do cliente |
| created_at | timestamptz | sim | automático |

---

## Tabela `empreiteiros`

Para que serve: os responsáveis pelas frentes. Cada obra tem os seus (na v1 não há cadastro único entre obras, para nunca misturar).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| nome | text | sim | |
| especialidade | text | não | |
| whatsapp | text | não | só dígitos, com DDD; usado no botão Cobrar |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** não pode ser apagado se tiver frente ligada.

---

## Tabela `frentes`

Para que serve: cada serviço contratado, com as datas do cronograma e a folga. **Não guarda valor** (ver `contratos`).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| empreiteiro_id | uuid | sim | → empreiteiros (mesma obra) |
| servico | text | sim | nome do serviço; único dentro da obra (é a chave da reimportação do cronograma) |
| inicio_previsto | date | sim | |
| termino_previsto | date | sim | ≥ inicio_previsto |
| folga_dias | integer | sim | ≥ 0; folga total do MS Project, em dias úteis |
| situacao | text | sim | CHECK: `Não iniciada`, `Em andamento`, `Concluída`; padrão `Não iniciada` |
| concluida_em | date | não | obrigatório quando situacao = `Concluída` |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma obra e a um empreiteiro; tem vários frente_ambientes, apontamentos, fotos, pendências, comentários.
**Índices úteis:** (obra_id, situacao).
**Regra de negócio:** o primeiro apontamento `Andou` muda `Não iniciada` para `Em andamento`.

### Valores calculados (não são colunas; saem de uma consulta pronta no banco)

Estes números aparecem na tela Frentes em risco e no detalhe. Ficam numa visão (consulta salva) que respeita as mesmas permissões de `frentes`.

- **dias_perdidos** = quantidade de diários da obra lançados a partir do `inicio_previsto` em que esta frente **não** recebeu apontamento `Andou` (marcada `Não andou` ou sem marcação). Frente `Concluída` para de contar. Dia sem diário nenhum não conta.
- **folga_restante** = `folga_dias` − `dias_perdidos`.
- **data_limite_decisao** = hoje + `folga_restante` dias úteis (segunda a sábado).
- **risco**: `Estourou a folga` se folga_restante < 0; `Atenção` se 0 a 5; `No prazo` se > 5. (Texto idêntico às etiquetas da tela.)
- **dias_sem_andar** = dias corridos desde o último `Andou` (ou desde `inicio_previsto`, se nunca andou). Zero se andou hoje.
- **ultimo_motivo** = motivo do último `Não andou`.
- **tem_pendencia_aberta** = existe pendência `Aberta` ligada.
- **pct_concluido** = ambientes concluídos ÷ ambientes da frente.
- **entrega de pé (por obra)** = nenhuma frente da obra com risco `Estourou a folga`; senão, a contagem delas.

---

## Tabela `frente_ambientes`

Para que serve: em quais ambientes cada frente acontece, e quando foi concluída em cada um. É a base do "a medir" e do avanço do cliente.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| frente_id | uuid | sim | |
| ambiente_id | uuid | sim | mesma obra |
| concluido_em | date | não | preenchido quando o mestre marca Concluí |
| concluido_por | uuid | não | → profiles |
| diario_id | uuid | não | diário em que foi marcado |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** par (frente_id, ambiente_id) único.

---

## Tabela `contratos`

Para que serve: o valor contratado de cada frente. Fica **separado de `frentes` de propósito**: a permissão do banco é por linha, não por coluna, e o mestre e a arquiteta precisam ler `frentes` sem ver dinheiro.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| frente_id | uuid | sim | único (um contrato por frente) |
| valor_contratado | numeric(14,2) | sim | ≥ 0 |
| observacao | text | não | |
| created_at | timestamptz | sim | automático |

---

## Tabela `diarios`

Para que serve: o diário de obra, um por obra por dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| data | date | sim | par (obra_id, data) único |
| clima | text | sim | CHECK: `Sol`, `Nublado`, `Chuva` |
| equipes | jsonb | não | lista de {empreiteiro_id, pessoas} |
| ocorrencias | text | não | |
| autor_id | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** o autor (mestre) edita até o fim do dia seguinte à `data`; depois, só o engenheiro.

---

## Tabela `apontamentos`

Para que serve: o "Andou / Não andou" de cada frente em cada diário. É daqui que sai todo o cálculo de atraso e a pergunta de um ano.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| diario_id | uuid | sim | |
| frente_id | uuid | sim | mesma obra do diário |
| situacao | text | sim | CHECK: `Andou`, `Não andou` |
| motivo | text | não | CHECK: `Falta material`, `Falta gente`, `Aguardando projeto`, `Aguardando outra frente`, `Chuva`, `Outro`; obrigatório se situacao = `Não andou` |
| motivo_detalhe | text | não | obrigatório se motivo = `Outro` |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** par (diario_id, frente_id) único. Mesma trava de edição do diário.
**Índices úteis:** (frente_id, situacao), (obra_id).

---

## Tabela `fotos`

Para que serve: as fotos do canteiro, ligadas a frente e ambiente.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| diario_id | uuid | não | |
| frente_id | uuid | não | |
| ambiente_id | uuid | não | |
| caminho | text | sim | caminho no Storage |
| tirada_em | date | sim | |
| autor_id | uuid | sim | → profiles |
| visivel_cliente | boolean | sim | padrão **falso**: nenhuma foto chega ao cliente até o engenheiro liberar |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (obra_id, tirada_em).

---

## Tabela `pendencias`

Para que serve: as dúvidas de projeto que travam uma frente.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| frente_id | uuid | sim | a frente que ela trava |
| pergunta | text | sim | |
| situacao | text | sim | CHECK: `Aberta`, `Respondida`, `Fechada`; padrão `Aberta` |
| aberta_por | uuid | sim | → profiles |
| fechada_em | timestamptz | não | |
| created_at | timestamptz | sim | automático |

O prazo da resposta **não é coluna**: é a `data_limite_decisao` da frente, calculada.

---

## Tabela `comentarios`

Para que serve: a conversa das pendências e os comentários/decisões no detalhe da frente.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| pendencia_id | uuid | não | preenchido se for comentário de pendência |
| frente_id | uuid | não | preenchido se for comentário da frente |
| texto | text | sim | |
| foto_caminho | text | não | |
| autor_id | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** exatamente um entre `pendencia_id` e `frente_id` preenchido. Comentário da arquiteta numa pendência `Aberta` muda a pendência para `Respondida`.

---

## Tabela `materiais`

Para que serve: o catálogo de materiais da empresa. **Não tem `obra_id`**: é cadastro, vale para todas as obras (como o logo). Não guarda lançamento nenhum.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | |
| unidade | text | sim | ex.: saco 50 kg, m³, rolo |
| categoria | text | sim | CHECK: `Grosso`, `Acabamento`, `Instalações` |

---

## Tabela `pedidos`

Para que serve: cada pedido de material de uma obra e a coluna em que ele está.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| material_id | uuid | sim | → materiais |
| quantidade | numeric | sim | CHECK > 0 |
| frente_id | uuid | sim | → frentes (da mesma obra); na entrega, a frente de aplicação |
| prioridade | text | sim | CHECK: `Normal`, `Crítico`; padrão `Normal` |
| status | text | sim | CHECK: `Solicitar`, `Em cotação`, `A caminho`, `No almoxarifado`, `Entregue`; padrão `Solicitar` |
| fornecedor | text | não | obrigatório a partir de `A caminho` |
| previsao_entrega | date | não | obrigatória a partir de `A caminho` |
| qtd_bate_nf | boolean | não | checklist de recebimento |
| estado_ok | boolean | não | checklist de recebimento |
| avarias | text | não | |
| foto_nf | text | não | caminho no Storage |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

Sem valor em R$. Se o preço entrar, vai para tabela separada (regra de `contratos`).

---

## Tabela `pedido_historico`

Para que serve: cada mudança de coluna de um pedido. É dela que saem "há X dias nesta coluna" e o lead time (Solicitar → No almoxarifado).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| pedido_id | uuid | sim | → pedidos |
| status | text | sim | mesmo CHECK de `pedidos.status` |
| data | date | sim | |
| autor_id | uuid | sim | → profiles |

**Índices úteis:** (pedido_id, data).

---

## Tabela `insumos`

Para que serve: o saldo de um material do catálogo numa obra (estoque opcional).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| material_id | uuid | sim | → materiais; único por obra (obra_id, material_id) |
| saldo | numeric | sim | CHECK ≥ 0; padrão 0; muda só por movimento |
| unidade | text | sim | copiada do material |
| saldo_minimo | numeric | sim | CHECK ≥ 0; padrão 0 |

---

## Tabela `movimentos`

Para que serve: cada entrada e saída de um insumo. O saldo do insumo é a soma destes.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| insumo_id | uuid | sim | → insumos |
| tipo | text | sim | CHECK: `Entrada`, `Saída` |
| quantidade | numeric | sim | CHECK > 0 |
| data | date | sim | |
| frente_id | uuid | não | obrigatória na saída |
| origem | text | sim | CHECK: `Pedido`, `Manual` |
| pedido_id | uuid | não | → pedidos; único quando preenchido (um pedido gera no máximo uma entrada) |
| autor_id | uuid | sim | → profiles |

**Índices úteis:** (obra_id, insumo_id, data).

**Processo automático:** pedido que passa para `No almoxarifado` com `qtd_bate_nf` e `estado_ok` verdadeiros gera uma `Entrada` (origem `Pedido`) e soma no saldo; cria o insumo se não existir. Saída que deixaria o saldo negativo é recusada (o CHECK do saldo segura no banco).

---

## Tabela `calendarios` (Planejamento)

Para que serve: os dias de trabalho de cada obra. Durações e prazos do Planejamento são contados nestes dias, menos os feriados. Não muda a regra da folga das frentes (segunda a sábado).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | único (uma linha por obra) |
| dias_semana | int[] | sim | 0 = domingo … 6 = sábado; padrão {1,2,3,4,5,6}; CHECK pelo menos um dia, valores de 0 a 6 |

Obra sem linha aqui usa o padrão (segunda a sábado).

---

## Tabela `feriados` (Planejamento)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| data | date | sim | único por obra (obra_id, data) |
| nome | text | sim | ex.: "Finados" |

---

## Tabela `atividades` (Planejamento)

Para que serve: a EAP da obra. Uma lista só, lida pelas 4 abas do Planejamento.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| pai_id | uuid | não | → atividades da **mesma obra**; vazio = nível principal; não pode ser ela mesma nem uma descendente |
| ordem | int | sim | posição entre as irmãs; o código (1.2.1) sai daqui, não é coluna |
| titulo | text | sim | |
| inicio | date | sim | |
| fim | date | sim | CHECK fim ≥ inicio |
| frente_id | uuid | não | → frentes da mesma obra |
| progresso | int | sim | % realizado; CHECK de 0 a 100; padrão 0 |
| status | text | sim | coluna do Kanban; CHECK: `A fazer`, `Em andamento`, `Concluído`; padrão `A fazer` |
| concluida_em | date | não | gravada ao ir para `Concluído` (e o progresso vai a 100); limpa ao sair. É dela que sai o PPC de cada semana |
| arquivada | boolean | sim | padrão falso |
| criado_por | uuid | sim | → profiles |

Grupo (atividade com subatividades não arquivadas): início, fim e progresso mostrados saem das subatividades; os gravados nele valem só se ele voltar a ficar sem filhas.
**Índices úteis:** (obra_id, pai_id, ordem).

---

## Tabela `restricoes` (Planejamento — Médio prazo)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| atividade_id | uuid | sim | → atividades da mesma obra |
| descricao | text | sim | |
| tipo | text | sim | CHECK: `Material`, `Mão de obra`, `Método`, `Equipamento`, `Projeto`, `Segurança`, `Logística` |
| prazo | date | sim | prazo de resolução; define a semana do quadro |
| responsavel | text | sim | |
| resolvida_em | date | não | vazio = aberta |

---

## Tabela `subtarefas` (Planejamento — Curto prazo)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| atividade_id | uuid | sim | → atividades da mesma obra |
| titulo | text | sim | |
| situacao | text | sim | CHECK: `Pendente`, `Feita`, `Não realizado`; padrão `Pendente` |
| causa | text | não | obrigatória quando `Não realizado`; CHECK com os motivos de `apontamentos.motivo` |
| causa_detalhe | text | não | obrigatório quando causa = `Outro` |

---

## Tabela `nao_realizados` (Planejamento — Curto prazo)

Para que serve: a atividade planejada numa semana que não foi concluída, com a causa. É o que alimenta "por que o plano falhou".

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| atividade_id | uuid | sim | → atividades da mesma obra |
| semana | date | sim | a segunda-feira da semana; único (atividade_id, semana) |
| causa | text | sim | CHECK com os motivos de `apontamentos.motivo` |
| causa_detalhe | text | não | obrigatório quando causa = `Outro` |
| autor_id | uuid | sim | → profiles |

Concluir a atividade apaga o "não realizado" da semana em que foi concluída.

## Tabela `vistoria_registros` (Qualidade — aba Vistoria, acrescentada em 23/10)

Para que serve: cada problema achado numa vistoria rápida da obra, até a correção com foto de evidência.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| numero | int | sim | sequência por obra (#1, #2…); único (obra_id, numero) |
| descricao | text | sim | |
| local | text | sim | |
| pavimento | text | não | |
| empreiteiro_id | uuid | sim | quem corrige → empreiteiros da mesma obra |
| responsavel_id | uuid | sim | quem acompanha → profiles membro da obra (engenheiro, mestre ou arquiteta) |
| prazo | date | sim | ≥ data_vistoria |
| data_vistoria | date | sim | padrão hoje |
| vistoriado_por | uuid | sim | → profiles |
| status | text | sim | CHECK: `Pendente`, `Em andamento`, `Resolvido` |
| foto | text | não | caminho no Storage |
| foto_evidencia | text | não | obrigatório quando status = `Resolvido` (CHECK) |
| resolvido_em | date | não | preenchido ao resolver |
| observacoes | text | não | histórico acumulado, nota mais nova no topo, cada uma com [dd/mm/aaaa hh:mm]; cada mudança de situação também entra aqui ("Em andamento — por X") |

Permissão: ler — engenheiro, mestre, arquiteta da obra; criar, mudar status, anotar — engenheiro e mestre; apagar — engenheiro. Cliente não lê.

## Tabela `fvs_modelos` (Qualidade — FVS)

Para que serve: a ficha-modelo de verificação de um serviço. **Da empresa, sem `obra_id`** (como `materiais`): vale para todas as obras.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| codigo | text | sim | FVS-01, FVS-02…; único |
| nome | text | sim | |
| categoria | text | sim | CHECK: `Impermeabilização`, `Estrutura`, `Instalações`, `Acabamento` |
| versao | int | sim | começa em 1; sobe a cada edição |
| grupos | jsonb | sim | `[{ nome, itens: [{ id, titulo }] }]`, pelo menos um grupo com um item |

Permissão: ler — engenheiro, mestre e arquiteta; criar e editar — engenheiro.

## Tabela `fvs_vistorias` (Qualidade — FVS)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| modelo_id | uuid | sim | → fvs_modelos |
| modelo_codigo, modelo_nome, modelo_versao | text/int | sim | cópia do modelo no dia em que a vistoria começou |
| grupos | jsonb | sim | cópia dos itens do modelo (a vistoria não muda se o modelo mudar) |
| ambiente | text | sim | texto livre |
| respostas | jsonb | sim | `{ item_id: 'OK' \| 'NC' \| 'N.A.' }` |
| status | text | sim | CHECK: `Em andamento`, `Concluída` |
| criada_por | uuid | sim | → profiles |
| criada_em | date | sim | |
| concluida_em | date | não | só com todos os itens respondidos; concluída não aceita mudança |

Permissão: ler — engenheiro, mestre, arquiteta da obra; criar, responder, finalizar — engenheiro e mestre.

## Tabela `fvs_ncs` (Qualidade — FVS)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| numero | int | sim | por obra; mostrado como NC-001; único (obra_id, numero) |
| vistoria_id | uuid | sim | → fvs_vistorias da mesma obra |
| item_id | text | sim | item da vistoria; uma NC por item |
| titulo | text | sim | título do item |
| descricao | text | sim | |
| solucao | text | não | solução proposta |
| severidade | text | sim | CHECK: `Baixa`, `Média`, `Alta` |
| empreiteiro_id | uuid | sim | quem corrige → empreiteiros da mesma obra |
| fotos | text[] | não | caminhos no Storage |
| status | text | sim | CHECK: `Aberta`, `Encaminhada`, `Corrigida`, `Fechada` |
| aberta_em | date | sim | |
| fechada_em | date | não | |
| historico | jsonb | sim | `[{ status, texto, autor_id, em }]`, um por passo |

Passos: Aberta→Encaminhada e Encaminhada→Corrigida (engenheiro e mestre); Corrigida→Fechada e Corrigida→Encaminhada com motivo (só engenheiro). Cliente não lê nenhuma das três tabelas.

## Tabela `gemba_observacoes` (Qualidade — Gemba Walk)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| local | text | sim | |
| descricao | text | sim | |
| causa_raiz | text | sim | |
| acao | text | sim | |
| desperdicios | text[] | sim | 1 ou mais, sem repetir; CHECK: cada um em `Retrabalho`, `Espera`, `Transporte`, `Movimentação`, `Estoque`, `Superprodução`, `Processo desnecessário` |
| prazo | date | não | |
| responsavel_id | uuid | sim | → profiles membro da obra |
| status | text | sim | CHECK: `Pendente`, `Em andamento`, `Resolvido` |
| foto | text | não | caminho no Storage |
| criada_em | date | sim | |
| criada_por | uuid | sim | → profiles |

Permissão: ler — engenheiro, mestre, arquiteta da obra; criar e mover — engenheiro e mestre; apagar — engenheiro. Cliente não lê.

---

## Permissões

Escrito em português. Vira RLS na hora de construir. Regra geral: **toda** leitura exige ser membro da obra (`membros`) e ter `role` diferente de `Pendente` e `ativo = verdadeiro`. Quem não fez login: **nada, em nenhuma tabela.**

### `profiles`
- **Ver:** a própria linha; engenheiro vê todas.
- **Criar:** só o gatilho do cadastro.
- **Editar:** a pessoa edita o próprio `nome`; só o engenheiro muda `role` e `ativo`.
- **Apagar:** ninguém (desativa-se).

### `obras`
- **Ver:** membros da obra (todos os perfis).
- **Criar / editar:** engenheiro.
- **Apagar:** engenheiro.

### `membros`
- **Ver:** engenheiro; cada pessoa vê as próprias linhas.
- **Criar / editar / apagar:** engenheiro.

### `ambientes`
- **Ver:** membros da obra (inclui cliente).
- **Criar / editar / apagar:** engenheiro.

### `empreiteiros`
- **Ver:** engenheiro, mestre e arquiteta membros da obra. **Cliente: não.**
- **Criar / editar / apagar:** engenheiro.

### `frentes` (e a visão com os valores calculados)
- **Ver:** engenheiro, mestre e arquiteta membros da obra. **Cliente: não.**
- **Criar / editar / apagar:** engenheiro. (A mudança automática de situação é feita pelo banco.)

### `frente_ambientes`
- **Ver:** engenheiro, mestre e arquiteta membros da obra. Cliente: não (vê só o % agregado, abaixo).
- **Criar / apagar:** engenheiro.
- **Editar (marcar concluído):** engenheiro e mestre; o mestre só preenche `concluido_em`, `concluido_por` e `diario_id`, e só dentro da janela de edição do diário.

### `contratos`
- **Ver / criar / editar / apagar:** **só engenheiro.** Mestre, arquiteta e cliente: nada.

### `diarios` e `apontamentos`
- **Ver:** engenheiro, mestre e arquiteta membros da obra. **Cliente: não.**
- **Criar:** engenheiro e mestre.
- **Editar:** engenheiro sempre; mestre só os próprios e só até o fim do dia seguinte à data do diário.
- **Apagar:** engenheiro.

### `fotos`
- **Ver:** engenheiro, mestre e arquiteta: todas da obra. **Cliente:** só as com `visivel_cliente = verdadeiro` e `tirada_em` nos últimos 7 dias, e sem acesso aos campos `frente_id`, `autor_id` e `diario_id` (o cliente lê por uma visão própria que só tem foto, data e ambiente).
- **Criar:** engenheiro e mestre.
- **Editar (`visivel_cliente`):** engenheiro.
- **Apagar:** engenheiro (apaga também o arquivo no Storage).

### `pendencias`
- **Ver:** engenheiro, mestre e arquiteta membros da obra. Cliente: não.
- **Criar:** engenheiro, mestre e arquiteta.
- **Editar situação para Fechada / reabrir:** só engenheiro. (A passagem para Respondida é automática.)
- **Apagar:** engenheiro.

### `comentarios`
- **Ver:** engenheiro, mestre e arquiteta membros da obra. Cliente: não.
- **Criar:** engenheiro, mestre e arquiteta.
- **Editar:** o próprio autor, até 24 horas depois.
- **Apagar:** engenheiro.

### `materiais`, `pedidos` e `pedido_historico`
- **Catálogo (`materiais`):** ler, qualquer logado não pendente; criar/editar, engenheiro.
- **Ver pedidos e histórico:** engenheiro, mestre e arquiteta membros da obra. Cliente: não.
- **Criar e mover pedido** (e gravar o histórico): engenheiro e mestre membros da obra.
- **Estoque (`insumos`, `movimentos`):** ver, engenheiro, mestre e arquiteta membros da obra; dar baixa, engenheiro e mestre. Cliente: não.
- **Apagar:** engenheiro.

### Planejamento (`calendarios`, `feriados`, `atividades`, `restricoes`, `subtarefas`)
- **Ver:** engenheiro e arquiteta membros da obra, tudo; mestre membro da obra, só o que o Curto prazo usa (atividades da semana e subtarefas). Cliente: não.
- **Criar e editar EAP, restrições e calendário:** engenheiro.
- **Mover atividade no Kanban, marcar subtarefa, informar causa:** engenheiro e mestre membros da obra.
- **Apagar:** engenheiro (atividade não se apaga: arquiva).

### Avanço por ambiente (para o cliente)
- O cliente não lê `frentes` nem `frente_ambientes`. Ele recebe, por uma consulta pronta do banco que só devolve dados da obra dele, a lista: ambiente · ordem · % de avanço (frente_ambientes concluídos ÷ total, naquele ambiente; todos os serviços com o mesmo peso).
- A data mostrada ao cliente é só `obras.data_entrega` (a prometida). O cliente não recebe risco, folga nem contagem de frentes atrasadas.

### Storage (arquivos)
- Pasta `fotos/{obra_id}/{foto_id}.jpg` — o caminho **não** contém nome de empreiteiro nem de serviço.
- Ler: mesmas regras da tabela `fotos`. Enviar: engenheiro e mestre membros da obra. Apagar: engenheiro.

---

## Fluxo de cadastro e liberação

1. A pessoa se cadastra sozinha com nome, email e senha.
2. O gatilho cria a linha em `profiles` com `role = Pendente` e nenhuma obra em `membros`.
3. Ela vê "Conta aguardando liberação do engenheiro" e não enxerga dado nenhum.
4. O engenheiro, em Cadastros › Equipe, escolhe o perfil e marca as obras. A partir daí ela entra direto.
5. O primeiro engenheiro é definido à mão na criação do banco (o email do Davidson recebe `role = Engenheiro`).

## Processos automáticos

### Conta nova nasce trancada
- **Gatilho:** novo cadastro no login.
- **Passos:** 1. cria `profiles` com `role = Pendente`. 2. não cria nenhum `membros`.
- **Resultado:** a pessoa só vê o aviso de espera; aparece em "Aguardando liberação" para o engenheiro.
- **Se falhar:** a conta fica sem `profiles` e não enxerga nada (falha segura). O engenheiro não a vê na lista; a pessoa precisa avisar por fora, e a construção deve incluir um jeito de recriar o perfil.

### Frente se encerra sozinha
- **Gatilho:** `frente_ambientes.concluido_em` preenchido e todos os ambientes daquela frente já têm `concluido_em`.
- **Passos:** 1. muda `frentes.situacao` para `Concluída`. 2. preenche `frentes.concluida_em` com a data mais recente.
- **Resultado:** a frente some de Frentes em risco (e, na segunda entrega, entra em "a medir").
- **Se falhar:** a frente segue `Em andamento` e continua contando dias perdidos; o engenheiro encerra à mão pelo detalhe.

(Também automáticas, mas simples, não contam como processo: `Não iniciada` → `Em andamento` no primeiro `Andou`; pendência `Aberta` → `Respondida` no comentário da arquiteta; criador da obra vira membro.)

## Tabela `config`

Para que serve: dados da empresa que valem para todas as obras. Uma linha só.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave; uma linha |
| logo_caminho | text | não | arquivo no Storage, pasta `marca/`; vazio = logo padrão da BMR |
| created_at | timestamptz | sim | automático |

**Permissões:** ver: todos, inclusive sem login (o logo aparece na tela de entrada — marcar `publico-de-proposito` só nesta leitura); editar: só Engenheiro.

---

## Arquivos

- Guardados no Storage, no bucket privado `fotos`, pasta `{obra_id}`.
- Imagem comprimida no navegador antes de subir (máx. 1200px, qualidade 0.8).
- O banco guarda `caminho`; a exibição usa link temporário assinado.
- Importação do cronograma: CSV lido no navegador (colunas Nome, Início, Término, Folga total); nada é guardado como arquivo.

## Critérios de aceite

- [ ] Usuário recém-cadastrado não enxerga nenhum dado até ser liberado.
- [ ] Um membro só da obra 2 não consegue ler nenhuma linha da obra 1, em nenhuma tabela, nem pelo Storage.
- [ ] Mestre e arquiteta não conseguem ler nenhuma linha de `contratos`, nem pedindo direto ao banco.
- [ ] Foto recém-criada nasce com `visivel_cliente = falso`.
- [ ] O cliente não consegue ler `frentes`, `empreiteiros`, `diarios`, `apontamentos`, `pendencias` nem `comentarios`; só recebe ambiente + %, a data de entrega e as fotos liberadas dos últimos 7 dias.
- [ ] O cliente não recebe foto com `visivel_cliente = falso` nem com mais de 7 dias.
- [ ] O mestre não consegue editar diário nem apontamento depois do fim do dia seguinte à data, nem apagar nada.
- [ ] Apontamento `Não andou` sem motivo é recusado; motivo `Outro` sem detalhe é recusado.
- [ ] Com os dados de exemplo do PRD-FRONTEND, a visão de frentes devolve exatamente 2 frentes `Estourou a folga` na obra 1 (Impermeabilização e Pintura fachada).
- [ ] Marcar o último ambiente de uma frente muda a frente para `Concluída`.
- [ ] O engenheiro consegue trocar o perfil de qualquer usuário.
- [ ] Os valores de status do banco são idênticos aos da interface.
- [ ] Todo campo obrigatório recusa cadastro vazio.

## A conta que vai chegar depois

- `[PENDENTE: formato do arquivo exportado do MS Project]` — custo: ajuste de colunas na importação.

## Decidir depois de usar

- Limite de `Atenção` — por enquanto: 0 a 5 dias úteis de folga restante.
- Dia sem diário nenhum conta como dia perdido? — por enquanto: não.
- Peso de cada serviço no % por ambiente — por enquanto: todos iguais.
- Espaço de fotos no plano grátis — por enquanto: compressão a 1200px.

---

# Segunda entrega (fora da v1)

Decidido em 20/10/2026: a Medição ficaria para depois da v1. **Antecipada em 23/10/2026**: as duas tabelas entram na Etapa 7 junto com as outras. Acréscimos de 23/10: o número da medição (nº 1, nº 2…) é calculado pela ordem do período dentro do empreiteiro, sem coluna própria — os períodos não se sobrepõem e só o rascunho, que é sempre o último, pode ser apagado; a soma dos itens de uma frente nunca passa do valor contratado; o valor sugerido nunca passa do que sobra do contrato; uma medição com todas as frentes em 0 não é aceita (cada frente pode ser 0). Na v1, `contratos` e `frente_ambientes.concluido_em` já guardam o que a medição vai precisar.

## Tabela `medicoes`

Para que serve: a medição de um empreiteiro num período.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| empreiteiro_id | uuid | sim | |
| periodo_inicio | date | sim | |
| periodo_fim | date | sim | ≥ periodo_inicio |
| situacao | text | sim | CHECK: `Rascunho`, `Fechada`; padrão `Rascunho` |
| fechada_em | timestamptz | não | |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** `Fechada` não muda mais (nem ela, nem os itens).

---

## Tabela `medicao_itens`

Para que serve: o valor medido de cada frente numa medição.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| medicao_id | uuid | sim | |
| frente_id | uuid | sim | do mesmo empreiteiro da medição |
| valor_sugerido | numeric(14,2) | sim | contratado × ambientes concluídos no período ÷ ambientes da frente |
| valor | numeric(14,2) | sim | ≥ 0 |
| justificativa | text | não | obrigatória se valor ≠ valor_sugerido |
| created_at | timestamptz | sim | automático |

**Valores calculados:** medido até hoje (soma dos itens de medições `Fechada`), saldo (contratado − medido), a medir (ambientes concluídos depois do fim da última medição fechada).

### Permissões de `medicoes` e `medicao_itens`
- **Ver / criar / editar / apagar:** **só engenheiro**, e só enquanto `Rascunho`. Fechada: só leitura, para ele também.

### Critérios de aceite da segunda entrega
- [ ] Mestre e arquiteta não conseguem ler nenhuma linha de `medicoes` ou `medicao_itens`.
- [ ] Medição `Fechada` não aceita alteração de ninguém.
