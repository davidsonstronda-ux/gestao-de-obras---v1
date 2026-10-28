// Regra do módulo Relatórios (o BI da obra). Fonte: PLANO-DO-PROJETO.md,
// "Relatórios — o BI da obra". Puro: sem React, sem banco, sem window.
// Recebe o que a camada de dados juntou da obra (dadosDoBi) e devolve as séries
// prontas para os gráficos. Sem dado, cada painel recebe null — nunca NaN.
import { MOTIVOS, SITUACOES_FRENTE } from './atraso.js'
import { diasEntre, formatarData } from './datas.js'
import { estaAtrasado, leadTime, PRIORIDADES, STATUS_PEDIDO } from './materiais.js'
import { percentualMedido, sobraDoContrato, totalDaMedicao } from './medicao.js'
import { situacaoInsumo, TIPOS_MOVIMENTO } from './estoque.js'
import { conformidade, filtrarNcs, progressoVistoria } from './fvs.js'
import { rankingDesperdicios } from './gemba.js'
import { META_PPC, atividadesDaSemana, ppcDaSemana, progressoPrevisto, semanaDe, semanaVizinha, tempoDaSemana } from './planejamento.js'
import { STATUS_REGISTRO } from './qualidade.js'

const CRITICO = PRIORIDADES[1]
// Guarda contra laço sem fim se vier uma data absurda (≈ 8 anos de semanas).
const MAX_SEMANAS = 400

// O que é planejado de verdade: atividade sem subatividades e não arquivada
// (o grupo é a soma das filhas, contaria duas vezes). Com empreiteiro, só as
// ligadas às frentes dele.
export function atividadesDoBi(itens, { empreiteiroId = '' } = {}) {
  return itens.filter((i) => !i.ehGrupo && !i.arquivada && (!empreiteiroId || i.empreiteiro_id === empreiteiroId))
}

// Média pesada pela duração em dias úteis (simples, se tudo tiver 0 dia).
function pesado(atividades, valor) {
  if (!atividades.length) return null
  const peso = atividades.reduce((s, a) => s + a.duracao, 0)
  return Math.round(peso
    ? atividades.reduce((s, a) => s + valor(a) * a.duracao, 0) / peso
    : atividades.reduce((s, a) => s + valor(a), 0) / atividades.length)
}

// % real × % previsto hoje. Sem atividade, null.
export function evolucao(atividades, cal, hoje) {
  if (!atividades.length) return null
  const real = pesado(atividades, (a) => a.progresso)
  const previsto = pesado(atividades, (a) => progressoPrevisto(a.inicio, a.fim, hoje, cal))
  return { real, previsto, diferenca: real - previsto }
}

// As semanas (segunda a domingo) que cobrem de `de` até `ate`.
export function semanasEntre(de, ate) {
  const semanas = []
  let s = semanaDe(de)
  while (s.inicio <= ate && semanas.length < MAX_SEMANAS) {
    semanas.push(s)
    s = semanaVizinha(s, 1)
  }
  return semanas
}

// Curva S, um ponto por semana, da primeira atividade à última.
// previsto = o que o calendário mandava ter feito até o domingo.
// real = semana passada: só o que estava concluído até o domingo (o app não
// guarda o % de cada dia); semana de hoje: o % real de hoje; futura: null.
export function curvaS(atividades, cal, hoje) {
  if (!atividades.length) return []
  const inicio = atividades.map((a) => a.inicio).sort()[0]
  const fim = atividades.map((a) => a.fim).sort().at(-1)
  return semanasEntre(inicio, fim).map((s) => {
    const depoisDoDomingo = semanaVizinha(s, 1).inicio
    const tempo = tempoDaSemana(s, hoje)
    let real = null
    if (tempo === 'passada') real = pesado(atividades, (a) => (a.concluida_em && a.concluida_em <= s.fim ? 100 : 0))
    else if (tempo === 'atual') real = pesado(atividades, (a) => a.progresso)
    return {
      semana: s.inicio,
      atual: tempo === 'atual',
      previsto: pesado(atividades, (a) => progressoPrevisto(a.inicio, a.fim, depoisDoDomingo, cal)),
      real,
    }
  })
}

// PPC de cada semana já fechada (antes da semana de hoje), da primeira atividade
// em diante. Semana sem nada planejado fica de fora.
export function ppcPorSemana(atividades, hoje) {
  if (!atividades.length) return []
  const inicio = atividades.map((a) => a.inicio).sort()[0]
  const atual = semanaDe(hoje)
  if (inicio >= atual.inicio) return []
  return semanasEntre(inicio, semanaVizinha(atual, -1).inicio)
    .map((s) => ({ semana: s.inicio, ...ppcDaSemana(atividadesDaSemana(atividades, s)) }))
    .filter((p) => p.planejadas > 0)
}

// PPC geral = soma das concluídas ÷ soma das planejadas das semanas fechadas.
export function ppcGeral(porSemana) {
  const concluidas = porSemana.reduce((s, p) => s + p.concluidas, 0)
  const planejadas = porSemana.reduce((s, p) => s + p.planejadas, 0)
  return { concluidas, planejadas, ppc: planejadas ? Math.round((concluidas / planejadas) * 100) : null }
}

// Dias corridos de hoje até a entrega (negativo = passou). Sem data, null.
export function prazoDaObra(dataEntrega, hoje) {
  return dataEntrega ? diasEntre(hoje, dataEntrega) : null
}

// R$ das medições Fechadas (a camada de dados já manda só elas).
export function custoMedido(medido, { empreiteiroId = '' } = {}) {
  return totalDaMedicao(medido.filter((m) => !empreiteiroId || m.empreiteiro_id === empreiteiroId))
}

// ── Painel 2: Ritmo & Produção ──────────────────────────────────────────────
const doEmpreiteiro = (lista, empreiteiroId) => lista.filter((x) => !empreiteiroId || x.empreiteiro_id === empreiteiroId)

// Pareto: cada "Não realizado" (Kanban e subtarefa) e cada "Não andou" do diário
// conta uma vez para a sua causa. Maior primeiro (empate: a ordem dos motivos do
// diário), com o % de cada uma e o % acumulado.
export function paretoDeCausas(causas, { empreiteiroId = '' } = {}) {
  const contagem = new Map()
  for (const c of doEmpreiteiro(causas, empreiteiroId)) {
    if (c.causa) contagem.set(c.causa, (contagem.get(c.causa) || 0) + 1)
  }
  const total = [...contagem.values()].reduce((s, n) => s + n, 0)
  const ordem = (causa) => (MOTIVOS.includes(causa) ? MOTIVOS.indexOf(causa) : MOTIVOS.length)
  let acumulado = 0
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1] || ordem(a[0]) - ordem(b[0]))
    .map(([causa, quantidade]) => {
      acumulado += quantidade
      return { causa, quantidade, pct: Math.round((quantidade / total) * 100), acumulado: Math.round((acumulado / total) * 100) }
    })
}

// Um ponto por dia de diário: o clima e as pessoas no canteiro (só as do
// empreiteiro, se filtrado).
export function climaEfetivo(diarios, { empreiteiroId = '' } = {}) {
  return [...diarios]
    .sort((a, b) => (a.data < b.data ? -1 : 1))
    .map((d) => ({
      data: d.data,
      clima: d.clima,
      pessoas: doEmpreiteiro(d.equipes || [], empreiteiroId).reduce((s, e) => s + (Number(e.pessoas) || 0), 0),
    }))
}

// ── Painel 3: Contratos & Medições ──────────────────────────────────────────
// O contrato é o da frente (tabela `contratos`); "medido" só conta as Fechadas.
function medidoDaFrente(medido, frenteId) {
  return totalDaMedicao(medido.filter((m) => m.frente_id === frenteId))
}

// Quantas frentes e quanto contratado em cada situação, na ordem do fluxo.
export function fluxoContratos(frentes, { empreiteiroId = '' } = {}) {
  const minhas = doEmpreiteiro(frentes, empreiteiroId)
  return SITUACOES_FRENTE.map((situacao) => {
    const nela = minhas.filter((f) => f.situacao === situacao)
    return { situacao, quantidade: nela.length, valor: totalDaMedicao(nela.map((f) => ({ valor: f.valor_contratado }))) }
  })
}

// Uma linha por empreiteiro com contrato: contratado, medido, % medido e saldo.
// Maior saldo primeiro (é quem ainda vai sair do caixa).
export function matrizEmpreiteiros(frentes, medido, empreiteiros, { empreiteiroId = '' } = {}) {
  return doEmpreiteiro(empreiteiros.map((e) => ({ ...e, empreiteiro_id: e.id })), empreiteiroId)
    .map((e) => {
      const dele = frentes.filter((f) => f.empreiteiro_id === e.id)
      const contratado = totalDaMedicao(dele.map((f) => ({ valor: f.valor_contratado })))
      const jaMedido = totalDaMedicao(dele.map((f) => ({ valor: medidoDaFrente(medido, f.id) })))
      return { id: e.id, nome: e.nome, contratado, medido: jaMedido, pct: percentualMedido(jaMedido, contratado), saldo: sobraDoContrato(contratado, jaMedido) }
    })
    .filter((l) => l.contratado > 0)
    .sort((a, b) => b.saldo - a.saldo || a.nome.localeCompare(b.nome))
}

// Saldo a medir de cada contrato (frente), maior primeiro; sem saldo fica de fora.
export function saldoPorContrato(frentes, medido, { empreiteiroId = '' } = {}) {
  return doEmpreiteiro(frentes, empreiteiroId)
    .map((f) => ({ id: f.id, servico: f.servico, saldo: sobraDoContrato(f.valor_contratado || 0, medidoDaFrente(medido, f.id)) }))
    .filter((f) => f.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo || a.servico.localeCompare(b.servico))
}

// ── Painel 4: Materiais ─────────────────────────────────────────────────────
// Quantos pedidos em cada coluna do quadro, na ordem do quadro.
export function pedidosPorEtapa(pedidos, { empreiteiroId = '' } = {}) {
  const meus = doEmpreiteiro(pedidos, empreiteiroId)
  return STATUS_PEDIDO.map((status) => ({ status, quantidade: meus.filter((p) => p.status === status).length }))
}

// Previsão vencida e ainda A caminho; o mais atrasado primeiro.
export function pedidosAtrasados(pedidos, hoje, { empreiteiroId = '' } = {}) {
  return doEmpreiteiro(pedidos, empreiteiroId)
    .filter((p) => estaAtrasado(p, hoje))
    .map((p) => ({ id: p.id, material: p.material, frente: p.frente, critico: p.prioridade === CRITICO, dias: diasEntre(p.previsao_entrega, hoje) }))
    .sort((a, b) => b.dias - a.dias)
}

// Lead time de cada pedido que já chegou, com a semana da chegada.
function chegadas(pedidos) {
  return pedidos.flatMap((p) => {
    const dias = leadTime(p.historico)
    if (dias === null) return []
    const chegou = p.historico.filter((h) => h.status === 'No almoxarifado').map((h) => h.data).sort().at(-1)
    return [{ dias, chegou, semana: semanaDe(chegou).inicio }]
  })
}
const media = (lista) => (lista.length ? Math.round(lista.reduce((s, n) => s + n, 0) / lista.length) : null)

// Lead time médio (Solicitar → No almoxarifado) do que chegou no período, e a
// média de cada uma das últimas 4 semanas (a de hoje incluída; sem chegada, null).
export function leadTimeDosPedidos(pedidos, hoje, { empreiteiroId = '', desde = null } = {}) {
  const todas = chegadas(doEmpreiteiro(pedidos, empreiteiroId))
  const tendencia = ultimasSemanas(hoje, 4).map((s) => {
    const nela = todas.filter((c) => c.semana === s.inicio).map((c) => c.dias)
    return { semana: s.inicio, media: media(nela), quantidade: nela.length }
  })
  const doPeriodo = todas.filter((c) => noPeriodo(c.chegou, desde)).map((c) => c.dias)
  return { media: media(doPeriodo), pedidos: doPeriodo.length, tendencia }
}

// Estoque (opcional): só aparece se a obra tem insumo. Críticos são da obra
// inteira (o insumo não é de um empreiteiro); os movimentos seguem a frente.
// Por semana conta lançamentos, não quantidade: cada insumo tem a sua unidade.
export function resumoEstoque(insumos, movimentos, hoje, { empreiteiroId = '' } = {}) {
  if (!insumos.length) return null
  const meus = doEmpreiteiro(movimentos, empreiteiroId)
  const [ENTRADA, SAIDA] = TIPOS_MOVIMENTO
  const semanas = ultimasSemanas(hoje, 6).map((s) => {
    const nela = meus.filter((m) => m.data >= s.inicio && m.data <= s.fim)
    return { semana: s.inicio, entradas: nela.filter((m) => m.tipo === ENTRADA).length, saidas: nela.filter((m) => m.tipo === SAIDA).length }
  })
  return {
    criticos: insumos.filter((i) => situacaoInsumo(i) === 'Crítico').map((i) => ({ id: i.id, nome: i.nome, saldo: i.saldo, minimo: i.saldo_minimo, unidade: i.unidade })),
    semanas,
  }
}

// Pedidos críticos que ainda não foram entregues (ao lado dos atrasados).
export function pedidosCriticosEmAberto(pedidos, { empreiteiroId = '' } = {}) {
  return doEmpreiteiro(pedidos, empreiteiroId).filter((p) => p.prioridade === CRITICO && p.status !== STATUS_PEDIDO.at(-1)).length
}

// ── Painel 5: Qualidade & Entrega ───────────────────────────────────────────
// Abaixo disto o modelo de FVS sai em vermelho: a mesma meta usual do PPC.
export const META_CONFORME = META_PPC

// % conforme de cada modelo de FVS = OK ÷ (OK + NC) somando as vistorias dele.
// Pior primeiro (é onde está o retrabalho). Modelo sem OK nem NC fica de fora.
export function conformePorModelo(vistorias, { desde = null } = {}) {
  const porModelo = new Map()
  for (const v of vistorias.filter((x) => noPeriodo(x.criada_em, desde))) {
    const p = progressoVistoria(v.grupos, v.respostas)
    const atual = porModelo.get(v.modelo_nome) || { ok: 0, nc: 0, vistorias: 0 }
    porModelo.set(v.modelo_nome, { ok: atual.ok + p.ok, nc: atual.nc + p.nc, vistorias: atual.vistorias + 1 })
  }
  return [...porModelo.entries()]
    .map(([modelo, s]) => ({ modelo, ...s, pct: conformidade(s.ok, s.nc) }))
    .filter((m) => m.pct !== null)
    .map((m) => ({ ...m, abaixoDaMeta: m.pct < META_CONFORME }))
    .sort((a, b) => a.pct - b.pct || a.modelo.localeCompare(b.modelo))
}

const registroAberto = (r) => r.status !== STATUS_REGISTRO.at(-1)

// Quem cobrar: registros de Vistoria não resolvidos + NCs não fechadas, por empresa.
export function pendenciasPorEmpresa(registros, ncs, empreiteiros, { empreiteiroId = '', desde = null } = {}) {
  const regs = doEmpreiteiro(registros, empreiteiroId).filter((r) => registroAberto(r) && noPeriodo(r.data_vistoria, desde))
  const abertas = filtrarNcs(doEmpreiteiro(ncs, empreiteiroId), 'Em aberto').filter((n) => noPeriodo(n.aberta_em, desde))
  return empreiteiros
    .map((e) => {
      const vistoria = regs.filter((r) => r.empreiteiro_id === e.id).length
      const nc = abertas.filter((n) => n.empreiteiro_id === e.id).length
      return { id: e.id, nome: e.nome, vistoria, nc, total: vistoria + nc }
    })
    .filter((e) => e.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
}

// Registros de Vistoria não resolvidos por local, o mais problemático primeiro.
export function pendenciasPorLocal(registros, { empreiteiroId = '', desde = null } = {}) {
  const contagem = new Map()
  for (const r of doEmpreiteiro(registros, empreiteiroId).filter((x) => registroAberto(x) && noPeriodo(x.data_vistoria, desde))) {
    contagem.set(r.local, (contagem.get(r.local) || 0) + 1)
  }
  return [...contagem.entries()].map(([local, quantidade]) => ({ local, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.local.localeCompare(b.local))
}

// ── filtros ─────────────────────────────────────────────────────────────────
export const PERIODOS = ['Tudo', 'Este mês', 'Últimas 4 semanas']

// O primeiro dia do período (null = tudo). "Últimas 4 semanas" = a de hoje e as 3 anteriores.
export function inicioDoPeriodo(periodo, hoje) {
  if (periodo === 'Este mês') return `${hoje.slice(0, 8)}01`
  if (periodo === 'Últimas 4 semanas') return semanaVizinha(semanaDe(hoje), -3).inicio
  return null
}
function noPeriodo(data, desde) {
  return !desde || (Boolean(data) && data >= desde)
}
// A semana entra se termina dentro do período, que vai até hoje: com período,
// as semanas futuras da Curva S ficam de fora.
const semanaNoPeriodo = (inicioDaSemana, desde, hoje) => !desde || (semanaDe(inicioDaSemana).fim >= desde && inicioDaSemana <= hoje)

// As `n` semanas que terminam na de hoje (ela incluída), da mais antiga à de hoje.
function ultimasSemanas(hoje, n) {
  return semanasEntre(semanaVizinha(semanaDe(hoje), -(n - 1)).inicio, hoje)
}

// Uma linha para o cabeçalho do relatório impresso.
export function descreverFiltrosBi({ empreiteiroId = '', periodo = 'Tudo' }, empreiteiros, hoje) {
  const empresa = empreiteiros.find((e) => e.id === empreiteiroId)?.nome || 'Todos'
  const desde = inicioDoPeriodo(periodo, hoje)
  const quando = desde ? `${periodo} (desde ${formatarData(desde)})` : periodo
  return `Empreiteiro: ${empresa} · Período: ${quando}`
}

// Tudo o que a tela desenha, já recortado pelos filtros. O período recorta o que
// tem data; evolução, prazo, contratos, pedidos por etapa, atrasados e estoque
// crítico são a posição de hoje.
export function montarBi(base, { empreiteiroId = '', periodo = 'Tudo' } = {}, hoje) {
  const filtros = { empreiteiroId, desde: inicioDoPeriodo(periodo, hoje) }
  const { desde } = filtros
  const atividades = atividadesDoBi(base.atividades, filtros)
  const porSemana = ppcPorSemana(atividades, hoje).filter((p) => semanaNoPeriodo(p.semana, desde, hoje))
  return {
    // A obra ainda não registrou nada em módulo nenhum (antes de qualquer filtro).
    vazio: !base.atividades.length && !base.diarios.length && !base.frentes.length && !base.pedidos.length
      && !base.registros.length && !base.fvs.length && !base.gemba.length,
    ritmo: {
      ppcSemanal: porSemana.map((p) => ({ ...p, naoConcluidas: p.planejadas - p.concluidas })),
      pareto: paretoDeCausas(base.causas.filter((c) => noPeriodo(c.data, desde)), filtros),
      efetivo: climaEfetivo(base.diarios.filter((d) => noPeriodo(d.data, desde)), filtros),
    },
    qualidade: {
      conforme: conformePorModelo(base.fvs, filtros),
      porEmpresa: pendenciasPorEmpresa(base.registros, base.ncs, base.empreiteiros, filtros),
      porLocal: pendenciasPorLocal(base.registros, filtros),
      desperdicios: rankingDesperdicios(base.gemba.filter((g) => noPeriodo(g.criada_em, desde))).filter((d) => d.quantidade > 0),
    },
    contratos: {
      fluxo: fluxoContratos(base.frentes, filtros),
      matriz: matrizEmpreiteiros(base.frentes, base.medido, base.empreiteiros, filtros),
      saldos: saldoPorContrato(base.frentes, base.medido, filtros),
    },
    materiais: {
      etapas: pedidosPorEtapa(base.pedidos, filtros),
      criticos: pedidosCriticosEmAberto(base.pedidos, filtros),
      atrasados: pedidosAtrasados(base.pedidos, hoje, filtros),
      leadTime: leadTimeDosPedidos(base.pedidos, hoje, filtros),
      estoque: resumoEstoque(base.insumos, base.movimentos, hoje, filtros),
    },
    executivo: {
      evolucao: evolucao(atividades, base.calendario, hoje),
      prazo: prazoDaObra(base.obra.data_entrega, hoje),
      dataEntrega: base.obra.data_entrega,
      custo: custoMedido(base.medido.filter((m) => noPeriodo(m.fechada_em, desde)), filtros),
      curva: curvaS(atividades, base.calendario, hoje).filter((p) => semanaNoPeriodo(p.semana, desde, hoje)),
      ppc: ppcGeral(porSemana),
    },
  }
}
