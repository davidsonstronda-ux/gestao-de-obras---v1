// Medição: a regra em src/lib/medicao.js, os dados de exemplo e o filtro por
// obra/permissão em src/lib/dados.js.
import {
  SITUACOES_MEDICAO, fimDaUltimaFechada, lerDinheiro, lerPercentualDigitado, medicaoCsv, nomeArquivoMedicao, numerarMedicoes, ordenarEmpreiteiros,
  ordenarHistorico, percentualDoValor, percentualMedido, periodoPadrao, resumoFrente, somarResumos, sugeridoNoPeriodo, textoDinheiro, textoPercentual,
  totalDaMedicao, validarMedicao, valorDoPercentual, valorSugerido, arredondarCentavos, campoPeloPercentual, campoPeloValor, concluidosNoPeriodo,
  difereDoSugerido, linhaDaFicha, resumoDaFicha, sobraDoContrato,
} from '../src/lib/medicao.js'
import { mockMedicaoItens, mockMedicoes } from '../src/lib/mockData.js'
import { MENUS, itensDaBarra } from '../src/lib/permissoes.js'
import { formatarDinheiro } from '../src/lib/datas.js'
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-10-20'

// ── regra pura ──────────────────────────────────────────────────────────────
conferir('sugerido = contratado × concluídos ÷ ambientes', [valorSugerido(62000, 1, 4), valorSugerido(21300, 1, 3), valorSugerido(100, 1, 3)], [15500, 7100, 33.33])
conferir('sem ambiente ou nada concluído sugere zero', [valorSugerido(1000, 0, 4), valorSugerido(1000, 1, 0)], [0, 0])
conferir('soma em centavos, sem lixo de vírgula', totalDaMedicao([{ valor: 0.1 }, { valor: 0.2 }]), 0.3)
conferir('fim da última fechada ignora rascunho', fimDaUltimaFechada([
  { situacao: 'Fechada', periodo_fim: '2026-10-05' }, { situacao: 'Rascunho', periodo_fim: '2026-10-20' }, { situacao: 'Fechada', periodo_fim: '2026-09-30' },
]), '2026-10-05')
conferir('sem fechada, devolve null', fimDaUltimaFechada([]), null)

const amb = [{ concluido_em: '2026-10-02' }, { concluido_em: '2026-10-10' }, { concluido_em: null }, { concluido_em: null }]
conferir('a medir conta só o concluído depois da última fechada', resumoFrente({ valorContratado: 62000, ambientes: amb, medido: 15500, desde: '2026-10-05' }),
  { contratado: 62000, medido: 15500, aMedir: 15500, saldo: 46500, pct: 25, ambientesNovos: 1 })
conferir('sem medição ainda, tudo concluído está a medir', resumoFrente({ valorContratado: 62000, ambientes: amb, medido: 0, desde: null }).aMedir, 31000)
conferir('a medir nunca passa do saldo', resumoFrente({ valorContratado: 1000, ambientes: [{ concluido_em: '2026-10-02' }], medido: 900, desde: '2026-10-01' }).aMedir, 100)
conferir('medido acima do contratado não dá saldo negativo', resumoFrente({ valorContratado: 1000, ambientes: [], medido: 1200, desde: null }).saldo, 0)
conferir('% medido inteiro, travado em 100 e zero sem contrato', [percentualMedido(8000, 33900), percentualMedido(2000, 1000), percentualMedido(10, 0)], [23, 100, 0])
conferir('somar resumos', somarResumos([{ contratado: 10, medido: 5, aMedir: 1, saldo: 5 }, { contratado: 30, medido: 5, aMedir: 0, saldo: 25 }]),
  { contratado: 40, medido: 10, aMedir: 1, saldo: 30, pct: 25 })

const ms = [
  { id: 'a', empreiteiro_id: 'e1', periodo_inicio: '2026-10-06', periodo_fim: '2026-10-20', created_at: '2' },
  { id: 'b', empreiteiro_id: 'e1', periodo_inicio: '2026-09-15', periodo_fim: '2026-10-05', created_at: '1' },
  { id: 'c', empreiteiro_id: 'e2', periodo_inicio: '2026-10-01', periodo_fim: '2026-10-10', created_at: '3' },
]
const numeradas = numerarMedicoes(ms)
conferir('número por empreiteiro, a mais antiga é a nº 1', numeradas.map((m) => [m.id, m.numero]), [['a', 2], ['b', 1], ['c', 1]])
conferir('histórico do mais recente para o mais antigo', ordenarHistorico(numeradas).map((m) => m.id), ['a', 'c', 'b'])
conferir('empreiteiro com algo a medir vem primeiro', ordenarEmpreiteiros([{ nome: 'B', aMedir: 0 }, { nome: 'C', aMedir: 5 }, { nome: 'A', aMedir: 0 }]).map((e) => e.nome), ['C', 'A', 'B'])

// ── dados de exemplo coerentes ──────────────────────────────────────────────
conferir('situação de toda medição é Rascunho ou Fechada', mockMedicoes.every((m) => SITUACOES_MEDICAO.includes(m.situacao)), true)
conferir('item sempre da mesma obra da medição', mockMedicaoItens.every((i) => mockMedicoes.find((m) => m.id === i.medicao_id)?.obra_id === i.obra_id), true)
conferir('valor diferente do sugerido sempre tem justificativa', mockMedicaoItens.every((i) => i.valor === i.valor_sugerido || Boolean(i.justificativa)), true)

// ── menu: só o engenheiro, na barra do celular; Fotos foi para "Mais" ──────
conferir('Medição só no menu do engenheiro', Object.keys(MENUS).filter((r) => MENUS[r].itens.includes('medicao')), ['Engenheiro'])
conferir('barra do engenheiro no celular', itensDaBarra('Engenheiro'), ['frentes', 'diario', 'pendencias', 'medicao', 'mais'])

// ── camada de dados: permissão e multi-obra ─────────────────────────────────
await dados.entrarComo('u2')
dados.definirContexto({ obraId: 'o1' })
conferir('mestre não lê medição', (await dados.listarMedicao()).erro, 'Só o engenheiro vê a medição.')
await dados.entrarComo('u1')
conferir('sem obra escolhida não lista medição', (await dados.listarMedicao()).erro, 'Nenhuma obra selecionada.')
dados.definirContexto({ obraId: 'o1' })
const o1 = (await dados.listarMedicao()).data
conferir('obra 1: totais', o1.totais, { contratado: 423300, medido: 84500, aMedir: 51905, saldo: 338800, pct: 19 })
conferir('obra 1: quem tem a medir vem primeiro', o1.empreiteiros.map((e) => e.nome).slice(0, 5), ['Drywall Prime', 'Elétrica Ramos', 'Gesso & Cia', 'Hidro Sul', 'ImperTec'])
conferir('obra 1: rascunho não conta no medido da Hidro Sul', o1.empreiteiros.find((e) => e.id === 'e1').medido, 15500)
const drywall = o1.empreiteiros.find((e) => e.id === 'e10')
conferir('drywall: 2 de 3 ambientes medidos, a Suíte a medir', [drywall.contratado, drywall.medido, drywall.pct, drywall.aMedir, drywall.saldo], [30000, 20000, 66, 10000, 10000])
conferir('gesso: R$ 30.000 com rascunho que ainda não conta', [o1.empreiteiros.find((e) => e.id === 'e3').contratado, o1.empreiteiros.find((e) => e.id === 'e3').medido, o1.empreiteiros.find((e) => e.id === 'e3').rascunho], [30000, 0, 1])
conferir('obra 1: histórico numerado, mais recente primeiro', o1.historico.map((m) => `${m.empreiteiro_id}#${m.numero}`), ['e1#2', 'e3#1', 'e10#2', 'e4#1', 'e1#1', 'e6#1', 'e10#1'])
dados.definirContexto({ obraId: 'o2' })
const o2 = (await dados.listarMedicao()).data
conferir('obra 2: só o empreiteiro dela', o2.empreiteiros.map((e) => e.id), ['e9'])
conferir('obra 2: totais próprios', o2.totais, { contratado: 96000, medido: 19200, aMedir: 0, saldo: 76800, pct: 20 })
conferir('obra 2: nenhuma medição da obra 1 no histórico', o2.historico.map((m) => m.id), ['md5'])

// ── etapa 2: regra da nova medição ──────────────────────────────────────────
conferir('ler dinheiro digitado', ['1.234,56', '1234,5', '1234.56', '1.500', 'R$ 80', 'abc', ''].map(lerDinheiro), [1234.56, 1234.5, 1234.56, 1500, 80, null, null])
conferir('ler % digitado', [lerPercentualDigitado('12,5'), lerPercentualDigitado('20%'), lerPercentualDigitado('x')], [12.5, 20, null])
conferir('R$ ↔ %', [valorDoPercentual(33900, 20), percentualDoValor(8000, 33900), percentualDoValor(10, 0)], [6780, 23.6, 0])
conferir('texto dos campos', [textoDinheiro(15500), textoPercentual(12.5)], ['15.500,00', '12,5'])
conferir('período padrão: dia seguinte à última fechada até hoje', periodoPadrao({ ultimaFechada: '2026-10-10', iniciosPrevistos: [], hoje: HOJE }), { inicio: '2026-10-11', fim: HOJE })
conferir('período padrão sem fechada: início previsto mais cedo', periodoPadrao({ ultimaFechada: null, iniciosPrevistos: ['2026-10-06', '2026-10-01'], hoje: HOJE }).inicio, '2026-10-01')
conferir('período padrão nunca começa no futuro', periodoPadrao({ ultimaFechada: null, iniciosPrevistos: ['2026-11-10'], hoje: HOJE }).inicio, HOJE)
const amb2 = [{ concluido_em: '2026-10-02' }, { concluido_em: '2026-10-10' }, { concluido_em: null }, { concluido_em: null }]
conferir('sugerido no período conta as pontas', sugeridoNoPeriodo({ valorContratado: 62000, ambientes: amb2, inicio: '2026-10-02', fim: '2026-10-10' }), 31000)
conferir('sugerido no período não passa do que sobra', sugeridoNoPeriodo({ valorContratado: 62000, ambientes: amb2, inicio: '2026-10-01', fim: HOJE, jaMedido: 50000 }), 12000)

const linha = (valor, extra = {}) => ({ frente_id: 'f1', contratado: 1000, jaMedido: 600, valor_sugerido: 200, valor, justificativa: '', ...extra })
const val = (linhas, periodo = { periodo_inicio: '2026-10-11', periodo_fim: HOJE }) => validarMedicao({ ...periodo, linhas }, { hoje: HOJE, ultimaFechada: '2026-10-10' })
conferir('medição certa não tem problema', val([linha(200)]), {})
conferir('trava em 100% do contratado', val([linha(450)])['valor:f1'], `Passa de 100% do contratado: sobram ${formatarDinheiro(400)} para medir.`)
conferir('exatamente 100% passa (com justificativa)', val([linha(400, { justificativa: 'fim do serviço' })]), {})
conferir('valor diferente do sugerido pede justificativa', Object.keys(val([linha(300)])), ['justificativa:f1'])
conferir('valor em branco é avisado', Object.keys(val([linha(null)])), ['valor:f1'])
conferir('medição zerada é recusada', Object.keys(val([linha(0, { valor_sugerido: 0 })])), ['total'])
conferir('período não pode invadir a última fechada', val([linha(200)], { periodo_inicio: '2026-10-10', periodo_fim: HOJE }).periodo, 'O período precisa começar depois de 10/10/2026, fim da última medição fechada.')
conferir('período não termina no futuro', val([linha(200)], { periodo_inicio: '2026-10-11', periodo_fim: '2026-10-21' }).periodo, 'O período não pode terminar depois de hoje.')

const csv = medicaoCsv({ obra: 'Residência', empreiteiro: 'Elétrica Ramos', numero: 1, periodo_inicio: '2026-09-22', periodo_fim: '2026-10-10', situacao: 'Fechada',
  linhas: [{ servico: 'Elétrica', contratado: 33900, jaMedido: 0, valor_sugerido: 6780, valor: 8000, justificativa: 'adiantado; combinado' }] })
conferir('CSV com BOM, ";" e vírgula decimal', [csv.charCodeAt(0) === 0xfeff, csv.includes('Elétrica;33900,00;0,00;6780,00;8000,00;23,6;"adiantado; combinado"'), csv.includes('Total;;;;8000,00')], [true, true, true])
conferir('nome do arquivo sem acento nem símbolo', nomeArquivoMedicao({ codigoObra: 'RABV', empreiteiro: 'Gesso & Cia', numero: 1 }), 'medicao-rabv-gesso-cia-1.csv')

// ── revisão de 23/10: regras que a tela pede à lib ──────────────────────────
conferir('arredondar e sobra do contrato em centavos', [arredondarCentavos(0.1 + 0.2), sobraDoContrato(1000, 999.99), sobraDoContrato(1000, 1200)], [0.3, 0.01, 0])
conferir('difere do sugerido compara em centavos; em branco não difere', [difereDoSugerido(0.1 + 0.2, 0.3), difereDoSugerido(300, 200), difereDoSugerido(null, 200)], [false, true, false])
conferir('concluídos no período: pontas incluídas, período invertido é vazio', [concluidosNoPeriodo(amb2, '2026-10-02', '2026-10-10').length, concluidosNoPeriodo(amb2, '2026-10-10', '2026-10-02').length], [2, 0])
conferir('última fechada terminando hoje explica que a próxima começa amanhã',
  validarMedicao({ periodo_inicio: HOJE, periodo_fim: HOJE, linhas: [] }, { hoje: HOJE, ultimaFechada: HOJE }).periodo, 'A última medição fechada já vai até hoje: a próxima só pode começar amanhã.')
conferir('digitar R$ calcula o %; digitar % calcula o R$', [campoPeloValor('10.000', 21300), campoPeloPercentual('120', 21300), campoPeloValor('x', 100)],
  [{ reais: '10.000', pct: '46,95' }, { pct: '120', reais: '25.560,00' }, { reais: 'x', pct: '' }])
const fr = { frente_id: 'f2', contratado: 21300, jaMedido: 0, ambientes: [{ concluido_em: '2026-10-13' }, { concluido_em: null }, { concluido_em: null }], item: null }
const per = { inicio: '2026-10-06', fim: HOJE }
const semMexer = linhaDaFicha({ frente: fr, campo: undefined, periodo: per, editavel: true })
conferir('linha que ninguém mexeu segue o sugerido', [semMexer.valor, semMexer.reais, semMexer.pct, semMexer.difere, semMexer.noPeriodo.length], [7100, '7.100,00', '33,33', false, 1])
const mexida = linhaDaFicha({ frente: fr, campo: { reais: '10.000', pct: '46,95', justificativa: 'ok' }, periodo: per, editavel: true })
conferir('linha digitada vale o digitado e difere', [mexida.valor, mexida.difere, mexida.justificativa], [10000, true, 'ok'])
const gravada = linhaDaFicha({ frente: { ...fr, item: { valor: 8000, valor_sugerido: 6780, justificativa: 'adiantado' } }, campo: undefined, periodo: per, editavel: false })
conferir('fechada mostra o gravado, não recalcula', [gravada.valor, gravada.valor_sugerido, gravada.justificativa], [8000, 6780, 'adiantado'])
conferir('rodapé da ficha: total, acumulado sem trava de 100%, saldo', resumoDaFicha([{ ...mexida, jaMedido: 15000 }]),
  { total: 10000, acumulado: 25000, pctAcumulado: 117.37, saldoDepois: 0, nadaSugerido: false })

// ── etapa 2: abrir, salvar, fechar e apagar (camada de dados) ───────────────
dados.definirContexto({ obraId: 'o1' })
const fHidro = (await dados.fichaMedicao({ empreiteiroId: 'e1' })).data
conferir('empreiteiro com rascunho abre o rascunho', [fHidro.medicao.id, fHidro.numero, fHidro.editavel], ['md4', 2, true])
conferir('rascunho: medido antes vem só da fechada', fHidro.frentes.find((f) => f.frente_id === 'f3').jaMedido, 15500)
conferir('gesso abre o rascunho dele', (await dados.fichaMedicao({ empreiteiroId: 'e3' })).data.medicao.id, 'md8')
const fImper = (await dados.fichaMedicao({ empreiteiroId: 'e2' })).data
conferir('sem medição: nova nº 1 com período padrão', [fImper.medicao, fImper.numero, fImper.periodo], [null, 1, { inicio: '2026-10-01', fim: HOJE }])
const fDry = (await dados.fichaMedicao({ empreiteiroId: 'e10' })).data
conferir('drywall: nova nº 3, começa depois da última fechada', [fDry.numero, fDry.periodo.inicio, fDry.frentes[0].jaMedido], [3, '2026-10-11', 20000])
conferir('fechada abre só para leitura', (await dados.fichaMedicao({ medicaoId: 'md3' })).data.editavel, false)
conferir('medição de outra obra não abre', (await dados.fichaMedicao({ medicaoId: 'md5' })).erro, 'Medição não encontrada nesta obra.')

// ImperTec: R$ 38.500, Banho social concluído em 09/10 (1 de 4 ambientes) → sugerido R$ 9.625.
const imper = (valor, extra = {}) => ({ empreiteiro_id: 'e2', periodo_inicio: '2026-10-01', periodo_fim: HOJE, itens: [{ frente_id: 'f1', valor, ...extra }] })
conferir('camada de dados também trava em 100%', (await dados.salvarMedicao(imper(40000))).erro, `Passa de 100% do contratado: sobram ${formatarDinheiro(38500)} para medir.`)
const salvo = (await dados.salvarMedicao(imper(9625))).data
conferir('salva como rascunho', salvo.situacao, 'Rascunho')
conferir('rascunho não conta no medido', (await dados.listarMedicao()).data.empreiteiros.find((e) => e.id === 'e2').medido, 0)
conferir('segundo rascunho do mesmo empreiteiro é recusado', (await dados.salvarMedicao(imper(9625))).erro, 'Este empreiteiro já tem uma medição em rascunho. Continue por ela.')
const fechada = (await dados.salvarMedicao({ ...imper(9625), id: salvo.id }, { fechar: true })).data
conferir('fechar grava a data', [fechada.situacao, Boolean(fechada.fechada_em)], ['Fechada', true])
const imperDepois = (await dados.listarMedicao()).data.empreiteiros.find((e) => e.id === 'e2')
conferir('fechada entra no medido e zera o a medir', [imperDepois.medido, imperDepois.aMedir, imperDepois.pct], [9625, 0, 25])
conferir('fechada não muda mais', (await dados.salvarMedicao({ ...imper(9625), id: salvo.id })).erro, 'Medição fechada não muda mais.')
conferir('fechada não pode ser apagada', (await dados.apagarRascunhoMedicao('md1')).erro, 'Medição fechada não pode ser apagada.')
conferir('rascunho pode ser apagado', [(await dados.apagarRascunhoMedicao('md4')).data, (await dados.listarMedicao()).data.historico.some((m) => m.id === 'md4')], ['md4', false])
dados.definirContexto({ obraId: 'o2' })
conferir('não mede empreiteiro de outra obra', (await dados.salvarMedicao(imper(100))).erro, 'Empreiteiro não encontrado nesta obra.')
await dados.entrarComo('u2')
dados.definirContexto({ obraId: 'o1' })
conferir('mestre não lança medição', (await dados.salvarMedicao(imper(100))).erro, 'Só o engenheiro lança medição.')

console.log(`${ok}/${tot} — medicao`)
process.exit(ok === tot ? 0 : 1)
