// Regra pura do Gemba Walk (caça aos desperdícios), aba do módulo Qualidade.
// Sem React, sem banco. Os 7 tipos são idênticos ao CHECK de
// gemba_observacoes.desperdicios; a situação é a mesma da Vistoria.
import { STATUS_REGISTRO, estaVencido, noFiltroPrazo, normalizarBusca } from './qualidade.js'

export const DESPERDICIOS = ['Retrabalho', 'Espera', 'Transporte', 'Movimentação', 'Estoque', 'Superprodução', 'Processo desnecessário']
export const STATUS_GEMBA = STATUS_REGISTRO
export const FILTROS_PRAZO_GEMBA = ['Todos', 'Vencidos', 'Hoje', 'Esta semana', 'Sem prazo']
export const FILTROS_GEMBA_VAZIOS = { tipo: '', prazo: 'Todos', busca: '' }

// Contagem por tipo em todas as observações, do maior para o menor (empate: a
// ordem da lista). Tipos com zero ficam no fim: também é informação.
export function rankingDesperdicios(observacoes) {
  return DESPERDICIOS.map((tipo, ordem) => ({ tipo, ordem, quantidade: observacoes.filter((o) => o.desperdicios.includes(tipo)).length }))
    .sort((a, b) => b.quantidade - a.quantidade || a.ordem - b.ordem)
    .map(({ tipo, quantidade }) => ({ tipo, quantidade }))
}

function noPrazo(o, filtro, hoje) {
  if (filtro === 'Sem prazo') return !o.prazo
  if (filtro === 'Vencidos') return estaVencido(o, hoje)
  if (!o.prazo) return filtro === 'Todos'
  return noFiltroPrazo(o, filtro, hoje)
}

export function filtrarObservacoes(observacoes, { tipo = '', prazo = 'Todos', busca = '' }, hoje) {
  const termo = normalizarBusca(busca.trim())
  return observacoes.filter((o) => (
    (!tipo || o.desperdicios.includes(tipo))
    && noPrazo(o, prazo, hoje)
    && (!termo || [o.local, o.descricao, o.causa_raiz, o.acao].some((c) => normalizarBusca(c).includes(termo)))
  ))
}

// "Em aberto" = tudo o que ainda não foi resolvido (o relatório só lista essas).
export const emAberto = (observacoes) => observacoes.filter((o) => o.status !== 'Resolvido')

// Dentro da coluna: vencidas primeiro, depois pelo prazo; sem prazo no fim.
export function ordenarObservacoes(observacoes, hoje) {
  const chave = (o) => [estaVencido(o, hoje) ? 0 : 1, o.prazo || '9999-12-31']
  return [...observacoes].sort((a, b) => {
    const [va, pa] = chave(a)
    const [vb, pb] = chave(b)
    return va - vb || (pa < pb ? -1 : pa > pb ? 1 : 0)
  })
}

export function validarObservacao(c, hoje) {
  const p = {}
  if (!String(c.local || '').trim()) p.local = 'Diga onde foi visto.'
  if (!String(c.descricao || '').trim()) p.descricao = 'Descreva o que foi visto.'
  if (!String(c.causa_raiz || '').trim()) p.causa_raiz = 'Qual é a causa raiz?'
  if (!String(c.acao || '').trim()) p.acao = 'O que será feito?'
  const tipos = c.desperdicios || []
  if (!tipos.length) p.desperdicios = 'Marque pelo menos um desperdício.'
  else if (tipos.some((t) => !DESPERDICIOS.includes(t)) || new Set(tipos).size !== tipos.length) p.desperdicios = 'Desperdício inválido.'
  if (!c.responsavel_id) p.responsavel_id = 'Escolha o responsável.'
  if (c.prazo && c.prazo < hoje) p.prazo = 'O prazo não pode ser antes de hoje.'
  return p
}

// No quadro do Gemba dá para ir para qualquer coluna (não é fluxo com etapas).
export function validarMudancaGemba(atual, novo) {
  if (!STATUS_GEMBA.includes(novo)) return 'Situação inválida.'
  if (atual === novo) return `Já está em "${novo}".`
  return null
}

// Marca/desmarca um tipo na multi-seleção, mantendo a ordem oficial.
export function alternarDesperdicio(escolhidos, tipo) {
  const set = new Set(escolhidos)
  if (set.has(tipo)) set.delete(tipo)
  else set.add(tipo)
  return DESPERDICIOS.filter((t) => set.has(t))
}
