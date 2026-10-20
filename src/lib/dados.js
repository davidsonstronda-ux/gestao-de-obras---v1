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
import { validarDiario } from './diario.js'
import { pode, obraNoSeletor } from './permissoes.js'
import { diasEntre } from './datas.js'

// Cópia de trabalho: as telas podem criar e editar sem estragar o original.
const db = structuredClone({
  obras: mock.mockObras, profiles: mock.mockProfiles, membros: mock.mockMembros,
  ambientes: mock.mockAmbientes, empreiteiros: mock.mockEmpreiteiros, frentes: mock.mockFrentes,
  contratos: mock.mockContratos, frente_ambientes: mock.mockFrenteAmbientes, diarios: mock.mockDiarios,
  apontamentos: mock.mockApontamentos, fotos: mock.mockFotos, pendencias: mock.mockPendencias,
  comentarios: mock.mockComentarios,
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
export async function diarioDeHoje() {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'lancarDiario')) return falha('Sem permissão.')
  const data = hoje()
  const existente = daObra('diarios', obraId).find((d) => d.data === data) || null
  const doDia = daObra('frentes', obraId).filter((f) => frenteVisivelNoRisco(f, data))
  const fa = daObra('frente_ambientes', obraId)
  const frentes = doDia.map((f) => ({
    ...f,
    empreiteiro: empreiteiroVisivel(f.empreiteiro_id),
    deveriaTerComecado: f.situacao === 'Não iniciada',
    ambientesAbertos: fa.filter((x) => x.frente_id === f.id && !x.concluido_em)
      .map((x) => ({ id: x.id, nome: db.ambientes.find((a) => a.id === x.ambiente_id)?.nome })),
  }))
  const marcas = {}
  if (existente) {
    for (const a of db.apontamentos.filter((x) => x.diario_id === existente.id)) {
      marcas[a.frente_id] = { situacao: a.situacao, motivo: a.motivo, motivo_detalhe: a.motivo_detalhe }
    }
  }
  return ok({ data, existente, frentes, marcas, empreiteiros: daObra('empreiteiros', obraId) })
}

// Grava o diário do dia, os apontamentos, as conclusões por ambiente e as fotos.
// Processos automáticos (PRD-BACKEND): primeiro "Andou" põe a frente Em andamento;
// último ambiente concluído encerra a frente.
export async function salvarDiario({ clima, equipes, ocorrencias, marcas, concluidos = [], fotos = [] }) {
  await espera()
  const { obraId, erro } = exigirObra()
  if (erro) return falha(erro)
  if (!pode(role(), 'lancarDiario')) return falha('Sem permissão.')
  const data = hoje()
  const frentesIds = daObra('frentes', obraId).filter((f) => frenteVisivelNoRisco(f, data)).map((f) => f.id)
  const problemas = validarDiario({ clima, frentesIds, marcas })
  if (problemas.length) return falha(problemas.join(' '))

  let diario = daObra('diarios', obraId).find((d) => d.data === data)
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
