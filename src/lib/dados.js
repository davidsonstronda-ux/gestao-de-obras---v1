// CAMADA DE DADOS — a única porta de entrada dos dados do app.
// Nenhuma tela lê mock nem chama Supabase direto: tudo passa por aqui.
//
// MULTI-OBRA: a obra atual e a pessoa logada ficam guardadas aqui dentro
// (definirContexto). Toda função de lançamento pega o obra_id daqui; as telas
// NÃO passam obra_id. Sem obra escolhida, a função devolve erro em vez de dados.
//
// Etapa 4: o miolo lê e grava numa cópia em memória dos mocks (some ao recarregar).
// Etapa 7: troca-se o miolo destas funções por consultas ao Supabase, com as
// mesmas regras valendo pela RLS. Nenhuma tela muda.
import * as mock from './mockData.js'
import { hoje } from './config.js'
import { calcularFrente, frenteVisivelNoRisco, ordenarFrentes, situacaoEntrega } from './atraso.js'
import { acessoAoDia, frentesDoDia, validarDiario } from './diario.js'
import { pode, obraNoSeletor } from './permissoes.js'
import { diasEntre } from './datas.js'
import { contadoresPedidos, diasNaColuna, estaAtrasado, etiquetaPedido, leadTime, lerQuantidade, ordenarPedidos, proximoStatus, recebidoComProblema, validarMudanca, validarNovoPedido } from './materiais.js'
import { contarCriticos, geraEntrada, saldoDepois, situacaoInsumo, validarBaixa } from './estoque.js'
import {
  SITUACOES_SUBTAREFA, STATUS_ATIVIDADE, ancestrais, atividadesDaSemana, calendarioDaObra, descendentes, lerPercentual, montarEap,
  moverPrazo, mudancaDeStatus, nomesUnicos, paiValido, podeMarcarNaoRealizado, podeVoltarSemana, proximaOrdem, segundaDaSemana,
  semanaDe, trocarOrdem, validarCausa, validarAtividade, validarDiasSemana, validarFeriado, validarRestricao,
} from './planejamento.js'
import { conferirCronograma } from './importarCronograma.js'
import {
  arredondarCentavos, difereDoSugerido, fimDaUltimaFechada, numerarMedicoes, ordenarEmpreiteiros, ordenarHistorico, periodoPadrao, resumoFrente,
  somarResumos, sugeridoNoPeriodo, totalDaMedicao, validarMedicao,
} from './medicao.js'

// Cópia de trabalho: as telas podem criar e editar sem estragar o original.
const db = structuredClone({
  obras: mock.mockObras, profiles: mock.mockProfiles, membros: mock.mockMembros,
  ambientes: mock.mockAmbientes, empreiteiros: mock.mockEmpreiteiros, frentes: mock.mockFrentes,
  contratos: mock.mockContratos, frente_ambientes: mock.mockFrenteAmbientes, diarios: mock.mockDiarios,
  apontamentos: mock.mockApontamentos, fotos: mock.mockFotos, pendencias: mock.mockPendencias,
  comentarios: mock.mockComentarios, materiais: mock.mockMateriais, pedidos: mock.mockPedidos,
  pedido_historico: mock.mockPedidoHistorico, insumos: mock.mockInsumos, movimentos: mock.mockMovimentos,
  calendarios: mock.mockCalendarios, feriados: mock.mockFeriados, atividades: mock.mockAtividades,
  restricoes: mock.mockRestricoes, subtarefas: mock.mockSubtarefas, nao_realizados: mock.mockNaoRealizados,
  medicoes: mock.mockMedicoes, medicao_itens: mock.mockMedicaoItens,
})

const contexto = { obraId: null, perfil: null }

export function definirContexto({ obraId, perfil }) {
  if (obraId !== undefined) contexto.obraId = obraId
  if (perfil !== undefined) contexto.perfil = perfil
}

// ── utilitários internos ────────────────────────────────────────────────────
const espera = () => new Promise((r) => setTimeout(r, 120)) // imita a rede, para ver o "carregando"
const ok = (data) => ({ data, erro: null })
const falha = (erro) => ({ data: null, erro })
let seq = 1
const novoId = (prefixo) => `${prefixo}-novo-${seq++}`
const agora = () => `${hoje()}T${new Date().toTimeString().slice(0, 8)}`

function role() {
  return contexto.perfil?.role
}
function souMembro(obraId) {
  return db.membros.some((m) => m.obra_id === obraId && m.pessoa_id === contexto.perfil?.id)
}
// Toda função de lançamento começa por aqui. É o "WHERE obra_id = ..." do mock,
// e o que a RLS por obra vai fazer no banco.
function exigirObra() {
  if (!contexto.perfil) return { erro: 'Faça login para continuar.' }
  if (!contexto.obraId) return { erro: 'Nenhuma obra selecionada.' }
  if (!souMembro(contexto.obraId)) return { erro: 'Você não tem acesso a esta obra.' }
  return { obraId: contexto.obraId }
}
const daObra = (tabela, obraId) => db[tabela].filter((r) => r.obra_id === obraId)
const nomePessoa = (id) => db.profiles.find((p) => p.id === id)?.nome || '—'

function calcular(frentesDaObra, obraId) {
  const diarios = daObra('diarios', obraId)
  return frentesDaObra.map((f) => ({
    ...f,
    calculo: calcularFrente(f, diarios, db.apontamentos.filter((a) => a.frente_id === f.id), hoje()),
  }))
}
function empreiteiroVisivel(empreiteiroId) {
  if (!pode(role(), 'verEmpreiteiro')) return null
  return db.empreiteiros.find((e) => e.id === empreiteiroId) || null
}
function valorVisivel(frenteId) {
  if (!pode(role(), 'verValores')) return null
  return db.contratos.find((c) => c.frente_id === frenteId)?.valor_contratado ?? null
}

// ── sessão (login de mentira até a Etapa 7) ─────────────────────────────────
export async function listarPerfisDeTeste() {
  await espera()
  return ok(db.profiles.map((p) => ({ ...p })))
}

export async function entrarComo(perfilId) {
  await espera()
  const perfil = db.profiles.find((p) => p.id === perfilId && p.ativo)
  if (!perfil) return falha('Usuário não encontrado.')
  contexto.perfil = perfil
  contexto.obraId = null
  return ok({ ...perfil })
}

// ── obras ───────────────────────────────────────────────────────────────────
// As obras que esta pessoa pode abrir (as do seletor). Concluída sai; Parada fica.
export async function listarMinhasObras() {
  await espera()
  if (!contexto.perfil) return falha('Faça login para continuar.')
  const minhas = db.obras.filter((o) => souMembro(o.id) && obraNoSeletor(o))
  return ok(minhas.map((o) => ({ ...o })))
}

// Cadastro de obras (engenheiro): inclui as concluídas.
export async function listarObrasCadastro() {
  await espera()
  if (!pode(role(), 'cadastrar')) return falha('Sem permissão.')
  return ok(db.obras.filter((o) => souMembro(o.id)).map((o) => ({ ...o })))
}

export async function salvarObra(dados) {
  await espera()
  if (!pode(role(), 'cadastrar')) return falha('Sem permissão.')
  const obrigatorios = ['nome', 'codigo', 'cliente_nome', 'data_inicio', 'data_entrega', 'situacao']
  if (obrigatorios.some((c) => !String(dados[c] || '').trim())) return falha('Preencha todos os campos obrigatórios.')
  if (dados.data_entrega < dados.data_inicio) return falha('A data-meta de entrega não pode ser antes do início.')
  if (dados.id) {
    const i = db.obras.findIndex((o) => o.id === dados.id)
    if (i < 0 || !souMembro(dados.id)) return falha('Obra não encontrada.')
    db.obras[i] = { ...db.obras[i], ...dados }
    return ok({ ...db.obras[i] })
  }
  const obra = { ...dados, id: novoId('obra') }
  db.obras.push(obra)
  // Quem cria vira membro (PRD-BACKEND, regra de obras).
  db.membros.push({ id: novoId('m'), obra_id: obra.id, pessoa_id: contexto.perfil.id })
  return ok({ ...obra })
}

// ── frentes em risco (tela do dia a dia) ────────────────────────────────────
export async function listarFrentesEmRisco({ ordem = 'limite' } = {}) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verFrentes')) return falha('Sem permissão.')
  const obra = db.obras.find((o) => o.id === obraId)
  const todas = daObra('frentes', obraId)
  const visiveis = todas.filter((f) => frenteVisivelNoRisco(f, hoje()))
  const pendAbertas = new Set(daObra('pendencias', obraId).filter((p) => p.situacao === 'Aberta').map((p) => p.frente_id))
  const frentes = ordenarFrentes(calcular(visiveis, obraId), ordem).map((f) => ({
    ...f,
    empreiteiro: empreiteiroVisivel(f.empreiteiro_id),
    temPendenciaAberta: pendAbertas.has(f.id),
  }))
  return ok({
    entrega: { data: obra.data_entrega, ...situacaoEntrega(frentes) },
    frentes,
    escondidas: todas.length - visiveis.length,
    pendenciasAbertas: pendAbertas.size,
  })
}

export async function detalheFrente(frenteId) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verFrentes')) return falha('Sem permissão.')
  const f = daObra('frentes', obraId).find((x) => x.id === frenteId)
  if (!f) return falha('Frente não encontrada nesta obra.')
  const [calc] = calcular([f], obraId)
  const ambientes = daObra('frente_ambientes', obraId)
    .filter((x) => x.frente_id === f.id)
    .map((x) => ({ ...x, nome: db.ambientes.find((a) => a.id === x.ambiente_id)?.nome }))

  const diarios = new Map(daObra('diarios', obraId).map((d) => [d.id, d]))
  const tempo = []
  if (pode(role(), 'verDiario')) {
    for (const a of db.apontamentos.filter((x) => x.frente_id === f.id)) {
      const d = diarios.get(a.diario_id)
      if (d) tempo.push({ id: a.id, data: d.data, quando: d.data, tipo: a.situacao, motivo: a.motivo, detalhe: a.motivo_detalhe, autor: nomePessoa(d.autor_id) })
    }
  }
  for (const p of daObra('pendencias', obraId).filter((x) => x.frente_id === f.id)) {
    tempo.push({ id: p.id, data: p.created_at.slice(0, 10), quando: p.created_at, tipo: 'Pendência', texto: p.pergunta, situacao: p.situacao, autor: nomePessoa(p.aberta_por) })
  }
  for (const c of daObra('comentarios', obraId).filter((x) => x.frente_id === f.id)) {
    tempo.push({ id: c.id, data: c.created_at.slice(0, 10), quando: c.created_at, tipo: 'Comentário', texto: c.texto, autor: nomePessoa(c.autor_id) })
  }
  const fotos = daObra('fotos', obraId).filter((x) => x.frente_id === f.id)
  for (const item of tempo) item.fotos = fotos.filter((x) => x.tirada_em === item.data && item.tipo === 'Andou').length
  tempo.sort((a, b) => (a.quando < b.quando ? 1 : -1))

  return ok({
    ...calc,
    empreiteiro: empreiteiroVisivel(f.empreiteiro_id),
    valor_contratado: valorVisivel(f.id),
    ambientes,
    tempo,
  })
}

export async function comentarFrente(frenteId, texto) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'comentar')) return falha('Sem permissão.')
  if (!texto.trim()) return falha('Escreva o comentário.')
  if (!daObra('frentes', obraId).some((f) => f.id === frenteId)) return falha('Frente não encontrada nesta obra.')
  const c = { id: novoId('cm'), obra_id: obraId, pendencia_id: null, frente_id: frenteId, texto: texto.trim(), autor_id: contexto.perfil.id, created_at: agora() }
  db.comentarios.push(c)
  return ok(c)
}

// Só nome e id, para escolher a frente numa lista (ex.: nova pendência).
export async function listarFrentesParaEscolha() {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verFrentes')) return falha('Sem permissão.')
  return ok(daObra('frentes', obraId).filter((f) => f.situacao !== 'Concluída')
    .map((f) => ({ id: f.id, servico: f.servico })).sort((a, b) => a.servico.localeCompare(b.servico)))
}

// Cadastro de frentes (engenheiro): todas, com % e valor.
export async function listarFrentesCadastro() {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'cadastrar')) return falha('Sem permissão.')
  const fa = daObra('frente_ambientes', obraId)
  return ok(calcular(daObra('frentes', obraId), obraId).map((f) => {
    const meus = fa.filter((x) => x.frente_id === f.id)
    return {
      ...f,
      empreiteiro: empreiteiroVisivel(f.empreiteiro_id),
      valor_contratado: valorVisivel(f.id),
      ambientes: meus.map((x) => db.ambientes.find((a) => a.id === x.ambiente_id)?.nome),
      pct: meus.length ? Math.round((meus.filter((x) => x.concluido_em).length / meus.length) * 100) : 0,
    }
  }).sort((a, b) => (a.inicio_previsto < b.inicio_previsto ? -1 : 1)))
}

// ── diário ──────────────────────────────────────────────────────────────────
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/

// O diário de um dia (padrão: hoje), com o aviso de se a pessoa pode editá-lo.
// Quem trava é salvarDiario, que confere de novo; a tela só obedece.
export async function diarioDoDia(data = hoje()) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verDiario')) return falha('Sem permissão.')
  if (!DATA_VALIDA.test(data) || data > hoje()) return falha('Data inválida para o diário.')
  const existente = daObra('diarios', obraId).find((d) => d.data === data) || null
  const doDiario = existente ? db.apontamentos.filter((x) => x.diario_id === existente.id) : []
  const acesso = acessoAoDia({ role: role(), userId: contexto.perfil.id, diario: existente, data, hoje: hoje() })
  // Só leitura mostra o que foi marcado; editável soma as frentes abertas no dia.
  const marcadas = doDiario.map((a) => a.frente_id)
  const doDia = acesso.editavel
    ? frentesDoDia(daObra('frentes', obraId), data, hoje(), marcadas)
    : daObra('frentes', obraId).filter((f) => marcadas.includes(f.id))
  const fa = daObra('frente_ambientes', obraId)
  const frentes = doDia.map((f) => ({
    ...f,
    empreiteiro: empreiteiroVisivel(f.empreiteiro_id),
    deveriaTerComecado: f.situacao === 'Não iniciada',
    ambientesAbertos: fa.filter((x) => x.frente_id === f.id && !x.concluido_em)
      .map((x) => ({ id: x.id, nome: db.ambientes.find((a) => a.id === x.ambiente_id)?.nome })),
  }))
  const marcas = {}
  for (const a of doDiario) {
    marcas[a.frente_id] = { situacao: a.situacao, motivo: a.motivo, motivo_detalhe: a.motivo_detalhe }
  }
  return ok({ data, ehHoje: data === hoje(), acesso, existente, frentes, marcas, empreiteiros: daObra('empreiteiros', obraId) })
}

// Grava o diário do dia escolhido, os apontamentos, as conclusões por ambiente e as fotos.
// Processos automáticos (PRD-BACKEND): primeiro "Andou" põe a frente Em andamento;
// último ambiente concluído encerra a frente.
export async function salvarDiario({ data = hoje(), clima, equipes, ocorrencias, marcas, concluidos = [], fotos = [] }) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'lancarDiario')) return falha('Sem permissão.')
  if (!DATA_VALIDA.test(data) || data > hoje()) return falha('Data inválida para o diário.')
  const existente = daObra('diarios', obraId).find((d) => d.data === data)
  const acesso = acessoAoDia({ role: role(), userId: contexto.perfil.id, diario: existente, data, hoje: hoje() })
  if (!acesso.editavel) return falha(acesso.motivo)
  const marcadas = existente ? db.apontamentos.filter((a) => a.diario_id === existente.id).map((a) => a.frente_id) : []
  const frentesIds = frentesDoDia(daObra('frentes', obraId), data, hoje(), marcadas).map((f) => f.id)
  const problemas = validarDiario({ clima, frentesIds, marcas })
  if (problemas.length) return falha(problemas.join(' '))

  let diario = existente
  if (diario) Object.assign(diario, { clima, equipes, ocorrencias })
  else {
    diario = { id: novoId('d'), obra_id: obraId, data, clima, equipes, ocorrencias, autor_id: contexto.perfil.id }
    db.diarios.push(diario)
  }
  db.apontamentos = db.apontamentos.filter((a) => a.diario_id !== diario.id)
  for (const id of frentesIds) {
    const m = marcas[id]
    db.apontamentos.push({
      id: novoId('ap'), obra_id: obraId, diario_id: diario.id, frente_id: id, situacao: m.situacao,
      motivo: m.situacao === 'Não andou' ? m.motivo : null, motivo_detalhe: m.motivo === 'Outro' ? m.motivo_detalhe : null,
    })
    const frente = db.frentes.find((f) => f.id === id)
    if (m.situacao === 'Andou' && frente.situacao === 'Não iniciada') frente.situacao = 'Em andamento'
  }
  for (const faId of concluidos) {
    const x = db.frente_ambientes.find((r) => r.id === faId && r.obra_id === obraId)
    if (x && !x.concluido_em) Object.assign(x, { concluido_em: data, concluido_por: contexto.perfil.id })
  }
  for (const frente of daObra('frentes', obraId)) {
    const meus = db.frente_ambientes.filter((x) => x.frente_id === frente.id)
    if (frente.situacao !== 'Concluída' && meus.length && meus.every((x) => x.concluido_em)) {
      frente.situacao = 'Concluída'
      frente.concluida_em = meus.map((x) => x.concluido_em).sort().at(-1)
    }
  }
  for (const f of fotos) {
    db.fotos.push({ id: novoId('p'), obra_id: obraId, frente_id: f.frente_id, ambiente_id: f.ambiente_id || null, caminho: '', tirada_em: data, autor_id: contexto.perfil.id, visivel_cliente: false })
  }
  return ok({ ...diario })
}

// ── pendências de projeto ───────────────────────────────────────────────────
export async function listarPendencias({ situacao = 'Aberta' } = {}) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'abrirPendencia')) return falha('Sem permissão.')
  const frentes = calcular(daObra('frentes', obraId), obraId)
  const lista = daObra('pendencias', obraId)
    .filter((p) => situacao === 'Todas' || p.situacao === situacao)
    .map((p) => {
      const f = frentes.find((x) => x.id === p.frente_id)
      return {
        ...p,
        frente: f ? { id: f.id, servico: f.servico } : null,
        prazo: f?.calculo.dataLimite,
        folgaRestante: f?.calculo.folgaRestante ?? 0,
        abertaPor: nomePessoa(p.aberta_por),
        comentarios: daObra('comentarios', obraId).filter((c) => c.pendencia_id === p.id)
          .map((c) => ({ ...c, autor: nomePessoa(c.autor_id) })),
      }
    })
    .sort((a, b) => a.folgaRestante - b.folgaRestante)
  return ok(lista)
}

export async function abrirPendencia({ frente_id, pergunta }) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'abrirPendencia')) return falha('Sem permissão.')
  if (!pergunta.trim()) return falha('Escreva a pergunta.')
  if (!daObra('frentes', obraId).some((f) => f.id === frente_id)) return falha('Escolha a frente que ela trava.')
  const p = { id: novoId('pd'), obra_id: obraId, frente_id, pergunta: pergunta.trim(), situacao: 'Aberta', aberta_por: contexto.perfil.id, created_at: agora(), fechada_em: null }
  db.pendencias.push(p)
  return ok(p)
}

export async function comentarPendencia(pendenciaId, texto) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'comentar')) return falha('Sem permissão.')
  if (!texto.trim()) return falha('Escreva o comentário.')
  const p = daObra('pendencias', obraId).find((x) => x.id === pendenciaId)
  if (!p) return falha('Pendência não encontrada nesta obra.')
  db.comentarios.push({ id: novoId('cm'), obra_id: obraId, pendencia_id: p.id, frente_id: null, texto: texto.trim(), autor_id: contexto.perfil.id, created_at: agora() })
  // Comentário da arquiteta numa pendência Aberta a passa para Respondida.
  if (role() === 'Arquiteta' && p.situacao === 'Aberta') p.situacao = 'Respondida'
  return ok({ ...p })
}

export async function mudarSituacaoPendencia(pendenciaId, situacao) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'fecharPendencia')) return falha('Só o engenheiro fecha ou reabre pendência.')
  const p = daObra('pendencias', obraId).find((x) => x.id === pendenciaId)
  if (!p) return falha('Pendência não encontrada nesta obra.')
  p.situacao = situacao
  p.fechada_em = situacao === 'Fechada' ? agora() : null
  return ok({ ...p })
}

// ── fotos ───────────────────────────────────────────────────────────────────
export async function listarFotos({ aguardando = false } = {}) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verFrentes')) return falha('Sem permissão.')
  return ok(daObra('fotos', obraId)
    .filter((f) => !aguardando || !f.visivel_cliente)
    .map((f) => ({
      ...f,
      frente: db.frentes.find((x) => x.id === f.frente_id)?.servico || '—',
      ambiente: db.ambientes.find((x) => x.id === f.ambiente_id)?.nome || '—',
      autor: nomePessoa(f.autor_id),
    }))
    .sort((a, b) => (a.tirada_em < b.tirada_em ? 1 : -1)))
}

export async function liberarFotos(ids, visivel) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'liberarFoto')) return falha('Só o engenheiro libera foto ao cliente.')
  for (const f of daObra('fotos', obraId)) if (ids.includes(f.id)) f.visivel_cliente = visivel
  return ok(ids.length)
}

// ── materiais (Kanban de pedidos) ───────────────────────────────────────────
// O catálogo é da empresa (sem obra_id); pedidos e histórico são da obra.
export async function listarCatalogoMateriais() {
  await espera()
  if (!pode(role(), 'verMateriais')) return falha('Sem permissão.')
  return ok(db.materiais.map((m) => ({ ...m })).sort((a, b) => a.nome.localeCompare(b.nome)))
}

function montarPedido(p, historicoDaObra) {
  const material = db.materiais.find((m) => m.id === p.material_id)
  const historico = historicoDaObra.filter((h) => h.pedido_id === p.id).sort((a, b) => (a.data < b.data ? -1 : 1))
  return {
    ...p,
    material: material ? { ...material } : null,
    frente: db.frentes.find((f) => f.id === p.frente_id && f.obra_id === p.obra_id)?.servico || '—',
    historico,
    diasNaColuna: diasNaColuna(p, historico, hoje()),
    leadTime: leadTime(historico),
    atrasado: estaAtrasado(p, hoje()),
    comProblema: recebidoComProblema(p),
    etiqueta: etiquetaPedido(p, material?.categoria),
  }
}

// O quadro da obra: pedidos (sem os entregues, a não ser que peça) e os contadores.
export async function listarPedidos({ entregues = false } = {}) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verMateriais')) return falha('Sem permissão.')
  const historico = daObra('pedido_historico', obraId)
  const todos = daObra('pedidos', obraId).map((p) => montarPedido(p, historico))
  const ativos = todos.filter((p) => p.status !== 'Entregue')
  return ok({
    pedidos: ordenarPedidos(entregues ? todos : ativos),
    contadores: contadoresPedidos(ativos, hoje()),
    totalEntregues: todos.length - ativos.length,
  })
}

export async function criarPedido({ material_id, quantidade, frente_id, prioridade = 'Normal' }) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'pedirMaterial')) return falha('Sem permissão para fazer pedido.')
  const problemas = Object.values(validarNovoPedido({ material_id, quantidade, frente_id, prioridade }))
  if (problemas.length) return falha(problemas.join(' '))
  if (!db.materiais.some((m) => m.id === material_id)) return falha('Material não encontrado no catálogo.')
  if (!daObra('frentes', obraId).some((f) => f.id === frente_id)) return falha('Frente não encontrada nesta obra.')
  const p = {
    id: novoId('pm'), obra_id: obraId, material_id, quantidade: lerQuantidade(quantidade), frente_id, prioridade,
    status: 'Solicitar', fornecedor: '', previsao_entrega: '', qtd_bate_nf: null, estado_ok: null, avarias: '', foto_nf: '',
    criado_por: contexto.perfil.id,
  }
  db.pedidos.push(p)
  db.pedido_historico.push({ id: novoId('ph'), obra_id: obraId, pedido_id: p.id, status: 'Solicitar', data: hoje(), autor_id: contexto.perfil.id })
  return ok(montarPedido(p, daObra('pedido_historico', obraId)))
}

// Muda o pedido de coluna (uma por vez) e grava no histórico. Quem confere as
// regras é validarMudanca (lib/materiais.js); a tela só mostra o formulário.
export async function moverPedido(pedidoId, novoStatus, dados = {}) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'pedirMaterial')) return falha('Sem permissão para mover pedido.')
  const p = daObra('pedidos', obraId).find((x) => x.id === pedidoId)
  if (!p) return falha('Pedido não encontrado nesta obra.')
  const problemas = Object.values(validarMudanca(p.status, novoStatus, dados))
  if (problemas.length) return falha(problemas.join(' '))
  const avancando = proximoStatus(p.status) === novoStatus
  if (avancando && novoStatus === 'A caminho') {
    Object.assign(p, { fornecedor: dados.fornecedor.trim(), previsao_entrega: dados.previsao_entrega })
  }
  if (avancando && novoStatus === 'No almoxarifado') {
    Object.assign(p, { qtd_bate_nf: dados.qtd_bate_nf, estado_ok: dados.estado_ok, avarias: String(dados.avarias || '').trim(), foto_nf: dados.foto_nf || '' })
  }
  if (avancando && novoStatus === 'Entregue') {
    if (!daObra('frentes', obraId).some((f) => f.id === dados.frente_id)) return falha('Frente não encontrada nesta obra.')
    p.frente_id = dados.frente_id
  }
  p.status = novoStatus
  db.pedido_historico.push({ id: novoId('ph'), obra_id: obraId, pedido_id: p.id, status: novoStatus, data: hoje(), autor_id: contexto.perfil.id })
  const entrouNoEstoque = avancando && novoStatus === 'No almoxarifado' && darEntradaDoPedido(p, obraId)
  return ok({ ...montarPedido(p, daObra('pedido_historico', obraId)), entrouNoEstoque })
}

// ── estoque (opcional) do módulo Materiais ──────────────────────────────────
// Entrada automática: recebido com o checklist OK soma no insumo do mesmo
// material (cria o insumo se não existir). Um pedido gera no máximo uma entrada,
// mesmo se voltar de coluna e for recebido de novo. Devolve se entrou.
function darEntradaDoPedido(p, obraId) {
  if (!geraEntrada(p)) return false
  if (daObra('movimentos', obraId).some((m) => m.pedido_id === p.id)) return false
  let insumo = daObra('insumos', obraId).find((i) => i.material_id === p.material_id)
  if (!insumo) {
    const material = db.materiais.find((m) => m.id === p.material_id)
    insumo = { id: novoId('in'), obra_id: obraId, material_id: p.material_id, saldo: 0, unidade: material?.unidade || '', saldo_minimo: 0 }
    db.insumos.push(insumo)
  }
  db.movimentos.push({
    id: novoId('mv'), obra_id: obraId, insumo_id: insumo.id, tipo: 'Entrada', quantidade: p.quantidade, data: hoje(),
    frente_id: p.frente_id, origem: 'Pedido', pedido_id: p.id, autor_id: contexto.perfil.id,
  })
  insumo.saldo = saldoDepois(insumo.saldo, 'Entrada', p.quantidade)
  return true
}

function montarInsumo(i) {
  const material = db.materiais.find((m) => m.id === i.material_id)
  return { ...i, nome: material?.nome || 'Material', categoria: material?.categoria || '', situacao: situacaoInsumo(i) }
}

// O estoque da obra: insumos com nome e situação, e quantos estão críticos.
export async function listarEstoque() {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verMateriais')) return falha('Sem permissão.')
  const insumos = daObra('insumos', obraId).map(montarInsumo)
  return ok({ insumos, criticos: contarCriticos(insumos) })
}

// Histórico de um insumo, mais recente primeiro.
export async function listarMovimentos(insumoId) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verMateriais')) return falha('Sem permissão.')
  if (!daObra('insumos', obraId).some((i) => i.id === insumoId)) return falha('Insumo não encontrado nesta obra.')
  return ok(daObra('movimentos', obraId).filter((m) => m.insumo_id === insumoId)
    .map((m) => ({ ...m, frente: db.frentes.find((f) => f.id === m.frente_id)?.servico || '—', autor: nomePessoa(m.autor_id) }))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)))
}

// Baixa de estoque (saída manual). O saldo nunca fica negativo.
export async function registrarBaixa({ insumo_id, quantidade, frente_id, data = hoje() }) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'pedirMaterial')) return falha('Sem permissão para dar baixa no estoque.')
  const insumo = daObra('insumos', obraId).find((i) => i.id === insumo_id)
  if (insumo_id && !insumo) return falha('Insumo não encontrado nesta obra.')
  const problemas = Object.values(validarBaixa({ insumo, quantidade, frente_id, data }, hoje()))
  if (problemas.length) return falha(problemas.join(' '))
  if (!daObra('frentes', obraId).some((f) => f.id === frente_id)) return falha('Frente não encontrada nesta obra.')
  const q = lerQuantidade(quantidade)
  db.movimentos.push({
    id: novoId('mv'), obra_id: obraId, insumo_id: insumo.id, tipo: 'Saída', quantidade: q, data,
    frente_id, origem: 'Manual', pedido_id: null, autor_id: contexto.perfil.id,
  })
  insumo.saldo = saldoDepois(insumo.saldo, 'Saída', q)
  return ok(montarInsumo(insumo))
}

// ── planejamento (Last Planner + EAP) ───────────────────────────────────────
// Uma lista só de atividades por obra, lida pelas 4 abas. Quem monta a árvore,
// o código 1.2.1 e o resumo dos grupos é lib/planejamento.js.
function calendarioDe(obraId) {
  return calendarioDaObra(db.calendarios.find((c) => c.obra_id === obraId), daObra('feriados', obraId))
}

export async function listarPlanejamento() {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verCurtoPrazo')) return falha('Sem permissão.')
  const frentes = daObra('frentes', obraId)
  const cal = calendarioDe(obraId)
  const itens = montarEap(daObra('atividades', obraId), cal, hoje())
    .map((i) => ({ ...i, frente: frentes.find((f) => f.id === i.frente_id)?.servico || null }))
  const daSemana = {
    subtarefas: daObra('subtarefas', obraId).map((s) => ({ ...s })),
    naoRealizados: daObra('nao_realizados', obraId).map((n) => ({ ...n, autor: nomePessoa(n.autor_id) })),
  }
  // O mestre só recebe o que o Curto prazo usa (PRD-BACKEND, permissões do Planejamento).
  if (!pode(role(), 'verPlanejamento')) {
    return ok({ itens, ...daSemana, restricoes: [], responsaveis: [], frentes: [], calendario: { dias_semana: cal.dias_semana, feriados: [] } })
  }
  const restricoes = daObra('restricoes', obraId).map((r) => {
    const a = itens.find((i) => i.id === r.atividade_id)
    return { ...r, atividade: a ? { id: a.id, codigo: a.codigo, titulo: a.titulo, arquivada: a.arquivada } : null }
  })
  // Sugestões para "responsável": quem trabalha na obra, os empreiteiros e quem já foi usado.
  const equipe = db.membros.filter((m) => m.obra_id === obraId).map((m) => db.profiles.find((p) => p.id === m.pessoa_id))
    .filter((p) => p && pode(p.role, 'verFrentes')).map((p) => p.nome)
  return ok({
    itens,
    ...daSemana,
    restricoes,
    responsaveis: nomesUnicos([...equipe, ...daObra('empreiteiros', obraId).map((e) => e.nome), ...restricoes.map((r) => r.responsavel)]),
    frentes: frentes.map((f) => ({ id: f.id, servico: f.servico })).sort((a, b) => a.servico.localeCompare(b.servico)),
    calendario: {
      dias_semana: cal.dias_semana,
      feriados: daObra('feriados', obraId).map((f) => ({ ...f })).sort((a, b) => (a.data < b.data ? -1 : 1)),
    },
  })
}

export async function salvarAtividade(campos) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro monta a EAP.')
  const atividades = daObra('atividades', obraId)
  const existente = campos.id ? atividades.find((a) => a.id === campos.id) : null
  if (campos.id && !existente) return falha('Atividade não encontrada nesta obra.')
  if (existente?.arquivada) return falha('Desarquive a atividade antes de mudar.')
  // Grupo segundo a mesma regra da árvore (lib), para a ficha e o salvamento não discordarem.
  const ehGrupo = Boolean(existente) && Boolean(montarEap(atividades, calendarioDe(obraId)).find((i) => i.id === existente.id)?.ehGrupo)
  const problemas = Object.values(validarAtividade(campos, { ehGrupo }))
  if (problemas.length) return falha(problemas.join(' '))
  const paiId = campos.pai_id || null
  if (!paiValido(atividades, existente?.id, paiId)) return falha('Escolha outra atividade para colocar esta dentro.')
  const frenteId = campos.frente_id || null
  if (frenteId && !daObra('frentes', obraId).some((f) => f.id === frenteId)) return falha('Frente não encontrada nesta obra.')
  const dados = { titulo: campos.titulo.trim(), frente_id: frenteId }
  if (!ehGrupo) Object.assign(dados, { inicio: campos.inicio, fim: campos.fim, progresso: lerPercentual(campos.progresso) })
  if (existente) {
    if ((existente.pai_id || null) !== paiId) Object.assign(dados, { pai_id: paiId, ordem: proximaOrdem(atividades, paiId) })
    Object.assign(existente, dados)
    return ok({ ...existente })
  }
  const nova = {
    id: novoId('at'), obra_id: obraId, pai_id: paiId, ordem: proximaOrdem(atividades, paiId), ...dados,
    status: 'A fazer', concluida_em: null, arquivada: false, criado_por: contexto.perfil.id,
  }
  db.atividades.push(nova)
  return ok({ ...nova })
}

// Arquivar leva as subatividades junto. Desarquivar devolve a atividade, as
// subatividades e os grupos acima dela (senão ela ficaria dentro de um arquivado).
export async function arquivarAtividade(id, arquivar) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro arquiva atividade.')
  const atividades = daObra('atividades', obraId)
  if (!atividades.some((a) => a.id === id)) return falha('Atividade não encontrada nesta obra.')
  const ids = new Set([id, ...descendentes(atividades, id), ...(arquivar ? [] : ancestrais(atividades, id))])
  for (const a of atividades) if (ids.has(a.id)) a.arquivada = arquivar
  return ok(ids.size)
}

export async function moverAtividade(id, direcao) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro muda a ordem da EAP.')
  const atividades = daObra('atividades', obraId)
  if (!atividades.some((a) => a.id === id)) return falha('Atividade não encontrada nesta obra.')
  const troca = trocarOrdem(atividades, id, direcao)
  if (!troca) return falha(direcao < 0 ? 'Ela já é a primeira deste nível.' : 'Ela já é a última deste nível.')
  for (const t of troca) atividades.find((a) => a.id === t.id).ordem = t.ordem
  return ok(troca)
}

// Importar cronograma por planilha: `linhas` são as linhas de texto da tela de
// conferência (lib/importarCronograma.js). A conferência roda de novo aqui —
// com erro, nada é criado. Substituir arquiva as atuais (nada se apaga).
export async function importarCronograma(linhas, modo) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro importa cronograma.')
  const { itens, erros } = conferirCronograma(linhas || [], calendarioDe(obraId))
  if (!itens.length) return falha('A planilha não tem nenhuma atividade.')
  if (erros) return falha('Corrija os erros da conferência antes de importar.')
  const atuais = daObra('atividades', obraId).filter((a) => !a.arquivada)
  if (atuais.length && !['adicionar', 'substituir'].includes(modo)) return falha('Escolha se as atividades entram junto com as atuais ou no lugar delas.')
  if (modo === 'substituir') for (const a of atuais) a.arquivada = true
  // Itens já vêm ordenados pelo código: o pai sempre antes dos filhos.
  const idPorCodigo = new Map()
  const filhos = new Map()
  let ordemRaiz = proximaOrdem(daObra('atividades', obraId), null)
  for (const it of itens) {
    const paiId = it.paiCodigo ? idPorCodigo.get(it.paiCodigo) : null
    const ordem = paiId ? (filhos.get(paiId) || 0) + 1 : ordemRaiz++
    if (paiId) filhos.set(paiId, ordem)
    const a = {
      id: novoId('at'), obra_id: obraId, pai_id: paiId, ordem, titulo: it.titulo, inicio: it.inicio, fim: it.fim,
      frente_id: null, progresso: 0, status: 'A fazer', concluida_em: null, arquivada: false, criado_por: contexto.perfil.id,
    }
    db.atividades.push(a)
    idPorCodigo.set(it.codigo, a.id)
  }
  return ok({ criadas: itens.length, arquivadas: modo === 'substituir' ? atuais.length : 0 })
}

// Curto prazo: a atividade como ela aparece numa semana (null se não entra nela).
function naSemana(obraId, id, semana) {
  return atividadesDaSemana(montarEap(daObra('atividades', obraId), calendarioDe(obraId)), semana).find((a) => a.id === id) || null
}

// Muda o cartão de coluna. Só na semana de hoje: o status é o de agora.
export async function moverNoKanban(id, novo) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'moverCurtoPrazo')) return falha('Sem permissão para mexer na semana.')
  if (!STATUS_ATIVIDADE.includes(novo)) return falha('Coluna inválida.')
  const semana = semanaDe(hoje())
  if (!naSemana(obraId, id, semana)) return falha('Esta atividade não está na semana de hoje.')
  const a = daObra('atividades', obraId).find((x) => x.id === id)
  Object.assign(a, mudancaDeStatus(a, novo, hoje()))
  // Concluída na semana: o "não realizado" desta semana deixa de valer.
  if (novo === 'Concluído') db.nao_realizados = db.nao_realizados.filter((n) => !(n.obra_id === obraId && n.atividade_id === id && n.semana === semana.inicio))
  return ok({ ...a })
}

export async function marcarNaoRealizado(id, semanaInicio, { causa, causa_detalhe }) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'moverCurtoPrazo')) return falha('Sem permissão para mexer na semana.')
  const semana = semanaDe(semanaInicio)
  const a = naSemana(obraId, id, semana)
  if (!a) return falha('Esta atividade não está nesta semana.')
  if (!podeMarcarNaoRealizado(a, semana, hoje())) return falha('Só dá para marcar o que não foi concluído, numa semana que já começou.')
  const problema = validarCausa({ causa, causa_detalhe })
  if (problema) return falha(problema)
  const dados = { causa, causa_detalhe: causa === 'Outro' ? causa_detalhe.trim() : null, autor_id: contexto.perfil.id }
  const existente = db.nao_realizados.find((n) => n.obra_id === obraId && n.atividade_id === id && n.semana === semana.inicio)
  if (existente) Object.assign(existente, dados)
  else db.nao_realizados.push({ id: novoId('nr'), obra_id: obraId, atividade_id: id, semana: semana.inicio, ...dados })
  return ok(true)
}

export async function desfazerNaoRealizado(id, semanaInicio) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'moverCurtoPrazo')) return falha('Sem permissão para mexer na semana.')
  const semana = segundaDaSemana(semanaInicio)
  const antes = db.nao_realizados.length
  db.nao_realizados = db.nao_realizados.filter((n) => !(n.obra_id === obraId && n.atividade_id === id && n.semana === semana))
  return antes === db.nao_realizados.length ? falha('Não havia "não realizado" nesta semana.') : ok(true)
}

export async function criarSubtarefa(atividadeId, titulo) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'moverCurtoPrazo')) return falha('Sem permissão para mexer na semana.')
  if (!String(titulo || '').trim()) return falha('Escreva a subtarefa.')
  const a = daObra('atividades', obraId).find((x) => x.id === atividadeId)
  if (!a || a.arquivada) return falha('Atividade não encontrada nesta obra.')
  const s = { id: novoId('st'), obra_id: obraId, atividade_id: a.id, titulo: titulo.trim(), situacao: 'Pendente', causa: null, causa_detalhe: null }
  db.subtarefas.push(s)
  return ok({ ...s })
}

export async function marcarSubtarefa(id, situacao, { causa, causa_detalhe } = {}) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'moverCurtoPrazo')) return falha('Sem permissão para mexer na semana.')
  const s = daObra('subtarefas', obraId).find((x) => x.id === id)
  if (!s) return falha('Subtarefa não encontrada nesta obra.')
  if (!SITUACOES_SUBTAREFA.includes(situacao)) return falha('Situação inválida.')
  if (situacao === 'Não realizado') {
    const problema = validarCausa({ causa, causa_detalhe })
    if (problema) return falha(problema)
    Object.assign(s, { situacao, causa, causa_detalhe: causa === 'Outro' ? causa_detalhe.trim() : null })
  } else Object.assign(s, { situacao, causa: null, causa_detalhe: null })
  return ok({ ...s })
}

export async function removerSubtarefa(id) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'apagar')) return falha('Só o engenheiro apaga subtarefa.')
  if (!daObra('subtarefas', obraId).some((s) => s.id === id)) return falha('Subtarefa não encontrada nesta obra.')
  db.subtarefas = db.subtarefas.filter((s) => s.id !== id)
  return ok(id)
}

// Restrições (Médio prazo): criar e editar, resolver/reabrir, mudar de semana.
export async function salvarRestricao(campos) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro registra restrição.')
  const existente = campos.id ? daObra('restricoes', obraId).find((r) => r.id === campos.id) : null
  if (campos.id && !existente) return falha('Restrição não encontrada nesta obra.')
  const problemas = Object.values(validarRestricao(campos, hoje()))
  if (problemas.length) return falha(problemas.join(' '))
  const atividade = daObra('atividades', obraId).find((a) => a.id === campos.atividade_id)
  if (!atividade || atividade.arquivada) return falha('Atividade não encontrada nesta obra.')
  // Restrição trava uma atividade de verdade, não um grupo (o "prontas" só olha as sem subatividades).
  if (montarEap(daObra('atividades', obraId), calendarioDe(obraId)).find((i) => i.id === atividade.id)?.ehGrupo) {
    return falha('Escolha uma atividade sem subatividades: a restrição trava quem executa.')
  }
  const dados = { atividade_id: atividade.id, tipo: campos.tipo, descricao: campos.descricao.trim(), prazo: campos.prazo, responsavel: campos.responsavel.trim() }
  if (existente) {
    Object.assign(existente, dados)
    return ok({ ...existente })
  }
  const r = { id: novoId('rs'), obra_id: obraId, ...dados, resolvida_em: null }
  db.restricoes.push(r)
  return ok({ ...r })
}

export async function resolverRestricao(id, resolvida) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro resolve restrição.')
  const r = daObra('restricoes', obraId).find((x) => x.id === id)
  if (!r) return falha('Restrição não encontrada nesta obra.')
  r.resolvida_em = resolvida ? hoje() : null
  return ok({ ...r })
}

export async function moverRestricao(id, direcao) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro muda a restrição de semana.')
  const r = daObra('restricoes', obraId).find((x) => x.id === id)
  if (!r) return falha('Restrição não encontrada nesta obra.')
  if (direcao < 0 && !podeVoltarSemana(r.prazo, hoje())) return falha('Ela já está nesta semana; não dá para voltar ao passado.')
  // Vencida que anda para a frente sai da semana do prazo antigo, não de hoje.
  r.prazo = moverPrazo(r.prazo < hoje() ? hoje() : r.prazo, direcao)
  return ok({ ...r })
}

export async function salvarDiasDeTrabalho(diasSemana) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro muda o calendário.')
  const problema = validarDiasSemana(diasSemana)
  if (problema) return falha(problema)
  const dias = [...diasSemana].sort((a, b) => a - b)
  const cal = db.calendarios.find((c) => c.obra_id === obraId)
  if (cal) cal.dias_semana = dias
  else db.calendarios.push({ id: novoId('cal'), obra_id: obraId, dias_semana: dias })
  return ok(dias)
}

export async function adicionarFeriado({ data, nome }) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro muda o calendário.')
  const problemas = Object.values(validarFeriado({ data, nome }, daObra('feriados', obraId)))
  if (problemas.length) return falha(problemas.join(' '))
  const f = { id: novoId('fe'), obra_id: obraId, data, nome: nome.trim() }
  db.feriados.push(f)
  return ok({ ...f })
}

export async function removerFeriado(id) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'planejar')) return falha('Só o engenheiro muda o calendário.')
  if (!daObra('feriados', obraId).some((f) => f.id === id)) return falha('Feriado não encontrado nesta obra.')
  db.feriados = db.feriados.filter((f) => f.id !== id)
  return ok(id)
}

// ── medição (só engenheiro) ─────────────────────────────────────────────────
// Por empreiteiro: contratado, medido (só Fechadas), a medir e saldo; e o
// histórico de medições numeradas. As contas são de lib/medicao.js.
export async function listarMedicao() {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'medir')) return falha('Só o engenheiro vê a medição.')
  const medicoes = numerarMedicoes(daObra('medicoes', obraId))
  const itens = daObra('medicao_itens', obraId)
  const fechadas = new Set(medicoes.filter((m) => m.situacao === 'Fechada').map((m) => m.id))
  const empreiteirosDaObra = daObra('empreiteiros', obraId)

  const empreiteiros = empreiteirosDaObra.map((e) => {
    const desde = fimDaUltimaFechada(medicoes.filter((m) => m.empreiteiro_id === e.id))
    const minhas = frentesParaMedir(obraId, e.id, fechadas)
    const resumos = minhas.map((f) => resumoFrente({ valorContratado: f.contratado, ambientes: f.ambientes, medido: f.jaMedido, desde }))
    const rascunho = medicoes.find((m) => m.empreiteiro_id === e.id && m.situacao === 'Rascunho')
    return { id: e.id, nome: e.nome, especialidade: e.especialidade, frentes: minhas.length, ultimaFechada: desde, rascunho: rascunho?.numero ?? null, ...somarResumos(resumos) }
  }).filter((e) => e.frentes > 0)

  const historico = ordenarHistorico(medicoes.map((m) => ({
    ...m,
    empreiteiro: empreiteirosDaObra.find((e) => e.id === m.empreiteiro_id)?.nome || '—',
    total: totalDaMedicao(itens.filter((i) => i.medicao_id === m.id)),
  })))

  return ok({ totais: somarResumos(empreiteiros), empreiteiros: ordenarEmpreiteiros(empreiteiros), historico })
}

// As frentes de um empreiteiro como a medição as vê: contratado, já medido nas
// medições Fechadas de `fechadas` (Set de ids) e ambientes com a data de conclusão.
function frentesParaMedir(obraId, empreiteiroId, fechadas) {
  const itens = daObra('medicao_itens', obraId)
  const fa = daObra('frente_ambientes', obraId)
  const contratos = daObra('contratos', obraId)
  const ambientes = daObra('ambientes', obraId)
  return daObra('frentes', obraId).filter((f) => f.empreiteiro_id === empreiteiroId).map((f) => ({
    frente_id: f.id,
    servico: f.servico,
    contratado: contratos.find((c) => c.frente_id === f.id)?.valor_contratado ?? 0,
    jaMedido: totalDaMedicao(itens.filter((i) => i.frente_id === f.id && fechadas.has(i.medicao_id))),
    inicio_previsto: f.inicio_previsto,
    ambientes: fa.filter((x) => x.frente_id === f.id)
      .map((x) => ({ nome: ambientes.find((a) => a.id === x.ambiente_id)?.nome || '—', concluido_em: x.concluido_em })),
  }))
}

// A ficha de uma medição: a pedida (medicaoId), ou a do empreiteiro — o rascunho
// dele se houver, senão uma nova. Fechada vem só para leitura.
export async function fichaMedicao({ medicaoId, empreiteiroId }) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'medir')) return falha('Só o engenheiro vê a medição.')
  const medicoes = numerarMedicoes(daObra('medicoes', obraId))
  const m = medicaoId
    ? medicoes.find((x) => x.id === medicaoId)
    : medicoes.find((x) => x.empreiteiro_id === empreiteiroId && x.situacao === 'Rascunho')
  if (medicaoId && !m) return falha('Medição não encontrada nesta obra.')
  const empreiteiro = daObra('empreiteiros', obraId).find((e) => e.id === (m?.empreiteiro_id || empreiteiroId))
  if (!empreiteiro) return falha('Empreiteiro não encontrado nesta obra.')
  const doEmpreiteiro = medicoes.filter((x) => x.empreiteiro_id === empreiteiro.id && x.id !== m?.id)
  // Uma Fechada olha só as fechadas de antes dela; rascunho e nova, todas.
  const fechadas = doEmpreiteiro.filter((x) => x.situacao === 'Fechada' && (m?.situacao !== 'Fechada' || x.periodo_fim < m.periodo_inicio))
  const frentes = frentesParaMedir(obraId, empreiteiro.id, new Set(fechadas.map((x) => x.id)))
  const ultimaFechada = fimDaUltimaFechada(fechadas)
  const itens = m ? daObra('medicao_itens', obraId).filter((i) => i.medicao_id === m.id) : []
  const obra = db.obras.find((o) => o.id === obraId)
  return ok({
    medicao: m ? { ...m } : null,
    numero: m?.numero ?? doEmpreiteiro.length + 1,
    situacao: m?.situacao || 'Rascunho',
    editavel: !m || m.situacao === 'Rascunho',
    empreiteiro: { id: empreiteiro.id, nome: empreiteiro.nome },
    obra: { nome: obra.nome, codigo: obra.codigo },
    ultimaFechada,
    periodo: m ? { inicio: m.periodo_inicio, fim: m.periodo_fim }
      : periodoPadrao({ ultimaFechada, iniciosPrevistos: frentes.map((f) => f.inicio_previsto), hoje: hoje() }),
    frentes: frentes.map((f) => ({ ...f, item: itens.find((i) => i.frente_id === f.frente_id) || null })),
  })
}

// Grava a medição como Rascunho (nova ou a mesma) e, com `fechar`, fecha.
// `itens`: [{ frente_id, valor, justificativa }]. Sugerido, contratado e já
// medido são recalculados aqui — a tela não decide nada disso.
export async function salvarMedicao({ id, empreiteiro_id, periodo_inicio, periodo_fim, itens = [] }, { fechar = false } = {}) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'medir')) return falha('Só o engenheiro lança medição.')
  const existente = id ? daObra('medicoes', obraId).find((m) => m.id === id) : null
  if (id && !existente) return falha('Medição não encontrada nesta obra.')
  if (existente && existente.situacao !== 'Rascunho') return falha('Medição fechada não muda mais.')
  const empId = existente?.empreiteiro_id || empreiteiro_id
  if (!daObra('empreiteiros', obraId).some((e) => e.id === empId)) return falha('Empreiteiro não encontrado nesta obra.')
  const doEmpreiteiro = daObra('medicoes', obraId).filter((m) => m.empreiteiro_id === empId && m.id !== existente?.id)
  if (!existente && doEmpreiteiro.some((m) => m.situacao === 'Rascunho')) return falha('Este empreiteiro já tem uma medição em rascunho. Continue por ela.')
  const fechadas = doEmpreiteiro.filter((m) => m.situacao === 'Fechada')
  const ultimaFechada = fimDaUltimaFechada(fechadas)
  const linhas = frentesParaMedir(obraId, empId, new Set(fechadas.map((m) => m.id))).map((f) => {
    const enviado = itens.find((i) => i.frente_id === f.frente_id)
    return {
      frente_id: f.frente_id, contratado: f.contratado, jaMedido: f.jaMedido,
      valor_sugerido: sugeridoNoPeriodo({ valorContratado: f.contratado, ambientes: f.ambientes, inicio: periodo_inicio, fim: periodo_fim, jaMedido: f.jaMedido }),
      valor: Number.isFinite(enviado?.valor) && enviado.valor >= 0 ? arredondarCentavos(enviado.valor) : null,
      justificativa: String(enviado?.justificativa || '').trim() || null,
    }
  })
  if (!linhas.length) return falha('Este empreiteiro não tem frente nesta obra.')
  const problemas = Object.values(validarMedicao({ periodo_inicio, periodo_fim, linhas }, { hoje: hoje(), ultimaFechada }))
  if (problemas.length) return falha(problemas.join(' '))

  let m = existente
  if (m) Object.assign(m, { periodo_inicio, periodo_fim })
  else {
    m = { id: novoId('md'), obra_id: obraId, empreiteiro_id: empId, periodo_inicio, periodo_fim, situacao: 'Rascunho', fechada_em: null, created_at: agora() }
    db.medicoes.push(m)
  }
  db.medicao_itens = db.medicao_itens.filter((i) => i.medicao_id !== m.id)
  for (const l of linhas) {
    // Justificativa só fica guardada quando o valor difere do sugerido.
    const justificativa = difereDoSugerido(l.valor, l.valor_sugerido) ? l.justificativa : null
    db.medicao_itens.push({ id: novoId('mi'), obra_id: obraId, medicao_id: m.id, frente_id: l.frente_id, valor_sugerido: l.valor_sugerido, valor: l.valor, justificativa })
  }
  if (fechar) Object.assign(m, { situacao: 'Fechada', fechada_em: agora() })
  return ok({ ...m })
}

// Rascunho pode ser apagado (com os itens). Fechada, não.
export async function apagarRascunhoMedicao(id) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'medir')) return falha('Só o engenheiro apaga medição.')
  const m = daObra('medicoes', obraId).find((x) => x.id === id)
  if (!m) return falha('Medição não encontrada nesta obra.')
  if (m.situacao !== 'Rascunho') return falha('Medição fechada não pode ser apagada.')
  db.medicoes = db.medicoes.filter((x) => x.id !== id)
  db.medicao_itens = db.medicao_itens.filter((i) => i.medicao_id !== id)
  return ok(id)
}

// ── cadastros da obra ───────────────────────────────────────────────────────
export async function listarEmpreiteirosEAmbientes() {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'cadastrar')) return falha('Sem permissão.')
  const frentes = daObra('frentes', obraId)
  return ok({
    empreiteiros: daObra('empreiteiros', obraId).map((e) => ({ ...e, frentes: frentes.filter((f) => f.empreiteiro_id === e.id).length })),
    ambientes: daObra('ambientes', obraId).sort((a, b) => a.ordem - b.ordem),
  })
}

// ── equipe (engenheiro) ─────────────────────────────────────────────────────
export async function listarEquipe() {
  await espera()
  if (!pode(role(), 'gerenciarUsuarios')) return falha('Sem permissão.')
  const minhas = new Set(db.membros.filter((m) => m.pessoa_id === contexto.perfil.id).map((m) => m.obra_id))
  const pessoas = db.profiles.map((p) => ({
    ...p,
    obras: db.membros.filter((m) => m.pessoa_id === p.id && minhas.has(m.obra_id))
      .map((m) => db.obras.find((o) => o.id === m.obra_id)?.codigo),
  }))
  return ok({
    pendentes: pessoas.filter((p) => p.role === 'Pendente'),
    equipe: pessoas.filter((p) => p.role !== 'Pendente' && p.obras.length),
  })
}

export async function liberarPessoa(pessoaId, novoRole, obrasIds) {
  await espera()
  if (!pode(role(), 'gerenciarUsuarios')) return falha('Sem permissão.')
  const p = db.profiles.find((x) => x.id === pessoaId)
  if (!p) return falha('Pessoa não encontrada.')
  if (!obrasIds.length) return falha('Escolha pelo menos uma obra.')
  p.role = novoRole
  for (const obraId of obrasIds) {
    if (!souMembro(obraId)) continue
    if (!db.membros.some((m) => m.obra_id === obraId && m.pessoa_id === p.id)) {
      db.membros.push({ id: novoId('m'), obra_id: obraId, pessoa_id: p.id })
    }
  }
  return ok({ ...p })
}

// ── empresa: logo do cabeçalho ──────────────────────────────────────────────
// Dado da empresa, não de uma obra: vale para todas. Sem logo próprio, o app
// usa o da BMR (public/logo-bmr.webp). No mock fica guardado no navegador; na
// Etapa 7 vira a tabela `config` (uma linha) + arquivo no Storage.
const CHAVE_LOGO = 'gestao-obras:config:logo'
const LIMITE_LOGO = 400_000 // ~400 KB em texto; a tela reduz a imagem antes de mandar

function lerArmazenado(chave) {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(chave) } catch (_) { return null }
}

export async function obterLogo() {
  return ok(lerArmazenado(CHAVE_LOGO))
}

export async function salvarLogo(imagem) {
  await espera()
  if (!pode(role(), 'cadastrar')) return falha('Só o engenheiro troca o logo.')
  if (imagem !== null && !/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(imagem || '')) return falha('Escolha uma imagem PNG, JPG, WebP ou SVG.')
  if (imagem && imagem.length > LIMITE_LOGO) return falha('A imagem ficou grande demais. Tente uma versão menor do logo.')
  try {
    if (imagem === null) localStorage.removeItem(CHAVE_LOGO)
    else localStorage.setItem(CHAVE_LOGO, imagem)
  } catch (_) {
    return falha('Este navegador não deixou guardar a imagem.')
  }
  return ok(imagem)
}

// ── painel do cliente ───────────────────────────────────────────────────────
// O cliente NÃO lê frentes, empreiteiros nem diários: recebe só ambiente + %,
// a data prometida e as fotos liberadas dos últimos 7 dias, sem frente nem autor.
export async function painelCliente() {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'verPainelCliente')) return falha('Sem permissão.')
  const obra = db.obras.find((o) => o.id === obraId)
  const fa = daObra('frente_ambientes', obraId)
  const ambientes = daObra('ambientes', obraId).sort((a, b) => a.ordem - b.ordem).map((a) => {
    const meus = fa.filter((x) => x.ambiente_id === a.id)
    return { id: a.id, nome: a.nome, pct: meus.length ? Math.round((meus.filter((x) => x.concluido_em).length / meus.length) * 100) : 0 }
  })
  const fotos = daObra('fotos', obraId)
    .filter((f) => f.visivel_cliente && diasEntre(f.tirada_em, hoje()) <= 7)
    .map((f) => ({ id: f.id, tirada_em: f.tirada_em, ambiente: db.ambientes.find((x) => x.id === f.ambiente_id)?.nome || '' }))
    .sort((a, b) => (a.tirada_em < b.tirada_em ? 1 : -1))
  return ok({ nome: obra.nome, data_entrega: obra.data_entrega, ambientes, fotos })
}
