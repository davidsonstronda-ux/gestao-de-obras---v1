// Planejamento (Last Planner + EAP): a regra em src/lib/planejamento.js e o
// filtro por obra/permissão em src/lib/dados.js.
import {
  atrasDoPrevisto, calendarioDaObra, diasUteisEntre, lerPercentual, montarEap, montarEscala, paisPossiveis, paiValido, posicaoDoDia,
  posicaoNaEscala, progressoPrevisto, resumoObra, segundaDaSemana, trocarOrdem, validarAtividade, validarDiasSemana,
  validarFeriado, visiveisNaEap, moverPrazo, nomesUnicos, podeVoltarSemana, quadroLookahead, resumoLookahead,
  semanasDoLookahead, validarRestricao, atividadesDaSemana, colunaAnterior, colunaNaSemana, mudancaDeStatus, podeMarcarNaoRealizado,
  faixaPpc, podeMoverNaSemana, ppcDaSemana, proximaColuna, resumoSubtarefas, semanaDe, semanaVizinha, tempoDaSemana, validarCausa,
} from '../src/lib/planejamento.js'
import { mockAtividades, mockCalendarios, mockFeriados, mockRestricoes, mockSubtarefas } from '../src/lib/mockData.js'
import * as dados from '../src/lib/dados.js'
import { abasDoPlanejamento, itensDaBarra } from '../src/lib/permissoes.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const porId = (itens) => Object.fromEntries(itens.map((i) => [i.id, i]))

// ── calendário ──────────────────────────────────────────────────────────────
const cal1 = calendarioDaObra(mockCalendarios[0], mockFeriados.filter((f) => f.obra_id === 'o1'))
const padrao = calendarioDaObra(undefined, [])
conferir('obra sem calendário trabalha de segunda a sábado', padrao.dias_semana, [1, 2, 3, 4, 5, 6])
conferir('semana de 19/10 a 25/10 tem 6 dias úteis (domingo fora)', diasUteisEntre('2026-10-19', '2026-10-25', cal1), 6)
conferir('feriado de Finados (02/11) não conta', [diasUteisEntre('2026-11-01', '2026-11-07', cal1), diasUteisEntre('2026-11-01', '2026-11-07', padrao)], [5, 6])
conferir('fim antes do início = 0', diasUteisEntre('2026-10-10', '2026-10-01', cal1), 0)
conferir('início e fim no mesmo dia útil = 1', diasUteisEntre('2026-10-20', '2026-10-20', cal1), 1)
conferir('pelo menos um dia de trabalho', [validarDiasSemana([]), validarDiasSemana([1, 7]), validarDiasSemana([1, 2])],
  ['Escolha pelo menos um dia de trabalho.', 'Dia da semana inválido.', null])
conferir('feriado repetido é recusado', validarFeriado({ data: '2026-11-02', nome: 'De novo' }, mockFeriados).data, 'Já existe um feriado nesta data.')
conferir('feriado sem nome é recusado', Object.keys(validarFeriado({ data: '2026-12-31', nome: ' ' }, mockFeriados)), ['nome'])

// ── árvore e código ─────────────────────────────────────────────────────────
const o1 = mockAtividades.filter((a) => a.obra_id === 'o1')
const eap = montarEap(o1, cal1)
const e = porId(eap)
conferir('código automático pela ordem', eap.map((i) => i.codigo),
  ['1', '2', '3', '3.1', '3.2', '4', '4.1', '4.2', '5', '5.1', '5.2', '5.3', '6', '6.1', '6.2', '6.3', '7', '7.1', '7.2', '7.3', null])
conferir('nível de cada linha', [e.at1.nivel, e.at10.nivel], [0, 1])
conferir('grupo pega início e fim das filhas', [e.at9.ehGrupo, e.at9.inicio, e.at9.fim], [true, '2026-09-29', '2026-11-07'])
conferir('folha não é grupo', e.at12.ehGrupo, false)
conferir('arquivada fica sem código e fora por padrão', [e.at13.codigo, visiveisNaEap(eap, false).some((i) => i.id === 'at13'), visiveisNaEap(eap, true).length], [null, false, 21])
conferir('grupo conta as subatividades', e.at9.subatividades, 3)

const cal7 = { dias_semana: [0, 1, 2, 3, 4, 5, 6], feriados: [] }
const peso = montarEap([
  { id: 'g', pai_id: null, ordem: 1, titulo: 'G', inicio: '2026-01-01', fim: '2026-01-01', progresso: 0 },
  { id: 'a', pai_id: 'g', ordem: 1, titulo: 'A', inicio: '2026-01-01', fim: '2026-01-10', progresso: 100 },
  { id: 'b', pai_id: 'g', ordem: 2, titulo: 'B', inicio: '2026-01-11', fim: '2026-01-30', progresso: 40 },
  { id: 'c', pai_id: 'g', ordem: 3, titulo: 'C', inicio: '2026-02-01', fim: '2026-02-28', progresso: 0, arquivada: true },
], cal7)
conferir('% do grupo pesado pela duração, sem a arquivada', [peso[0].progresso, peso[0].duracao, peso[0].fim], [60, 30, '2026-01-30'])
conferir('filha de grupo arquivado também fica arquivada', montarEap([
  { id: 'g', pai_id: null, ordem: 1, titulo: 'G', inicio: '2026-01-01', fim: '2026-01-02', progresso: 0, arquivada: true },
  { id: 'a', pai_id: 'g', ordem: 1, titulo: 'A', inicio: '2026-01-01', fim: '2026-01-02', progresso: 0 },
], cal7).map((i) => [i.codigo, i.arquivada, i.ehGrupo]), [[null, true, true], [null, true, false]])
// Bug de 21/10: grupo arquivado aparecia com 0% e as datas gravadas, em vez do resumo das filhas.
const grupoArquivado = montarEap([
  { id: 'g', pai_id: null, ordem: 1, titulo: 'G', inicio: '2026-03-01', fim: '2026-03-01', progresso: 0, arquivada: true },
  { id: 'a', pai_id: 'g', ordem: 1, titulo: 'A', inicio: '2026-01-01', fim: '2026-01-10', progresso: 50, arquivada: true },
], cal7)[0]
conferir('grupo arquivado resume as filhas arquivadas', [grupoArquivado.progresso, grupoArquivado.inicio, grupoArquivado.fim], [50, '2026-01-01', '2026-01-10'])

conferir('não dá para pôr a atividade dentro dela mesma nem de uma filha', paisPossiveis(eap, o1, 'at9').map((i) => i.id),
  ['at1', 'at2', 'at3', 'at4', 'at5', 'at6', 'at7', 'at8', 'at30', 'at31', 'at32', 'at33', 'at34', 'at35', 'at36', 'at37'])
conferir('pai válido', [paiValido(o1, 'at9', 'at10'), paiValido(o1, 'at9', 'at9'), paiValido(o1, 'at12', 'at13'), paiValido(o1, 'at12', 'at3'), paiValido(o1, null, null)],
  [false, false, false, true, true])
conferir('subir troca com a irmã de cima', trocarOrdem(o1, 'at9', -1), [{ id: 'at9', ordem: 4 }, { id: 'at6', ordem: 5 }])
conferir('descer pula a arquivada: já é a última', trocarOrdem(o1, 'at34', 1), null)
conferir('primeira não sobe', trocarOrdem(o1, 'at4', -1), null)

conferir('% aceita 0 a 100, vazio é 0', [lerPercentual('45'), lerPercentual(''), lerPercentual('100')], [45, 0, 100])
conferir('% recusa acima de 100, decimal e texto', [lerPercentual('101'), lerPercentual('4,5'), lerPercentual('abc')], [null, null, null])
conferir('atividade sem título, sem fim e com fim antes do início', [
  Object.keys(validarAtividade({ titulo: '', inicio: '2026-10-20', fim: '2026-10-21', progresso: '' })),
  validarAtividade({ titulo: 'X', inicio: '2026-10-20', fim: '', progresso: '' }).fim,
  validarAtividade({ titulo: 'X', inicio: '2026-10-20', fim: '2026-10-19', progresso: '' }).fim,
], [['titulo'], 'Escolha a data de fim.', 'O fim não pode ser antes do início.'])
conferir('grupo só exige título', validarAtividade({ titulo: 'G', inicio: '', fim: '', progresso: 'x' }, { ehGrupo: true }), {})

// ── Longo prazo: previsto × real e escala ───────────────────────────────────
// Revisão de 21/10: hoje ainda não passou; antes contava como dia já passado.
conferir('previsto = dias úteis já passados (antes de hoje) ÷ duração', progressoPrevisto('2026-01-01', '2026-01-10', '2026-01-05', cal7), 40)
conferir('previsto: 0 até o dia do início, 90 no último dia, 100 depois do fim', [
  progressoPrevisto('2026-01-01', '2026-01-10', '2025-12-31', cal7), progressoPrevisto('2026-01-01', '2026-01-10', '2026-01-01', cal7),
  progressoPrevisto('2026-01-01', '2026-01-10', '2026-01-10', cal7), progressoPrevisto('2026-01-01', '2026-01-10', '2026-01-11', cal7),
], [0, 0, 90, 100])
conferir('feriado no meio não conta no previsto', progressoPrevisto('2026-01-01', '2026-01-10', '2026-01-05', { dias_semana: cal7.dias_semana, feriados: ['2026-01-03'] }), 33)
const comHoje = montarEap([
  { id: 'g', pai_id: null, ordem: 1, titulo: 'G', inicio: '2026-01-01', fim: '2026-01-01', progresso: 0 },
  { id: 'a', pai_id: 'g', ordem: 1, titulo: 'A', inicio: '2026-01-01', fim: '2026-01-10', progresso: 100 },
  { id: 'b', pai_id: 'g', ordem: 2, titulo: 'B', inicio: '2026-01-11', fim: '2026-01-30', progresso: 40 },
], cal7, '2026-01-15')
conferir('previsto do grupo pesado pela duração', comHoje.map((i) => i.previsto), [47, 100, 20])
conferir('resumo da obra: real, previsto e diferença', resumoObra(comHoje), { inicio: '2026-01-01', fim: '2026-01-30', real: 60, previsto: 47, diferenca: 13 })
conferir('sem hoje, não calcula previsto', 'previsto' in eap[0], false)
conferir('atrás do previsto só quando realizou menos', comHoje.map((i) => atrasDoPrevisto(i)), [false, false, false])
conferir('atrás do previsto', atrasDoPrevisto({ progresso: 30, previsto: 76 }), true)

conferir('segunda-feira da semana (domingo volta 6 dias)', [segundaDaSemana('2026-10-25'), segundaDaSemana('2026-10-19'), segundaDaSemana('2026-10-21')],
  ['2026-10-19', '2026-10-19', '2026-10-19'])
const semanas = montarEscala([{ inicio: '2026-10-07', fim: '2026-10-20' }], 'Semana')
conferir('escala por semana começa na segunda e fecha no domingo',
  [semanas.colunas.map((c) => c.rotulo), semanas.inicio, semanas.fim, semanas.total], [['05/10', '12/10', '19/10'], '2026-10-05', '2026-10-25', 21])
const pos = posicaoNaEscala('2026-10-07', '2026-10-20', semanas)
conferir('barra: começo e largura em %', [pos.esquerda.toFixed(2), pos.largura.toFixed(2)], ['9.52', '66.67'])
conferir('linha de hoje no meio do dia; fora da escala, nada', [posicaoDoDia('2026-10-20', semanas).toFixed(2), posicaoDoDia('2026-11-01', semanas)], ['73.81', null])
const meses = montarEscala([{ inicio: '2026-09-15', fim: '2026-11-03' }, { inicio: '2026-10-01', fim: '2026-10-02', arquivada: true }], 'Mês')
conferir('escala por mês, com os dias de cada mês',
  [meses.colunas.map((c) => [c.rotulo, c.dias]), meses.inicio, meses.fim, meses.total], [[['set/26', 30], ['out/26', 31], ['nov/26', 30]], '2026-09-01', '2026-11-30', 91])
conferir('virada de ano', montarEscala([{ inicio: '2026-12-20', fim: '2027-01-05' }], 'Mês').colunas.map((c) => c.rotulo), ['dez/26', 'jan/27'])
conferir('arquivada não estica a escala; tudo arquivado, sem escala',
  [montarEscala([{ inicio: '2026-10-07', fim: '2026-10-08' }, { inicio: '2027-05-01', fim: '2027-05-02', arquivada: true }], 'Semana').colunas.length,
    montarEscala([{ inicio: '2026-10-07', fim: '2026-10-08', arquivada: true }], 'Semana')], [1, null])

// ── Médio prazo: lookahead de restrições ────────────────────────────────────
const HOJE = '2026-10-20'
conferir('semanas da janela, de segunda a domingo', semanasDoLookahead(HOJE, 3).map((s) => [s.inicio, s.fim, s.atual]),
  [['2026-10-19', '2026-10-25', true], ['2026-10-26', '2026-11-01', false], ['2026-11-02', '2026-11-08', false]])
const restr1 = mockRestricoes.filter((r) => r.obra_id === 'o1').map((r) => ({ ...r, atividade: { arquivada: false } }))
const idsPorSemana = (q) => q.semanas.map((s) => s.restricoes.map((r) => r.id))
const q4 = quadroLookahead(restr1, { hoje: HOJE })
conferir('4 semanas: cada uma na semana do prazo; vencida no topo de "esta semana"', idsPorSemana(q4), [['rs1', 'rs2'], [], [], []])
conferir('vencida marcada; a janela fecha no domingo da 4ª semana', [q4.semanas[0].restricoes[0].vencida, q4.depois, q4.fimJanela], [true, 0, '2026-11-15'])
conferir('resolvida só com o filtro, no fim da semana', idsPorSemana(quadroLookahead(restr1, { hoje: HOJE, mostrarResolvidas: true }))[0], ['rs1', 'rs2', 'rs3'])
conferir('filtro por responsável', quadroLookahead(restr1, { hoje: HOJE, responsavel: 'Elétrica Ramos' }).semanas.map((s) => s.restricoes.length), [1, 0, 0, 0])
// Duas restrições de mentira, longe: 16/11 (5ª semana) e 30/11 (fora até de 6 semanas).
const longe = [...restr1, { ...restr1[1], id: 'x', prazo: '2026-11-16' }, { ...restr1[1], id: 'y', prazo: '2026-11-30' }]
const q6 = quadroLookahead(longe, { hoje: HOJE, semanas: 6 })
conferir('o que passa da janela é contado; com 6 semanas, 16/11 entra e 30/11 fica de fora',
  [quadroLookahead(longe, { hoje: HOJE }).depois, q6.semanas.length, q6.semanas[4].restricoes.map((r) => r.id), q6.depois], [2, 6, ['x'], 1])
conferir('restrição de atividade arquivada some', quadroLookahead([{ ...restr1[0], atividade: { arquivada: true } }], { hoje: HOJE }).semanas[0].restricoes, [])
conferir('resumo: 2 abertas, 1 vencida, prontas 4 de 6 (a atrasada conta)', resumoLookahead(eap, restr1, { hoje: HOJE }),
  { abertas: 2, vencidas: 1, prontas: 4, naJanela: 6 })
conferir('mover anda 7 dias', [moverPrazo('2026-10-22', 1), moverPrazo('2026-10-29', -1)], ['2026-10-29', '2026-10-22'])
conferir('não volta para antes desta semana', [podeVoltarSemana('2026-10-27', HOJE), podeVoltarSemana('2026-10-25', HOJE), podeVoltarSemana('2026-10-10', HOJE)], [true, false, false])
const restricaoOk = { descricao: 'Falta cimento', tipo: 'Material', atividade_id: 'at4', prazo: HOJE, responsavel: 'Davidson' }
conferir('restrição completa passa', validarRestricao(restricaoOk, HOJE), {})
conferir('restrição nova não nasce vencida; a já gravada pode estar', [validarRestricao({ ...restricaoOk, prazo: '2026-10-19' }, HOJE).prazo, validarRestricao({ ...restricaoOk, id: 'rs2', prazo: '2026-10-17' }, HOJE)],
  ['O prazo não pode ser antes de hoje.', {}])
conferir('tipo fora da lista e campos vazios', Object.keys(validarRestricao({ tipo: 'Clima' }, HOJE)), ['descricao', 'tipo', 'atividade_id', 'prazo', 'responsavel'])
conferir('nomes sem repetição, em ordem', nomesUnicos([' Bia', 'Ana', 'Bia', '', null]), ['Ana', 'Bia'])

// ── Curto prazo: semana, Kanban e PPC ───────────────────────────────────────
const sAtual = semanaDe(HOJE)
conferir('semana de hoje e vizinhas', [sAtual, semanaVizinha(sAtual, -1).inicio, semanaVizinha(sAtual, 1).fim], [{ inicio: '2026-10-19', fim: '2026-10-25' }, '2026-10-12', '2026-11-01'])
conferir('passada, atual, futura', [tempoDaSemana(semanaVizinha(sAtual, -1), HOJE), tempoDaSemana(sAtual, HOJE), tempoDaSemana(semanaVizinha(sAtual, 1), HOJE)], ['passada', 'atual', 'futura'])
const daSemana = atividadesDaSemana(eap, sAtual)
conferir('entram as que cruzam a semana e as acumuladas; concluída antes (demolição) e grupo não', daSemana.map((a) => a.id),
  ['at2', 'at4', 'at5', 'at7', 'at8', 'at10', 'at11', 'at12'])
conferir('o revestimento (fim 17/10) entra como acumulado', daSemana.filter((a) => a.acumulada).map((a) => a.id), ['at11'])
conferir('PPC desta semana: 2 de 8 (reboco e quadro)', ppcDaSemana(daSemana), { concluidas: 2, planejadas: 8, ppc: 25 })
conferir('PPC da semana em que a demolição terminou: 1 de 2 (a elevação das paredes seguia)', ppcDaSemana(atividadesDaSemana(eap, semanaDe('2026-08-26'))), { concluidas: 1, planejadas: 2, ppc: 50 })
conferir('o reboco (concluído em 19/10) aparece em andamento numa semana antiga', atividadesDaSemana(eap, semanaDe('2026-09-16')).find((a) => a.id === 'at2').coluna, 'Em andamento')
conferir('sem planejadas, PPC vazio', ppcDaSemana([]).ppc, null)
conferir('faixa do PPC (meta 80%)', [faixaPpc(80), faixaPpc(79), faixaPpc(50), faixaPpc(49), faixaPpc(null)], ['Bom', 'Regular', 'Regular', 'Baixo', null])
conferir('concluída depois aparece em andamento na semana antiga', colunaNaSemana({ status: 'Concluído', concluida_em: '2026-10-30' }, sAtual), 'Em andamento')
conferir('ordem das colunas', [proximaColuna('A fazer'), proximaColuna('Concluído'), colunaAnterior('A fazer'), colunaAnterior('Concluído')], ['Em andamento', null, null, 'Em andamento'])
conferir('ir para Concluído põe 100% e a data', mudancaDeStatus({ progresso: 40, concluida_em: null }, 'Concluído', HOJE), { status: 'Concluído', concluida_em: HOJE, progresso: 100 })
conferir('sair de Concluído limpa a data e mantém o %', mudancaDeStatus({ progresso: 100, concluida_em: '2026-10-19' }, 'Em andamento', HOJE), { status: 'Em andamento', concluida_em: null, progresso: 100 })
conferir('só move na semana de hoje', [podeMoverNaSemana(sAtual, HOJE), podeMoverNaSemana(semanaVizinha(sAtual, -1), HOJE)], [true, false])
conferir('"não realizado": não em semana futura nem em concluída', [
  podeMarcarNaoRealizado({ coluna: 'A fazer' }, sAtual, HOJE), podeMarcarNaoRealizado({ coluna: 'A fazer' }, semanaVizinha(sAtual, -1), HOJE),
  podeMarcarNaoRealizado({ coluna: 'A fazer' }, semanaVizinha(sAtual, 1), HOJE), podeMarcarNaoRealizado({ coluna: 'Concluído' }, sAtual, HOJE),
], [true, true, false, false])
conferir('causa com os motivos do diário', [validarCausa({ causa: 'Chuva' }), validarCausa({ causa: 'Clima' }), validarCausa({ causa: 'Outro', causa_detalhe: ' ' })],
  [null, 'Escolha a causa.', 'Explique a causa.'])
conferir('resumo das subtarefas', resumoSubtarefas(mockSubtarefas.filter((s) => s.atividade_id === 'at5')), { total: 4, feitas: 2, naoRealizadas: 1 })

// ── camada de dados: obra e permissão ───────────────────────────────────────
await dados.entrarComo('u1')
conferir('sem obra escolhida, nada sai', (await dados.listarPlanejamento()).erro, 'Nenhuma obra selecionada.')
dados.definirContexto({ obraId: 'o2' })
const o2 = (await dados.listarPlanejamento()).data
conferir('obra 2: só as atividades dela', o2.itens.map((i) => [i.id, i.codigo]), [['at20', '1'], ['at21', '1.1']])
conferir('obra 2: calendário padrão, sem feriado', [o2.calendario.dias_semana, o2.calendario.feriados], [[1, 2, 3, 4, 5, 6], []])
conferir('obra 2: só as frentes dela para ligar', o2.frentes.map((f) => f.id), ['f11'])
conferir('obra 2: só a restrição dela', o2.restricoes.map((r) => r.id), ['rs20'])
conferir('obra 2: responsáveis sugeridos só da obra 2', o2.responsaveis, ['Carla', 'Davidson', 'Fundações Base'])
conferir('obra 2 não liga restrição a atividade da obra 1', (await dados.salvarRestricao({ descricao: 'X', tipo: 'Material', atividade_id: 'at3', prazo: '2026-10-20', responsavel: 'Davidson' })).erro,
  'Atividade não encontrada nesta obra.')
conferir('obra 2 não resolve nem move restrição da obra 1', [(await dados.resolverRestricao('rs1', true)).erro, (await dados.moverRestricao('rs1', 1)).erro],
  ['Restrição não encontrada nesta obra.', 'Restrição não encontrada nesta obra.'])
conferir('obra 2: só as subtarefas dela, nenhum "não realizado"', [o2.subtarefas.map((s) => s.id), o2.naoRealizados], [['st20', 'st21'], []])
conferir('obra 2 não move cartão nem marca subtarefa da obra 1', [(await dados.moverNoKanban('at3', 'Concluído')).erro, (await dados.marcarSubtarefa('st1', 'Feita')).erro],
  ['Esta atividade não está na semana de hoje.', 'Subtarefa não encontrada nesta obra.'])
conferir('obra 2 não põe atividade dentro de uma da obra 1', (await dados.salvarAtividade({ titulo: 'X', inicio: '2026-10-20', fim: '2026-10-21', pai_id: 'at5' })).erro,
  'Escolha outra atividade para colocar esta dentro.')
conferir('obra 2 não liga frente da obra 1', (await dados.salvarAtividade({ titulo: 'X', inicio: '2026-10-20', fim: '2026-10-21', frente_id: 'f1' })).erro,
  'Frente não encontrada nesta obra.')
conferir('obra 2 não arquiva atividade da obra 1', (await dados.arquivarAtividade('at5', true)).erro, 'Atividade não encontrada nesta obra.')
conferir('obra 2 não remove feriado da obra 1', (await dados.removerFeriado('fe1')).erro, 'Feriado não encontrado nesta obra.')
await dados.salvarDiasDeTrabalho([5, 1, 2, 3, 4])
await dados.adicionarFeriado({ data: '2026-11-15', nome: 'Proclamação' })
const o2depois = (await dados.listarPlanejamento()).data.calendario
conferir('obra 2 grava o calendário dela', [o2depois.dias_semana, o2depois.feriados.map((f) => f.nome)], [[1, 2, 3, 4, 5], ['Proclamação']])

dados.definirContexto({ obraId: 'o1' })
const o1dados = (await dados.listarPlanejamento()).data
conferir('obra 1 não pegou o calendário da obra 2', [o1dados.calendario.dias_semana, o1dados.calendario.feriados.length], [[1, 2, 3, 4, 5, 6], 3])
conferir('obra 1: 21 atividades, nenhuma da obra 2', [o1dados.itens.length, o1dados.itens.some((i) => i.obra_id !== 'o1')], [21, false])
conferir('a linha traz o nome da frente ligada', porId(o1dados.itens).at5.frente, 'Impermeabilização áreas molhadas')
// Forro: 23 dias úteis de 06 a 31/10, 12 já passados antes de 20/10.
conferir('a lista já vem com o previsto de hoje (20/10)', [porId(o1dados.itens).at10.previsto, porId(o1dados.itens).at1.previsto], [52, 100])

const sub = (await dados.salvarAtividade({ titulo: 'Bancada da cozinha', inicio: '2026-10-20', fim: '2026-10-24', pai_id: 'at12', progresso: '' })).data
const comSub = porId((await dados.listarPlanejamento()).data.itens)
conferir('subatividade nova vira 5.3.1 (3º nível) e o pai vira grupo', [comSub[sub.id].codigo, comSub.at12.ehGrupo, comSub[sub.id].status], ['5.3.1', true, 'A fazer'])
conferir('grupo não tem as datas mexidas pela ficha', (await dados.salvarAtividade({ id: 'at12', titulo: 'Bancadas', pai_id: 'at9', inicio: '2020-01-01', fim: '2020-01-02', progresso: 'x' })).data.inicio, '2026-10-19')
conferir('não põe o grupo dentro da própria filha', (await dados.salvarAtividade({ id: 'at9', titulo: 'Acabamento', pai_id: 'at10' })).erro,
  'Escolha outra atividade para colocar esta dentro.')
conferir('arquivar o grupo leva as 4 subatividades', (await dados.arquivarAtividade('at9', true)).data, 5)
conferir('desarquivar a neta devolve ela e os 2 grupos acima', (await dados.arquivarAtividade(sub.id, false)).data, 3)
const parcial = porId((await dados.listarPlanejamento()).data.itens)
conferir('as irmãs continuam arquivadas', [parcial.at10.arquivada, parcial[sub.id].arquivada, parcial.at9.codigo, parcial[sub.id].codigo], [true, false, '5', '5.1.1'])
conferir('a primeira não sobe', (await dados.moverAtividade('at1', -1)).erro, 'Ela já é a primeira deste nível.')
conferir('calendário sem dia nenhum é recusado', (await dados.salvarDiasDeTrabalho([])).erro, 'Escolha pelo menos um dia de trabalho.')

// Restrições na camada de dados.
const novaRs = await dados.salvarRestricao({ descricao: 'Falta cimento', tipo: 'Material', atividade_id: 'at4', prazo: '2026-10-20', responsavel: ' Davidson ' })
conferir('cria restrição aberta, com o responsável limpo', [novaRs.erro, novaRs.data?.resolvida_em, novaRs.data?.responsavel], [null, null, 'Davidson'])
conferir('não volta a restrição para antes desta semana', (await dados.moverRestricao('rs1', -1)).erro, 'Ela já está nesta semana; não dá para voltar ao passado.')
conferir('vencida que avança vai para hoje + 7', (await dados.moverRestricao('rs1', 1)).data.prazo, '2026-10-27')
conferir('avança e volta uma semana', [(await dados.moverRestricao('rs2', 1)).data.prazo, (await dados.moverRestricao('rs2', -1)).data.prazo], ['2026-10-30', '2026-10-23'])
conferir('resolver grava a data de hoje; reabrir limpa', [(await dados.resolverRestricao('rs2', true)).data.resolvida_em, (await dados.resolverRestricao('rs2', false)).data.resolvida_em], ['2026-10-20', null])
conferir('não liga restrição a atividade arquivada', (await dados.salvarRestricao({ ...restricaoOk, atividade_id: 'at11' })).erro, 'Atividade não encontrada nesta obra.')
// Revisão de 21/10: restrição num grupo não travava nenhuma filha no "prontas".
conferir('não liga restrição a um grupo', (await dados.salvarRestricao({ ...restricaoOk, atividade_id: 'at3' })).erro,
  'Escolha uma atividade sem subatividades: a restrição trava quem executa.')
// Revisão de 21/10: salvar a ficha de uma arquivada a mudava para o nível principal.
conferir('atividade arquivada não se edita', (await dados.salvarAtividade({ id: 'at11', titulo: 'Revestimento', inicio: '2026-09-29', fim: '2026-10-17', progresso: '70' })).erro,
  'Desarquive a atividade antes de mudar.')
const comRs = (await dados.listarPlanejamento()).data
conferir('a restrição vem com o código da atividade', comRs.restricoes.find((r) => r.id === novaRs.data.id).atividade.codigo, '3.1')

await dados.entrarComo('u3')
dados.definirContexto({ obraId: 'o1' })
conferir('arquiteta vê a EAP', (await dados.listarPlanejamento()).erro, null)
conferir('arquiteta não mexe na EAP', (await dados.salvarAtividade({ titulo: 'X', inicio: '2026-10-20', fim: '2026-10-21' })).erro, 'Só o engenheiro monta a EAP.')
conferir('arquiteta não mexe no calendário', (await dados.adicionarFeriado({ data: '2026-12-31', nome: 'Réveillon' })).erro, 'Só o engenheiro muda o calendário.')
conferir('arquiteta vê as restrições mas não mexe', [(await dados.listarPlanejamento()).data.restricoes.length > 0, (await dados.resolverRestricao('rs1', true)).erro],
  [true, 'Só o engenheiro resolve restrição.'])
conferir('arquiteta não mexe na semana', (await dados.moverNoKanban('at3', 'Concluído')).erro, 'Sem permissão para mexer na semana.')

// Mestre: só o Curto prazo.
await dados.entrarComo('u2')
dados.definirContexto({ obraId: 'o1' })
const doMestre = await dados.listarPlanejamento()
conferir('mestre recebe a semana, sem restrição, frente nem feriado', [doMestre.erro, doMestre.data.restricoes, doMestre.data.frentes, doMestre.data.calendario.feriados, doMestre.data.subtarefas.length],
  [null, [], [], [], 9])
conferir('mestre não mexe na EAP', (await dados.salvarAtividade({ titulo: 'X', inicio: '2026-10-20', fim: '2026-10-21' })).erro, 'Só o engenheiro monta a EAP.')
const concluiu = (await dados.moverNoKanban('at4', 'Concluído')).data
conferir('concluir põe 100% e grava a data', [concluiu.status, concluiu.progresso, concluiu.concluida_em], ['Concluído', 100, '2026-10-20'])
conferir('concluída não vira "não realizado"', (await dados.marcarNaoRealizado('at4', '2026-10-19', { causa: 'Chuva' })).erro,
  'Só dá para marcar o que não foi concluído, numa semana que já começou.')
const voltou = (await dados.moverNoKanban('at4', 'Em andamento')).data
conferir('sair de Concluído limpa a data e não mexe no %', [voltou.concluida_em, voltou.progresso], [null, 100])
conferir('"Outro" pede explicação', (await dados.marcarNaoRealizado('at4', '2026-10-20', { causa: 'Outro', causa_detalhe: ' ' })).erro, 'Explique a causa.')
conferir('marca "não realizado" na semana de hoje', (await dados.marcarNaoRealizado('at4', '2026-10-20', { causa: 'Chuva' })).erro, null)
const nrDe = async () => (await dados.listarPlanejamento()).data.naoRealizados.filter((n) => n.atividade_id === 'at4').map((n) => [n.semana, n.causa])
conferir('o "não realizado" fica na segunda da semana', await nrDe(), [['2026-10-19', 'Chuva']])
await dados.moverNoKanban('at4', 'Concluído')
conferir('concluir na semana apaga o "não realizado" dela', await nrDe(), [])
conferir('semana futura não recebe "não realizado"', (await dados.marcarNaoRealizado('at7', '2026-10-26', { causa: 'Chuva' })).erro,
  'Só dá para marcar o que não foi concluído, numa semana que já começou.')
conferir('semana passada recebe', (await dados.marcarNaoRealizado('at7', '2026-10-14', { causa: 'Falta gente' })).erro, null)
conferir('atividade fora da semana de hoje não se move', (await dados.moverNoKanban('at1', 'Em andamento')).erro, 'Esta atividade não está na semana de hoje.')
const sub2 = (await dados.criarSubtarefa('at4', '  Teste de continuidade ')).data
conferir('mestre inclui subtarefa', [sub2.titulo, sub2.situacao], ['Teste de continuidade', 'Pendente'])
conferir('subtarefa não realizada exige causa', (await dados.marcarSubtarefa(sub2.id, 'Não realizado')).erro, 'Escolha a causa.')
conferir('subtarefa não realizada com causa', (await dados.marcarSubtarefa(sub2.id, 'Não realizado', { causa: 'Falta material' })).data.causa, 'Falta material')
conferir('feita limpa a causa', (await dados.marcarSubtarefa(sub2.id, 'Feita')).data.causa, null)
conferir('mestre não apaga subtarefa', (await dados.removerSubtarefa(sub2.id)).erro, 'Só o engenheiro apaga subtarefa.')
await dados.entrarComo('u4')
dados.definirContexto({ obraId: 'o1' })
conferir('cliente não abre a EAP', (await dados.listarPlanejamento()).erro, 'Sem permissão.')

conferir('abas do Planejamento por perfil', [abasDoPlanejamento('Engenheiro'), abasDoPlanejamento('Arquiteta').length, abasDoPlanejamento('Mestre'), abasDoPlanejamento('Cliente')],
  [['eap', 'longo', 'medio', 'curto'], 4, ['curto'], []])
conferir('no celular do mestre, Materiais e Planejamento ficam em Mais', itensDaBarra('Mestre'), ['diario', 'frentes', 'pendencias', 'fotos', 'mais'])

console.log(`${ok}/${tot} — planejamento`)
process.exit(ok === tot ? 0 : 1)
