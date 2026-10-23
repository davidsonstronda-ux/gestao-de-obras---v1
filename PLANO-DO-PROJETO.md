# Plano do Projeto — Gestão de Obras (nome provisório)

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 23/10/2026 — a Medição foi antecipada (decisão do Davidson em 23/10): construída agora, ainda no mock, seguindo a especificação dos PRDs; nº do boletim por empreiteiro, digitar % ou R$ e trava de 100% do contratado vieram do modelo do curso. Antes: 21/10/2026 — acrescentado o módulo Planejamento (Last Planner + EAP), decidido pelo Davidson em 21/10: atividades ligadas às frentes, mestre só no Curto prazo, causas = motivos do diário. Antes: 20/10/2026 — Etapas 1 e 3 escritas, Etapa 2 pendente. PRD-FRONTEND.md e PRD-BACKEND.md gerados em 20/10. Os 7 pontos que estavam [A CONFIRMAR] foram decididos pelo Davidson em 20/10 (ver "Decisões de 20/10" na Etapa 3). Resolvido em 20/10: são várias obras, com seletor; a Medição foi para a segunda entrega.
> O rascunho anterior (5 obras, foco em medição) ficou guardado em "PLANO-DO-PROJETO (rascunho anterior - 5 obras).md".

## Em uma frase

Um sistema de **acompanhamento de frentes de serviço** que responde toda manhã **"a data de entrega do cliente está de pé?"** para o **engenheiro que coordena 12 empreiteiros, uma arquiteta e um mestre**, fazendo **o mestre registrar no canteiro, todo dia, o que andou e o que parou, e cruzando isso com a folga de cada serviço no cronograma**.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — O atraso só aparece duas semanas depois
- **Como acontece hoje:** a informação está em três lugares (o que o mestre conta no canteiro, o WhatsApp dos empreiteiros, a planilha de medição). O cronograma no MS Project só é aberto quando o cliente pergunta.
- **Frequência:** toda semana.
- **Custo:** a tarde inteira de toda sexta (≈ 4 h/semana) e, na segunda, ainda sem saber se a entrega está de pé. Quando um atraso é descoberto, já passaram ~2 semanas.
- **Último caso:** [PENDENTE: a última frente que atrasou e só foi descoberta depois — qual, e quanto empurrou]

### Problema 2 — O registro da obra não serve pra nada depois
- **Como acontece hoje:** diário no caderno que ninguém relê; fotos soltas em 5 grupos de WhatsApp.
- **Frequência:** todo dia.
- **Custo:** [PENDENTE] — sem histórico confiável para mostrar ao cliente ou cobrar empreiteiro.

### Problema 3 — A medição está sempre desatualizada
- **Como acontece hoje:** planilha com uma aba por empreiteiro, atualizada na mão.
- **Frequência:** a cada medição.
- **Custo:** [PENDENTE]

## A solução

Cada um dos 30 serviços contratados vira uma **frente**, com responsável (empreiteiro), datas do cronograma e **folga** (quantos dias pode atrasar sem empurrar a entrega). Todo dia o mestre abre o app no celular e, para cada frente em andamento, toca em **"andou hoje"** ou **"não andou — motivo"**, com foto, e marca o que foi **concluído** (por ambiente). O sistema calcula há quantos dias cada frente não anda e a **data limite de decisão**: o último dia para agir antes de aquele atraso empurrar a entrega. A arquiteta responde as pendências de projeto que travam frentes; o cliente vê o avanço por ambiente e as fotos da semana.

**O que ele NÃO faz (v1):**
- Orçamento, composição de preço, SINAPI (você já resolve isso)
- Recalcular o caminho crítico sozinho: o cronograma das frentes vem do MS Project (importado). O módulo Planejamento (21/10) planeja as atividades por baixo das frentes, mas não calcula caminho crítico nem mexe na folga das frentes
- Contas a pagar / financeiro completo (só valor contratado × medido)
- App nativo de loja (é site que abre no celular e "instala" na tela inicial)
- Empreiteiro entrando no app

## Funcionalidades

### Frentes em risco (TELA DO DIA A DIA — engenheiro)
- **Abre em:** lista da obra selecionada
- **Mostra, por linha:** serviço · responsável (empreiteiro) · **há quantos dias não anda** · motivo do último "não andou" · **data limite de decisão** e quantos dias faltam pra ela · situação (No prazo / Atenção / Estourou a folga)
- **Ordem:** pela data limite de decisão, a mais próxima primeiro (quem já estourou a folga fica no topo, em vermelho). Frentes concluídas e as que ainda não começaram ficam escondidas.
- **Filtro:** situação, responsável, "travada por projeto"
- **No topo da tela, uma linha:** "Entrega prevista: dd/mm — de pé" ou "em risco: N frentes já comeram a folga"
- **Ações:** abrir, cobrar o responsável (WhatsApp com texto pronto), registrar decisão tomada
- **Ao clicar:** histórico da frente (lançamentos do mestre, fotos, pendências de projeto ligadas, datas)
- **Vazio:** "Nenhuma frente em risco. A entrega de dd/mm está de pé."
- **Nasce e morre:** é calculada; não se cadastra nada aqui.

### Obras (seletor)
- **Abre em:** seletor no topo de todas as telas
- **Mostra:** nome · código/apelido · endereço · cliente · data de início · data-meta de entrega · situação (Em andamento / Parada / Concluída). Concluída sai do seletor; Parada continua. A obra escolhida fica guardada ao reabrir o app.
- **Ações:** criar, editar, concluir (só engenheiro)
- **Vazio:** "Nenhuma obra cadastrada. Crie a primeira."

### Frentes de serviço (cadastro)
- **Abre em:** lista da obra
- **Mostra:** serviço · responsável · ambientes onde acontece · início e término previstos · folga (dias) · % concluído · valor contratado e medido (só engenheiro)
- **Ações:** criar, editar, importar do cronograma (planilha exportada do MS Project), encerrar
- **Vazio:** "Importe seu cronograma ou cadastre o primeiro serviço."
- **Nasce e morre:** nasce na importação do cronograma ou no cadastro; termina ao concluir todos os ambientes.

### Diário do dia (mestre)
- **Abre em:** formulário de hoje, pensado para celular
- **Mostra:** data · clima · equipes presentes (empreiteiro + nº de pessoas) · cada frente em andamento com dois botões: **Andou** / **Não andou** (motivo: falta material, falta gente, aguardando projeto, aguardando outra frente, chuva, outro) · **Concluí** (escolhendo os ambientes) · fotos (marcando a frente e o ambiente) · ocorrências
- **Ações:** lançar, editar o próprio até o fim do dia seguinte
- **Vazio:** "Diário de hoje ainda não lançado."
- **Nasce e morre:** um por obra por dia; depois de 2 dias fica travado (só o engenheiro corrige).

### Pendências de projeto (arquiteta + engenheiro)
- **Abre em:** lista
- **Mostra:** pergunta · frente que ela trava · aberta por · data · prazo da resposta (puxado da data limite de decisão da frente) · situação (Aberta / Respondida / Fechada)
- **Ordem:** a que trava a frente mais urgente primeiro
- **Ações:** engenheiro e mestre abrem; arquiteta e engenheiro comentam; engenheiro fecha
- **Vazio:** "Nenhuma pendência de projeto aberta."

### Medição (só engenheiro) — era segunda entrega (20/10); antecipada pelo Davidson em 23/10, entra antes do deploy
- **Abre em:** lista por empreiteiro
- **Mostra:** empreiteiro · serviços · valor contratado · medido até hoje · **a medir** (concluído pelo mestre e ainda não medido) · saldo
- **Ações:** gerar medição do período, ajustar com justificativa, fechar, exportar para Excel
- **Vazio:** "Nada a medir. O mestre ainda não concluiu nenhum serviço desde a última medição."

### Fotos
- **Abre em:** galeria por semana
- **Mostra:** foto · frente · ambiente · data · quem tirou · visível ao cliente (sim/não)
- **Ações:** enviar (pelo diário), liberar ou tirar do cliente (engenheiro; toda foto nasce **não liberada**), apagar (engenheiro)

### Painel do cliente
- **Abre em:** a obra dele
- **Mostra:** data de entrega · % de avanço por ambiente (sala, cozinha, suíte master…) · fotos da semana
- **Ações:** só ver

### Materiais — Kanban de pedidos (engenheiro e mestre; arquiteta só vê) — acrescentado em 20/10
- **Conceito:** não é estoque item a item. Cada cartão é um **pedido** (ex.: "50 sacos de cimento" para a frente Pintura fachada) que anda por 5 colunas: **Solicitar → Em cotação → A caminho → No almoxarifado → Entregue**.
- **Abre em:** o quadro da obra escolhida, sem a coluna Entregue (o filtro "ver entregues" mostra).
- **Mostra:** contadores no topo (em cotação · chegam em 7 dias · atrasados) · em cada cartão: material + quantidade, frente, etiqueta (vermelha = crítico; azul = material grosso; verde = acabamento/instalações), fornecedor e previsão, "há X dias nesta coluna" e o **lead time** (dias entre Solicitar e No almoxarifado).
- **Atrasado:** previsão de entrega vencida e o pedido ainda "A caminho" → cartão vermelho com a etiqueta "Atrasado".
- **Ações:** novo pedido em menos de 30 s (material do catálogo, quantidade, frente, prioridade; entra em Solicitar) · mover por botões, sem arrastar: avançar uma coluna ou voltar uma.
  - para **A caminho**: fornecedor e previsão de entrega obrigatórios;
  - para **No almoxarifado**: checklist de recebimento — quantidade bate com a NF? (sim/não), material em perfeito estado? (sim/não), avarias (opcional), foto da NF (opcional). Um "não" marca o cartão com alerta;
  - para **Entregue**: confirmar a frente onde o material foi aplicado.
- **Toda mudança de coluna fica no histórico** (coluna + data + quem); é dele que saem o tempo na coluna e o lead time.
- **Sem valor em R$** nesta versão. Se o preço entrar, vai para tabela separada (como `contratos`), para o mestre e a arquiteta não verem.
- **Catálogo de materiais:** da empresa, vale para todas as obras (nome, unidade, categoria Grosso / Acabamento / Instalações). Na v1 vem pronto; o cadastro do catálogo fica para depois.
- **Vazio:** "Nenhum pedido de material nesta obra. Faça o primeiro."
- **Estoque (opcional, acrescentado em 20/10):** aba "Estoque" dentro de Materiais. Cada **insumo** é um material do catálogo naquela obra, com saldo e saldo mínimo.
  - **Entrada automática:** pedido que chega a No almoxarifado com o checklist todo "sim" gera uma entrada com a quantidade do pedido (cria o insumo se ainda não existir, com mínimo 0). Um pedido gera no máximo uma entrada, mesmo se voltar de coluna e for recebido de novo. Recebido com problema não entra sozinho.
  - **Baixa de estoque (saída manual):** insumo, quantidade, frente e data (nasce com hoje). O saldo nunca fica negativo: baixa maior que o saldo é recusada com aviso.
  - **Mostra:** tabela insumo · saldo · mínimo · situação (etiqueta vermelha "Crítico" quando saldo ≤ mínimo), busca e filtro "só críticos"; tocar no insumo abre o histórico de movimentos. Contador "Insumos críticos" ao lado dos três do quadro.
  - Quem faz baixa: engenheiro e mestre. Arquiteta só vê. Cliente não vê.

### Planejamento — Last Planner em 3 horizontes + EAP (engenheiro; mestre só o Curto prazo; arquiteta só vê) — acrescentado em 21/10
- **Conceito:** a frente continua sendo o serviço contratado que vem do MS Project, com folga. O Planejamento quebra a obra em **atividades** (mais finas que a frente), cada uma podendo ser **ligada a uma frente**. Uma lista só de atividades por obra; as 4 abas leem e mudam a mesma lista. Ciclo de uso: EAP → Longo prazo → Médio prazo → Curto prazo.
- **Calendário da obra:** dias de trabalho (padrão segunda a sábado) e feriados, por obra. Durações e prazos do Planejamento são em **dias úteis** desse calendário. A regra da folga (Frentes em risco) continua segunda a sábado, sem feriados.
- **Aba EAP (a base):** árvore com código automático (1, 1.1, 1.2.1…) pela ordem dentro de cada nível. Criar (título, início, fim, "dentro de" outra atividade ou no nível principal, frente ligada opcional), editar, adicionar subatividade, subir/descer na ordem, arquivar/desarquivar. Atividade com subatividades é um **grupo**: início, fim e % saem das subatividades. Arquivar um grupo arquiva as subatividades junto (pede confirmação); desarquivar devolve a atividade, as subatividades e os grupos acima. Arquivada some da árvore e do código; o filtro "mostrar arquivadas" mostra.
- **Aba Longo prazo (cronograma):** barras em CSS por semana ou por mês, com início, fim e % realizado × % previsto (o previsto é a fração dos dias úteis já passados). No celular vira lista: código, título, datas, progresso. Linha de base fica para depois.
- **Aba Médio prazo (lookahead, 3 a 6 semanas):** quadro com uma coluna por semana, com as **restrições** (impedimentos) das atividades. Restrição: descrição, tipo, atividade, prazo de resolução (nasce com hoje), responsável. Tipos com cor e ícone: Material, Mão de obra, Método, Equipamento, Projeto, Segurança, Logística. Marcar resolvida; mover de semana por botões (semana anterior / próxima). Filtros: nº de semanas, responsável, mostrar resolvidas.
- **Aba Curto prazo (semana, Kanban + PPC):** colunas A fazer · Em andamento · Concluído, mover por botões. Subtarefas (checklist) dentro de cada atividade. Marcar atividade ou subtarefa como **Não realizado** exige a causa, com os **mesmos motivos do diário** (Falta material, Falta gente, Aguardando projeto, Aguardando outra frente, Chuva, Outro). Entra na semana a atividade cujo período cruza a semana **ou** que deveria ter terminado e não terminou (acumulada). **PPC** = concluídas ÷ planejadas da semana × 100: número grande, barra e "X de Y concluídas". Navegar entre semanas.
- **Quem:** engenheiro faz tudo; mestre vê e mexe só no Curto prazo (move cartão, inclui e marca subtarefa, informa causa); arquiteta vê as 4 abas sem mexer; cliente não vê. No celular do mestre, Materiais e Planejamento ficam dentro de "Mais" (a barra só cabe 5).
- **Vazio:** "Esta obra ainda não tem atividades planejadas. Monte a EAP pela primeira atividade."
- **Importar cronograma por planilha (acrescentado em 21/10):** na aba EAP, **Baixar planilha modelo** (colunas ITEM, Atividade, Início, Término, Duração (Dias); ITEM formatado como texto) e **Importar planilha** (.xlsx ou .csv). A leitura é toda no navegador: nenhum dado sai do aparelho, sem IA e sem servidor. A hierarquia sai do código da coluna ITEM (1 → 1.1 → 1.1.1, em qualquer profundidade; "1.0" vale "1"). Antes de criar qualquer coisa, uma **tela de conferência** mostra a árvore e os erros (código órfão ou repetido, data inválida, término antes do início, atividade sem nome), dá para corrigir ali, e só "Confirmar importação" grava. Se a obra já tem atividades: **Adicionar** (entram depois das atuais) ou **Substituir** (as atuais vão para Arquivadas; nada se apaga). As datas alimentam o Longo prazo. Não confundir com a importação das **frentes** (Cadastros › Frentes e cronograma, MS Project), que continua como estava.

## Unidade principal

**Obra** — vai existir mais de uma? **sim** — o Davidson toca várias ao mesmo tempo (a de alto padrão descrita aqui é uma delas). Seletor de obra no topo de todas as telas; os dados de uma obra **nunca** aparecem misturados com os de outra, nem nas listas, nem na medição, nem nas fotos. Alguém trabalha em mais de uma ao mesmo tempo? **[AINDA NÃO RESPONDIDO — proposta: sim, o engenheiro e a arquiteta]**. Cada pessoa só enxerga as obras às quais foi vinculada.

## Perfis de usuário

- **Engenheiro:** dono de tudo · primeira tela: Frentes em risco
- **Mestre de obras:** lança diário, foto e conclusão · primeira tela: Diário do dia
- **Arquiteta:** responde pendências de projeto · primeira tela: Pendências de projeto
- **Cliente:** acompanha · primeira tela: Painel do cliente

### Matriz de permissões (proposta)

| Ação | Engenheiro | Mestre | Arquiteta | Cliente |
|---|---|---|---|---|
| Ver obras | todas | só a(s) dele | as vinculadas | só a dele |
| Ver frentes, datas e folga | sim | sim | sim | não (só % por ambiente) |
| Ver nome do empreiteiro/fornecedor | sim | sim | sim | **não** |
| **Ver valor contratado e medido** | sim | **não** | **não** | **não** |
| Lançar diário, foto, concluir serviço | sim | sim | não | não |
| Ler o diário e as ocorrências | sim | sim | sim | **não** |
| Ver fotos | todas | todas | todas | **só as dos últimos 7 dias que o engenheiro liberou** |
| Abrir pendência de projeto | sim | sim | sim | não |
| Comentar pendência | sim | sim | sim | não |
| Fechar pendência | sim | não | não | não |
| Medição (segunda entrega) | sim | não | não | não |
| Criar/editar obra e frente, importar cronograma | sim | não | não | não |
| Materiais: ver o quadro de pedidos | sim | sim | sim | não |
| Materiais: fazer e mover pedido, dar baixa no estoque | sim | sim | não | não |
| Planejamento: ver EAP, Longo e Médio prazo | sim | não | sim | não |
| Planejamento: montar EAP, restrições, calendário | sim | não | não | não |
| Planejamento: ver e mexer no Curto prazo (Kanban, subtarefas, causa) | sim | sim | só vê | não |
| Apagar qualquer coisa | sim | não | não | não |
| Gerenciar usuários | sim | não | não | não |
| **Quem não fez login** | não vê nada | | | |

## Fluxo de cadastro

1. A pessoa se cadastra sozinha com email e senha
2. Entra sem perfil e não vê dado nenhum
3. Vê o aviso "Conta aguardando liberação do engenheiro"
4. O engenheiro libera, escolhe o perfil e vincula à(s) obra(s)

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | a assinatura que já tem |
| React + Vite | a interface | grátis |
| Supabase | banco, login e fotos | grátis até crescer |
| Vercel | colocar no ar | grátis |
| GitHub | guardar o código | grátis |
| SheetJS (xlsx) | ler e gerar planilha .xlsx no navegador (importação do cronograma). Única biblioteca além do Supabase, a pedido do Davidson em 21/10 | grátis |

**Total por mês:** R$ 0 no começo
**O que custaria a alternativa pronta:** [AINDA NÃO RESPONDIDO]

## Prazo

- **Quer usar de verdade em:** [AINDA NÃO RESPONDIDO]
- **Horas por semana disponíveis:** [AINDA NÃO RESPONDIDO]

---

# 2. Insights do Mercado

[PENDENTE: benchmark não pesquisado] — nesta rodada não foi feita busca de concorrentes. Nenhum nome, preço ou funcionalidade de concorrente foi escrito aqui de propósito: preço inventado é pior que preço nenhum. Se quiser, dê uma olhada em 2 ou 3 apps de diário de obra que já ouviu falar e anote o que gostou e quanto custam.

**Referência visual (proposta):** lista densa e legível, estilo "caixa de entrada": uma linha por frente, cor só na etiqueta de situação. Nada de painel de gráficos na abertura.

# 3. Arquitetura

> Etapa proposta pela IA em 20/10/2026; os pontos abaixo foram decididos pelo Davidson no mesmo dia, escolhendo entre opções.

## Decisões de 20/10

1. **Ordem da tela Frentes em risco:** pela **data limite de decisão** (menos folga sobrando primeiro), com botão para trocar para "mais dias sem andar". Estourou a folga sempre no topo.
2. **Arquiteta vê o nome do empreiteiro** de cada frente: **sim**.
3. **Arquiteta lê o diário do mestre** e as ocorrências: **sim**.
4. **Mestre vê o nome do empreiteiro** e nenhum valor: segue a descrição original do Davidson ("não vê nenhum valor"). Não foi perguntado à parte.
5. **Fotos do cliente:** **nenhuma foto aparece para o cliente até o engenheiro liberar.** O painel mostra as fotos liberadas dos últimos 7 dias.
6. **Cliente vê só a data de entrega prometida.** O aviso "em risco" fica só para o engenheiro.
7. **Medição vai para a segunda entrega.** Na v1 o valor contratado continua cadastrado (só o engenheiro vê) e o mestre já marca o que concluiu em cada ambiente, para a medição nascer com histórico.

## Como o sistema calcula o atraso (regra central)

- Cada frente tem, vindos do cronograma: **início previsto**, **término previsto** e **folga** (dias que pode atrasar sem empurrar a entrega — a "folga total" do MS Project).
- **Dia perdido:** todo dia com diário lançado, a partir do início previsto da frente, em que ela não recebeu "Andou" (marcada "Não andou", ou sem marcação, ou ainda não começou). Dia sem diário nenhum não conta.
- **Folga que sobra** = folga − dias perdidos.
- **Data limite de decisão** = hoje + folga que sobra (em dias úteis, segunda a sábado). É o último dia para agir antes de empurrar a entrega.
- **Situação:** folga que sobra < 0 → **Estourou a folga**; de 0 a 5 dias → **Atenção**; mais de 5 → **No prazo**.
- **Há quantos dias não anda** = dias desde o último "Andou" (ou desde o início previsto, se nunca andou).
- **Entrega de pé?** Se nenhuma frente estourou a folga: "de pé". Senão: "em risco: N frentes já comeram a folga".
- Limite: o app **não** recalcula o caminho crítico. Se o cronograma mudar, o engenheiro reimporta.

## Mapa de telas

```
Login / Criar conta / Aguardando liberação
└── Engenheiro (seletor de obra no topo)
    ├── Frentes em risco  (início)  →  Detalhe da frente
    ├── Diário  →  Diário do dia
    ├── Pendências de projeto  →  Detalhe da pendência
    ├── Fotos
    ├── Materiais (pedidos)
    ├── Planejamento: EAP · Longo prazo · Médio prazo · Curto prazo
    └── Cadastros: Obras · Frentes e cronograma · Empreiteiros · Ambientes · Equipe
└── Mestre (seletor de obra no topo)
    ├── Diário do dia  (início)
    ├── Frentes  →  Detalhe da frente (sem valores)
    ├── Pendências de projeto
    ├── Fotos
    └── Mais: Materiais · Planejamento (só o Curto prazo)
└── Arquiteta (seletor de obra no topo)
    ├── Pendências de projeto  (início)
    ├── Frentes  →  Detalhe da frente (sem valores)
    └── Fotos
└── Cliente
    └── Painel da obra  (início e única tela)
```

- 6 itens de menu no máximo (engenheiro tem 5). Celular: barra inferior com 5 (Frentes · Diário · Pendências · Fotos · Mais); "Mais" abre Cadastros. Computador: menu lateral.
- "Meu perfil" (trocar nome e senha, sair) fica no canto do topo, não no menu.

## Processos automáticos (2)

**1. Conta nova nasce trancada**
- Gatilho: alguém cria conta.
- Passos: 1. cria o perfil com papel "Pendente". 2. não vincula a nenhuma obra.
- Resultado: a pessoa vê "Conta aguardando liberação do engenheiro"; o engenheiro vê a conta na tela Equipe.
- Se falhar: a conta fica sem perfil e não enxerga nada (falha segura); o engenheiro não a vê na lista e precisa ser avisado pela pessoa.

**2. Frente se encerra sozinha**
- Gatilho: o mestre marca "Concluí" no último ambiente que faltava daquela frente.
- Passos: 1. a frente muda para "Concluída". 2. registra a data de conclusão.
- Resultado: some da tela Frentes em risco (e, na segunda entrega, aparece em "a medir" na Medição).
- Se falhar: a frente continua "Em andamento" e segue contando dias sem andar; o engenheiro encerra na mão pelo detalhe da frente.

Avisos automáticos (lembrete de diário não lançado, resumo de segunda por email) ficaram para a v2.

## Modelagem de dados (resumo — detalhe no PRD-BACKEND.md)

| Tabela | Serve para |
|---|---|
| profiles | a pessoa logada e o papel dela |
| obras | cada obra, com cliente e data de entrega prometida |
| membros | quem trabalha em qual obra |
| ambientes | sala, cozinha, suíte master… de cada obra |
| empreiteiros | os responsáveis pelas frentes, por obra |
| frentes | os serviços contratados, com datas e folga |
| frente_ambientes | em quais ambientes cada frente acontece e quando foi concluída em cada um |
| contratos | valor contratado de cada frente (separado para o mestre e a arquiteta não verem) |
| diarios | um por obra por dia: clima, equipes, ocorrências |
| apontamentos | o "Andou / Não andou" de cada frente em cada diário |
| fotos | as fotos, ligadas a frente e ambiente |
| pendencias | as pendências de projeto |
| comentarios | a conversa de cada pendência e os comentários/decisões no detalhe da frente |
| materiais | o catálogo de materiais da empresa (vale para todas as obras) |
| pedidos | cada pedido de material da obra, a coluna em que está e o recebimento |
| pedido_historico | cada mudança de coluna de um pedido (de onde saem o tempo na coluna e o lead time) |
| insumos | o saldo de cada material do catálogo numa obra, com o saldo mínimo |
| movimentos | cada entrada (do pedido recebido) e saída (baixa) de um insumo |
| calendarios | os dias de trabalho de cada obra (Planejamento) |
| feriados | os feriados de cada obra (Planejamento) |
| atividades | a EAP: cada atividade, com pai, ordem, datas, %, frente ligada e coluna do Kanban |
| restricoes | os impedimentos das atividades no Médio prazo |
| subtarefas | o checklist de cada atividade no Curto prazo |
| nao_realizados | a atividade planejada na semana que não foi concluída, com a causa |

Na segunda entrega entram mais duas: `medicoes` (a medição de um empreiteiro num período) e `medicao_itens` (o valor medido de cada frente naquela medição).

## A pergunta de daqui a um ano (proposta)

"Quais empreiteiros mais me fizeram perder folga, e por qual motivo?" — **confirmada pelo Davidson em 20/10.** Já está coberta: cada "Não andou" guarda a frente (e portanto o empreiteiro), a data e o motivo.

## Melhorias da v2

- **Medição** (contratado × medido × a medir por empreiteiro, gerar, ajustar, fechar e exportar) — primeira da fila; decidido em 20/10 para a v1 entrar no ar mais rápido. Especificação já pronta no fim dos dois PRDs.
- Lembrete automático quando o diário do dia não foi lançado — exige serviço de notificação.
- Resumo de segunda de manhã por email — idem.
- Empreiteiro entrando no app para ver as próprias frentes — mais um perfil e mais permissões.
- Recalcular caminho crítico dentro do app — é trabalho de MS Project.
- Cadastro único de empreiteiro entre obras — na v1 cada obra tem os seus, para nunca misturar.
- Registro formal de "decisão tomada" com nova data — na v1 vai como comentário no detalhe da frente.
- Importar direto o arquivo do MS Project — na v1 importa a planilha CSV salva pelo Excel.

## Tamanho da v1

14 telas · 24 tabelas · 3 processos · 4 perfis (Materiais acrescentado em 20/10: 1 tela com a aba Estoque, 5 tabelas, a entrada automática no estoque. Planejamento acrescentado em 21/10: 1 tela com 4 abas, 6 tabelas). A Medição (1 tela, 2 tabelas) foi para a segunda entrega por decisão do Davidson em 20/10. Mesmo assim a v1 passa da régua do método (mais de 7 tabelas); o resto é o mínimo para separar obras, esconder dinheiro e calcular a folga, então fica.

---

# A conta que vai chegar depois

- `[PENDENTE: o último atraso descoberto tarde]` — custo: sem ele, não dá para medir se o app resolveu.
- `[PENDENTE: custo dos problemas 2 e 3]` — custo: pouco; só serve de régua.
- `[PENDENTE: benchmark não pesquisado]` — custo: risco de construir algo que já existe pronto e barato.
- `[PENDENTE: prazo e horas por semana]` — custo: sem isso não dá para saber se a v1 (13 telas, 15 tabelas) cabe no tempo.
- `[PENDENTE: formato do cronograma exportado do MS Project]` — custo: a importação foi desenhada para as colunas Nome, Início, Término e Folga total; se o seu arquivo vier diferente, ajusta na construção.

# Decidir depois de usar

- `[DESCOBRIR NO USO: peso de cada serviço no % por ambiente]` — por enquanto: todos os serviços valem igual dentro do ambiente.
- `[DESCOBRIR NO USO: limite de "Atenção"]` — por enquanto: 5 dias úteis de folga ou menos.
- `[DESCOBRIR NO USO: espaço de fotos]` — por enquanto: fotos comprimidas no envio (1200 px).
- `[DESCOBRIR NO USO: dia sem diário nenhum conta como dia perdido?]` — por enquanto: não conta. Só conta o dia em que o diário foi lançado e a frente ficou marcada "Não andou" ou sem marcação (para não punir a frente pelo esquecimento do mestre).
