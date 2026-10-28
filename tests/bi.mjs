// Relatórios (BI da obra): a regra em src/lib/bi.js e o recorte por obra e
// permissão em src/lib/dados.js (dadosDoBi).
import {
  atividadesDoBi, climaEfetivo, curvaS, custoMedido, evolucao, fluxoContratos, leadTimeDosPedidos, matrizEmpreiteiros, montarBi, paretoDeCausas, pedidosAtrasados, pedidosPorEtapa,
  ppcGeral, ppcPorSemana, prazoDaObra, resumoEstoque, saldoPorContrato, semanasEntre, conformePorModelo, pendenciasPorEmpresa, pendenciasPorLocal, PERIODOS,
  inicioDoPeriodo, descreverFiltrosBi, META_CONFORME, pedidosCriticosEmAberto,
} from '../src/lib/bi.js'
import { MENUS, itensDaBarra, pode } from '../src/lib/permissoes.js'
import { formatarDinheiroCurto } from '../src/lib/datas.js'
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-10-20'
const cal7 = { dias_semana: [0, 1, 2, 3, 4, 5, 6], feriados: [] }
const a = (id, inicio, fim, duracao, progresso, extra = {}) => ({ id, inicio, fim, duracao, progresso, status: progresso === 100 ? 'Concluído' : 'A fazer', concluida_em: null, ...extra })

// ── regra pura ──────────────────────────────────────────────────────────────
conferir('grupo e arquivada ficam de fora; filtro por empreiteiro', [
  atividadesDoBi([{ id: 'g', ehGrupo: true }, { id: 'x', arquivada: true }, { id: 'y', empreiteiro_id: 'e1' }, { id: 'z', empreiteiro_id: 'e2' }]).map((i) => i.id),
  atividadesDoBi([{ id: 'y', empreiteiro_id: 'e1' }, { id: 'z', empreiteiro_id: 'e2' }], { empreiteiroId: 'e2' }).map((i) => i.id),
], [['y', 'z'], ['z']])
conferir('semanas de segunda a domingo cobrindo o intervalo', semanasEntre('2026-10-21', '2026-11-02').map((s) => s.inicio), ['2026-10-19', '2026-10-26', '2026-11-02'])

const duas = [a('a', '2026-10-01', '2026-10-10', 10, 100), a('b', '2026-10-11', '2026-10-30', 20, 25)]
conferir('evolução pesada pela duração', evolucao(duas, cal7, '2026-10-16'), { real: 50, previsto: 50, diferenca: 0 })
conferir('sem atividade, evolução e curva vazias (nunca NaN)', [evolucao([], cal7, HOJE), curvaS([], cal7, HOJE), ppcPorSemana([], HOJE)], [null, [], []])
conferir('atividades de 0 dia: média simples', evolucao([a('a', '2026-10-01', '2026-10-01', 0, 100), a('b', '2026-10-01', '2026-10-01', 0, 0)], cal7, HOJE).real, 50)

const curva = curvaS([a('a', '2026-10-05', '2026-10-18', 14, 100, { concluida_em: '2026-10-16' }), a('b', '2026-10-19', '2026-11-01', 14, 50)], cal7, HOJE)
conferir('curva S: previsto até o domingo, real das concluídas, hoje o % real, futuro vazio',
  curva.map((p) => [p.semana, p.previsto, p.real, p.atual]),
  [['2026-10-05', 25, 0, false], ['2026-10-12', 50, 50, false], ['2026-10-19', 75, 75, true], ['2026-10-26', 100, null, false]])

const ppc = ppcPorSemana([a('a', '2026-10-05', '2026-10-10', 6, 100, { concluida_em: '2026-10-09' }), a('b', '2026-10-05', '2026-10-17', 13, 0)], HOJE)
conferir('PPC só das semanas fechadas', ppc.map((p) => [p.semana, p.concluidas, p.planejadas]), [['2026-10-05', 1, 2], ['2026-10-12', 0, 1]])
conferir('PPC geral soma as semanas', ppcGeral(ppc), { concluidas: 1, planejadas: 3, ppc: 33 })
conferir('PPC geral sem semana fechada é vazio', ppcGeral([]), { concluidas: 0, planejadas: 0, ppc: null })
conferir('prazo em dias até a entrega (negativo = passou; sem data = null)', [prazoDaObra('2026-10-30', HOJE), prazoDaObra('2026-10-18', HOJE), prazoDaObra(null, HOJE)], [10, -2, null])
conferir('custo medido soma em centavos e filtra o empreiteiro',
  [custoMedido([{ valor: 0.1, empreiteiro_id: 'e1' }, { valor: 0.2, empreiteiro_id: 'e2' }]), custoMedido([{ valor: 0.1, empreiteiro_id: 'e1' }, { valor: 0.2, empreiteiro_id: 'e2' }], { empreiteiroId: 'e2' })],
  [0.3, 0.2])

// Ritmo & Produção
const causas = [
  { causa: 'Chuva', empreiteiro_id: 'e1' }, { causa: 'Falta gente', empreiteiro_id: 'e1' }, { causa: 'Chuva', empreiteiro_id: 'e2' },
  { causa: 'Falta material', empreiteiro_id: 'e2' }, { causa: null, empreiteiro_id: 'e2' },
]
conferir('Pareto: maior primeiro, empate pela ordem dos motivos, % e acumulado', paretoDeCausas(causas).map((c) => [c.causa, c.quantidade, c.pct, c.acumulado]),
  [['Chuva', 2, 50, 50], ['Falta material', 1, 25, 75], ['Falta gente', 1, 25, 100]])
conferir('Pareto do empreiteiro e sem causa nenhuma', [paretoDeCausas(causas, { empreiteiroId: 'e1' }).map((c) => c.causa), paretoDeCausas([])], [['Falta gente', 'Chuva'], []])
conferir('efetivo por dia, em ordem, somando as equipes (ou só a do empreiteiro)', [
  climaEfetivo([{ data: '2026-10-02', clima: 'Chuva', equipes: [] }, { data: '2026-10-01', clima: 'Sol', equipes: [{ empreiteiro_id: 'e1', pessoas: 3 }, { empreiteiro_id: 'e2', pessoas: 2 }] }]),
  climaEfetivo([{ data: '2026-10-01', clima: 'Sol', equipes: [{ empreiteiro_id: 'e1', pessoas: 3 }, { empreiteiro_id: 'e2', pessoas: 2 }] }], { empreiteiroId: 'e2' })[0].pessoas,
], [[{ data: '2026-10-01', clima: 'Sol', pessoas: 5 }, { data: '2026-10-02', clima: 'Chuva', pessoas: 0 }], 2])

// Contratos & Medições
const frentes = [
  { id: 'f1', servico: 'Gesso', situacao: 'Em andamento', empreiteiro_id: 'e1', valor_contratado: 1000 },
  { id: 'f2', servico: 'Pintura', situacao: 'Concluída', empreiteiro_id: 'e2', valor_contratado: 500 },
  { id: 'f3', servico: 'Forro', situacao: 'Em andamento', empreiteiro_id: 'e1', valor_contratado: 0.3 },
]
const medidoTeste = [{ frente_id: 'f1', valor: 800 }, { frente_id: 'f2', valor: 500 }]
conferir('fluxo na ordem da frente, com quantidade e R$ (situação vazia fica com zero)', fluxoContratos(frentes),
  [{ situacao: 'Não iniciada', quantidade: 0, valor: 0 }, { situacao: 'Em andamento', quantidade: 2, valor: 1000.3 }, { situacao: 'Concluída', quantidade: 1, valor: 500 }])
conferir('matriz: maior saldo primeiro; sem contrato fica de fora', matrizEmpreiteiros(frentes, medidoTeste, [{ id: 'e1', nome: 'Gesso & Cia' }, { id: 'e2', nome: 'Pinturas' }, { id: 'e3', nome: 'Sem frente' }]),
  [{ id: 'e1', nome: 'Gesso & Cia', contratado: 1000.3, medido: 800, pct: 79, saldo: 200.3 }, { id: 'e2', nome: 'Pinturas', contratado: 500, medido: 500, pct: 100, saldo: 0 }])
conferir('saldo por contrato: sem saldo sai; filtro de empreiteiro', [saldoPorContrato(frentes, medidoTeste).map((f) => [f.servico, f.saldo]), saldoPorContrato(frentes, medidoTeste, { empreiteiroId: 'e2' })],
  [[['Gesso', 200], ['Forro', 0.3]], []])

conferir('dinheiro curto para cartão pequeno', [141500, 96000, 850].map((v) => formatarDinheiroCurto(v).replace(/\s/g, ' ')), ['R$ 141,5 mil', 'R$ 96 mil', 'R$ 850'])

// Materiais
const hist = (...datas) => datas.map((data, i) => ({ status: ['Solicitar', 'Em cotação', 'A caminho', 'No almoxarifado', 'Entregue'][i], data }))
const pedidos = [
  { id: 'p1', status: 'A caminho', prioridade: 'Crítico', previsao_entrega: '2026-10-15', empreiteiro_id: 'e1', historico: hist('2026-10-01', '2026-10-02', '2026-10-05') },
  { id: 'p2', status: 'A caminho', prioridade: 'Normal', previsao_entrega: '2026-10-25', empreiteiro_id: 'e2', historico: hist('2026-10-01') },
  { id: 'p3', status: 'No almoxarifado', prioridade: 'Normal', previsao_entrega: '2026-10-10', empreiteiro_id: 'e2', historico: hist('2026-09-28', '2026-09-29', '2026-09-30', '2026-10-08') },
  { id: 'p4', status: 'Entregue', prioridade: 'Normal', previsao_entrega: '2026-10-10', empreiteiro_id: 'e1', historico: hist('2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10') },
]
conferir('pedidos nas 5 colunas, na ordem do quadro', pedidosPorEtapa(pedidos).map((e) => e.quantidade), [0, 0, 2, 1, 1])
conferir('atrasado: previsão vencida e ainda a caminho, com os dias', pedidosAtrasados(pedidos, HOJE).map((p) => [p.id, p.dias, p.critico]), [['p1', 5, true]])
const lt = leadTimeDosPedidos(pedidos, HOJE)
conferir('lead time médio e as últimas 4 semanas (sem chegada = null)', [lt.media, lt.pedidos, lt.tendencia.map((t) => [t.semana, t.media])],
  [7, 2, [['2026-09-28', null], ['2026-10-05', 7], ['2026-10-12', null], ['2026-10-19', null]]])
conferir('lead time sem pedido que chegou: tudo null, sem NaN', leadTimeDosPedidos([], HOJE).media, null)
conferir('estoque: sem insumo, nada (nem cartão)', resumoEstoque([], [], HOJE), null)
const est = resumoEstoque([{ id: 'i1', nome: 'Cimento', saldo: 5, saldo_minimo: 5, unidade: 'saco' }, { id: 'i2', nome: 'Areia', saldo: 9, saldo_minimo: 2, unidade: 'm³' }],
  [{ tipo: 'Entrada', data: '2026-10-19', empreiteiro_id: null }, { tipo: 'Saída', data: '2026-10-20', empreiteiro_id: 'e1' }, { tipo: 'Saída', data: '2026-08-01', empreiteiro_id: 'e1' }], HOJE)
conferir('estoque: críticos (saldo ≤ mínimo) e lançamentos das últimas 6 semanas', [est.criticos.map((i) => i.nome), est.semanas.length, est.semanas.at(-1)],
  [['Cimento'], 6, { semana: '2026-10-19', entradas: 1, saidas: 1 }])

// Qualidade & Entrega
const vistoriaFvs = (modelo_nome, respostas, criada_em = '2026-10-10') => ({ modelo_nome, grupos: [{ nome: 'G', itens: Object.keys(respostas).map((id) => ({ id })) }], respostas, criada_em })
conferir('% conforme por modelo: soma as vistorias, pior primeiro, sem OK nem NC fica de fora', conformePorModelo([
  vistoriaFvs('Cerâmica', { a: 'OK', b: 'NC' }), vistoriaFvs('Cerâmica', { a: 'OK', b: 'OK' }), vistoriaFvs('Impermeabilização', { a: 'OK' }), vistoriaFvs('Forro', { a: 'N.A.' }),
]).map((m) => [m.modelo, m.pct, m.vistorias]), [['Cerâmica', 75, 2], ['Impermeabilização', 100, 1]])
const registros = [
  { local: 'Sala', empreiteiro_id: 'e1', status: 'Pendente', data_vistoria: '2026-10-10' },
  { local: 'Sala', empreiteiro_id: 'e2', status: 'Em andamento', data_vistoria: '2026-09-10' },
  { local: 'Cozinha', empreiteiro_id: 'e1', status: 'Resolvido', data_vistoria: '2026-10-10' },
]
const ncs = [{ empreiteiro_id: 'e2', status: 'Aberta', aberta_em: '2026-10-12' }, { empreiteiro_id: 'e2', status: 'Encaminhada', aberta_em: '2026-10-13' }, { empreiteiro_id: 'e1', status: 'Fechada', aberta_em: '2026-10-01' }]
const emps = [{ id: 'e1', nome: 'Alfa' }, { id: 'e2', nome: 'Beta' }]
conferir('pendências por empresa: vistoria não resolvida + NC não fechada', pendenciasPorEmpresa(registros, ncs, emps).map((e) => [e.nome, e.vistoria, e.nc]), [['Beta', 1, 2], ['Alfa', 1, 0]])
conferir('pendências por local, só as não resolvidas', pendenciasPorLocal(registros), [{ local: 'Sala', quantidade: 2 }])
conferir('período recorta vistoria e NC pela data', [pendenciasPorEmpresa(registros, ncs, emps, { desde: '2026-10-01' }).map((e) => [e.nome, e.total]), pendenciasPorLocal(registros, { desde: '2026-10-01' })],
  [[['Beta', 2], ['Alfa', 1]], [{ local: 'Sala', quantidade: 1 }]])

// Filtros
conferir('início do período', [PERIODOS, inicioDoPeriodo('Tudo', HOJE), inicioDoPeriodo('Este mês', HOJE), inicioDoPeriodo('Últimas 4 semanas', HOJE)],
  [['Tudo', 'Este mês', 'Últimas 4 semanas'], null, '2026-10-01', '2026-09-28'])
conferir('texto dos filtros para o relatório impresso', [descreverFiltrosBi({}, emps, HOJE), descreverFiltrosBi({ empreiteiroId: 'e2', periodo: 'Este mês' }, emps, HOJE)],
  ['Empreiteiro: Todos · Período: Tudo', 'Empreiteiro: Beta · Período: Este mês (desde 01/10/2026)'])

// ── menu e permissão ────────────────────────────────────────────────────────
conferir('só o engenheiro vê os relatórios', ['Engenheiro', 'Mestre', 'Arquiteta', 'Cliente'].map((r) => pode(r, 'verRelatorios')), [true, false, false, false])
conferir('Relatórios no menu do engenheiro, dentro de Mais no celular', [MENUS.Engenheiro.itens.includes('relatorios'), itensDaBarra('Engenheiro').includes('relatorios')], [true, false])

// ── camada de dados: cada obra a sua ────────────────────────────────────────
conferir('sem login, nada', (await dados.dadosDoBi()).erro, 'Faça login para continuar.')
await dados.entrarComo('u1')
dados.definirContexto({ obraId: 'o1' })
const o1 = (await dados.dadosDoBi()).data
dados.definirContexto({ obraId: 'o2' })
const o2 = (await dados.dadosDoBi()).data
conferir('cada obra só traz o que é dela', [o1.atividades.every((i) => i.obra_id === 'o1'), o2.atividades.every((i) => i.obra_id === 'o2'), o2.empreiteiros.map((e) => e.nome)],
  [true, true, ['Fundações Base']])
conferir('a atividade sabe o empreiteiro da frente ligada', o1.atividades.find((i) => i.id === 'at4').empreiteiro_id, 'e1')
conferir('medido só das medições Fechadas (o rascunho do gesso fica de fora)', [o1.medido.some((m) => m.empreiteiro_id === 'e3'), custoMedido(o1.medido), custoMedido(o2.medido)], [false, 84500, 19200])
const bi1 = montarBi(o1, {}, HOJE).executivo
const bi2 = montarBi(o2, {}, HOJE).executivo
conferir('Residência: evolução, prazo e PPC', [bi1.evolucao, bi1.prazo, bi1.ppc], [{ real: 75, previsto: 83, diferenca: -8 }, 146, { concluidas: 7, planejadas: 42, ppc: 17 }])
conferir('Casa Jardins é outra conta', [bi2.evolucao.real, bi2.prazo, bi2.custo, bi2.curva.length], [35, 253, 19200, 7])
conferir('filtro de empreiteiro recorta a curva e o custo', [montarBi(o1, { empreiteiroId: 'e10' }, HOJE).executivo.evolucao.real, montarBi(o1, { empreiteiroId: 'e10' }, HOJE).executivo.custo], [100, 20000])
conferir('empreiteiro sem atividade: painel vazio, sem NaN', montarBi(o1, { empreiteiroId: 'e8' }, HOJE).executivo.evolucao, null)
const r1 = montarBi(o1, {}, HOJE).ritmo
const r2 = montarBi(o2, {}, HOJE).ritmo
conferir('Residência: Pareto junta Kanban, subtarefa e diário', r1.pareto.slice(0, 2).map((c) => [c.causa, c.quantidade]), [['Falta material', 11], ['Aguardando outra frente', 10]])
conferir('Residência: 12 dias de diário, a chuva derruba o efetivo', [r1.efetivo.length, r1.efetivo.find((d) => d.data === '2026-10-06').pessoas, r1.efetivo.find((d) => d.data === '2026-10-17').pessoas], [12, 20, 2])
conferir('Residência: PPC semanal das 11 semanas fechadas', [r1.ppcSemanal.length, r1.ppcSemanal.at(-1)], [11, { semana: '2026-10-12', concluidas: 1, planejadas: 7, ppc: 14, naoConcluidas: 6 }])
conferir('Casa Jardins: sem causa nenhuma, 6 diários só da Fundações Base', [r2.pareto, r2.efetivo.map((d) => d.pessoas)], [[], [4, 6, 6, 6, 6, 6]])
conferir('filtro de empreiteiro no Ritmo: a ImperTec só tem falta de material', montarBi(o1, { empreiteiroId: 'e2' }, HOJE).ritmo.pareto.map((c) => [c.causa, c.quantidade]), [['Falta material', 8]])
const c1 = montarBi(o1, {}, HOJE)
const c2 = montarBi(o2, {}, HOJE)
conferir('Residência: 11 frentes no fluxo; Hidro Sul tem o maior saldo; drywall 66% medido',
  [c1.contratos.fluxo.map((f) => f.quantidade), c1.contratos.matriz[0].nome, c1.contratos.matriz.find((l) => l.id === 'e10').pct], [[3, 6, 2], 'Hidro Sul', 66])
conferir('Residência: 10 pedidos, 2 críticos, a manta atrasada 4 dias, lead time médio 9', [c1.materiais.etapas.map((e) => e.quantidade), c1.materiais.criticos,
  c1.materiais.atrasados.map((p) => [p.material, p.dias]), c1.materiais.leadTime.media], [[2, 2, 2, 2, 2], 2, [['Manta asfáltica 4 mm', 4]], 9])
conferir('Residência: cimento e bloco críticos no estoque', c1.materiais.estoque.criticos.map((i) => i.nome), ['Cimento CP-II', 'Bloco cerâmico 14×19×29'])
conferir('Casa Jardins: só a fundação e 2 pedidos', [c2.contratos.matriz.map((l) => [l.nome, l.saldo]), c2.materiais.etapas.map((e) => e.quantidade), c2.materiais.leadTime.media],
  [[['Fundações Base', 76800]], [1, 1, 0, 0, 0], null])
conferir('filtro de empreiteiro nos pedidos: a ImperTec só tem a manta', montarBi(o1, { empreiteiroId: 'e2' }, HOJE).materiais.etapas.map((e) => e.quantidade), [0, 0, 1, 0, 0])
const q1 = montarBi(o1, {}, HOJE).qualidade
const q2 = montarBi(o2, {}, HOJE).qualidade
conferir('Residência: cerâmica é o pior modelo; Hidro Sul lidera as pendências; 7 desperdícios', [q1.conforme.map((m) => [m.modelo, m.pct]), q1.porEmpresa[0].nome, q1.porEmpresa.length, q1.desperdicios.length],
  [[['Revestimento Cerâmico', 67], ['Impermeabilização — Áreas Molhadas', 75]], 'Hidro Sul', 5, 7])
conferir('Casa Jardins: só a Fundações Base e o Bloco B1', [q2.porEmpresa.map((e) => e.nome), q2.porLocal.map((l) => l.local), q2.desperdicios.map((d) => d.tipo)], [['Fundações Base'], ['Bloco B1'], ['Espera']])
conferir('filtro de empreiteiro na qualidade: a Hidro Sul tem 1 registro e 2 NCs', montarBi(o1, { empreiteiroId: 'e1' }, HOJE).qualidade.porEmpresa, [{ id: 'e1', nome: 'Hidro Sul', vistoria: 1, nc: 2, total: 3 }])
const mes = montarBi(o1, { periodo: 'Este mês' }, HOJE)
conferir('Este mês: PPC e Curva S só de outubro; o que é posição de hoje não muda', [mes.ritmo.ppcSemanal.map((p) => p.semana), mes.executivo.curva[0].semana, mes.executivo.evolucao.real, mes.contratos.fluxo.map((f) => f.quantidade)],
  [['2026-09-28', '2026-10-05', '2026-10-12'], '2026-09-28', 75, [3, 6, 2]])
conferir('Este mês: a medição fechada em setembro sai do custo', montarBi({ ...o1, medido: [...o1.medido, { frente_id: 'f7', empreiteiro_id: 'e6', valor: 1000, fechada_em: '2026-09-30' }] }, { periodo: 'Este mês' }, HOJE).executivo.custo, 84500)
// Revisão de 28/10: com período, a Curva S mostrava as semanas futuras.
conferir('com período, a Curva S para na semana de hoje', mes.executivo.curva.at(-1).semana, '2026-10-19')
conferir('sem período, a Curva S vai até a última atividade', montarBi(o1, {}, HOJE).executivo.curva.at(-1).semana, '2026-11-02')
conferir('causa do Kanban vale pelo domingo da semana (como o PPC)', o1.causas.filter((c) => c.origem === 'Kanban').slice(0, 2).map((c) => c.data), ['2026-10-18', '2026-10-18'])
conferir('modelo de FVS abaixo da meta', [META_CONFORME, q1.conforme.map((m) => m.abaixoDaMeta)], [80, [true, true]])
conferir('pedidos críticos em aberto (entregue não conta) e por empreiteiro', [pedidosCriticosEmAberto(pedidos), pedidosCriticosEmAberto([...pedidos, { prioridade: 'Crítico', status: 'Entregue' }]), pedidosCriticosEmAberto(pedidos, { empreiteiroId: 'e2' })], [1, 1, 0])
conferir('Este mês: a demolição de agosto some do PPC', montarBi(o1, { periodo: 'Este mês' }, HOJE).ritmo.ppcSemanal.some((p) => p.semana < '2026-09-28'), false)
await dados.entrarComo('u2')
dados.definirContexto({ obraId: 'o1' })
conferir('mestre não abre os relatórios', (await dados.dadosDoBi()).erro, 'Só o engenheiro vê os relatórios.')

console.log(`${ok}/${tot} — bi`)
process.exit(ok === tot ? 0 : 1)
