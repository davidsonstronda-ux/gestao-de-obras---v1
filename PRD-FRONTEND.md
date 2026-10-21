# PRD Frontend — Gestão de Obras (nome provisório)

> Especificação da interface. Quem constrói lê este arquivo.
> Nesta fase não existe banco: as telas funcionam com os dados de exemplo do fim deste arquivo.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.
> Revisado em 20/10/2026 com as decisões do Davidson (ordem da lista, acesso da arquiteta, fotos do cliente, data do cliente, Medição na segunda entrega).

## O que o sistema é

Um sistema de acompanhamento de frentes de serviço que responde toda manhã "a data de entrega do cliente está de pé?", para um engenheiro que toca várias obras com empreiteiros, arquiteta e mestre. Usado no **celular, no canteiro** (mestre) e no **celular ou computador** (engenheiro, arquiteta, cliente).

## Padrão técnico

- React + Vite (versões atuais), sem biblioteca de componente pronta.
- Visual a partir de um `index.css` próprio.
- Navegação por estado, sem endereço no navegador.
- Identidade BMR Construtora (opção 2, escolhida em 20/10/2026): cabeçalho, menu lateral e login em preto `#000000` com o logo (`public/logo-bmr.webp`, branco sobre transparente; inteiro no menu e no login, só o símbolo no cabeçalho do celular); a turquesa é só a cor de ação. Layout de referência: `preview.html` ("Painel"). Paleta: `#26333A` (texto escuro, seleção), `#4A5A63` (texto secundário), fundo `#F2F4F5`, destaque turquesa `#00A3B4` (faixas, barras; `#007A87` em botão com texto branco), vermelho `#E2574C` (faixas e números grandes; `#C4372D` em etiqueta com texto branco). Situação: verde `#237A4B` (No prazo), âmbar `#F0A93B` (Atenção), vermelho (Estourou a folga). Fontes IBM Plex Sans e IBM Plex Mono. Cantos de 6px. Tema claro.
- Mobile primeiro. Celular: barra inferior fixa com até 5 itens. Computador: menu lateral à esquerda.
- **Seletor de obra** fixo no topo de todas as telas (exceto para o cliente, que só tem uma obra). Trocar a obra recarrega a tela atual com os dados daquela obra; nada de uma obra aparece na outra.
- Datas sempre em `dd/mm/aaaa`; dinheiro em `R$ 1.234,56`.

## Perfis

- **Engenheiro:** entra em Frentes em risco. Vê tudo, inclusive valor contratado e medido.
- **Mestre:** entra em Diário do dia. Lança diário, fotos e conclusões. Não vê nenhum valor.
- **Arquiteta:** entra em Pendências de projeto. Vê frentes e fotos, comenta pendências. Não vê valores nem contratos.
- **Cliente:** entra no Painel da obra. Vê avanço por ambiente e fotos da semana. Não vê custo nem nome de empreiteiro.
- **Pendente:** quem criou conta e ainda não foi liberado. Só vê o aviso de espera.

## Mapa de navegação

```
Login · Criar conta · Aguardando liberação
└── Engenheiro: Frentes em risco · Diário · Pendências · Fotos · Materiais · Planejamento · Cadastros (Obras, Frentes e cronograma, Empreiteiros e ambientes, Equipe)
└── Mestre:     Diário do dia · Frentes · Pendências · Fotos · Materiais · Planejamento (só Curto prazo)
└── Arquiteta:  Pendências · Frentes · Fotos · Materiais · Planejamento (só vê)
└── Cliente:    Painel da obra
```

- Barra inferior do engenheiro no celular: **Frentes · Diário · Pendências · Fotos · Mais** ("Mais" abre Cadastros).
- Barra inferior do mestre no celular (desde 21/10, quando entrou o Planejamento): **Diário · Frentes · Pendências · Fotos · Mais** ("Mais" abre Materiais e Planejamento).
- "Meu perfil" (nome, trocar senha, Sair) fica num ícone no canto superior direito, para todos os perfis.
- "Frentes" do mestre e da arquiteta é a mesma tela Frentes em risco, sem nenhum valor e sem ações de engenheiro.

---

## Tela: Login

**Quem acessa:** todos, antes de entrar.

**O que aparece**
Nome do sistema, campo de email, campo de senha, botão Entrar, link Criar conta.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Email | email | sim | |
| Senha | senha | sim | mínimo 8 caracteres |

**Ações**
- **Entrar:** valida e leva para a tela inicial do perfil. Erro: "Email ou senha incorretos."
- **Criar conta:** abre o formulário com Nome, Email e Senha; ao salvar, leva para Aguardando liberação.

**Estado vazio**
Não se aplica.

---

## Tela: Aguardando liberação

**Quem acessa:** perfil Pendente, ou qualquer perfil sem nenhuma obra vinculada (exceto engenheiro).

**O que aparece**
"Conta aguardando liberação do engenheiro. Assim que ele liberar, você entra direto na sua obra." Botão Sair.

**Estado vazio**
Não se aplica.

---

## Tela: Frentes em risco (tela do dia a dia)

**Quem acessa:** Engenheiro (tela inicial). Mestre e Arquiteta pelo item "Frentes", sem valores.
**Chega aqui por:** item de menu Frentes / abertura do sistema (engenheiro).

**O que aparece**
1. **Faixa da entrega** no topo: "Entrega prometida: 15/03/2027 — **de pé**" (verde) ou "Entrega prometida: 15/03/2027 — **em risco: 3 frentes já comeram a folga**" (vermelho).
2. **Filtros** em uma linha: Situação (Todas / Estourou a folga / Atenção / No prazo) · Responsável (lista de empreiteiros) · "Só travadas por projeto" (liga/desliga) · **Ordenar por:** Data limite (padrão) / Dias sem andar.
3. **Lista**, uma linha por frente em andamento ou atrasada para começar. Concluídas e não iniciadas (dentro do prazo) ficam escondidas; um link no rodapé "Mostrar concluídas e não iniciadas (N)" as revela.

**Campos e informações** (por linha)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Serviço | texto | sim | ex.: "Impermeabilização áreas molhadas" |
| Responsável | texto | sim | nome do empreiteiro |
| Há quantos dias não anda | número | sim | "9 dias sem andar"; "andou hoje" se 0 |
| Motivo do último "Não andou" | etiqueta | não | ex.: "Aguardando projeto" |
| Data limite de decisão | data | sim | "decidir até 24/10 (faltam 3 dias úteis)"; se estourou: "folga estourada há 4 dias" |
| Situação | etiqueta colorida | sim | No prazo / Atenção / Estourou a folga |
| Ícone de pendência | ícone | não | aparece se há pendência de projeto Aberta ligada à frente |

Estourou a folga fica sempre no topo, em vermelho, qualquer que seja a ordenação escolhida.

**Ações**
- **Tocar na linha:** abre o Detalhe da frente.
- **Cobrar** (ícone de WhatsApp na linha, só engenheiro): abre o WhatsApp do empreiteiro com o texto pronto: "Olá, {nome}. A frente {serviço} da obra {obra} está há {N} dias sem andar. Precisamos retomar até {data limite}. Consegue me confirmar?"

**Regras por perfil**
- **Engenheiro:** vê tudo e o botão Cobrar.
- **Mestre e Arquiteta:** mesma lista, sem Cobrar. Veem o nome do empreiteiro.
- **Cliente:** não acessa.

**Estado vazio**
"Nenhuma frente em risco. A entrega de {data} está de pé."
Sem frentes cadastradas: "Esta obra ainda não tem frentes. Importe o cronograma em Cadastros › Frentes e cronograma."

---

## Tela: Detalhe da frente

**Quem acessa:** Engenheiro, Mestre, Arquiteta.
**Chega aqui por:** clique numa linha de Frentes em risco ou de Cadastros › Frentes.

**O que aparece**
1. Cabeçalho: serviço, responsável, etiqueta de situação.
2. Bloco de datas: início previsto · término previsto · folga original · dias perdidos · folga que sobra · data limite de decisão.
3. Ambientes da frente com marca de concluído e data (ex.: "Suíte master ✓ 10/10 · Banho social — em andamento").
4. Bloco de valores (**só engenheiro**): valor contratado. (Medido e saldo entram com a Medição, na segunda entrega.)
5. Linha do tempo, do mais recente para o mais antigo: cada "Andou / Não andou (motivo)" do diário, fotos em miniatura, pendências de projeto ligadas, comentários.
6. Campo "Comentar" no fim da linha do tempo (registra decisões tomadas, ex.: "Combinado com o empreiteiro reforço de 2 pessoas a partir de segunda").

**Ações**
- **Comentar:** adiciona à linha do tempo com nome e data.
- **Abrir pendência de projeto:** abre o formulário de pendência já ligado a esta frente.
- **Cobrar** (só engenheiro): igual à lista.
- **Editar frente / Encerrar frente** (só engenheiro): leva a Cadastros › Frentes e cronograma.

**Regras por perfil**
- **Engenheiro:** tudo.
- **Mestre:** sem bloco de valores, sem Cobrar, sem Editar.
- **Arquiteta:** igual ao mestre. Vê os lançamentos do diário na linha do tempo.

**Estado vazio**
Linha do tempo sem nada: "Nenhum lançamento ainda para esta frente."

---

## Tela: Diário do dia

**Quem acessa:** Mestre (tela inicial), Engenheiro (item Diário). Arquiteta lê os lançamentos pelo detalhe da frente.
**Chega aqui por:** item de menu Diário / abertura do sistema (mestre).

**O que aparece**
1. Data de hoje no topo, com setas para dias anteriores (abre o diário daquele dia, só leitura se travado).
2. Clima: três botões Sol · Nublado · Chuva.
3. Equipes presentes: lista de empreiteiros da obra, cada um com um campo de número de pessoas (vazio = não veio).
4. **Frentes em andamento**, um cartão por frente com dois botões grandes: **Andou** / **Não andou**. Ao tocar em Não andou, aparece a escolha do motivo. Em cada cartão: botão **Concluí** (abre a lista dos ambientes daquela frente para marcar quais foram concluídos hoje) e botão **Foto**.
5. Frentes que deveriam ter começado e não começaram aparecem num bloco separado "Deveriam ter começado", com os mesmos botões (Andou aqui significa "começou hoje").
6. Ocorrências: texto livre.
7. Botão **Salvar diário** fixo no rodapé.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Data | data | sim | hoje, automático |
| Clima | escolha | sim | Sol / Nublado / Chuva |
| Equipes presentes | número por empreiteiro | não | |
| Situação da frente | escolha | sim para cada frente em andamento | Andou / Não andou |
| Motivo | escolha | sim se Não andou | Falta material / Falta gente / Aguardando projeto / Aguardando outra frente / Chuva / Outro |
| Detalhe do motivo | texto | sim se motivo = Outro | |
| Concluí | escolha múltipla de ambientes | não | |
| Fotos | foto da câmera ou galeria | não | cada foto pede frente e ambiente (já vem preenchida pelo cartão) |
| Ocorrências | texto longo | não | |

**Ações**
- **Salvar diário:** grava; se faltar marcar alguma frente, avisa "Faltam 2 frentes sem Andou/Não andou" e não salva. Depois de salvar: "Diário de 20/10 salvo."
- **Foto:** abre a câmera do celular; a foto é comprimida antes de enviar.
- **Concluí:** marca os ambientes; se era o último ambiente da frente, mostra "Frente concluída" e ela sai da lista de amanhã.

**Regras por perfil**
- **Mestre:** lança e edita o próprio diário até o fim do dia seguinte. Depois disso, só leitura.
- **Engenheiro:** lança e edita qualquer diário, a qualquer tempo.
- **Arquiteta e Cliente:** não acessam esta tela.

**Estado vazio**
Antes de lançar: "Diário de hoje ainda não lançado." Sem frentes em andamento: "Nenhuma frente em andamento nesta obra hoje."

---

## Tela: Pendências de projeto

**Quem acessa:** Arquiteta (tela inicial), Engenheiro, Mestre.
**Chega aqui por:** item de menu Pendências / abertura do sistema (arquiteta).

**O que aparece**
Filtro de situação (Abertas — padrão / Respondidas / Fechadas / Todas). Lista ordenada pela data limite de decisão da frente que a pendência trava, a mais urgente primeiro. Botão **Nova pendência**. Tocar abre o detalhe: pergunta, frente travada, quem abriu, quando, prazo, e a conversa (comentários) com campo para responder.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Pergunta | texto longo | sim | ex.: "Altura do nicho do box da suíte master?" |
| Frente que trava | escolha | sim | lista de frentes da obra |
| Aberta por / em | texto + data | sim | automático |
| Prazo da resposta | data | sim | automático: data limite de decisão da frente; não editável |
| Situação | etiqueta | sim | Aberta / Respondida / Fechada |
| Comentários | texto + foto opcional | não | nome e data de cada um |

**Ações**
- **Nova pendência:** formulário com Pergunta e Frente; salva como Aberta.
- **Responder (comentar):** adiciona comentário. Quando a arquiteta comenta numa pendência Aberta, ela passa a Respondida.
- **Fechar** (só engenheiro): passa a Fechada.
- **Reabrir** (só engenheiro): volta a Aberta.

**Regras por perfil**
- **Engenheiro:** tudo.
- **Mestre e Arquiteta:** abrem e comentam; não fecham.
- **Cliente:** não acessa.

**Estado vazio**
"Nenhuma pendência de projeto aberta."

---

## Tela: Fotos

**Quem acessa:** Engenheiro, Mestre, Arquiteta.
**Chega aqui por:** item de menu Fotos (no celular do engenheiro, dentro de "Mais").

**O que aparece**
Galeria agrupada por semana, mais recente primeiro. Filtros: frente, ambiente, e (só engenheiro) **"Aguardando liberação"**, que mostra as fotos ainda não liberadas ao cliente. Cada miniatura mostra data e um ícone de olho aberto se estiver liberada ao cliente. Tocar abre a foto grande com frente, ambiente, data e quem tirou.

**Ações**
- **Liberar ao cliente / Tirar do cliente** (só engenheiro), uma foto por vez ou várias marcadas de uma vez ("Liberar 6 fotos").
- **Apagar** (só engenheiro): confirma "Apagar esta foto? Não dá para desfazer."
- Enviar foto não é aqui: é pelo Diário do dia.

**Regras por perfil**
- **Engenheiro:** tudo. Fotos novas nascem **não liberadas**: nenhuma chega ao cliente até o engenheiro liberar.
- **Mestre e Arquiteta:** só veem.

**Estado vazio**
"Nenhuma foto ainda. As fotos entram pelo Diário do dia."

---

## Tela: Cadastros › Obras

**Quem acessa:** só Engenheiro.

**O que aparece**
Lista de obras: nome · código · cliente · início · entrega · situação (Em andamento / Parada / Concluída). Botão Nova obra.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome | texto | sim | ex.: "Residência Alto da Boa Vista" |
| Código / apelido | texto curto | sim | ex.: "RABV"; aparece no seletor e no cabeçalho |
| Cliente (nome) | texto | sim | |
| Endereço | texto | não | |
| Data de início | data | sim | |
| Data-meta de entrega | data | sim | não pode ser antes do início |
| Situação | escolha | sim | Em andamento / Parada / Concluída |

**Ações**
- **Nova obra / Editar:** formulário acima. Ao criar, a obra vira a selecionada.
- **Concluir:** muda para Concluída; sai do seletor de obra. **Parada continua no seletor** (decisão de 20/10).

**Seletor de obra (todas as telas):** sempre visível no topo, dizendo em qual obra se está. Trocar de obra recarrega a tela inteira com os dados daquela obra. A obra escolhida fica guardada: ao fechar e abrir o app, ele volta nela. Nenhuma tela mostra dado de duas obras juntas, a não ser uma tela que seja explicitamente um comparativo entre obras.

**Estado vazio**
"Nenhuma obra cadastrada. Crie a primeira."

---

## Tela: Cadastros › Frentes e cronograma

**Quem acessa:** só Engenheiro.

**O que aparece**
Lista das frentes da obra: serviço · responsável · ambientes · início e término previstos · folga · % concluído · valor contratado · situação (Não iniciada / Em andamento / Concluída). Botões **Importar cronograma** e **Nova frente**.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Serviço | texto | sim | |
| Responsável | escolha | sim | empreiteiro da obra |
| Ambientes | escolha múltipla | sim | ambientes da obra |
| Início previsto | data | sim | |
| Término previsto | data | sim | não pode ser antes do início |
| Folga (dias úteis) | número inteiro ≥ 0 | sim | |
| Valor contratado | dinheiro | não | |
| Situação | escolha | sim | Não iniciada / Em andamento / Concluída |

**Ações**
- **Importar cronograma:** escolhe um arquivo CSV (salvo pelo Excel a partir da exportação do MS Project) com as colunas Nome, Início, Término, Folga total. Mostra uma prévia das linhas lidas; o engenheiro escolhe o responsável e os ambientes de cada uma e confirma. Linhas já importadas (mesmo nome) têm as datas e a folga atualizadas, sem perder lançamentos.
- **Nova frente / Editar:** formulário acima.
- **Encerrar:** marca Concluída manualmente.

**Estado vazio**
"Importe seu cronograma ou cadastre o primeiro serviço."

---

## Tela: Cadastros › Empreiteiros e ambientes

**Quem acessa:** só Engenheiro.

**O que aparece**
Duas listas lado a lado (empilhadas no celular).
- **Empreiteiros da obra:** nome · especialidade · WhatsApp. Botão Novo empreiteiro.
- **Ambientes da obra:** nome, na ordem de exibição. Botão Novo ambiente.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Empreiteiro — nome | texto | sim | |
| Empreiteiro — especialidade | texto | não | ex.: "Impermeabilização" |
| Empreiteiro — WhatsApp | telefone | não | usado no botão Cobrar |
| Ambiente — nome | texto | sim | ex.: "Suíte master" |
| Ambiente — ordem | número | sim | ordem no painel do cliente |

**Ações**
- Criar, editar e apagar (apagar só se não houver frente ligada; senão: "Este empreiteiro tem frentes. Troque o responsável antes de apagar.").

**Estado vazio**
"Nenhum empreiteiro cadastrado nesta obra." / "Nenhum ambiente cadastrado nesta obra."

---

## Tela: Cadastros › Empresa e logo

**Quem acessa:** só Engenheiro.
**Chega aqui por:** Cadastros › Empresa e logo.

**O que aparece**
Prévia do logo sobre o fundo preto do menu lateral e do cabeçalho do celular. Botões Escolher imagem, Voltar ao logo da BMR e Salvar logo.

**Ações**
- **Escolher imagem:** PNG, JPG, WebP ou SVG. A imagem é reduzida no navegador (máx. 600×240) antes de salvar, mantendo a transparência. Mostra a prévia; nada muda no app até salvar.
- **Salvar logo:** o logo passa a aparecer no menu lateral, no login e no cabeçalho do celular, para todos os perfis.
- **Voltar ao logo da BMR:** volta ao padrão (`public/logo-bmr.webp`). O recorte só do símbolo no cabeçalho do celular vale apenas para o logo da BMR; logo próprio aparece inteiro, reduzido.

**Estado vazio**
Não se aplica: sem logo próprio, o app usa o da BMR.

---

## Tela: Cadastros › Equipe

**Quem acessa:** só Engenheiro.

**O que aparece**
No topo, **Aguardando liberação**: contas novas com nome, email e data. Abaixo, **Equipe**: pessoas liberadas com perfil e obras vinculadas.

**Ações**
- **Liberar:** escolhe o perfil (Mestre / Arquiteta / Cliente / Engenheiro) e marca as obras. A pessoa passa a entrar direto.
- **Editar:** troca perfil e obras.
- **Desativar:** a pessoa não entra mais; o histórico dela fica.

**Estado vazio**
"Ninguém aguardando liberação."

---

## Tela: Painel da obra (cliente)

**Quem acessa:** só Cliente.
**Chega aqui por:** abertura do sistema.

**O que aparece**
1. Nome da obra e "Entrega prevista para 15/03/2027" — sempre a data **prometida**; o aviso de risco nunca aparece para o cliente.
2. **Avanço por ambiente:** uma barra por ambiente com o % (ex.: "Cozinha — 60%"), na ordem cadastrada.
3. **Fotos da semana:** fotos dos últimos 7 dias **liberadas** pelo engenheiro, com data e ambiente. **Sem nome de empreiteiro, sem nome de serviço, sem valores.**

**Regras por perfil**
- Se o cliente estiver vinculado a mais de uma obra, aparece o seletor; senão, não.

**Estado vazio**
"As fotos desta semana aparecem aqui em breve."

---

## Tela: Materiais (Kanban de pedidos)

**Quem acessa:** Engenheiro e Mestre (fazem e movem pedidos); Arquiteta só vê. Cliente não.
**Chega aqui por:** menu Materiais. No celular: dentro de "Mais" para o engenheiro (a barra já tem 5); 5º item da barra para o mestre.

**O que aparece**
1. **Contadores:** Em cotação · Chegam em 7 dias (A caminho com previsão de hoje até daqui a 7 dias) · Atrasados (A caminho com previsão vencida).
2. **Quadro** com as colunas Solicitar · Em cotação · A caminho · No almoxarifado (e Entregue, com "ver entregues" marcado). No celular, as colunas rolam para o lado.
3. **Cartão:** material e quantidade com unidade · frente · etiqueta (Crítico em vermelho; Grosso em azul; Acabamento e Instalações em verde) · fornecedor e previsão, se houver · "há X dias nesta coluna" · lead time, depois de chegar ao almoxarifado · etiqueta "Atrasado" e cartão vermelho quando a previsão venceu · alerta "Recebido com problema" quando o checklist teve um "não".

**Ações**
- **Novo pedido:** material (lista do catálogo), quantidade (só número, teclado numérico), frente e prioridade (Normal / Crítico). Entra em Solicitar.
- **Avançar** para a próxima coluna e **Voltar** uma coluna, por botões. Avançar para A caminho pede fornecedor e previsão (já vem com hoje); para No almoxarifado abre o checklist de recebimento; para Entregue pede a frente de aplicação.

**Estado vazio**
"Nenhum pedido de material nesta obra." com o botão "Fazer o primeiro pedido".

**Aba Estoque (opcional)**
- Abas da tela: Em aberto · Ver entregues · Estoque. Os contadores ganham um quarto, **Insumos críticos** (saldo ≤ mínimo); tocar nele abre o Estoque já filtrado.
- Tabela: insumo · saldo · mínimo · situação (etiqueta vermelha "Crítico" ou "OK"), críticos primeiro. Busca pelo nome e filtro "Só críticos". Tocar no insumo abre o histórico de movimentos (data, entrada/saída, quantidade, frente, origem).
- **Baixa de estoque** (engenheiro e mestre): insumo, quantidade (só número), frente e data (nasce com hoje, não aceita futuro). Quantidade maior que o saldo: aviso "Saldo de X; não dá para baixar Y." e não salva.
- Entrada automática: ao confirmar o checklist de recebimento com os dois "sim", o aviso diz que o material entrou no estoque.
- Vazio: "Nenhum insumo no estoque desta obra. O estoque começa sozinho quando um pedido chega ao almoxarifado com o checklist OK."

---

## Tela: Planejamento (Last Planner + EAP)

**Quem acessa:** Engenheiro (tudo) e Arquiteta (só vê as 4 abas). Mestre: só a aba Curto prazo. Cliente não.
**Chega aqui por:** menu Planejamento. No celular: dentro de "Mais" para o engenheiro; 5º item da barra para a arquiteta.

**Abas internas:** EAP · Longo prazo · Médio prazo · Curto prazo. As quatro usam a mesma lista de atividades da obra: mudou numa, as outras mostram na hora.

**Aba EAP**
- Árvore das atividades, recuada por nível, com o código automático (1, 1.1, 1.2.1) em fonte mono. Cada linha: código · título · início–fim · duração em dias úteis · frente ligada, se houver · % realizado. Grupo (com subatividades) em negrito, com datas e % calculados das filhas.
- Botões (engenheiro): **Nova atividade** e **Calendário**. Filtro **Mostrar arquivadas (N)**.
- Tocar numa atividade abre a ficha: título (obrigatório), dentro de (nível principal ou outra atividade), início e fim (nascem com hoje; fim não antes do início; grupo não edita datas), frente ligada (opcional), % realizado (só número, 0 a 100, teclado numérico). Na ficha: **Salvar**, **Adicionar subatividade**, **Subir** / **Descer** na ordem, **Arquivar** (pede confirmação; num grupo avisa quantas subatividades vão junto) ou **Desarquivar**.
- **Calendário:** dias de trabalho (seg a dom, pelo menos um) e feriados (data + nome; remover pede confirmação). Muda as durações na hora.
- Arquiteta vê a árvore e abre a ficha só para ler.
- Vazio: "Esta obra ainda não tem atividades planejadas." com o botão "Criar a primeira atividade" e o "Importar planilha" (engenheiro).
- **Baixar planilha modelo** (engenheiro): baixa `cronograma-modelo.xlsx` com as colunas ITEM · Atividade · Início · Término · Duração (Dias) e linhas de exemplo 1, 2, 2.1, 2.2. ITEM sai como texto (o Excel não transforma 1.10 em 1.1); datas em dd/mm/aaaa.
- **Importar planilha** (engenheiro): escolhe um .xlsx ou .csv; tudo é lido no navegador. Abre a **conferência**: a árvore interpretada, indentada pelo código, com cada erro em vermelho na linha (código inválido, repetido ou órfão como 2.1 sem o 2; atividade sem nome; data inválida; término antes do início). Dá para corrigir o código, o nome e as datas na própria linha, ou tirar a linha. Duração em branco é calculada pelas datas; término em branco com duração preenchida é calculado pela duração (dias úteis do calendário da obra). "Confirmar importação" só fica ativo sem erros. Se a obra já tem atividades, pergunta: **Adicionar** (entram depois das atuais, renumeradas) ou **Substituir** (as atuais vão para Arquivadas, nada se apaga). Cancelar não grava nada.

**Aba Longo prazo (cronograma)**
- No topo, três números da obra: **previsto hoje** (%), **realizado** (%) e a **diferença** em pontos (vermelha quando o realizado está atrás). O % da obra é a média das atividades do nível principal pesada pela duração, como nos grupos.
- **Previsto** de uma atividade = dias úteis já passados do período, sem contar hoje, ÷ duração (até o dia do início, 0%; depois do fim, 100%). Grupo: média das filhas pesada pela duração.
- Botão **Semana / Mês** troca a escala. Computador: grade com o código e o título à esquerda e as barras em CSS à direita, rolando para o lado. Cada barra ocupa o período planejado; o preenchimento é o realizado; um traço marca o previsto de hoje; uma linha vertical marca hoje. Grupo em barra escura e fina. Legenda embaixo.
- Celular: em vez do gráfico, lista com código, título, datas, barra do realizado com o traço do previsto e "real X% · previsto Y%" (em vermelho quando atrás).
- Arquivadas não aparecem. Tocar numa linha abre a mesma ficha da EAP.
- Vazio: "Sem atividades para pôr no cronograma." com o botão "Ir para a EAP".
- Linha de base (planejado × atual salvos) fica para depois.

**Aba Médio prazo (lookahead / restrições)**
- Janela de **3 a 6 semanas** a partir desta (segunda a domingo); padrão 4. Uma coluna por semana ("Esta semana", depois "dd/mm a dd/mm"); no celular as colunas rolam para o lado.
- No topo, três números: **restrições abertas**, **vencidas** (abertas com prazo antes de hoje; vermelho) e **prontas para executar**: das atividades da janela (sem subatividades, não arquivadas, abaixo de 100% e começando até o fim da janela, inclusive as atrasadas), quantas não têm restrição aberta — "X de Y".
- **Cartão da restrição:** tipo com cor e ícone (Material, Mão de obra, Método, Equipamento, Projeto, Segurança, Logística) · descrição · atividade (código e título) · responsável · prazo · etiqueta "Vencida" (vermelha) ou "Resolvida" (verde). A restrição fica na semana do prazo; vencida e aberta aparece em "Esta semana", no topo.
- **Ações (engenheiro):** **Nova restrição** — descrição, tipo, atividade (só as sem subatividades), prazo de resolução (nasce com hoje, não aceita antes de hoje), responsável (texto, com sugestões: equipe, empreiteiros e responsáveis já usados). Tocar no cartão edita. **Semana anterior / próxima** por botões (o prazo anda 7 dias; não volta para antes desta semana). **Resolvida** / **Reabrir**.
- **Filtros:** nº de semanas (3 a 6), responsável, mostrar resolvidas. Abaixo do quadro: "N restrições depois de dd/mm" quando houver.
- Restrição de atividade arquivada não aparece. Arquiteta vê sem mexer.
- Vazio: "Nenhuma restrição nas próximas semanas." com "Registrar a primeira restrição" (engenheiro).

**Aba Curto prazo (semana: Kanban + PPC)**
- **Quem:** engenheiro e mestre mexem; arquiteta só vê. Para o mestre, o Planejamento abre só nesta aba.
- Navegação: **‹ semana anterior · "19/10 a 25/10" · próxima ›** e o atalho "Voltar para esta semana".
- **Entra na semana** a atividade sem subatividades, não arquivada, que não foi concluída antes da semana e cujo período cruza a semana **ou** que já devia ter terminado (etiqueta âmbar **Acumulada**).
- **PPC** = concluídas na semana ÷ planejadas da semana × 100: número grande, barra e "X de Y concluídas", com quantas ficaram "não realizadas". Concluída = `concluida_em` até o domingo da semana.
- **Kanban:** A fazer · Em andamento · Concluído. Cartão: código, título, datas, "Acumulada", "2 de 4 subtarefas", e a etiqueta vermelha "Não realizado: causa". Botões ‹ › mudam a coluna (só na semana atual). Ir para Concluído põe 100% e grava a data; sair de Concluído não mexe no %.
- **Tocar no cartão** abre a ficha da semana: coluna (select, só na semana atual), checklist de subtarefas (marcar feita; "não realizada" pede a causa; incluir subtarefa; apagar só o engenheiro, com confirmação) e **Não realizado nesta semana** (causa obrigatória com os motivos do diário; "Outro" pede detalhe; dá para desfazer). Não realizado só em semana atual ou passada e só em atividade não concluída.
- Semana passada: só "não realizado" e subtarefas. Semana futura: só ver.
- Vazio: "Nenhuma atividade planejada para esta semana." com "Ir para a EAP" (quem pode ver a EAP).
- Menu do mestre no celular: **Diário · Frentes · Pendências · Fotos · Mais** (Mais: Materiais e Planejamento), igual ao engenheiro.
- Gráfico do PPC ao longo das semanas fica para depois.

---

## Textos do sistema

- Botões: Salvar, Cancelar, Novo, Editar, Apagar, Fechar, Reabrir, Liberar, Sair.
- Confirmação de exclusão: "Apagar {item}? Não dá para desfazer."
- Aviso de conta pendente: "Conta aguardando liberação do engenheiro. Assim que ele liberar, você entra direto na sua obra."
- Erro genérico: "Não deu para salvar. Confira sua internet e tente de novo."
- Salvo: "Salvo."

## Dados de exemplo

Duas obras, para testar que os dados nunca se misturam. Hoje = 20/10/2026.

```
OBRA 1 — Residência Alto da Boa Vista (RABV) · cliente Família Andrade · início 02/03/2026 · entrega 15/03/2027 · Em andamento
  Ambientes: Sala, Cozinha, Suíte master, Banho social, Área gourmet, Fachada
  Empreiteiros: Hidro Sul (hidráulica), ImperTec (impermeabilização), Gesso & Cia (forro),
                Elétrica Ramos, Pedras Nobres (bancadas), Pinturas Lima, Marcenaria Oliveira, Vidraçaria Luz

  Frentes (serviço · responsável · início–término · folga · situação · último lançamento):
  1. Impermeabilização áreas molhadas · ImperTec · 01/10–25/10 · 4 · Em andamento · Não andou desde 13/10 (Falta material) → Estourou a folga
  2. Forro de gesso · Gesso & Cia · 06/10–31/10 · 8 · Em andamento · Não andou desde 15/10 (Aguardando projeto) + pendência aberta → Atenção
  3. Instalações hidráulicas · Hidro Sul · 15/09–24/10 · 10 · Em andamento · Andou 19/10 → No prazo
  4. Elétrica — passagem de fios · Elétrica Ramos · 22/09–30/10 · 6 · Em andamento · Não andou 16/10 e 17/10 (Falta gente), andou 19/10 → Atenção
  5. Bancadas de mármore · Pedras Nobres · 13/10–07/11 · 8 · Não iniciada, deveria ter começado 13/10 → Atenção
  6. Revestimento suíte master · Hidro Sul · 29/09–17/10 · 20 · Em andamento · Não andou desde 08/10 (Aguardando outra frente) → No prazo
  7. Alvenaria de vedação · Pinturas Lima · 01/08–20/09 · 5 · Concluída 18/09
  8. Marcenaria cozinha · Marcenaria Oliveira · 10/11–15/12 · 15 · Não iniciada (no prazo)
  9. Esquadrias de vidro · Vidraçaria Luz · 03/11–28/11 · 10 · Não iniciada (no prazo)
  10. Pintura fachada · Pinturas Lima · 01/10–30/10 · 3 · Em andamento · Não andou 14/10 a 17/10 (Chuva) → Estourou a folga

  Valor contratado: frente 1 R$ 38.500,00 · frente 3 R$ 62.000,00 · frente 7 R$ 41.000,00
  Pendências: "Altura do nicho do box da suíte master?" (frente 2, Aberta, 15/10) ·
              "Ponto elétrico da ilha da cozinha muda de lugar?" (frente 4, Respondida, 09/10) ·
              "Paginação do porcelanato da sala" (frente 6, Fechada, 25/09)
  Diários: lançados em 13, 14, 15, 16, 17 e 19/10; 18/10 sem diário (domingo)
  Fotos: 12 fotos entre 06/10 e 19/10; 8 liberadas ao cliente, 4 aguardando liberação (2 delas de 19/10)

OBRA 2 — Casa Jardins (CJ) · cliente Sr. Costa · início 01/09/2026 · entrega 30/06/2027 · Em andamento
  Ambientes: Sala, Cozinha · Empreiteiro: Fundações Base
  Frente: Fundação · Fundações Base · 01/10–15/11 · 10 · Em andamento · Andou 19/10 → No prazo
```

Usuários de exemplo:
- Davidson — Engenheiro — obras 1 e 2
- Seu Raimundo — Mestre — obra 1
- Carla — Arquiteta — obras 1 e 2
- Família Andrade — Cliente — obra 1
- Novo Usuário — Pendente — nenhuma obra

## Critérios de aceite

- [ ] O engenheiro abre o sistema em Frentes em risco da última obra usada, com "Estourou a folga" no topo e as concluídas escondidas.
- [ ] A faixa do topo mostra "em risco: 2 frentes já comeram a folga" com os dados de exemplo da obra 1.
- [ ] Trocar para a obra 2 no seletor mostra só a frente Fundação; nenhum dado da obra 1 aparece em nenhuma tela.
- [ ] O mestre abre direto no Diário do dia, consegue marcar Andou/Não andou, escolher motivo, tirar foto e salvar em menos de 3 minutos para 6 frentes.
- [ ] Salvar o diário com uma frente sem marcação mostra o aviso e não salva.
- [ ] O mestre não consegue editar o diário de anteontem.
- [ ] Marcar Concluí no último ambiente de uma frente faz ela sumir de Frentes em risco sem recarregar a página.
- [ ] Mestre e arquiteta não veem nenhum valor em R$ em nenhuma tela.
- [ ] O cliente vê só o Painel: data prometida, barras por ambiente e fotos liberadas dos últimos 7 dias, sem nome de empreiteiro, sem serviço, sem valores e sem aviso de risco.
- [ ] Uma foto recém-enviada pelo mestre não aparece para o cliente até o engenheiro liberar.
- [ ] O usuário Pendente vê só o aviso de espera.
- [ ] O botão Cobrar abre o WhatsApp com o texto pronto.
- [ ] Todas as telas funcionam no celular sem rolagem horizontal.
- [ ] Cada lista tem estado vazio com texto próprio.
- [ ] Materiais da obra 1 mostra 1 pedido atrasado (manta asfáltica) em vermelho; trocar para a obra 2 mostra só os 2 pedidos dela.
- [ ] Pedido só passa para A caminho com fornecedor e previsão, e só entra no almoxarifado com o checklist respondido.
- [ ] Estoque da obra 1 mostra 2 insumos críticos (cimento e bloco); a obra 2 mostra só a areia dela.
- [ ] Receber um pedido com o checklist OK soma a quantidade no estoque; baixa maior que o saldo é recusada.

## A conta que vai chegar depois

- `[PENDENTE: formato do arquivo exportado do MS Project]` — custo: a importação pode precisar de ajuste de colunas na construção.

## Decidir depois de usar

- Limite de "Atenção" — por enquanto: 5 dias úteis de folga ou menos.
- Peso de cada serviço no % por ambiente — por enquanto: todos valem igual.

---

# Segunda entrega (fora da v1)

Decidido em 20/10/2026: a Medição fica para depois que a v1 estiver no ar. Esta especificação fica guardada aqui para não se perder. **Nada desta seção é construído na v1.**

## Tela: Medição

**Quem acessa:** só Engenheiro.
**Chega aqui por:** item de menu Medição (entra na barra inferior no lugar de Fotos, que vai para "Mais").

**O que aparece**
Lista por empreiteiro da obra: empreiteiro · nº de frentes · valor contratado · medido até hoje · **a medir** · saldo. Abaixo, histórico de medições (período, empreiteiro, total, situação). Tocar num empreiteiro abre **Nova medição**: cada frente dele com valor contratado, já medido, ambientes concluídos desde a última medição, valor sugerido e campo do valor desta medição.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Período (de / até) | data | sim | padrão: dia seguinte à última medição até hoje |
| Valor desta medição, por frente | dinheiro | sim (pode ser 0) | sugerido = valor contratado × ambientes concluídos no período ÷ total de ambientes da frente |
| Justificativa | texto | sim se o valor for diferente do sugerido | |
| Situação | etiqueta | sim | Rascunho / Fechada |

**Ações**
- **Salvar rascunho:** guarda como Rascunho, editável.
- **Fechar medição:** confirma "Depois de fechada, a medição não muda mais. Fechar?"; vira Fechada.
- **Exportar para Excel:** baixa um arquivo CSV com a medição.

**Regras por perfil**
- Só engenheiro. Para os outros, o item nem aparece no menu.

**Estado vazio**
"Nada a medir. O mestre ainda não concluiu nenhum serviço desde a última medição."
