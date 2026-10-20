// A regra do atraso (src/lib/atraso.js) contra os dados de exemplo do PRD.
// Se um destes números mudar, ou a regra mudou ou o mock mudou: confira os dois.
import { calcularFrente, folgaConsumida, frenteVisivelNoRisco, ordenarFrentes, riscoDaFolga, situacaoEntrega } from '../src/lib/atraso.js'
import { somarDiasUteis } from '../src/lib/datas.js'
import { mockFrentes, mockDiarios, mockApontamentos } from '../src/lib/mockData.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-10-20'
function calcularObra(obraId) {
  const diarios = mockDiarios.filter((d) => d.obra_id === obraId)
  return mockFrentes
    .filter((f) => f.obra_id === obraId && frenteVisivelNoRisco(f, HOJE))
    .map((f) => ({ ...f, calculo: calcularFrente(f, diarios, mockApontamentos.filter((a) => a.frente_id === f.id), HOJE) }))
}
const o1 = calcularObra('o1')
const por = (id) => o1.find((f) => f.id === id).calculo

// Dias úteis = segunda a sábado.
conferir('sábado conta como dia útil', somarDiasUteis('2026-10-23', 1), '2026-10-24')
conferir('domingo é pulado', somarDiasUteis('2026-10-24', 1), '2026-10-26')
conferir('20/10 + 11 dias úteis = 02/11', somarDiasUteis('2026-10-20', 11), '2026-11-02')

// Limites de situação.
conferir('folga −1 estourou', riscoDaFolga(-1), 'Estourou a folga')
conferir('folga 0 é atenção', riscoDaFolga(0), 'Atenção')
conferir('folga 5 é atenção', riscoDaFolga(5), 'Atenção')
conferir('folga 6 está no prazo', riscoDaFolga(6), 'No prazo')

// Visibilidade: 7 na lista, 3 escondidas (1 concluída, 2 que ainda não chegaram na data).
conferir('7 frentes visíveis na obra 1', o1.length, 7)
conferir('concluída fica fora', o1.some((f) => f.id === 'f7'), false)
conferir('não iniciada atrasada para começar entra', o1.some((f) => f.id === 'f5'), true)
conferir('não iniciada no prazo fica fora', o1.some((f) => f.id === 'f8'), false)

// O critério de aceite do PRD-BACKEND: exatamente 2 estouradas na obra 1.
const estouradas = o1.filter((f) => f.calculo.risco === 'Estourou a folga').map((f) => f.id).sort()
conferir('obra 1: estouradas são Impermeabilização e Pintura fachada', estouradas, ['f1', 'f10'])
conferir('obra 1: entrega em risco com 2', situacaoEntrega(o1), { dePe: false, estouradas: 2 })

conferir('impermeabilização: 6 dias perdidos, folga −2', [por('f1').diasPerdidos, por('f1').folgaRestante], [6, -2])
conferir('impermeabilização: parada há 10 dias, falta material', [por('f1').diasSemAndar, por('f1').ultimoMotivo], [10, 'Falta material'])
conferir('pintura: andou ontem, mas folga −1 pela chuva', [por('f10').diasSemAndar, por('f10').folgaRestante, por('f10').ultimoMotivo], [1, -1, 'Chuva'])
conferir('bancadas nunca começou: decidir até 22/10', [por('f5').risco, por('f5').dataLimite, por('f5').diasSemAndar], ['Atenção', '2026-10-22', 7])
conferir('forro: decidir até 24/10', [por('f2').risco, por('f2').dataLimite], ['Atenção', '2026-10-24'])
conferir('hidráulica: no prazo até 29/10', [por('f3').risco, por('f3').dataLimite], ['No prazo', '2026-10-29'])
conferir('revestimento: 13 dias parado, mas no prazo até 02/11', [por('f6').diasSemAndar, por('f6').risco, por('f6').dataLimite], [13, 'No prazo', '2026-11-02'])

// Ordem: estouradas no topo; depois menos folga primeiro, ou mais dias parado.
conferir('ordem por data limite', ordenarFrentes(o1, 'limite').map((f) => f.id), ['f1', 'f10', 'f5', 'f2', 'f4', 'f3', 'f6'])
conferir('ordem por dias parado mantém estouradas no topo', ordenarFrentes(o1, 'parado').map((f) => f.id).slice(0, 3), ['f1', 'f10', 'f6'])

// Régua de folga: fração consumida, travada em 1.
conferir('sem dia perdido, régua vazia', folgaConsumida(8, 0), 0)
conferir('metade da folga comida', folgaConsumida(8, 4), 0.5)
conferir('estourou trava em 1', folgaConsumida(4, 6), 1)
conferir('folga zero com perda já está cheia', folgaConsumida(0, 1), 1)

// Obra 2 não enxerga nada da obra 1.
const o2 = calcularObra('o2')
conferir('obra 2 tem só a Fundação', o2.map((f) => f.id), ['f11'])
conferir('obra 2: entrega de pé', situacaoEntrega(o2), { dePe: true, estouradas: 0 })

// Dia sem diário não conta: frente que andou em todo diário não perde folga.
const semPerda = calcularFrente(
  { id: 'z', inicio_previsto: '2026-10-01', folga_dias: 3, situacao: 'Em andamento' },
  [{ id: 'd', data: '2026-10-19' }],
  [{ diario_id: 'd', situacao: 'Andou' }],
  HOJE,
)
conferir('dia sem diário não conta como perdido', semPerda.diasPerdidos, 0)

console.log(`${ok}/${tot} — atraso`)
process.exit(ok === tot ? 0 : 1)
