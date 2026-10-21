// Regras do diário e de quem vê o quê (src/lib/diario.js, src/lib/permissoes.js).
import { validarDiario, podeEditarDiario, acessoAoDia, diaVizinho, frentesDoDia } from '../src/lib/diario.js'
import { pode, obraNoSeletor, MENUS, itensDaBarra } from '../src/lib/permissoes.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Diário: não salva com frente sem marcação, nem "Não andou" sem motivo.
conferir('frente sem marcação bloqueia', validarDiario({ clima: 'Sol', frentesIds: ['a', 'b'], marcas: { a: { situacao: 'Andou' } } }),
  ['Faltam 1 frente sem Andou/Não andou.'])
conferir('não andou sem motivo bloqueia', validarDiario({ clima: 'Sol', frentesIds: ['a'], marcas: { a: { situacao: 'Não andou' } } }),
  ['Toda frente que não andou precisa de motivo.'])
conferir('motivo Outro sem detalhe bloqueia', validarDiario({ clima: 'Sol', frentesIds: ['a'], marcas: { a: { situacao: 'Não andou', motivo: 'Outro', motivo_detalhe: '  ' } } }),
  ['Motivo "Outro" precisa de detalhe.'])
conferir('tudo marcado salva', validarDiario({ clima: 'Chuva', frentesIds: ['a', 'b'], marcas: { a: { situacao: 'Andou' }, b: { situacao: 'Não andou', motivo: 'Chuva' } } }), [])

// Trava do diário: mestre edita o próprio até o fim do dia seguinte.
const diario = { data: '2026-10-19', autor_id: 'u2' }
conferir('mestre edita o de ontem', podeEditarDiario({ role: 'Mestre', userId: 'u2', diario, hoje: '2026-10-20' }), true)
conferir('mestre não edita o de anteontem', podeEditarDiario({ role: 'Mestre', userId: 'u2', diario, hoje: '2026-10-21' }), false)
conferir('mestre não edita o de outro autor', podeEditarDiario({ role: 'Mestre', userId: 'u9', diario, hoje: '2026-10-20' }), false)
conferir('engenheiro edita qualquer um', podeEditarDiario({ role: 'Engenheiro', userId: 'u1', diario, hoje: '2026-12-01' }), true)
conferir('arquiteta não edita diário', podeEditarDiario({ role: 'Arquiteta', userId: 'u3', diario, hoje: '2026-10-19' }), false)

// Setas do diário: pulam domingo e nunca passam de hoje.
conferir('segunda volta para sábado', diaVizinho('2026-10-19', -1, '2026-10-20'), '2026-10-17')
conferir('sábado avança para segunda', diaVizinho('2026-10-17', 1, '2026-10-20'), '2026-10-19')
conferir('de hoje não avança', diaVizinho('2026-10-20', 1, '2026-10-20'), null)

// Como o dia abre: dia sem diário conta como da própria pessoa.
const H = '2026-10-20'
conferir('mestre lança o de ontem que esqueceu', acessoAoDia({ role: 'Mestre', userId: 'u2', diario: null, data: '2026-10-19', hoje: H }).editavel, true)
conferir('mestre não lança o de anteontem', acessoAoDia({ role: 'Mestre', userId: 'u2', diario: null, data: '2026-10-17', hoje: H }),
  { editavel: false, motivo: 'Só leitura: o prazo de edição deste diário acabou.' })
conferir('mestre só lê o diário de outro autor', acessoAoDia({ role: 'Mestre', userId: 'u2', diario: { data: '2026-10-19', autor_id: 'u1' }, data: '2026-10-19', hoje: H }).motivo,
  'Só leitura: lançado por outra pessoa.')
conferir('engenheiro lança dia antigo', acessoAoDia({ role: 'Engenheiro', userId: 'u1', diario: null, data: '2026-10-01', hoje: H }).editavel, true)
conferir('dia futuro não abre', acessoAoDia({ role: 'Engenheiro', userId: 'u1', diario: null, data: '2026-10-21', hoje: H }).editavel, false)
conferir('arquiteta só lê', acessoAoDia({ role: 'Arquiteta', userId: 'u3', diario: null, data: H, hoje: H }), { editavel: false, motivo: 'Só leitura.' })

// Frentes de um dia passado: começadas e não concluídas naquele dia; marcadas sempre entram.
const fr = [
  { id: 'a', situacao: 'Em andamento', inicio_previsto: '2026-10-15' },
  { id: 'b', situacao: 'Concluída', inicio_previsto: '2026-10-01', concluida_em: '2026-10-10' },
  { id: 'c', situacao: 'Concluída', inicio_previsto: '2026-10-01', concluida_em: '2026-10-12' },
  { id: 'd', situacao: 'Não iniciada', inicio_previsto: '2026-10-25' },
]
conferir('dia 10: só a que estava aberta', frentesDoDia(fr, '2026-10-10', H).map((f) => f.id), ['b', 'c'])
conferir('dia 13: concluídas antes saem', frentesDoDia(fr, '2026-10-13', H).map((f) => f.id), [])
conferir('marcada no diário entra mesmo concluída', frentesDoDia(fr, '2026-10-13', H, ['b']).map((f) => f.id), ['b'])
conferir('hoje: regra do risco', frentesDoDia(fr, H, H).map((f) => f.id), ['a'])

// Dinheiro e dado de terceiro: os itens que exigiram confirmação item por item.
conferir('só engenheiro vê valores', ['Engenheiro', 'Mestre', 'Arquiteta', 'Cliente', 'Pendente'].map((r) => pode(r, 'verValores')), [true, false, false, false, false])
conferir('cliente não vê empreiteiro', pode('Cliente', 'verEmpreiteiro'), false)
conferir('arquiteta vê empreiteiro e lê diário', [pode('Arquiteta', 'verEmpreiteiro'), pode('Arquiteta', 'verDiario')], [true, true])
conferir('só engenheiro libera foto ao cliente', ['Engenheiro', 'Mestre', 'Arquiteta'].map((r) => pode(r, 'liberarFoto')), [true, false, false])
conferir('pendente não pode nada', ['verFrentes', 'verDiario', 'verPainelCliente', 'comentar'].map((a) => pode('Pendente', a)), [false, false, false, false])
conferir('ação desconhecida é negada', pode('Engenheiro', 'qualquerCoisa'), false)

// Seletor: concluída sai, parada fica.
conferir('obra parada fica no seletor', obraNoSeletor({ situacao: 'Parada' }), true)
conferir('obra concluída sai do seletor', obraNoSeletor({ situacao: 'Concluída' }), false)

// Menu: no máximo 5 itens na barra inferior.
conferir('nenhuma barra do celular passa de 5 itens', Object.keys(MENUS).every((r) => itensDaBarra(r).length <= 5), true)
conferir('materiais do engenheiro fica em Mais no celular', [MENUS.Engenheiro.itens.includes('materiais'), itensDaBarra('Engenheiro').includes('materiais')], [true, false])

console.log(`${ok}/${tot} — diario-e-permissoes`)
process.exit(ok === tot ? 0 : 1)
