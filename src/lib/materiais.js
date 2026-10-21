// Regra do módulo Materiais (Kanban de pedidos). Fonte: PLANO-DO-PROJETO.md,
// "Materiais — Kanban de pedidos". Puro: sem React, sem banco, sem window.
// Os textos são idênticos ao CHECK do banco (PRD-BACKEND, tabela `pedidos`).
import { diasEntre } from './datas.js'

export const STATUS_PEDIDO = ['Solicitar', 'Em cotação', 'A caminho', 'No almoxarifado', 'Entregue']
export const PRIORIDADES = ['Normal', 'Crítico']
export const CATEGORIAS = ['Grosso', 'Acabamento', 'Instalações']

// Título de cada coluna do quadro (o status é a chave; o título é só tela).
export const TITULO_COLUNA = {
  'Solicitar': 'Solicitar', 'Em cotação': 'Em cotação', 'A caminho': 'Comprado / a caminho',
  'No almoxarifado': 'No almoxarifado', 'Entregue': 'Entregue na frente',
}

export function proximoStatus(status) {
  return STATUS_PEDIDO[STATUS_PEDIDO.indexOf(status) + 1] || null
}
export function statusAnterior(status) {
  const i = STATUS_PEDIDO.indexOf(status)
  return i > 0 ? STATUS_PEDIDO[i - 1] : null
}

// Quantidade digitada no celular: aceita "12,5" e "12.5"; devolve número > 0 ou null.
export function lerQuantidade(texto) {
  const t = String(texto ?? '').trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  const n = Number(t)
  return n > 0 ? n : null
}

// Problemas de um pedido novo, um por campo (chave = campo), para a tela avisar na hora.
export function validarNovoPedido({ material_id, quantidade, frente_id, prioridade }) {
  const p = {}
  if (!material_id) p.material_id = 'Escolha o material.'
  if (lerQuantidade(quantidade) === null) p.quantidade = 'Informe a quantidade (só número, maior que zero).'
  if (!frente_id) p.frente_id = 'Escolha a frente.'
  if (!PRIORIDADES.includes(prioridade)) p.prioridade = 'Escolha a prioridade.'
  return p
}

// Problemas para mover um pedido de coluna. Só uma coluna por vez, para frente
// ou para trás; quem entra em certas colunas precisa trazer dados.
export function validarMudanca(statusAtual, novoStatus, dados = {}) {
  const p = {}
  if (novoStatus !== proximoStatus(statusAtual) && novoStatus !== statusAnterior(statusAtual)) {
    p.status = 'O pedido só anda uma coluna por vez.'
    return p
  }
  const avancando = novoStatus === proximoStatus(statusAtual)
  if (!avancando) return p
  if (novoStatus === 'A caminho') {
    if (!String(dados.fornecedor || '').trim()) p.fornecedor = 'Informe o fornecedor.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.previsao_entrega || '')) p.previsao_entrega = 'Informe a previsão de entrega.'
  }
  if (novoStatus === 'No almoxarifado') {
    if (typeof dados.qtd_bate_nf !== 'boolean') p.qtd_bate_nf = 'Responda se a quantidade bate com a NF.'
    if (typeof dados.estado_ok !== 'boolean') p.estado_ok = 'Responda se o material chegou em perfeito estado.'
  }
  if (novoStatus === 'Entregue' && !dados.frente_id) p.frente_id = 'Confirme a frente onde o material foi aplicado.'
  return p
}

// Previsão vencida e o material ainda não chegou.
export function estaAtrasado(pedido, hoje) {
  return pedido.status === 'A caminho' && Boolean(pedido.previsao_entrega) && pedido.previsao_entrega < hoje
}

// Um "não" no checklist de recebimento.
export function recebidoComProblema(pedido) {
  return pedido.qtd_bate_nf === false || pedido.estado_ok === false
}

// Dias desde que o pedido entrou na coluna em que está (última entrada dela no histórico).
export function diasNaColuna(pedido, historico, hoje) {
  const entrada = historico.filter((h) => h.status === pedido.status).map((h) => h.data).sort().at(-1)
  return entrada ? diasEntre(entrada, hoje) : 0
}

// Lead time: dias entre o pedido (Solicitar) e a chegada ao almoxarifado.
// null enquanto não chegou.
export function leadTime(historico) {
  const datas = (status) => historico.filter((h) => h.status === status).map((h) => h.data).sort()
  const pedido = datas('Solicitar')[0]
  const chegada = datas('No almoxarifado').at(-1)
  return pedido && chegada ? diasEntre(pedido, chegada) : null
}

// Os três contadores do topo.
export function contadoresPedidos(pedidos, hoje) {
  const emSete = (d) => d >= hoje && diasEntre(hoje, d) <= 7
  return {
    emCotacao: pedidos.filter((p) => p.status === 'Em cotação').length,
    chegando: pedidos.filter((p) => p.status === 'A caminho' && p.previsao_entrega && emSete(p.previsao_entrega)).length,
    atrasados: pedidos.filter((p) => estaAtrasado(p, hoje)).length,
  }
}

// Etiqueta do cartão: crítico manda (vermelho); senão a categoria
// (grosso = azul; acabamento e instalações = verde).
export function etiquetaPedido(pedido, categoria) {
  if (pedido.prioridade === 'Crítico') return { texto: 'Crítico', cor: 'vermelho' }
  return { texto: categoria, cor: categoria === 'Grosso' ? 'destaque' : 'verde' }
}

// Ordem dentro da coluna: atrasado, depois crítico, depois o mais antigo na coluna.
export function ordenarPedidos(pedidos) {
  return [...pedidos].sort((a, b) =>
    Number(b.atrasado) - Number(a.atrasado)
    || Number(b.prioridade === 'Crítico') - Number(a.prioridade === 'Crítico')
    || b.diasNaColuna - a.diasNaColuna)
}

// 12.5 -> "12,5"; 1200 -> "1.200"
export function formatarQuantidade(n) {
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function rotuloDiasNaColuna(dias) {
  if (dias <= 0) return 'entrou hoje nesta coluna'
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'} nesta coluna`
}
