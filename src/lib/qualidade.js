// Regra pura do módulo Qualidade (aba Vistoria). Sem React, sem banco.
// Textos de situação idênticos ao CHECK de `vistoria_registros.status`.
import { formatarData, paraData, paraIso } from './datas.js'

export const STATUS_REGISTRO = ['Pendente', 'Em andamento', 'Resolvido']
export const FILTROS_PRAZO = ['Todos', 'Atrasados', 'Hoje', 'Esta semana']
export const FILTROS_VISTORIA_VAZIOS = { status: '', responsavel: '', prazo: 'Todos', busca: '' }

// Pendente -> Em andamento -> Resolvido, um passo por vez.
export function proximoStatusRegistro(status) {
  const i = STATUS_REGISTRO.indexOf(status)
  return i >= 0 && i < STATUS_REGISTRO.length - 1 ? STATUS_REGISTRO[i + 1] : null
}

// Nº do próximo registro da obra (#1, #2…): o maior + 1, mesmo com buracos.
export function proximoNumero(registros) {
  return registros.reduce((maior, r) => Math.max(maior, r.numero || 0), 0) + 1
}

export function estaVencido(registro, hoje) {
  return registro.status !== 'Resolvido' && Boolean(registro.prazo) && registro.prazo < hoje
}

// Domingo da semana de `hoje` (a semana vai de segunda a domingo).
function domingoDaSemana(hoje) {
  const d = paraData(hoje)
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return paraIso(d)
}

export function noFiltroPrazo(registro, filtro, hoje) {
  if (filtro === 'Atrasados') return estaVencido(registro, hoje)
  if (filtro === 'Hoje') return registro.prazo === hoje
  if (filtro === 'Esta semana') return registro.prazo >= hoje && registro.prazo <= domingoDaSemana(hoje)
  return true
}

// Sem acento e sem caixa, para a busca achar "agua" em "Água". Vale para as
// buscas das três abas da Qualidade.
export const normalizarBusca = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function filtrarRegistros(registros, { status = '', responsavel = '', prazo = 'Todos', busca = '' }, hoje) {
  const termo = normalizarBusca(busca.trim()).replace(/^#/, '')
  return registros.filter((r) => (
    (!status || r.status === status)
    && (!responsavel || r.responsavel_id === responsavel)
    && noFiltroPrazo(r, prazo, hoje)
    && (!termo || [r.descricao, r.local, r.pavimento, String(r.numero)].some((c) => normalizarBusca(c).includes(termo)))
  ))
}

export function contarStatus(registros) {
  const conta = { Total: registros.length }
  for (const s of STATUS_REGISTRO) conta[s] = registros.filter((r) => r.status === s).length
  return conta
}

// "Pendentes por responsável": tudo o que ainda não foi resolvido, contado por
// pessoa (pelo id: dois "João" diferentes não viram um só), maior primeiro.
export function pendentesPorResponsavel(registros) {
  const porPessoa = new Map()
  for (const r of registros) {
    if (r.status === 'Resolvido') continue
    const atual = porPessoa.get(r.responsavel_id) || { id: r.responsavel_id, nome: r.responsavel, quantidade: 0 }
    porPessoa.set(r.responsavel_id, { ...atual, quantidade: atual.quantidade + 1 })
  }
  return [...porPessoa.values()].sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome))
}

// Abertos primeiro (vencidos no topo, depois pelo prazo); resolvidos no fim.
export function ordenarRegistros(registros, hoje) {
  const peso = (r) => (r.status === 'Resolvido' ? 2 : estaVencido(r, hoje) ? 0 : 1)
  return [...registros].sort((a, b) => peso(a) - peso(b) || (a.prazo < b.prazo ? -1 : a.prazo > b.prazo ? 1 : 0) || b.numero - a.numero)
}

// Devolve { campo: 'mensagem' } com o que falta; vazio = pode salvar.
export function validarRegistro(c, hoje) {
  const p = {}
  if (!String(c.descricao || '').trim()) p.descricao = 'Descreva o problema.'
  if (!String(c.local || '').trim()) p.local = 'Diga onde está o problema.'
  if (!c.empreiteiro_id) p.empreiteiro_id = 'Escolha a empresa que corrige.'
  if (!c.responsavel_id) p.responsavel_id = 'Escolha quem acompanha.'
  if (!c.prazo) p.prazo = 'Informe o prazo.'
  else if (c.prazo < (c.data_vistoria || hoje)) p.prazo = 'O prazo não pode ser antes da vistoria.'
  return p
}

// Mudança de situação: só um passo à frente, e resolver exige a foto de evidência.
export function validarMudancaRegistro(atual, novo, { foto_evidencia } = {}) {
  const p = {}
  if (proximoStatusRegistro(atual) !== novo) p.status = `De "${atual}" o registro só pode ir para "${proximoStatusRegistro(atual) || 'nenhum'}".`
  else if (novo === 'Resolvido' && !foto_evidencia) p.foto_evidencia = 'Tire a foto da correção para resolver.'
  return p
}

// O que muda no registro ao trocar de situação (resolver grava a foto e a data).
// A camada de dados aplica de verdade; a tela aplica o mesmo na hora (otimista).
export function mudancaDeSituacao(novo, { foto_evidencia = '' } = {}, hoje) {
  return novo === 'Resolvido' ? { status: novo, foto_evidencia, resolvido_em: hoje } : { status: novo }
}

// '2026-10-20T14:18:05' -> '20/10/2026 14:18'
export function formatarCarimbo(dataHora) {
  const [dia, hora = ''] = String(dataHora).split('T')
  return `${formatarData(dia)} ${hora.slice(0, 5)}`.trim()
}

// Observações acumuladas: a nota nova entra NO TOPO, com carimbo, sobre o histórico.
export function anexarObservacao(historico, texto, dataHora) {
  // Uma nota por linha: quebra de linha dentro da nota vira espaço.
  const nota = `[${formatarCarimbo(dataHora)}] ${texto.trim().replace(/\s*\n\s*/g, ' ')}`
  return historico ? `${nota}\n${historico}` : nota
}

// O histórico em linhas, para a tela mostrar uma nota por linha.
export function notasDoHistorico(historico) {
  return String(historico || '').split('\n').filter(Boolean).map((linha) => {
    const m = linha.match(/^\[([^\]]+)\]\s*(.*)$/)
    return m ? { carimbo: m[1], texto: m[2] } : { carimbo: '', texto: linha }
  })
}
