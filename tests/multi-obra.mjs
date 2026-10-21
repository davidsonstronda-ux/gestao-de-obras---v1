// Multi-obra e permissões na camada de dados (src/lib/dados.js).
// É o teste que impede uma obra de enxergar a outra, e dinheiro de vazar.
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const ids = (lista) => lista.map((x) => x.id).sort()

// Sem obra escolhida, nada sai.
await dados.entrarComo('u1')
conferir('sem obra escolhida a busca devolve erro', (await dados.listarFrentesEmRisco()).erro, 'Nenhuma obra selecionada.')

// Engenheiro nas duas obras: cada uma devolve só o que é dela.
conferir('engenheiro vê as duas obras no seletor', ids((await dados.listarMinhasObras()).data), ['o1', 'o2'])
dados.definirContexto({ obraId: 'o2' })
const o2 = (await dados.listarFrentesEmRisco()).data
conferir('obra 2: só a Fundação', ids(o2.frentes), ['f11'])
conferir('obra 2: nenhuma pendência', (await dados.listarPendencias({ situacao: 'Todas' })).data.length, 0)
conferir('obra 2: só a foto dela', ids((await dados.listarFotos()).data), ['p13'])
conferir('obra 2: só o empreiteiro dela', ids((await dados.listarEmpreiteirosEAmbientes()).data.empreiteiros), ['e9'])
conferir('obra 2 não abre frente da obra 1', (await dados.detalheFrente('f1')).erro, 'Frente não encontrada nesta obra.')
conferir('obra 2 não comenta pendência da obra 1', (await dados.comentarPendencia('pd1', 'oi')).erro, 'Pendência não encontrada nesta obra.')

dados.definirContexto({ obraId: 'o1' })
const o1 = (await dados.listarFrentesEmRisco()).data
conferir('obra 1: 7 frentes, nenhuma da obra 2', [o1.frentes.length, o1.frentes.some((f) => f.obra_id !== 'o1')], [7, false])
conferir('obra 1: entrega em risco com 2', [o1.entrega.dePe, o1.entrega.estouradas], [false, 2])
conferir('engenheiro vê valor contratado', (await dados.detalheFrente('f1')).data.valor_contratado, 38500)

// Mestre: só a obra 1, nenhum valor.
await dados.entrarComo('u2')
conferir('mestre só vê a obra 1 no seletor', ids((await dados.listarMinhasObras()).data), ['o1'])
dados.definirContexto({ obraId: 'o2' })
conferir('mestre não abre a obra 2 nem forçando', (await dados.listarFrentesEmRisco()).erro, 'Você não tem acesso a esta obra.')
dados.definirContexto({ obraId: 'o1' })
const det = (await dados.detalheFrente('f1')).data
conferir('mestre não recebe valor', det.valor_contratado, null)
conferir('mestre vê o empreiteiro', det.empreiteiro?.nome, 'ImperTec')
conferir('mestre não libera foto', (await dados.liberarFotos(['p6'], true)).erro, 'Só o engenheiro libera foto ao cliente.')

// Diário: não salva incompleto; salvo, recalcula a lista.
const hojeDiario = (await dados.diarioDoDia()).data
conferir('diário de hoje ainda não lançado', hojeDiario.existente, null)
conferir('diário incompleto é recusado', (await dados.salvarDiario({ clima: 'Sol', marcas: {} })).erro?.startsWith('Faltam 7 frentes'), true)
const marcas = Object.fromEntries(hojeDiario.frentes.map((f) => [f.id, f.id === 'f5' ? { situacao: 'Andou' } : { situacao: 'Não andou', motivo: 'Chuva' }]))
conferir('diário completo salva', (await dados.salvarDiario({ clima: 'Chuva', marcas })).erro, null)
const depois = (await dados.listarFrentesEmRisco()).data
conferir('bancadas começou: virou Em andamento', depois.frentes.find((f) => f.id === 'f5').situacao, 'Em andamento')
conferir('forro perdeu mais um dia: folga 3', depois.frentes.find((f) => f.id === 'f2').calculo.folgaRestante, 3)

// Diário de outro dia: o mestre só lê o antigo e não grava nele nem forçando.
const antigo = (await dados.diarioDoDia('2026-10-13')).data
conferir('diário de 13/10 abre só leitura para o mestre', [antigo.acesso.editavel, antigo.existente?.id], [false, 'd1-2026-10-13'])
conferir('só leitura mostra o que foi marcado', antigo.frentes.every((f) => antigo.marcas[f.id]), true)
conferir('mestre não grava no diário antigo', (await dados.salvarDiario({ data: '2026-10-13', clima: 'Sol', marcas: antigo.marcas })).erro,
  'Só leitura: o prazo de edição deste diário acabou.')
conferir('dia futuro é recusado', (await dados.diarioDoDia('2026-10-21')).erro, 'Data inválida para o diário.')
conferir('mestre abre o de ontem para editar', (await dados.diarioDoDia('2026-10-19')).data.acesso.editavel, true)

// Engenheiro na obra 2: o diário de 13/10 é o DELA, não o da obra 1.
await dados.entrarComo('u1')
dados.definirContexto({ obraId: 'o2' })
const o2dia = (await dados.diarioDoDia('2026-10-13')).data
conferir('obra 2: diário de 13/10 é o da obra 2', [o2dia.existente?.id, o2dia.acesso.editavel], ['d2-2026-10-13', true])
conferir('obra 2: só frente da obra 2 no diário', o2dia.frentes.every((f) => f.obra_id === 'o2'), true)
conferir('obra 2: dia sem diário abre em branco', (await dados.diarioDoDia('2026-10-12')).data.existente, null)

// Cliente: só o painel, sem empreiteiro e sem serviço.
await dados.entrarComo('u4')
dados.definirContexto({ obraId: 'o1' })
conferir('cliente não lista frentes', (await dados.listarFrentesEmRisco()).erro, 'Sem permissão.')
const painel = (await dados.painelCliente()).data
conferir('cliente vê só fotos liberadas da semana', ids(painel.fotos), ['p10', 'p5', 'p7', 'p8'])
conferir('foto do cliente não traz frente nem autor', Object.keys(painel.fotos[0]).sort(), ['ambiente', 'id', 'tirada_em'])
conferir('cliente vê a data prometida', painel.data_entrega, '2027-03-15')

// Logo da empresa: só o engenheiro troca, e só imagem.
conferir('cliente não troca o logo', (await dados.salvarLogo('data:image/png;base64,AAAA')).erro, 'Só o engenheiro troca o logo.')
await dados.entrarComo('u1')
conferir('arquivo que não é imagem é recusado', (await dados.salvarLogo('data:text/html;base64,AAAA')).erro, 'Escolha uma imagem PNG, JPG, WebP ou SVG.')
conferir('imagem gigante é recusada', (await dados.salvarLogo(`data:image/png;base64,${'A'.repeat(400_001)}`)).erro, 'A imagem ficou grande demais. Tente uma versão menor do logo.')

// Pendente: nada.
await dados.entrarComo('u5')
conferir('pendente não tem obra', (await dados.listarMinhasObras()).data.length, 0)

console.log(`${ok}/${tot} — multi-obra`)
process.exit(ok === tot ? 0 : 1)
