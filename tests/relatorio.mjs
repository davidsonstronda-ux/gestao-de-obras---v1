// Relatório de Qualidade: o texto dos filtros e o carimbo (src/lib/relatorio.js).
import { carimboDeGeracao, descreverFiltros } from '../src/lib/relatorio.js'
import { FILTROS_VISTORIA_VAZIOS } from '../src/lib/qualidade.js'
import { FILTROS_NC } from '../src/lib/fvs.js'
import { FILTROS_GEMBA_VAZIOS } from '../src/lib/gemba.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('sem filtro nenhum', descreverFiltros({ vistoria: FILTROS_VISTORIA_VAZIOS, filtroNc: FILTROS_NC[0], gemba: FILTROS_GEMBA_VAZIOS }),
  ['Vistoria: todos os registros', 'Não conformidades: em aberto', 'Gemba Walk: observações em aberto'])
conferir('com filtros', descreverFiltros({
  vistoria: { status: 'Pendente', responsavel: 'u2', prazo: 'Atrasados', busca: ' box ' },
  pessoas: [{ id: 'u2', nome: 'Seu Raimundo' }],
  filtroNc: 'Todas',
  gemba: { tipo: 'Espera', prazo: 'Esta semana', busca: '' },
}), [
  'Vistoria: situação: Pendente · responsável: Seu Raimundo · prazo: atrasados · busca "box"',
  'Não conformidades: todas',
  'Gemba Walk: desperdício: Espera · prazo: esta semana (só em aberto)',
])
conferir('carimbo com dia de hoje() e hora do relógio', carimboDeGeracao('2026-10-20', new Date(2030, 0, 1, 9, 5)), '20/10/2026 às 09:05')

console.log(`${ok}/${tot} — relatorio`)
process.exit(ok === tot ? 0 : 1)
