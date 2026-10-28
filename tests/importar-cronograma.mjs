// Importar cronograma por planilha: a leitura (lib/planilha.js), a conferência
// (lib/importarCronograma.js) e a gravação por obra (lib/dados.js).
import * as XLSX from 'xlsx'
import {
  codigosNaEap, compararCodigos, conferirCronograma, extrairLinhas, isoParaSerial, lerCsv, lerData, lerDuracao, normalizarItem, serialParaIso,
} from '../src/lib/importarCronograma.js'
import { gerarModeloXlsx, lerArquivo, textoDoCsv } from '../src/lib/planilha.js'
import { calendarioDaObra, fimPelaDuracao } from '../src/lib/planejamento.js'
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const cal = calendarioDaObra(undefined, []) // segunda a sábado, sem feriado
const L = (n, item, titulo, inicio, fim, duracao = '') => ({ n, item, titulo, inicio, fim, duracao })

// ── código da coluna ITEM ───────────────────────────────────────────────────
conferir('código: 1.10 continua 1.10; 1.0 vira 1; zero à esquerda e vírgula', ['1', '1.10', '1.0', '1.0.0', ' 2.01 ', '1,2'].map(normalizarItem),
  ['1', '1.10', '1', '1', '2.1', '1.2'])
conferir('código inválido', ['x.1', '1..2', '0', '1.0.2', '', 'A'].map(normalizarItem), [null, null, null, null, null, null])
conferir('ordem pelos códigos (1.10 depois de 1.9)', ['2', '1.10', '1.9', '1', '1.1.1', '1.1'].sort(compararCodigos), ['1', '1.1', '1.1.1', '1.9', '1.10', '2'])

// ── datas e duração ─────────────────────────────────────────────────────────
conferir('data do Excel pelo número de série, sem fuso', [serialParaIso(46027), serialParaIso(46315.75), serialParaIso(0, true), isoParaSerial('2026-10-20')],
  ['2026-01-05', '2026-10-20', '1904-01-01', 46315])
conferir('data em texto', ['05/01/2026', '5/1/26', '2026-01-05', '31/02/2026', '13/13/2026', 'amanhã', ''].map(lerData),
  ['2026-01-05', '2026-01-05', '2026-01-05', null, null, null, null])
conferir('duração', [lerDuracao('5'), lerDuracao('5 dias'), lerDuracao('7,0'), lerDuracao('')], [5, 5, 7, null])
conferir('duração que não é número', Number.isNaN(lerDuracao('uma semana')), true)
conferir('término pela duração (dias úteis; domingo e feriado fora)', [
  fimPelaDuracao('2026-11-09', 3, cal), fimPelaDuracao('2026-10-25', 1, cal), fimPelaDuracao('2026-10-31', 2, cal),
  fimPelaDuracao('2026-10-31', 2, calendarioDaObra(undefined, [{ data: '2026-11-02' }])),
], ['2026-11-11', '2026-10-26', '2026-11-02', '2026-11-03'])

// ── CSV sem biblioteca ──────────────────────────────────────────────────────
conferir('CSV do Excel brasileiro (;), com aspas e BOM', lerCsv('' + String.fromCharCode(0xfeff) + 'ITEM;Atividade\r\n1;"Demolição; parede"\n2;"Diz ""oi"""'),
  [['ITEM', 'Atividade'], ['1', 'Demolição; parede'], ['2', 'Diz "oi"']])
conferir('CSV com vírgula', lerCsv('a,b\n1,2\n'), [['a', 'b'], ['1', '2']])
conferir('CSV em UTF-8 e em Windows-1252 (ANSI)', [textoDoCsv(new TextEncoder().encode('Término')), textoDoCsv(Uint8Array.from([0x54, 0xE9, 0x72, 0x6D, 0x69, 0x6E, 0x6F]))],
  ['Término', 'Término'])

// ── da planilha às linhas ───────────────────────────────────────────────────
const matrizCsv = (texto) => lerCsv(texto).map((l) => l.map((t) => ({ texto: t, serial: null })))
const comTitulo = extrairLinhas(matrizCsv('Cronograma da obra\n\nITEM;Atividade;Início;Término;Duração (Dias)\n1;Demolição;03/11/2026;07/11/2026;5\n;;;;\n1.1;Retirada;03/11/2026;;2'))
conferir('acha o cabeçalho abaixo do título e pula linha vazia', comTitulo.linhas,
  [L(4, '1', 'Demolição', '03/11/2026', '07/11/2026', '5'), L(6, '1.1', 'Retirada', '03/11/2026', '', '2')])
conferir('sem cabeçalho, avisa o que falta', extrairLinhas(matrizCsv('Nome;Data\nx;y')).erro,
  'Não achei o cabeçalho. A planilha precisa das colunas ITEM, Atividade, Início, Término (como no modelo).')
conferir('só o cabeçalho', extrairLinhas(matrizCsv('ITEM;Atividade;Início;Término')).erro, 'A planilha não tem nenhuma atividade abaixo do cabeçalho.')

// ── conferência ─────────────────────────────────────────────────────────────
const boa = conferirCronograma([
  L(2, '1', 'Demolição', '03/11/2026', '07/11/2026', '5'),
  L(3, '2', 'Hidráulica', '', ''),
  L(4, '2.1', 'Água fria', '09/11/2026', '', '3'),
  L(5, '2.10', 'Esgoto', '12/11/2026', '14/11/2026'),
  L(6, '2.2', 'Gás', '16/11/2026', '17/11/2026', '9'),
], cal)
conferir('ordena pelos códigos e monta o nível', boa.itens.map((i) => [i.codigo, i.nivel, i.paiCodigo]),
  [['1', 0, null], ['2', 0, null], ['2.1', 1, '2'], ['2.2', 1, '2'], ['2.10', 1, '2']])
conferir('sem erros', boa.erros, 0)
conferir('término em branco sai da duração; duração em branco sai das datas', boa.itens.slice(2).map((i) => [i.codigo, i.fim, i.duracao]),
  [['2.1', '2026-11-11', 3], ['2.2', '2026-11-17', 2], ['2.10', '2026-11-14', 3]])
conferir('grupo sem datas pega as das subatividades', [boa.itens[1].ehGrupo, boa.itens[1].inicio, boa.itens[1].fim, boa.itens[1].duracao], [true, '2026-11-09', '2026-11-17', 8])
conferir('duração diferente das datas é só aviso', [boa.itens[3].avisos, boa.itens[3].erros],
  [['A planilha diz 9 dias; pelas datas são 2 dias úteis. Vale o que está nas datas.'], []])
conferir('grupo pode ir fundo (1.1.1)', conferirCronograma([L(2, '1', 'A', '', ''), L(3, '1.1', 'B', '', ''), L(4, '1.1.1', 'C', '02/11/2026', '03/11/2026')], cal).itens.map((i) => [i.codigo, i.inicio]),
  [['1', '2026-11-02'], ['1.1', '2026-11-02'], ['1.1.1', '2026-11-02']])

const ruim = conferirCronograma([
  L(2, '3.1', 'Órfão', '01/12/2026', '02/12/2026'),
  L(3, '4', '', '31/02/2026', '01/12/2026'),
  L(4, '5', 'Invertida', '10/12/2026', '01/12/2026'),
  L(5, '6', 'A', '01/12/2026', '02/12/2026'),
  L(6, '6.0', 'B', '01/12/2026', '02/12/2026'),
  L(7, 'x.1', 'C', '01/12/2026', '02/12/2026'),
  L(8, '7', 'Sem fim', '01/12/2026', ''),
  L(9, '8', 'Grupo vazio', '', ''),
  L(10, '8.1', 'Filha sem datas', '', ''),
], cal)
const errosDa = (n) => ruim.itens.find((i) => i.n === n).erros
conferir('código órfão', errosDa(2), ['Falta o item 3, que seria o pai deste.'])
conferir('sem nome e data inválida', errosDa(3), ['Atividade sem nome.', 'Data de início inválida: "31/02/2026". Use DD/MM/AAAA.'])
conferir('término antes do início', errosDa(4), ['O término está antes do início.'])
conferir('6 e 6.0 são o mesmo código: repetido', [errosDa(5), errosDa(6)], [['Código repetido: o 6 aparece em mais de uma linha.'], ['Código repetido: o 6 aparece em mais de uma linha.']])
// Teste no navegador, 21/10: grupo com início inválido pegava o início da filha e acusava "término antes do início" também.
conferir('grupo com data inválida acusa só a data', conferirCronograma([L(2, '3', 'Pintura', '31/02/2026', '05/12/2026'), L(3, '3.1', 'Fachada', '10/12/2026', '11/12/2026')], cal).itens[0].erros,
  ['Data de início inválida: "31/02/2026". Use DD/MM/AAAA.'])
// Revisão de 21/10: a conferência mostrava as datas do grupo da planilha, mas a EAP usa as das filhas.
const grupoComDatas = conferirCronograma([L(2, '2', 'Hidráulica', '01/11/2026', '30/11/2026'), L(3, '2.1', 'Água', '03/11/2026', '20/11/2026')], cal).itens[0]
conferir('grupo com datas próprias: vale o das filhas, com aviso', [grupoComDatas.inicio, grupoComDatas.fim, grupoComDatas.erros, grupoComDatas.avisos],
  ['2026-11-03', '2026-11-20', [], ['Na EAP o grupo vale de 03/11/2026 a 20/11/2026: as datas de um grupo saem das subatividades.']])
// Revisão de 21/10: a conferência mostrava o código da planilha, não o que fica na EAP.
const comLacuna = conferirCronograma([L(2, '1', 'A', '02/11/2026', '03/11/2026'), L(3, '3', 'B', '', ''), L(4, '3.2', 'C', '04/11/2026', '05/11/2026'), L(5, '3.2.5', 'D', '04/11/2026', '05/11/2026')], cal)
conferir('código na EAP: lacuna some e, ao adicionar, continua depois das atuais', [[...codigosNaEap(comLacuna.itens)], [...codigosNaEap(comLacuna.itens, 5)]],
  [[[2, '1'], [3, '2'], [4, '2.1'], [5, '2.1.1']], [[2, '6'], [3, '7'], [4, '7.1'], [5, '7.1.1']]])
conferir('linha com erro não ganha código na EAP', [...codigosNaEap(conferirCronograma([L(2, '1', '', '02/11/2026', '03/11/2026')], cal).itens)], [])
conferir('código inválido', errosDa(7), ['Código inválido: "x.1". Use números separados por ponto (1, 1.1, 1.1.1).'])
conferir('sem término e sem duração', errosDa(8), ['Falta a data de término (ou a duração).'])
conferir('grupo sem datas e filha sem datas', [errosDa(9), errosDa(10)],
  [['Grupo sem datas e sem subatividades com datas.'], ['Falta a data de início.', 'Falta a data de término (ou a duração).']])
conferir('inválido vai para o fim, na ordem da planilha', ruim.itens.map((i) => i.codigo ?? `#${i.n}`), ['3.1', '4', '5', '6', '6', '7', '8', '8.1', '#7'])

// ── arquivo de verdade (.xlsx e .csv) ───────────────────────────────────────
const modelo = await gerarModeloXlsx('2026-10-20')
const wbModelo = XLSX.read(modelo, { type: 'array', cellNF: true })
conferir('modelo: ITEM sai como TEXTO (formato @), também nas linhas em branco', [wbModelo.Sheets.Cronograma.A3.t, wbModelo.Sheets.Cronograma.A3.z, wbModelo.Sheets.Cronograma.A50.z],
  ['s', '@', '@'])
conferir('modelo: abas e cabeçalho', [wbModelo.SheetNames, ['A1', 'B1', 'C1', 'D1', 'E1'].map((c) => wbModelo.Sheets.Cronograma[c].v)],
  [['Cronograma', 'Como preencher'], ['ITEM', 'Atividade', 'Início', 'Término', 'Duração (Dias)']])
const lido = await lerArquivo(modelo, 'cronograma-modelo.xlsx')
const doModelo = conferirCronograma(extrairLinhas(lido.matriz, lido).linhas, cal)
conferir('o modelo baixado volta sem erro nem aviso: 1, 2, 2.1, 2.2, nada começa no domingo',
  [doModelo.erros, doModelo.itens.map((i) => [i.codigo, i.inicio, i.fim, i.avisos.length])],
  [0, [['1', '2026-10-20', '2026-10-24', 0], ['2', '2026-10-26', '2026-11-10', 0], ['2.1', '2026-10-26', '2026-11-03', 0], ['2.2', '2026-11-04', '2026-11-10', 0]]])
// Com o feriado de Finados (02/11) no calendário da obra, o exemplo já sai com as durações certas.
const calFinados = calendarioDaObra(undefined, [{ data: '2026-11-02' }])
const comFeriado = await lerArquivo(await gerarModeloXlsx('2026-10-20', calFinados), 'modelo.xlsx')
const doModeloFeriado = conferirCronograma(extrairLinhas(comFeriado.matriz, comFeriado).linhas, calFinados)
conferir('modelo no calendário da obra: sem aviso de duração', [doModeloFeriado.erros, doModeloFeriado.itens.map((i) => [i.codigo, i.fim, i.avisos.length])],
  [0, [['1', '2026-10-24', 0], ['2', '2026-11-11', 0], ['2.1', '2026-11-04', 0], ['2.2', '2026-11-11', 0]]])

// ITEM digitado como número e formatado "0.00": o valor é 1.1, o texto é 1.10.
const ws = { '!ref': 'A1:D2', A1: { t: 's', v: 'ITEM' }, B1: { t: 's', v: 'Atividade' }, C1: { t: 's', v: 'Início' }, D1: { t: 's', v: 'Término' },
  A2: { t: 'n', v: 1.1, z: '0.00' }, B2: { t: 's', v: 'X' }, C2: { t: 'n', v: 46315, z: 'm/d/yy' }, D2: { t: 's', v: '21/10/2026' } }
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'x')
const numerico = await lerArquivo(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }), 'velha.xlsx')
conferir('ITEM lido pelo texto da célula (1.10, não 1.1); data em formato americano vale pelo número', extrairLinhas(numerico.matriz, numerico).linhas,
  [L(2, '1.10', 'X', '20/10/2026', '21/10/2026')])
const csv = await lerArquivo(new TextEncoder().encode('ITEM;Atividade;Início;Término\n1;Demolição;03/11/2026;04/11/2026'), 'cron.CSV')
conferir('CSV pelo mesmo caminho', extrairLinhas(csv.matriz, csv).linhas, [L(2, '1', 'Demolição', '03/11/2026', '04/11/2026')])
conferir('outro tipo de arquivo é recusado (inclusive .xls antigo)', [(await lerArquivo(new Uint8Array(3), 'cronograma.pdf')).erro, (await lerArquivo(new Uint8Array(3), 'velho.xls')).erro],
  ['Use um arquivo .xlsx ou .csv.', 'Use um arquivo .xlsx ou .csv.'])
// Revisão de 21/10: qualquer número na coluna de data virava data do Excel, sem erro.
const numerosSoltos = [[{ texto: 'ITEM' }, { texto: 'Atividade' }, { texto: 'Início' }, { texto: 'Término' }],
  [{ texto: '1' }, { texto: 'X' }, { texto: '45', serial: 45 }, { texto: '20102026', serial: 20102026 }]]
const soltos = conferirCronograma(extrairLinhas(numerosSoltos).linhas, cal).itens[0].erros
conferir('número que não é data do Excel vira erro de data', soltos, ['Data de início inválida: "45". Use DD/MM/AAAA.', 'Data de término inválida: "20102026". Use DD/MM/AAAA.'])
const falso = await lerArquivo(new TextEncoder().encode('não sou planilha'), 'falso.xlsx')
conferir('arquivo que não é planilha termina em "não achei o cabeçalho"', (falso.erro || extrairLinhas(falso.matriz, falso).erro).startsWith('Não achei o cabeçalho'), true)

// ── gravação por obra ───────────────────────────────────────────────────────
const linhasModelo = extrairLinhas(lido.matriz, lido).linhas
const ativas = async () => (await dados.listarPlanejamento()).data.itens.filter((i) => !i.arquivada)
await dados.entrarComo('u1')
dados.definirContexto({ obraId: 'o2' })
conferir('com atividades na obra, precisa escolher adicionar ou substituir', (await dados.importarCronograma(linhasModelo)).erro,
  'Escolha se as atividades entram junto com as atuais ou no lugar delas.')
conferir('com erro, nada é criado', [(await dados.importarCronograma([L(2, '2.1', 'Órfão', '01/12/2026', '02/12/2026')], 'adicionar')).erro, (await ativas()).length],
  ['Corrija os erros da conferência antes de importar.', 2])
conferir('adicionar: entram depois das atuais, renumeradas', [(await dados.importarCronograma(linhasModelo, 'adicionar')).data, (await ativas()).map((i) => i.codigo)],
  [{ criadas: 4, arquivadas: 0 }, ['1', '1.1', '2', '3', '3.1', '3.2']])
const importada = (await ativas()).find((i) => i.codigo === '3.1')
conferir('importada nasce A fazer, 0%, ligada ao pai e com as datas (alimenta o Longo prazo)',
  [importada.titulo, importada.status, importada.progresso, importada.inicio, importada.fim, typeof importada.previsto],
  ['Tubulação de água fria e quente', 'A fazer', 0, '2026-10-26', '2026-11-03', 'number'])
conferir('substituir: as atuais vão para Arquivadas, nada se apaga', [(await dados.importarCronograma(linhasModelo, 'substituir')).data, (await ativas()).map((i) => i.codigo),
  (await dados.listarPlanejamento()).data.itens.filter((i) => i.arquivada).length], [{ criadas: 4, arquivadas: 6 }, ['1', '2', '2.1', '2.2'], 6])
dados.definirContexto({ obraId: 'o1' })
conferir('a outra obra não foi tocada', (await dados.listarPlanejamento()).data.itens.length, 21)
await dados.entrarComo('u3')
dados.definirContexto({ obraId: 'o1' })
conferir('arquiteta não importa', (await dados.importarCronograma(linhasModelo, 'adicionar')).erro, 'Só o engenheiro importa cronograma.')
await dados.entrarComo('u2')
dados.definirContexto({ obraId: 'o1' })
conferir('mestre não importa', (await dados.importarCronograma(linhasModelo, 'adicionar')).erro, 'Só o engenheiro importa cronograma.')

console.log(`${ok}/${tot} — importar-cronograma`)
process.exit(ok === tot ? 0 : 1)
