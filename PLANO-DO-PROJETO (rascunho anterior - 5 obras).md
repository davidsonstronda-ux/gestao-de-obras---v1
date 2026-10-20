# Plano do Projeto — Gestão de Obras (nome provisório)

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 19/10/2026 — RASCUNHO da Etapa 1, aguardando correção do Davidson.

## Em uma frase

Um sistema de **diário de obra e medição** que acaba com as **2 horas de toda sexta juntando o WhatsApp** para o **engenheiro que toca 5 obras ao mesmo tempo**, fazendo o **mestre e o estagiário lançarem o avanço de cada frente de serviço no dia, para que a medição da semana saia somada sozinha**.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — A sexta perdida e a segunda sem medição
- **Como acontece hoje:** cada empreiteiro/mestre manda pelo WhatsApp o que fez; na sexta o Davidson junta tudo, obra por obra, e tenta transformar em quantidade para a planilha de medição.
- **Frequência:** toda semana.
- **Custo:** 2 horas toda sexta (≈ 8 h/mês) e, mesmo assim, chega segunda sem saber quanto medir de cada empreiteiro.
- **Último caso:** [PENDENTE: um exemplo real de medição que saiu errada ou atrasou]

### Problema 2 — O registro da obra está espalhado
- **Como acontece hoje:** diário de obra no caderno, fotos soltas no WhatsApp, sem ligação com a frente de serviço nem com a data.
- **Frequência:** todo dia, em cada obra.
- **Custo:** [PENDENTE: tempo procurando foto/registro quando precisa provar algo ao cliente ou fiscal]

### Problema 3 — Medição e compras na mão
- **Como acontece hoje:** planilha de medição montada à mão; pedidos de compra feitos por mensagem, sem lista de quem pediu, o que foi comprado e o que chegou.
- **Frequência:** medição toda semana; compras várias vezes por semana.
- **Custo:** [PENDENTE]

## A solução

O mestre ou o estagiário abre o app no canteiro e, para cada frente de serviço ativa, diz uma de duas coisas: **avançou X** (na unidade da frente: m², m³, m, un) ou **parou, por quê** (falta material, falta gente, chuva, aguardando projeto/cliente, outro). Junta foto, clima e quem estava na obra. Com isso: a tela principal mostra o que está parado e há quantos dias; a medição da semana de cada empreiteiro sai somada (quantidade × preço unitário) para o engenheiro conferir e fechar; e o cliente acompanha o avanço e as fotos liberadas, sem ver custo.

**O que ele NÃO faz (v1):** (proposta — diga se faz questão de algum)
- Financeiro completo (contas a pagar/receber, fluxo de caixa)
- Orçamento/composições SINAPI e cronograma Gantt
- App nativo de loja (vai ser site que abre no celular e pode ser "instalado" na tela inicial)
- Emitir medição em PDF assinado / integração com contador ou nota fiscal
- Empreiteiro entrando no app (ele continua recebendo pelo engenheiro)

## Funcionalidades

### Frentes paradas (TELA DO DIA A DIA)
- **Abre em:** lista, todas as obras juntas
- **Mostra:** obra · frente de serviço · empreiteiro · situação (Parada / Sem lançamento / Andando) · **há quantos dias** · motivo · último lançamento (quem e quando)
- **Ordem e filtro:** paradas primeiro, das mais antigas para as mais novas; depois "sem lançamento"; as que estão andando ficam escondidas por padrão. Filtro por obra e por empreiteiro.
- **Ações:** ver, cobrar (abre o WhatsApp do empreiteiro com texto pronto), marcar como resolvida
- **Ao clicar num item:** abre a frente com o histórico de lançamentos e fotos
- **Vazio:** "Nenhuma frente parada. Todas as obras andaram nos últimos 3 dias."
- **Nasce e morre:** a lista é calculada a partir dos lançamentos do diário; não se cadastra nada aqui.

### Obras
- **Abre em:** lista de cartões
- **Mostra:** nome · tipo (reforma / construção / vertical) · cliente · endereço · % de avanço físico · nº de frentes paradas · situação (Ativa / Pausada / Concluída)
- **Ordem e filtro:** ativas primeiro, por nome; filtro por situação
- **Ações:** criar, editar, concluir (só engenheiro)
- **Ao clicar num item:** abre a obra com abas: Frentes · Diário · Fotos · Medições · Compras · Equipe
- **Vazio:** "Nenhuma obra cadastrada. Comece criando a primeira."
- **Nasce e morre:** o engenheiro cria; ao concluir, sai da lista principal mas nada é apagado.

### Frentes de serviço (dentro da obra)
- **Abre em:** lista
- **Mostra:** serviço (ex.: Alvenaria Bloco B – 2º pav.) · empreiteiro · unidade · quantidade contratada · executado até hoje · % · preço unitário (só engenheiro) · situação
- **Ordem e filtro:** paradas primeiro, depois por % concluído
- **Ações:** criar, editar, encerrar (engenheiro)
- **Ao clicar num item:** histórico de avanço e fotos da frente
- **Vazio:** "Esta obra ainda não tem frentes de serviço. Cadastre a primeira para o mestre começar a lançar."
- **Nasce e morre:** engenheiro cria ao contratar o serviço; encerra quando chega a 100% ou quando o contrato acaba.

### Diário de obra (o lançamento do mestre/estagiário)
- **Abre em:** formulário do dia, por obra, pensado para celular
- **Mostra:** data · clima (manhã/tarde) · equipe presente por empreiteiro (nº de pessoas) · para cada frente ativa: "avançou ___ [unidade]" ou "parou — motivo" · fotos (marcando a frente e se o cliente pode ver) · ocorrências (texto livre)
- **Ordem e filtro:** histórico do mais recente para o mais antigo; filtro por obra e data
- **Ações:** lançar, editar o próprio até o fim do dia seguinte, ver anteriores
- **Ao clicar num dia:** abre o diário completo daquele dia
- **Vazio:** "Nenhum diário lançado hoje nesta obra."
- **Nasce e morre:** um por obra por dia; depois de 2 dias fica travado (só o engenheiro corrige), para servir de registro.

### Fotos
- **Abre em:** galeria por data
- **Mostra:** foto · obra · frente · data · quem tirou · visível ao cliente (sim/não)
- **Ordem e filtro:** mais recentes primeiro; filtro por obra, frente e período
- **Ações:** enviar (pelo diário), marcar/desmarcar para o cliente (engenheiro), apagar (engenheiro)
- **Vazio:** "Nenhuma foto ainda."

### Medições
- **Abre em:** lista por obra e semana
- **Mostra:** semana · empreiteiro · cada frente com quantidade executada no período × preço unitário = valor · total · situação (Rascunho / Conferida / Paga)
- **Ordem e filtro:** semana mais recente primeiro; filtro por obra e empreiteiro
- **Ações:** gerar rascunho da semana (soma automática dos lançamentos), ajustar quantidade com justificativa, fechar, marcar como paga, exportar para planilha (Excel)
- **Ao clicar num item:** abre a medição com os lançamentos que formaram cada número
- **Vazio:** "Nenhuma medição ainda. Ela aparece aqui assim que o diário tiver avanço lançado."
- **Nasce e morre:** o sistema monta o rascunho; o engenheiro confere e fecha; fechada não muda mais.

### Compras
- **Abre em:** lista de pedidos
- **Mostra:** obra · item · quantidade · urgência · quem pediu · situação (Pedido / Aprovado / Comprado / Entregue / Recusado) · fornecedor e valor (só engenheiro)
- **Ordem e filtro:** urgentes e mais antigos primeiro; filtro por obra e situação
- **Ações:** mestre/estagiário pedem; engenheiro aprova, registra fornecedor e valor, marca comprado; mestre marca entregue
- **Vazio:** "Nenhum pedido de compra aberto."
- **Nasce e morre:** nasce no pedido do canteiro; termina em Entregue ou Recusado.

### Painel do cliente
- **Abre em:** página da obra dele
- **Mostra:** % de avanço físico geral e por etapa · linha do tempo com fotos liberadas · últimas ocorrências liberadas
- **Ações:** só ver
- **Vazio:** "As primeiras fotos da sua obra aparecem aqui em breve."

## Unidade principal

**Obra** — vai existir mais de uma? **sim** (5 hoje). Alguém trabalha em mais de uma ao mesmo tempo? **[AINDA NÃO RESPONDIDO — proposta: sim, o estagiário e às vezes o mestre]**. Cada pessoa só enxerga as obras às quais foi vinculada; o engenheiro vê todas.

## Perfis de usuário

- **Engenheiro (Davidson):** dono de tudo · primeira tela: Frentes paradas
- **Mestre de obras:** lança diário, pede compra · primeira tela: Diário de hoje da obra dele
- **Estagiário:** mesmo acesso do mestre, nas obras às quais foi vinculado · primeira tela: Diário de hoje
- **Cliente:** dono da obra · primeira tela: Painel do cliente da obra dele

### Matriz de permissões (proposta)

| Ação | Engenheiro | Mestre / Estagiário | Cliente |
|---|---|---|---|
| Ver obras | todas | só as vinculadas | só a(s) dele |
| Ver frentes e quantidades | sim | sim | só o % de avanço |
| **Ver preço unitário, valor de medição, valor de compra** | sim | **não** | **não** |
| Lançar diário | sim | sim | não |
| Editar diário | sempre | o próprio, até o dia seguinte | não |
| Ver ocorrências do diário | todas | todas da obra | só as liberadas |
| Ver fotos | todas | todas da obra | **só as marcadas "visível ao cliente"** |
| Pedir compra | sim | sim | não |
| Aprovar compra / ver fornecedor | sim | não | não |
| Gerar e fechar medição | sim | não | não |
| Criar/encerrar obra e frente | sim | não | não |
| Apagar qualquer coisa | sim | não | não |
| Gerenciar usuários | sim | não | não |
| **Quem não fez login** | não vê nada | | |

## Fluxo de cadastro

1. A pessoa se cadastra sozinha com email e senha
2. Entra sem perfil e não vê dado nenhum
3. Vê o aviso "Conta aguardando liberação do engenheiro"
4. O engenheiro libera, escolhe o perfil e vincula às obras

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | a assinatura que já tem |
| React + Vite | a interface | grátis |
| Supabase | banco, login e fotos | grátis até crescer (fotos de 5 obras podem passar do limite grátis em alguns meses — [DESCOBRIR NO USO]) |
| Vercel | colocar no ar | grátis |
| GitHub | guardar o código | grátis |

**Total por mês:** R$ 0 no começo
**O que custaria a alternativa pronta:** [AINDA NÃO RESPONDIDO]

## Prazo

- **Quer usar de verdade em:** [AINDA NÃO RESPONDIDO]
- **Horas por semana disponíveis:** [AINDA NÃO RESPONDIDO]

---

# 2. Insights do Mercado

[AINDA NÃO RESPONDIDO]

# 3. Arquitetura

[AINDA NÃO RESPONDIDO]

---

# A conta que vai chegar depois

- `[PENDENTE: exemplo real de medição errada/atrasada]` — custo: sem ele, não dá para medir se o sistema resolveu.
- `[PENDENTE: custo dos problemas 2 e 3]` — custo: pouco; só serve de régua.

# Decidir depois de usar

- `[DESCOBRIR NO USO: espaço de fotos]` — por enquanto: fotos comprimidas no envio.
