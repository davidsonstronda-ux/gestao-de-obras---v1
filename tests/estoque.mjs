// Estoque (opcional) de Materiais: a regra em src/lib/estoque.js, os dados de
// exemplo e o filtro por obra/permissão em src/lib/dados.js.
import { contarCriticos, filtrarInsumos, geraEntrada, saldoDepois, saldoDosMovimentos, situacaoInsumo, validarBaixa } from '../src/lib/estoque.js'
import { mockInsumos, mockMovimentos } from '../src/lib/mockData.js'
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
conferir('crítico quando saldo ≤ mínimo', [situacaoInsumo({ saldo: 1, saldo_minimo: 1 }), situacaoInsumo({ saldo: 0.5, saldo_minimo: 1 }), situacaoInsumo({ saldo: 2, saldo_minimo: 1 })], ['Crítico', 'Crítico', 'OK'])
conferir('só checklist todo "sim" gera entrada', [geraEntrada({ qtd_bate_nf: true, estado_ok: true }), geraEntrada({ qtd_bate_nf: false, estado_ok: true }), geraEntrada({ qtd_bate_nf: true, estado_ok: false })], [true, false, false])
conferir('saldo sem lixo de vírgula', saldoDepois(0.3, 'Saída', 0.1), 0.2)
const ins = { saldo: 10, unidade: 'saco 50 kg' }
conferir('baixa vazia aponta os campos', chaves(validarBaixa({ data: HOJE }, HOJE)), ['frente_id', 'insumo_id', 'quantidade'])
conferir('baixa maior que o saldo é recusada', validarBaixa({ insumo: ins, quantidade: '12', frente_id: 'f1', data: HOJE }, HOJE).quantidade, 'Saldo de 10 saco 50 kg; não dá para baixar 12.')
conferir('baixa do saldo inteiro passa', validarBaixa({ insumo: ins, quantidade: '10', frente_id: 'f1', data: HOJE }, HOJE), {})
conferir('baixa no futuro é recusada', chaves(validarBaixa({ insumo: ins, quantidade: '1', frente_id: 'f1', data: '2026-10-21' }, HOJE)), ['data'])
const lista = [{ nome: 'Tubo PVC', saldo: 12, saldo_minimo: 10 }, { nome: 'Cimento', saldo: 10, saldo_minimo: 15 }, { nome: 'Argamassa', saldo: 9, saldo_minimo: 1 }]
conferir('críticos primeiro, depois por nome', filtrarInsumos(lista).map((i) => i.nome), ['Cimento', 'Argamassa', 'Tubo PVC'])
conferir('busca sem acento e filtro só críticos', [filtrarInsumos(lista, { busca: 'tubo' }).length, filtrarInsumos(lista, { soCriticos: true }).map((i) => i.nome)], [1, ['Cimento']])
conferir('contar críticos', contarCriticos(lista), 1)

// ── dados de exemplo coerentes ──────────────────────────────────────────────
conferir('saldo de cada insumo = soma dos movimentos', mockInsumos.every((i) => saldoDosMovimentos(mockMovimentos.filter((m) => m.insumo_id === i.id)) === i.saldo), true)
conferir('movimento sempre da mesma obra do insumo', mockMovimentos.every((m) => mockInsumos.find((i) => i.id === m.insumo_id)?.obra_id === m.obra_id), true)

// ── camada de dados: multi-obra, entrada automática, baixa ──────────────────
await dados.entrarComo('u1')
conferir('sem obra escolhida não lista estoque', (await dados.listarEstoque()).erro, 'Nenhuma obra selecionada.')
dados.definirContexto({ obraId: 'o1' })
const o1 = (await dados.listarEstoque()).data
conferir('obra 1: 3 insumos, 2 críticos (cimento e bloco)', [o1.insumos.length, o1.criticos, o1.insumos.filter((i) => i.situacao === 'Crítico').map((i) => i.id).sort()], [3, 2, ['in1', 'in3']])
conferir('histórico do cimento, mais recente primeiro', (await dados.listarMovimentos('in1')).data.map((m) => m.id), ['mv7', 'mv6', 'mv5', 'mv4'])

conferir('baixa maior que o saldo é bloqueada', (await dados.registrarBaixa({ insumo_id: 'in1', quantidade: '11', frente_id: 'f10', data: HOJE })).erro, 'Saldo de 10 saco 50 kg; não dá para baixar 11.')
const baixa = (await dados.registrarBaixa({ insumo_id: 'in2', quantidade: '2', frente_id: 'f3', data: HOJE })).data
conferir('baixa tira do saldo e o tubo vira crítico', [baixa.saldo, baixa.situacao], [10, 'Crítico'])

// Recebimento OK cria o insumo do cabo (não existia) com a quantidade do pedido.
const cabo = (await dados.moverPedido('pm4', 'No almoxarifado', { qtd_bate_nf: true, estado_ok: true })).data
const depois = (await dados.listarEstoque()).data.insumos
conferir('recebido OK entra no estoque, criando o insumo', [cabo.entrouNoEstoque, depois.find((i) => i.material_id === 'mt12')?.saldo], [true, 6])
// Volta e recebe de novo: não entra duas vezes.
await dados.moverPedido('pm4', 'A caminho')
const deNovo = (await dados.moverPedido('pm4', 'No almoxarifado', { qtd_bate_nf: true, estado_ok: true })).data
conferir('o mesmo pedido não entra duas vezes', [deNovo.entrouNoEstoque, (await dados.listarEstoque()).data.insumos.find((i) => i.material_id === 'mt12').saldo], [false, 6])
// Recebimento de material que já tem insumo soma no mesmo.
await dados.moverPedido('pm2', 'A caminho', { fornecedor: 'Gesso Rio', previsao_entrega: HOJE })
await dados.moverPedido('pm2', 'No almoxarifado', { qtd_bate_nf: true, estado_ok: false })
conferir('recebido com problema não entra', (await dados.listarEstoque()).data.insumos.some((i) => i.material_id === 'mt9'), false)

dados.definirContexto({ obraId: 'o2' })
const o2 = (await dados.listarEstoque()).data
conferir('obra 2: só a areia dela, nenhum crítico', [o2.insumos.map((i) => i.id), o2.criticos], [['in4'], 0])
conferir('obra 2 não baixa insumo da obra 1', (await dados.registrarBaixa({ insumo_id: 'in1', quantidade: '1', frente_id: 'f11', data: HOJE })).erro, 'Insumo não encontrado nesta obra.')
conferir('obra 2 não lê histórico da obra 1', (await dados.listarMovimentos('in1')).erro, 'Insumo não encontrado nesta obra.')
conferir('obra 2 não baixa para frente da obra 1', (await dados.registrarBaixa({ insumo_id: 'in4', quantidade: '1', frente_id: 'f1', data: HOJE })).erro, 'Frente não encontrada nesta obra.')

await dados.entrarComo('u3')
dados.definirContexto({ obraId: 'o1' })
conferir('arquiteta vê o estoque', (await dados.listarEstoque()).erro, null)
conferir('arquiteta não dá baixa', (await dados.registrarBaixa({ insumo_id: 'in1', quantidade: '1', frente_id: 'f10', data: HOJE })).erro, 'Sem permissão para dar baixa no estoque.')
await dados.entrarComo('u4')
dados.definirContexto({ obraId: 'o1' })
conferir('cliente não vê estoque', (await dados.listarEstoque()).erro, 'Sem permissão.')

console.log(`${ok}/${tot} — estoque`)
process.exit(ok === tot ? 0 : 1)
