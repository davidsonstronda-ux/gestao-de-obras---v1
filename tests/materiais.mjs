// Materiais (Kanban de pedidos): a regra em src/lib/materiais.js e o filtro
// por obra/permissão em src/lib/dados.js.
import {
  contadoresPedidos, diasNaColuna, estaAtrasado, etiquetaPedido, leadTime, lerQuantidade, proximoStatus,
  recebidoComProblema, rotuloDiasNaColuna, statusAnterior, validarMudanca, validarNovoPedido,
} from '../src/lib/materiais.js'
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const HOJE = '2026-10-20'
const chaves = (o) => Object.keys(o).sort()

// ── regra pura ──────────────────────────────────────────────────────────────
conferir('ordem das colunas', [proximoStatus('Solicitar'), proximoStatus('A caminho'), proximoStatus('Entregue')], ['Em cotação', 'No almoxarifado', null])
conferir('voltar uma coluna', [statusAnterior('Em cotação'), statusAnterior('Solicitar')], ['Solicitar', null])

conferir('quantidade aceita vírgula', lerQuantidade('12,5'), 12.5)
conferir('quantidade recusa zero, texto e vazio', [lerQuantidade('0'), lerQuantidade('abc'), lerQuantidade('')], [null, null, null])

conferir('pedido novo vazio aponta os 3 campos', chaves(validarNovoPedido({ prioridade: 'Normal' })), ['frente_id', 'material_id', 'quantidade'])
conferir('pedido novo completo passa', validarNovoPedido({ material_id: 'mt1', quantidade: '50', frente_id: 'f1', prioridade: 'Crítico' }), {})

conferir('não pula coluna', chaves(validarMudanca('Solicitar', 'A caminho', { fornecedor: 'X', previsao_entrega: HOJE })), ['status'])
conferir('A caminho exige fornecedor e previsão', chaves(validarMudanca('Em cotação', 'A caminho', {})), ['fornecedor', 'previsao_entrega'])
conferir('A caminho completo passa', validarMudanca('Em cotação', 'A caminho', { fornecedor: 'Depósito', previsao_entrega: HOJE }), {})
conferir('almoxarifado exige o checklist', chaves(validarMudanca('A caminho', 'No almoxarifado', {})), ['estado_ok', 'qtd_bate_nf'])
conferir('almoxarifado aceita "não" como resposta', validarMudanca('A caminho', 'No almoxarifado', { qtd_bate_nf: false, estado_ok: true }), {})
conferir('entregue exige a frente', chaves(validarMudanca('No almoxarifado', 'Entregue', {})), ['frente_id'])
conferir('voltar não pede dados', validarMudanca('No almoxarifado', 'A caminho', {}), {})

conferir('atrasado: previsão vencida e ainda a caminho', estaAtrasado({ status: 'A caminho', previsao_entrega: '2026-10-16' }, HOJE), true)
conferir('previsão de hoje ainda não é atraso', estaAtrasado({ status: 'A caminho', previsao_entrega: HOJE }, HOJE), false)
conferir('já recebido não é atraso', estaAtrasado({ status: 'No almoxarifado', previsao_entrega: '2026-10-01' }, HOJE), false)
conferir('um "não" marca problema', [recebidoComProblema({ qtd_bate_nf: false, estado_ok: true }), recebidoComProblema({ qtd_bate_nf: true, estado_ok: true }), recebidoComProblema({ qtd_bate_nf: null, estado_ok: null })], [true, false, false])

const hist = [
  { status: 'Solicitar', data: '2026-10-02' }, { status: 'Em cotação', data: '2026-10-05' },
  { status: 'A caminho', data: '2026-10-07' }, { status: 'No almoxarifado', data: '2026-10-15' },
]
conferir('lead time = Solicitar até almoxarifado', leadTime(hist), 13)
conferir('sem chegada, sem lead time', leadTime(hist.slice(0, 3)), null)
conferir('dias na coluna saem da última entrada nela', diasNaColuna({ status: 'No almoxarifado' }, hist, HOJE), 5)
conferir('voltou e entrou de novo: conta da última vez', diasNaColuna({ status: 'Em cotação' }, [...hist, { status: 'Em cotação', data: '2026-10-18' }], HOJE), 2)
conferir('rótulo de dias', [rotuloDiasNaColuna(0), rotuloDiasNaColuna(1), rotuloDiasNaColuna(4)], ['entrou hoje nesta coluna', 'há 1 dia nesta coluna', 'há 4 dias nesta coluna'])

conferir('contadores', contadoresPedidos([
  { status: 'Em cotação' }, { status: 'A caminho', previsao_entrega: '2026-10-16' },
  { status: 'A caminho', previsao_entrega: '2026-10-27' }, { status: 'A caminho', previsao_entrega: '2026-10-28' },
], HOJE), { emCotacao: 1, chegando: 1, atrasados: 1 })

conferir('etiqueta: crítico manda', etiquetaPedido({ prioridade: 'Crítico' }, 'Grosso'), { texto: 'Crítico', cor: 'vermelho' })
conferir('etiqueta: grosso azul, resto verde', [etiquetaPedido({ prioridade: 'Normal' }, 'Grosso').cor, etiquetaPedido({ prioridade: 'Normal' }, 'Instalações').cor], ['destaque', 'verde'])

// ── camada de dados: multi-obra e permissões ────────────────────────────────
await dados.entrarComo('u1')
conferir('sem obra escolhida não lista pedido', (await dados.listarPedidos()).erro, 'Nenhuma obra selecionada.')
dados.definirContexto({ obraId: 'o1' })
const o1 = (await dados.listarPedidos()).data
conferir('obra 1: 8 pedidos em aberto, 2 entregues fora', [o1.pedidos.length, o1.totalEntregues], [8, 2])
conferir('obra 1: nenhum pedido da obra 2', o1.pedidos.some((p) => p.obra_id !== 'o1'), false)
conferir('obra 1: contadores do mock', o1.contadores, { emCotacao: 2, chegando: 1, atrasados: 1 })
conferir('obra 1: o atrasado é a manta e vem primeiro', [o1.pedidos[0].id, o1.pedidos[0].atrasado], ['pm1', true])
conferir('obra 1: lead time do tubo PVC', o1.pedidos.find((p) => p.id === 'pm3').leadTime, 13)
conferir('ver entregues traz os 10', (await dados.listarPedidos({ entregues: true })).data.pedidos.length, 10)

dados.definirContexto({ obraId: 'o2' })
const o2 = (await dados.listarPedidos()).data
conferir('obra 2: só os 2 dela', o2.pedidos.map((p) => p.id).sort(), ['pm10', 'pm11'])
conferir('obra 2 não move pedido da obra 1', (await dados.moverPedido('pm2', 'Solicitar')).erro, 'Pedido não encontrado nesta obra.')
conferir('obra 2 não pede para frente da obra 1', (await dados.criarPedido({ material_id: 'mt1', quantidade: '10', frente_id: 'f1', prioridade: 'Normal' })).erro, 'Frente não encontrada nesta obra.')

// Fluxo completo na obra 2, gravando o histórico.
const novo = (await dados.criarPedido({ material_id: 'mt2', quantidade: '4,5', frente_id: 'f11', prioridade: 'Normal' })).data
conferir('pedido novo entra em Solicitar com 4,5', [novo.status, novo.quantidade, novo.obra_id], ['Solicitar', 4.5, 'o2'])
conferir('não pula para A caminho', (await dados.moverPedido(novo.id, 'A caminho', { fornecedor: 'X', previsao_entrega: HOJE })).erro, 'O pedido só anda uma coluna por vez.')
await dados.moverPedido(novo.id, 'Em cotação')
conferir('A caminho sem fornecedor é recusado', Boolean((await dados.moverPedido(novo.id, 'A caminho', {})).erro), true)
await dados.moverPedido(novo.id, 'A caminho', { fornecedor: ' Areal Bom Jesus ', previsao_entrega: '2026-10-22' })
const recebido = (await dados.moverPedido(novo.id, 'No almoxarifado', { qtd_bate_nf: true, estado_ok: false, avarias: 'Molhada' })).data
conferir('recebido com problema, histórico com 4 passos', [recebido.comProblema, recebido.fornecedor, recebido.historico.map((h) => h.status)], [true, 'Areal Bom Jesus', ['Solicitar', 'Em cotação', 'A caminho', 'No almoxarifado']])
conferir('entregue sai do quadro ativo', [(await dados.moverPedido(novo.id, 'Entregue', { frente_id: 'f11' })).data.status, (await dados.listarPedidos()).data.pedidos.some((p) => p.id === novo.id)], ['Entregue', false])

// Mestre: só a obra 1. Arquiteta vê e não mexe. Cliente nem vê.
await dados.entrarComo('u2')
dados.definirContexto({ obraId: 'o2' })
conferir('mestre não abre pedidos da obra 2', (await dados.listarPedidos()).erro, 'Você não tem acesso a esta obra.')
dados.definirContexto({ obraId: 'o1' })
conferir('mestre move pedido da obra 1', (await dados.moverPedido('pm6', 'Em cotação')).data?.status, 'Em cotação')

await dados.entrarComo('u3')
dados.definirContexto({ obraId: 'o1' })
conferir('arquiteta vê o quadro', (await dados.listarPedidos()).erro, null)
conferir('arquiteta não move', (await dados.moverPedido('pm5', 'Em cotação')).erro, 'Sem permissão para mover pedido.')
conferir('arquiteta não pede', (await dados.criarPedido({ material_id: 'mt1', quantidade: '1', frente_id: 'f1', prioridade: 'Normal' })).erro, 'Sem permissão para fazer pedido.')

await dados.entrarComo('u4')
dados.definirContexto({ obraId: 'o1' })
conferir('cliente não vê pedidos', (await dados.listarPedidos()).erro, 'Sem permissão.')

console.log(`${ok}/${tot} — materiais`)
process.exit(ok === tot ? 0 : 1)
