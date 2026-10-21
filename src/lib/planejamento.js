// Regra do módulo Planejamento (Last Planner + EAP). Fonte: PLANO-DO-PROJETO.md,
// "Planejamento — Last Planner em 3 horizontes + EAP". Puro: sem React, sem banco, sem window.
// Uma lista só de atividades por obra; as 4 abas leem o que sai daqui.
import { diasEntre, paraData, paraIso } from './datas.js'
import { MOTIVOS } from './atraso.js'

export const STATUS_ATIVIDADE = ['A fazer', 'Em andamento', 'Concluído']
// 0 = domingo … 6 = sábado, igual ao getDay() e à coluna calendarios.dias_semana.
export const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_PADRAO = [1, 2, 3, 4, 5, 6]

// ── calendário da obra (dias de trabalho + feriados) ────────────────────────
// Obra sem calendário gravado trabalha de segunda a sábado.
export function calendarioDaObra(calendario, feriados = []) {
  return {
    dias_semana: calendario?.dias_semana?.length ? [...calendario.dias_semana] : [...DIAS_SEMANA_PADRAO],
    feriados: feriados.map((f) => f.data),
  }
}

function trabalhaNoDia(iso, cal) {
  return cal.dias_semana.includes(paraData(iso).getDay()) && !cal.feriados.includes(iso)
}

// Dias de trabalho de `inicio` a `fim`, contando os dois. Fim antes do início = 0.
export function diasUteisEntre(inicio, fim, cal) {
  if (!inicio || !fim || fim < inicio) return 0
  const d = paraData(inicio)
  const ate = paraData(fim)
  let n = 0
  while (d <= ate) {
    if (trabalhaNoDia(paraIso(d), cal)) n++
    d.setDate(d.getDate() + 1)
  }
  return n
}

export function validarDiasSemana(dias) {
  if (!Array.isArray(dias) || !dias.length) return 'Escolha pelo menos um dia de trabalho.'
  if (dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return 'Dia da semana inválido.'
  return null
}

export function validarFeriado({ data, nome }, existentes = []) {
  const p = {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) p.data = 'Escolha a data do feriado.'
  else if (existentes.some((f) => f.data === data)) p.data = 'Já existe um feriado nesta data.'
  if (!String(nome || '').trim()) p.nome = 'Dê um nome ao feriado.'
  return p
}

// ── a árvore (EAP) ──────────────────────────────────────────────────────────
const irmas = (atividades, paiId) => atividades
  .filter((a) => (a.pai_id || null) === (paiId || null))
  .sort((x, y) => x.ordem - y.ordem)

export function descendentes(atividades, id) {
  const ids = []
  for (const f of irmas(atividades, id)) ids.push(f.id, ...descendentes(atividades, f.id))
  return ids
}

export function ancestrais(atividades, id) {
  const ids = []
  let atual = atividades.find((a) => a.id === id)
  while (atual?.pai_id) {
    ids.push(atual.pai_id)
    atual = atividades.find((a) => a.id === atual.pai_id)
  }
  return ids
}

// % previsto hoje: dias úteis já passados do período (antes de hoje) ÷ duração.
// No dia do início, 0; depois do fim, 100.
export function progressoPrevisto(inicio, fim, hoje, cal) {
  if (hoje <= inicio) return 0
  if (hoje > fim) return 100
  const total = diasUteisEntre(inicio, fim, cal)
  return total ? Math.round((diasUteisEntre(inicio, somarDias(hoje, -1), cal) / total) * 100) : 0
}

// Média pesada pela duração em dias úteis (ou simples, se tudo tiver 0 dia).
function mediaPesada(itens, campo) {
  const peso = itens.reduce((s, f) => s + f.duracao, 0)
  return Math.round(peso
    ? itens.reduce((s, f) => s + f[campo] * f.duracao, 0) / peso
    : itens.reduce((s, f) => s + f[campo], 0) / itens.length)
}

// Em ordem de exibição, com código (1, 1.1, 1.2.1), nível e o resumo dos grupos.
// Com `hoje`, cada item ganha também o `previsto` (grupo: média das filhas, pesada).
// Arquivada (ou dentro de grupo arquivado) não ganha código nem entra no resumo
// de um grupo ativo. Grupo = tem subatividade não arquivada (ou, se ele mesmo
// está arquivado, qualquer subatividade): início, fim e % saem das filhas;
// o % do grupo é a média das filhas pesada pela duração em dias úteis.
export function montarEap(atividades, cal, hoje) {
  const saida = []
  function visitar(paiId, prefixo, nivel, acimaArquivada) {
    const todas = []
    let n = 0
    for (const a of irmas(atividades, paiId)) {
      const arquivada = acimaArquivada || Boolean(a.arquivada)
      const codigo = arquivada ? null : prefixo ? `${prefixo}.${++n}` : String(++n)
      const item = { ...a, codigo, nivel, arquivada }
      saida.push(item)
      const filhas = visitar(a.id, codigo, nivel + 1, arquivada).filter((f) => arquivada || !f.arquivada)
      item.ehGrupo = filhas.length > 0
      if (item.ehGrupo) {
        item.inicio = filhas.map((f) => f.inicio).sort()[0]
        item.fim = filhas.map((f) => f.fim).sort().at(-1)
        item.progresso = mediaPesada(filhas, 'progresso')
        if (hoje) item.previsto = mediaPesada(filhas, 'previsto')
      } else if (hoje) {
        item.previsto = progressoPrevisto(item.inicio, item.fim, hoje, cal)
      }
      item.duracao = diasUteisEntre(item.inicio, item.fim, cal)
      item.subatividades = descendentes(atividades, a.id).length
      todas.push(item)
    }
    return todas
  }
  visitar(null, '', 0, false)
  return saida
}

// A obra inteira: o nível principal, sem as arquivadas, pesado como um grupo.
export function resumoObra(itens) {
  const raiz = itens.filter((i) => i.nivel === 0 && !i.arquivada)
  if (!raiz.length) return null
  const real = mediaPesada(raiz, 'progresso')
  const previsto = mediaPesada(raiz, 'previsto')
  return {
    inicio: raiz.map((i) => i.inicio).sort()[0],
    fim: raiz.map((i) => i.fim).sort().at(-1),
    real, previsto, diferenca: real - previsto,
  }
}

// Atrás do previsto: realizou menos do que o calendário dizia para hoje.
export function atrasDoPrevisto(item) {
  return item.progresso < item.previsto
}

// ── escala do cronograma (Longo prazo) ──────────────────────────────────────
export const VISOES = ['Semana', 'Mês']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const somarDias = (iso, n) => { const d = paraData(iso); d.setDate(d.getDate() + n); return paraIso(d) }

export function segundaDaSemana(iso) {
  const dia = paraData(iso).getDay()
  return somarDias(iso, dia === 0 ? -6 : 1 - dia)
}

// Colunas de semana (segunda a domingo) ou de mês que cobrem todas as
// atividades não arquivadas. Cada coluna diz quantos dias corridos tem.
export function montarEscala(itens, visao) {
  const ativos = itens.filter((i) => !i.arquivada)
  if (!ativos.length) return null
  const primeiro = ativos.map((i) => i.inicio).sort()[0]
  const ultimo = ativos.map((i) => i.fim).sort().at(-1)
  const colunas = []
  let col = visao === 'Mês' ? `${primeiro.slice(0, 7)}-01` : segundaDaSemana(primeiro)
  while (col <= ultimo) {
    let prox
    let rotulo
    if (visao === 'Mês') {
      const [a, m] = col.split('-').map(Number)
      prox = m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`
      rotulo = `${MESES[m - 1]}/${String(a).slice(2)}`
    } else {
      prox = somarDias(col, 7)
      rotulo = `${col.slice(8, 10)}/${col.slice(5, 7)}`
    }
    colunas.push({ inicio: col, rotulo, dias: diasEntre(col, prox) })
    col = prox
  }
  const inicio = colunas[0].inicio
  const fim = somarDias(col, -1)
  return { inicio, fim, total: diasEntre(inicio, fim) + 1, colunas }
}

// Onde a barra começa e quanto ocupa, em % da largura da escala (dias corridos).
export function posicaoNaEscala(inicio, fim, escala) {
  return {
    esquerda: (diasEntre(escala.inicio, inicio) / escala.total) * 100,
    largura: ((diasEntre(inicio, fim) + 1) / escala.total) * 100,
  }
}

// A linha de "hoje", no meio do dia; fora da escala, null.
export function posicaoDoDia(iso, escala) {
  if (iso < escala.inicio || iso > escala.fim) return null
  return ((diasEntre(escala.inicio, iso) + 0.5) / escala.total) * 100
}

// ── Médio prazo: lookahead de restrições ────────────────────────────────────
// Texto idêntico ao CHECK de restricoes.tipo.
export const TIPOS_RESTRICAO = ['Material', 'Mão de obra', 'Método', 'Equipamento', 'Projeto', 'Segurança', 'Logística']
export const SEMANAS_LOOKAHEAD = [3, 4, 5, 6]
export const SEMANAS_PADRAO = 4

// As semanas da janela, de segunda a domingo, começando pela de hoje.
export function semanasDoLookahead(hoje, n) {
  const primeira = segundaDaSemana(hoje)
  return Array.from({ length: n }, (_, k) => {
    const inicio = somarDias(primeira, 7 * k)
    return { inicio, fim: somarDias(inicio, 6), atual: k === 0 }
  })
}

export const restricaoAberta = (r) => !r.resolvida_em
export const restricaoVencida = (r, hoje) => restricaoAberta(r) && r.prazo < hoje

// O quadro: cada restrição na semana do prazo; aberta e vencida vai para a
// semana atual. Restrição de atividade arquivada não entra. Resolvida só com
// o filtro, e só se o prazo cai na janela. O que passa da janela vira `depois`.
export function quadroLookahead(restricoes, { hoje, semanas: n = SEMANAS_PADRAO, responsavel = '', mostrarResolvidas = false }) {
  const semanas = semanasDoLookahead(hoje, n).map((s) => ({ ...s, restricoes: [] }))
  const fimJanela = semanas.at(-1).fim
  let depois = 0
  for (const r of restricoes) {
    if (r.atividade?.arquivada) continue
    if (responsavel && r.responsavel !== responsavel) continue
    if (!restricaoAberta(r) && !mostrarResolvidas) continue
    const vencida = restricaoVencida(r, hoje)
    if (r.prazo > fimJanela) { depois++; continue }
    const semana = vencida ? semanas[0] : semanas.find((s) => r.prazo >= s.inicio && r.prazo <= s.fim)
    if (semana) semana.restricoes.push({ ...r, vencida })
  }
  const ordem = (r) => (r.vencida ? 0 : restricaoAberta(r) ? 1 : 2)
  for (const s of semanas) s.restricoes.sort((a, b) => ordem(a) - ordem(b) || (a.prazo < b.prazo ? -1 : a.prazo > b.prazo ? 1 : 0))
  return { semanas, depois, fimJanela }
}

// Os números do topo: abertas, vencidas e quantas atividades da janela estão
// prontas (sem restrição aberta). Atividade da janela = sem subatividades, não
// arquivada, abaixo de 100% e que começa até o fim da janela (a atrasada, que
// já devia ter terminado, conta: ainda falta fazê-la).
export function resumoLookahead(itens, restricoes, { hoje, semanas: n = SEMANAS_PADRAO }) {
  const fim = semanasDoLookahead(hoje, n).at(-1).fim
  const valendo = restricoes.filter((r) => !r.atividade?.arquivada && restricaoAberta(r))
  const travadas = new Set(valendo.map((r) => r.atividade_id))
  const naJanela = itens.filter((i) => !i.ehGrupo && !i.arquivada && i.progresso < 100 && i.inicio <= fim)
  return {
    abertas: valendo.length,
    vencidas: valendo.filter((r) => restricaoVencida(r, hoje)).length,
    prontas: naJanela.filter((i) => !travadas.has(i.id)).length,
    naJanela: naJanela.length,
  }
}

// Nomes sem repetição e em ordem (filtro e sugestões de responsável).
export function nomesUnicos(nomes) {
  return [...new Set(nomes.map((n) => String(n || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

// Mover de semana anda 7 dias; não volta para antes da semana de hoje.
export function moverPrazo(prazo, direcao) {
  return somarDias(prazo, 7 * direcao)
}
export function podeVoltarSemana(prazo, hoje) {
  return segundaDaSemana(prazo) > segundaDaSemana(hoje)
}

export function validarRestricao(campos, hoje) {
  const p = {}
  if (!String(campos.descricao || '').trim()) p.descricao = 'Descreva o impedimento.'
  if (!TIPOS_RESTRICAO.includes(campos.tipo)) p.tipo = 'Escolha o tipo.'
  if (!campos.atividade_id) p.atividade_id = 'Escolha a atividade que ela trava.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(campos.prazo || '')) p.prazo = 'Escolha o prazo de resolução.'
  else if (!campos.id && campos.prazo < hoje) p.prazo = 'O prazo não pode ser antes de hoje.'
  if (!String(campos.responsavel || '').trim()) p.responsavel = 'Diga quem resolve.'
  return p
}

// ── Curto prazo: a semana (Kanban + PPC) ────────────────────────────────────
export const SITUACOES_SUBTAREFA = ['Pendente', 'Feita', 'Não realizado']

export function semanaDe(iso) {
  const inicio = segundaDaSemana(iso)
  return { inicio, fim: somarDias(inicio, 6) }
}
export function semanaVizinha(semana, direcao) {
  return semanaDe(somarDias(semana.inicio, 7 * direcao))
}
// 'passada', 'atual' ou 'futura' em relação a hoje.
export function tempoDaSemana(semana, hoje) {
  if (hoje > semana.fim) return 'passada'
  return hoje < semana.inicio ? 'futura' : 'atual'
}

// A coluna do cartão naquela semana: concluída até o domingo dela = Concluído;
// concluída só depois = ainda estava em andamento; senão, o status de hoje.
export function colunaNaSemana(a, semana) {
  if (a.concluida_em && a.concluida_em <= semana.fim) return 'Concluído'
  return a.status === 'Concluído' ? 'Em andamento' : a.status
}

// Quem entra na semana: atividade sem subatividades, não arquivada, que não foi
// concluída antes da semana, e cujo período cruza a semana OU que já devia ter
// terminado (acumulada).
export function atividadesDaSemana(itens, semana) {
  return itens
    .filter((a) => !a.ehGrupo && !a.arquivada && a.inicio <= semana.fim && !(a.concluida_em && a.concluida_em < semana.inicio))
    .map((a) => ({ ...a, coluna: colunaNaSemana(a, semana), acumulada: a.fim < semana.inicio }))
}

// PPC = concluídas na semana ÷ planejadas da semana × 100 (null sem planejadas).
export function ppcDaSemana(daSemana) {
  const concluidas = daSemana.filter((a) => a.coluna === 'Concluído').length
  const planejadas = daSemana.length
  return { concluidas, planejadas, ppc: planejadas ? Math.round((concluidas / planejadas) * 100) : null }
}

// Meta usual do Last Planner: 80% do plano cumprido. Abaixo de 50, o plano não está servindo.
export const META_PPC = 80
export function faixaPpc(ppc) {
  if (ppc === null) return null
  if (ppc >= META_PPC) return 'Bom'
  return ppc >= 50 ? 'Regular' : 'Baixo'
}

export function proximaColuna(coluna) {
  return STATUS_ATIVIDADE[STATUS_ATIVIDADE.indexOf(coluna) + 1] || null
}
export function colunaAnterior(coluna) {
  return STATUS_ATIVIDADE[STATUS_ATIVIDADE.indexOf(coluna) - 1] || null
}

// O que muda na atividade ao trocar de coluna. Concluído grava a data e põe
// 100%; sair de Concluído limpa a data e não mexe no % (ajusta-se na ficha).
export function mudancaDeStatus(a, novo, hoje) {
  if (novo === 'Concluído') return { status: novo, concluida_em: a.concluida_em || hoje, progresso: 100 }
  return { status: novo, concluida_em: null, progresso: a.progresso }
}

// Só se move cartão na semana de hoje (o status é o de agora).
export const podeMoverNaSemana = (semana, hoje) => tempoDaSemana(semana, hoje) === 'atual'
// "Não realizado" se informa na semana atual ou numa que já passou, e só para o que não foi concluído.
export const podeMarcarNaoRealizado = (a, semana, hoje) => tempoDaSemana(semana, hoje) !== 'futura' && a.coluna !== 'Concluído'

// Causa com os motivos do diário (MOTIVOS, lib/atraso.js); "Outro" pede detalhe.
export function validarCausa({ causa, causa_detalhe }) {
  if (!MOTIVOS.includes(causa)) return 'Escolha a causa.'
  if (causa === 'Outro' && !String(causa_detalhe || '').trim()) return 'Explique a causa.'
  return null
}

export function resumoSubtarefas(subtarefas) {
  return {
    total: subtarefas.length,
    feitas: subtarefas.filter((s) => s.situacao === 'Feita').length,
    naoRealizadas: subtarefas.filter((s) => s.situacao === 'Não realizado').length,
  }
}

export function visiveisNaEap(itens, mostrarArquivadas) {
  return mostrarArquivadas ? itens : itens.filter((i) => !i.arquivada)
}

// Onde a atividade pode morar: nível principal ou qualquer atividade não
// arquivada que não seja ela mesma nem uma descendente dela (senão vira um laço).
export function paisPossiveis(itens, atividades, id) {
  const fora = new Set(id ? [id, ...descendentes(atividades, id)] : [])
  return itens.filter((i) => !i.arquivada && !fora.has(i.id))
}

export function paiValido(atividades, id, paiId) {
  if (!paiId) return true
  const pai = atividades.find((a) => a.id === paiId)
  if (!pai || pai.arquivada) return false
  return !id || (paiId !== id && !descendentes(atividades, id).includes(paiId))
}

export function proximaOrdem(atividades, paiId) {
  return Math.max(0, ...irmas(atividades, paiId).map((a) => a.ordem)) + 1
}

// Troca de lugar com a irmã de cima (-1) ou de baixo (+1), pulando as arquivadas
// (que não aparecem na árvore). Devolve as duas novas ordens, ou null na ponta.
export function trocarOrdem(atividades, id, direcao) {
  const a = atividades.find((x) => x.id === id)
  if (!a) return null
  const fila = irmas(atividades, a.pai_id).filter((x) => !x.arquivada || x.id === id)
  const vizinha = fila[fila.findIndex((x) => x.id === id) + direcao]
  if (!vizinha) return null
  return [{ id: a.id, ordem: vizinha.ordem }, { id: vizinha.id, ordem: a.ordem }]
}

// "% realizado": inteiro de 0 a 100. Vazio conta como 0; o resto é null.
export function lerPercentual(texto) {
  const t = String(texto ?? '').trim()
  if (t === '') return 0
  if (!/^\d{1,3}$/.test(t)) return null
  const n = Number(t)
  return n <= 100 ? n : null
}

// Grupo não edita datas nem %: elas saem das filhas.
export function validarAtividade(campos, { ehGrupo = false } = {}) {
  const p = {}
  if (!String(campos.titulo || '').trim()) p.titulo = 'Dê um título à atividade.'
  if (ehGrupo) return p
  if (!campos.inicio) p.inicio = 'Escolha a data de início.'
  if (!campos.fim) p.fim = 'Escolha a data de fim.'
  else if (campos.inicio && campos.fim < campos.inicio) p.fim = 'O fim não pode ser antes do início.'
  if (lerPercentual(campos.progresso) === null) p.progresso = 'Use um número de 0 a 100.'
  return p
}
