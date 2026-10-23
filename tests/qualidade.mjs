// Qualidade (aba Vistoria): a regra em src/lib/qualidade.js e o filtro por
// obra/permissão em src/lib/dados.js.
import {
  anexarObservacao, contarStatus, estaVencido, filtrarRegistros, formatarCarimbo, noFiltroPrazo, notasDoHistorico,
  mudancaDeSituacao, ordenarRegistros, pendentesPorResponsavel, proximoNumero, proximoStatusRegistro, validarMudancaRegistro, validarRegistro,
} from '../src/lib/qualidade.js'
import { MENUS, itensDaBarra } from '../src/lib/permissoes.js'
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
const reg = (x) => ({ numero: 1, status: 'Pendente', prazo: HOJE, descricao: '', local: '', pavimento: '', responsavel: 'Ana', responsavel_id: 'u1', ...x })

// ── regra pura ──────────────────────────────────────────────────────────────
conferir('situação anda um passo', [proximoStatusRegistro('Pendente'), proximoStatusRegistro('Em andamento'), proximoStatusRegistro('Resolvido')], ['Em andamento', 'Resolvido', null])
conferir('nº é o maior + 1, mesmo com buraco', [proximoNumero([]), proximoNumero([{ numero: 1 }, { numero: 4 }])], [1, 5])

conferir('vencido: prazo passou e não resolveu', estaVencido(reg({ prazo: '2026-10-19' }), HOJE), true)
conferir('prazo de hoje ainda não venceu', estaVencido(reg({ prazo: HOJE }), HOJE), false)
conferir('resolvido nunca vence', estaVencido(reg({ prazo: '2026-10-01', status: 'Resolvido' }), HOJE), false)
conferir('esta semana vai até domingo 25/10', [noFiltroPrazo(reg({ prazo: '2026-10-25' }), 'Esta semana', HOJE), noFiltroPrazo(reg({ prazo: '2026-10-26' }), 'Esta semana', HOJE), noFiltroPrazo(reg({ prazo: '2026-10-19' }), 'Esta semana', HOJE)], [true, false, false])
conferir('esta semana num domingo é só o próprio dia', noFiltroPrazo(reg({ prazo: '2026-10-25' }), 'Esta semana', '2026-10-25'), true)

const lista = [
  reg({ numero: 1, descricao: 'Infiltração no box', local: 'Banho social', prazo: '2026-10-17' }),
  reg({ numero: 2, descricao: 'Fissura', local: 'Sala', status: 'Em andamento', responsavel: 'Raimundo', responsavel_id: 'u2', prazo: '2026-10-24' }),
  reg({ numero: 3, descricao: 'Rejunte', local: 'Suíte', responsavel: 'Raimundo', responsavel_id: 'u2' }),
  reg({ numero: 4, descricao: 'Ralo', local: 'Área gourmet', status: 'Resolvido', prazo: '2026-10-16' }),
]
const nums = (l) => l.map((r) => r.numero)
conferir('busca ignora acento e caixa', nums(filtrarRegistros(lista, { busca: 'AGUA' }, HOJE)), [])
conferir('busca acha "area" em "Área gourmet"', nums(filtrarRegistros(lista, { busca: 'area' }, HOJE)), [4])
conferir('busca pelo nº com #', nums(filtrarRegistros(lista, { busca: '#3' }, HOJE)), [3])
conferir('filtro atrasados não traz resolvido', nums(filtrarRegistros(lista, { prazo: 'Atrasados' }, HOJE)), [1])
conferir('filtros somam', nums(filtrarRegistros(lista, { status: 'Pendente', responsavel: 'u2' }, HOJE)), [3])
conferir('contagem por situação', contarStatus(lista), { Total: 4, Pendente: 2, 'Em andamento': 1, Resolvido: 1 })
conferir('pendentes por responsável: sem resolvidos, maior primeiro', pendentesPorResponsavel(lista), [{ id: 'u2', nome: 'Raimundo', quantidade: 2 }, { id: 'u1', nome: 'Ana', quantidade: 1 }])
conferir('dois responsáveis com o mesmo nome não viram um só', pendentesPorResponsavel([reg({ responsavel: 'João', responsavel_id: 'x' }), reg({ responsavel: 'João', responsavel_id: 'y' })]).map((p) => p.id).sort(), ['x', 'y'])
conferir('resolver grava foto e data; andar só muda a situação', [mudancaDeSituacao('Resolvido', { foto_evidencia: 'f' }, HOJE), mudancaDeSituacao('Em andamento', {}, HOJE)], [{ status: 'Resolvido', foto_evidencia: 'f', resolvido_em: HOJE }, { status: 'Em andamento' }])
conferir('ordem: vencido, abertos por prazo, resolvido no fim', nums(ordenarRegistros(lista, HOJE)), [1, 3, 2, 4])

conferir('registro vazio aponta os 5 campos', chaves(validarRegistro({}, HOJE)), ['descricao', 'empreiteiro_id', 'local', 'prazo', 'responsavel_id'])
conferir('prazo antes da vistoria é recusado', chaves(validarRegistro({ descricao: 'x', local: 'y', empreiteiro_id: 'e1', responsavel_id: 'u1', prazo: '2026-10-19' }, HOJE)), ['prazo'])
conferir('não pula de Pendente para Resolvido', chaves(validarMudancaRegistro('Pendente', 'Resolvido', { foto_evidencia: 'x' })), ['status'])
conferir('resolver exige foto de evidência', chaves(validarMudancaRegistro('Em andamento', 'Resolvido', {})), ['foto_evidencia'])
conferir('em andamento não pede foto', validarMudancaRegistro('Pendente', 'Em andamento'), {})

conferir('carimbo dd/mm/aaaa hh:mm', formatarCarimbo('2026-10-20T14:18:05'), '20/10/2026 14:18')
const hist = anexarObservacao(anexarObservacao('', 'primeira', '2026-10-20T08:00:00'), 'segunda\nlinha', '2026-10-20T09:30:00')
conferir('nota nova entra no topo, uma por linha', notasDoHistorico(hist), [{ carimbo: '20/10/2026 09:30', texto: 'segunda linha' }, { carimbo: '20/10/2026 08:00', texto: 'primeira' }])

conferir('Qualidade fica em Mais no celular de quem vê', ['Engenheiro', 'Mestre', 'Arquiteta'].map((r) => MENUS[r].itens.includes('qualidade') && !itensDaBarra(r).includes('qualidade')), [true, true, true])
conferir('barra da arquiteta', itensDaBarra('Arquiteta'), ['pendencias', 'frentes', 'fotos', 'mais'])
conferir('cliente não tem Qualidade', MENUS.Cliente.itens.includes('qualidade'), false)

// ── multi-obra e permissões (dados.js) ──────────────────────────────────────
await dados.entrarComo('u1')
conferir('sem obra escolhida não sai nada', (await dados.listarVistoria()).erro, 'Nenhuma obra selecionada.')
dados.definirContexto({ obraId: 'o2' })
const o2 = (await dados.listarVistoria()).data
conferir('obra 2: só o registro dela', o2.registros.map((r) => r.id), ['vr7'])
conferir('obra 2: só o empreiteiro dela', o2.empreiteiros.map((e) => e.id), ['e9'])
conferir('obra 2: responsáveis são a equipe dela que vê a Qualidade (com a arquiteta)', o2.pessoas.map((p) => p.id), ['u1', 'u3'])
conferir('obra 2 não mexe em registro da obra 1', (await dados.moverRegistroVistoria('vr1', 'Em andamento')).erro, 'Registro não encontrado nesta obra.')
conferir('obra 2 não usa empreiteiro da obra 1', (await dados.criarRegistroVistoria({ descricao: 'x', local: 'y', empreiteiro_id: 'e2', responsavel_id: 'u1', prazo: HOJE })).erro, 'Empresa não encontrada nesta obra.')
const novoO2 = (await dados.criarRegistroVistoria({ descricao: 'Bloco B2 com ninho', local: 'Bloco B2', empreiteiro_id: 'e9', responsavel_id: 'u1', prazo: HOJE })).data
conferir('nº é por obra: na obra 2 o novo é o #2', [novoO2.numero, novoO2.status, novoO2.vistoriado_por], [2, 'Pendente', 'u1'])
conferir('arquiteta pode ser a responsável na Vistoria', (await dados.criarRegistroVistoria({ descricao: 'x', local: 'y', empreiteiro_id: 'e9', responsavel_id: 'u3', prazo: HOJE })).data?.responsavel, 'Carla')

dados.definirContexto({ obraId: 'o1' })
const o1 = (await dados.listarVistoria()).data
conferir('obra 1: 6 registros, nenhum da obra 2', [o1.registros.length, o1.registros.some((r) => r.obra_id !== 'o1')], [6, false])
conferir('obra 1: o #1 está vencido e vem primeiro', [o1.registros[0].numero, estaVencido(o1.registros[0], HOJE)], [1, true])
conferir('obra 1: novo registro é o #7', (await dados.criarRegistroVistoria({ descricao: 'x', local: 'y', empreiteiro_id: 'e2', responsavel_id: 'u2', prazo: HOJE, observacao: 'nota' })).data.numero, 7)
conferir('resolver sem foto é recusado', (await dados.moverRegistroVistoria('vr2', 'Resolvido')).erro, 'Tire a foto da correção para resolver.')
const resolvido = (await dados.moverRegistroVistoria('vr2', 'Resolvido', { foto_evidencia: 'blob:x' })).data
conferir('resolver grava data e foto', [resolvido.status, resolvido.resolvido_em, resolvido.foto_evidencia], ['Resolvido', HOJE, 'blob:x'])
conferir('a mudança entra nas observações', notasDoHistorico(resolvido.observacoes)[0].texto, 'Resolvido — por Davidson.')

// Mestre registra e anota; não exclui. Arquiteta só vê. Cliente não vê.
await dados.entrarComo('u2')
dados.definirContexto({ obraId: 'o1' })
conferir('mestre anota', notasDoHistorico((await dados.anotarRegistroVistoria('vr3', 'Hidro Sul vem quinta')).data.observacoes)[0].texto, 'Hidro Sul vem quinta')
conferir('mestre não exclui', (await dados.excluirRegistroVistoria('vr3')).erro, 'Só o engenheiro exclui registro.')
await dados.entrarComo('u3')
dados.definirContexto({ obraId: 'o1' })
conferir('arquiteta vê', (await dados.listarVistoria()).erro, null)
conferir('arquiteta não muda situação', (await dados.moverRegistroVistoria('vr3', 'Em andamento')).erro, 'Sem permissão para mudar a situação.')
await dados.entrarComo('u4')
dados.definirContexto({ obraId: 'o1' })
conferir('cliente não vê a Qualidade', (await dados.listarVistoria()).erro, 'Sem permissão.')

console.log(`${ok}/${tot} — qualidade`)
process.exit(ok === tot ? 0 : 1)
