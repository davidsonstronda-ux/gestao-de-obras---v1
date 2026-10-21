// Regra do estoque (opcional) do módulo Materiais. Fonte: PLANO-DO-PROJETO.md,
// "Materiais — Kanban de pedidos", item Estoque. Puro: sem React, sem banco.
// Os textos são idênticos ao CHECK do banco (PRD-BACKEND, tabela `movimentos`).
import { formatarQuantidade, lerQuantidade } from './materiais.js'

export const TIPOS_MOVIMENTO = ['Entrada', 'Saída']
export const ORIGENS_MOVIMENTO = ['Pedido', 'Manual']

// Crítico quando o saldo chega no mínimo (ou abaixo).
export function situacaoInsumo(insumo) {
  return insumo.saldo <= insumo.saldo_minimo ? 'Crítico' : 'OK'
}

// Só o recebimento com o checklist todo "sim" entra sozinho no estoque.
export function geraEntrada(pedido) {
  return pedido.qtd_bate_nf === true && pedido.estado_ok === true
}

// Saldo depois de um movimento. Arredonda para não acumular 0,30000000004.
export function saldoDepois(saldo, tipo, quantidade) {
  const novo = tipo === 'Entrada' ? saldo + quantidade : saldo - quantidade
  return Math.round(novo * 1000) / 1000
}

// Saldo que os movimentos dão (para conferir o saldo guardado).
export function saldoDosMovimentos(movimentos) {
  return movimentos.reduce((s, m) => saldoDepois(s, m.tipo, m.quantidade), 0)
}

// Problemas de uma baixa, um por campo. O saldo nunca fica negativo.
export function validarBaixa({ insumo, quantidade, frente_id, data }, hoje) {
  const p = {}
  const q = lerQuantidade(quantidade)
  if (!insumo) p.insumo_id = 'Escolha o insumo.'
  if (q === null) p.quantidade = 'Informe a quantidade (só número, maior que zero).'
  else if (insumo && q > insumo.saldo) {
    p.quantidade = `Saldo de ${formatarQuantidade(insumo.saldo)} ${insumo.unidade}; não dá para baixar ${formatarQuantidade(q)}.`
  }
  if (!frente_id) p.frente_id = 'Escolha a frente.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) p.data = 'Informe a data.'
  else if (data > hoje) p.data = 'A data não pode ser no futuro.'
  return p
}

const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Busca pelo nome (sem ligar para acento) e filtro "só críticos"; críticos primeiro.
export function filtrarInsumos(insumos, { busca = '', soCriticos = false } = {}) {
  const termo = semAcento(busca.trim())
  return insumos
    .filter((i) => !soCriticos || situacaoInsumo(i) === 'Crítico')
    .filter((i) => !termo || semAcento(i.nome || '').includes(termo))
    .sort((a, b) => Number(situacaoInsumo(b) === 'Crítico') - Number(situacaoInsumo(a) === 'Crítico') || (a.nome || '').localeCompare(b.nome || ''))
}

export function contarCriticos(insumos) {
  return insumos.filter((i) => situacaoInsumo(i) === 'Crítico').length
}
