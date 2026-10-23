// Qualidade (aba Gemba Walk): a regra em src/lib/gemba.js e o filtro por
// obra/permissão em src/lib/dados.js.
import { DESPERDICIOS, alternarDesperdicio, emAberto, filtrarObservacoes, ordenarObservacoes, rankingDesperdicios, validarMudancaGemba, validarObservacao } from '../src/lib/gemba.js'
import { estaVencido } from '../src/lib/qualidade.js'
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const HOJE = '2026-10-20' // terça
const chaves = (o) => Object.keys(o).sort()
const obs = (x) => ({ local: '', descricao: '', causa_raiz: '', acao: '', desperdicios: ['Espera'], status: 'Pendente', prazo: null, ...x })

// ── regra pura ──────────────────────────────────────────────────────────────
conferir('os 7 tipos, textos exatos', DESPERDICIOS, ['Retrabalho', 'Espera', 'Transporte', 'Movimentação', 'Estoque', 'Superprodução', 'Processo desnecessário'])
const lista = [
  obs({ id: 'a', desperdicios: ['Espera', 'Retrabalho'], prazo: '2026-10-18', local: 'Cozinha' }),
  obs({ id: 'b', desperdicios: ['Espera'], prazo: HOJE, descricao: 'Concreto atrasou' }),
  obs({ id: 'c', desperdicios: ['Estoque'], prazo: '2026-10-18', status: 'Resolvido' }),
  obs({ id: 'd', desperdicios: ['Retrabalho'], prazo: '2026-10-25', causa_raiz: 'Sequência invertida' }),
  obs({ id: 'e', desperdicios: ['Transporte'] }),
]
const ids = (l) => l.map((o) => o.id)
const ranking = rankingDesperdicios(lista)
conferir('ranking: maior primeiro, empate na ordem da lista', ranking.slice(0, 4), [{ tipo: 'Retrabalho', quantidade: 2 }, { tipo: 'Espera', quantidade: 2 }, { tipo: 'Transporte', quantidade: 1 }, { tipo: 'Estoque', quantidade: 1 }])
conferir('ranking traz os 7 tipos, zeros no fim', [ranking.length, ranking.at(-1)], [7, { tipo: 'Processo desnecessário', quantidade: 0 }])
conferir('filtro por tipo', ids(filtrarObservacoes(lista, { tipo: 'Retrabalho' }, HOJE)), ['a', 'd'])
conferir('vencidos não traz resolvido', ids(filtrarObservacoes(lista, { prazo: 'Vencidos' }, HOJE)), ['a'])
conferir('hoje', ids(filtrarObservacoes(lista, { prazo: 'Hoje' }, HOJE)), ['b'])
conferir('esta semana (até domingo 25/10)', ids(filtrarObservacoes(lista, { prazo: 'Esta semana' }, HOJE)), ['b', 'd'])
conferir('sem prazo', ids(filtrarObservacoes(lista, { prazo: 'Sem prazo' }, HOJE)), ['e'])
conferir('em aberto tira só as resolvidas', ids(emAberto(lista)), ['a', 'b', 'd', 'e'])
conferir('busca acha na causa raiz, sem acento', ids(filtrarObservacoes(lista, { busca: 'SEQUENCIA' }, HOJE)), ['d'])
conferir('ordem: vencida, por prazo, sem prazo no fim', ids(ordenarObservacoes(lista, HOJE)), ['a', 'c', 'b', 'd', 'e'])

conferir('observação vazia aponta 6 campos', chaves(validarObservacao({}, HOJE)), ['acao', 'causa_raiz', 'descricao', 'desperdicios', 'local', 'responsavel_id'])
conferir('tipo inventado é recusado', validarObservacao({ desperdicios: ['Preguiça'] }, HOJE).desperdicios, 'Desperdício inválido.')
conferir('tipo repetido é recusado', validarObservacao({ desperdicios: ['Espera', 'Espera'] }, HOJE).desperdicios, 'Desperdício inválido.')
conferir('prazo no passado é recusado; vazio passa', [validarObservacao({ prazo: '2026-10-19' }, HOJE).prazo, validarObservacao({ prazo: '' }, HOJE).prazo], ['O prazo não pode ser antes de hoje.', undefined])
conferir('pode ir para qualquer coluna', [validarMudancaGemba('Resolvido', 'Pendente'), validarMudancaGemba('Pendente', 'Pendente'), validarMudancaGemba('Pendente', 'Feito')], [null, 'Já está em "Pendente".', 'Situação inválida.'])
conferir('multi-seleção mantém a ordem oficial', [alternarDesperdicio(['Estoque'], 'Espera'), alternarDesperdicio(['Espera', 'Estoque'], 'Espera')], [['Espera', 'Estoque'], ['Estoque']])

// ── multi-obra e permissões (dados.js) ──────────────────────────────────────
await dados.entrarComo('u1')
conferir('sem obra escolhida não sai nada', (await dados.listarGemba()).erro, 'Nenhuma obra selecionada.')
dados.definirContexto({ obraId: 'o2' })
const o2 = (await dados.listarGemba()).data
conferir('obra 2: só a observação dela', [ids(o2.observacoes), ids(o2.pessoas)], [['g8'], ['u1']])
conferir('obra 2 não move observação da obra 1', (await dados.moverObservacaoGemba('g1', 'Resolvido')).erro, 'Observação não encontrada nesta obra.')
conferir('obra 2 não usa responsável de fora dela', (await dados.criarObservacaoGemba({ local: 'x', descricao: 'x', causa_raiz: 'x', acao: 'x', desperdicios: ['Espera'], responsavel_id: 'u2' })).erro, 'O responsável precisa ser da equipe desta obra.')

dados.definirContexto({ obraId: 'o1' })
const o1 = (await dados.listarGemba()).data
conferir('obra 1: 7 observações, nenhuma da obra 2', [o1.observacoes.length, o1.observacoes.some((o) => o.obra_id !== 'o1')], [7, false])
conferir('obra 1: ranking começa por Retrabalho', rankingDesperdicios(o1.observacoes)[0], { tipo: 'Retrabalho', quantidade: 2 })
conferir('obra 1: a vencida vem primeiro', [o1.observacoes[0].id, estaVencido(o1.observacoes[0], HOJE)], ['g2', true])
const nova = (await dados.criarObservacaoGemba({ local: 'Lavabo', descricao: 'x', causa_raiz: 'y', acao: 'z', desperdicios: ['Estoque', 'Espera'], responsavel_id: 'u2' })).data
conferir('nova nasce pendente, sem prazo vira null', [nova.status, nova.prazo, nova.desperdicios], ['Pendente', null, ['Estoque', 'Espera']])
conferir('mover volta coluna também', (await dados.moverObservacaoGemba('g4', 'Em andamento')).data.status, 'Em andamento')

await dados.entrarComo('u2')
dados.definirContexto({ obraId: 'o1' })
conferir('mestre move', (await dados.moverObservacaoGemba('g5', 'Resolvido')).erro, null)
conferir('mestre não exclui', (await dados.excluirObservacaoGemba('g5')).erro, 'Só o engenheiro exclui observação.')
await dados.entrarComo('u3')
dados.definirContexto({ obraId: 'o1' })
conferir('arquiteta vê e não move', [(await dados.listarGemba()).erro, (await dados.moverObservacaoGemba('g1', 'Resolvido')).erro], [null, 'Sem permissão para mover.'])
await dados.entrarComo('u4')
dados.definirContexto({ obraId: 'o1' })
conferir('cliente não vê', (await dados.listarGemba()).erro, 'Sem permissão.')
await dados.entrarComo('u1')
dados.definirContexto({ obraId: 'o1' })
conferir('engenheiro exclui', [(await dados.excluirObservacaoGemba('g7')).erro, (await dados.listarGemba()).data.observacoes.some((o) => o.id === 'g7')], [null, false])

console.log(`${ok}/${tot} — gemba`)
process.exit(ok === tot ? 0 : 1)
