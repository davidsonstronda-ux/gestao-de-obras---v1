// Qualidade (aba FVS): a regra em src/lib/fvs.js e o filtro por obra/permissão
// em src/lib/dados.js.
import {
  conformidade, diasEmAberto, filtrarNcs, numerarItens, ordenarNcs, ordenarVistorias, passosNc, progressoVistoria, proximoCodigoModelo, proximoNumeroNc,
  codigoNc, resumoFvs, textoDoPasso, validarFinalizar, validarModelo, validarNc, validarPassoNc, validarResposta,
} from '../src/lib/fvs.js'
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const HOJE = '2026-10-20'
const chaves = (o) => Object.keys(o).sort()
const grupos = [{ nome: 'A', itens: [{ id: 'a', titulo: 'x' }, { id: 'b', titulo: 'y' }] }, { nome: 'B', itens: [{ id: 'c', titulo: 'z' }, { id: 'd', titulo: 'w' }] }]

// ── regra pura ──────────────────────────────────────────────────────────────
conferir('itens numerados por grupo', numerarItens(grupos).flatMap((g) => g.itens.map((i) => i.codigo)), ['1.1', '1.2', '2.1', '2.2'])
conferir('próximo código de modelo', [proximoCodigoModelo([]), proximoCodigoModelo([{ codigo: 'FVS-01' }, { codigo: 'FVS-09' }])], ['FVS-01', 'FVS-10'])
conferir('conformidade arredonda e ignora N.A.', [conformidade(2, 1), conformidade(6, 2), conformidade(0, 0)], [67, 75, null])
conferir('progresso conta cada resposta', progressoVistoria(grupos, { a: 'OK', b: 'NC', c: 'N.A.' }), { total: 4, ok: 1, nc: 1, na: 1, verificados: 3, pendentes: 1, conformidade: 50 })
conferir('finalizar com pendente é recusado', validarFinalizar({ status: 'Em andamento', grupos, respostas: { a: 'OK' } }), 'Faltam 3 itens para finalizar.')
conferir('finalizar completo passa', validarFinalizar({ status: 'Em andamento', grupos, respostas: { a: 'OK', b: 'OK', c: 'N.A.', d: 'NC' } }), null)
conferir('concluída não finaliza de novo', validarFinalizar({ status: 'Concluída', grupos, respostas: {} }), 'Esta vistoria já foi concluída.')
const v = { status: 'Em andamento', grupos, respostas: {} }
conferir('resposta: concluída trava', validarResposta({ ...v, status: 'Concluída' }, 'a', 'OK', false), 'Vistoria concluída não muda.')
conferir('resposta: item com NC trava', validarResposta(v, 'a', 'OK', true), 'Este item já tem não conformidade. Trate pelo fluxo da NC.')
conferir('resposta: item de outra ficha', validarResposta(v, 'zz', 'OK', false), 'Item não encontrado nesta ficha.')

conferir('modelo vazio', chaves(validarModelo({})), ['categoria', 'grupos', 'nome'])
conferir('modelo com item sem texto', validarModelo({ nome: 'X', categoria: 'Estrutura', grupos: [{ nome: 'G', itens: [{ titulo: ' ' }] }] }).grupos, 'Há item sem texto. Escreva ou remova.')
conferir('modelo com grupo vazio', validarModelo({ nome: 'X', categoria: 'Estrutura', grupos: [{ nome: 'G', itens: [] }] }).grupos, 'Todo grupo precisa de pelo menos um item.')
conferir('NC vazia aponta 3 campos', chaves(validarNc({})), ['descricao', 'empreiteiro_id', 'severidade'])

conferir('código da NC com 3 dígitos', [codigoNc(1), codigoNc(12)], ['NC-001', 'NC-012'])
conferir('próximo nº de NC', proximoNumeroNc([{ numero: 1 }, { numero: 3 }]), 4)
const quem = { podeMover: true, podeAprovar: false }
conferir('mestre na NC corrigida não tem passo', passosNc('Corrigida', quem), [])
conferir('engenheiro na corrigida: aprovar ou reprovar', passosNc('Corrigida', { podeMover: true, podeAprovar: true }).map((p) => p.rotulo), ['Aprovar e fechar', 'Reprovar'])
conferir('não pula de Aberta para Fechada', validarPassoNc('Aberta', 'Fechada', { podeMover: true, podeAprovar: true }), 'De "Aberta" a NC não vai para "Fechada".')
conferir('mestre não aprova', validarPassoNc('Corrigida', 'Fechada', quem), 'Só o engenheiro aprova ou reprova a correção.')
conferir('reprovar exige motivo', validarPassoNc('Corrigida', 'Encaminhada', { podeMover: true, podeAprovar: true }), 'Diga por que a correção foi reprovada.')
conferir('reprovar com motivo passa', validarPassoNc('Corrigida', 'Encaminhada', { podeMover: true, podeAprovar: true, motivo: 'ainda oca' }), null)
conferir('texto da timeline', [textoDoPasso('Aberta', 'Encaminhada', { quem: 'Ana', empresa: 'ImperTec' }), textoDoPasso('Corrigida', 'Encaminhada', { quem: 'Ana', motivo: ' ainda oca ' })],
  ['Encaminhada à ImperTec por Ana', 'Reprovada por Ana: ainda oca. Volta para correção.'])
conferir('dias em aberto param no fechamento', [diasEmAberto({ aberta_em: '2026-10-16' }, HOJE), diasEmAberto({ aberta_em: '2026-10-08', fechada_em: '2026-10-10' }, HOJE)], [4, 2])
const ncs = [{ numero: 1, status: 'Fechada', severidade: 'Alta', aberta_em: '2026-10-01' }, { numero: 2, status: 'Aberta', severidade: 'Baixa', aberta_em: '2026-10-02' }, { numero: 3, status: 'Encaminhada', severidade: 'Alta', aberta_em: '2026-10-05' }]
conferir('filtro em aberto tira fechadas', filtrarNcs(ncs, 'Em aberto').map((n) => n.numero), [2, 3])
conferir('ordem: alta primeiro, fechada no fim', ordenarNcs(ncs).map((n) => n.numero), [3, 2, 1])
conferir('vistorias: em andamento primeiro, mais nova antes, empate pelo id', ordenarVistorias([{ id: 'b', status: 'Concluída', criada_em: '2026-10-19' }, { id: 'd', status: 'Em andamento', criada_em: '2026-10-10' }, { id: 'c', status: 'Em andamento', criada_em: '2026-10-10' }, { id: 'a', status: 'Em andamento', criada_em: '2026-10-15' }]).map((x) => x.id), ['a', 'c', 'd', 'b'])
conferir('resumo da obra', resumoFvs([{ grupos, respostas: { a: 'OK', b: 'NC' }, status: 'Concluída' }, { grupos, respostas: { a: 'OK' }, status: 'Em andamento' }], ncs), { conformidadeGeral: 67, ncsAbertas: 2, vistoriasConcluidas: 1 })

// ── multi-obra e permissões (dados.js) ──────────────────────────────────────
await dados.entrarComo('u1')
conferir('sem obra escolhida não sai nada', (await dados.listarFvs()).erro, 'Nenhuma obra selecionada.')
dados.definirContexto({ obraId: 'o2' })
const o2 = (await dados.listarFvs()).data
conferir('obra 2: só a vistoria dela, nenhuma NC', [o2.vistorias.map((x) => x.id), o2.ncs.length], [['fv3'], 0])
conferir('obra 2: modelos da empresa aparecem', o2.modelos.map((m) => m.codigo), ['FVS-01', 'FVS-02'])
conferir('obra 2: resumo dela', o2.resumo, { conformidadeGeral: 100, ncsAbertas: 0, vistoriasConcluidas: 0 })
conferir('obra 2 não responde ficha da obra 1', (await dados.responderItemFvs('fv2', 'fi15', 'OK')).erro, 'Vistoria não encontrada nesta obra.')
conferir('obra 2 não mexe em NC da obra 1', (await dados.moverNcFvs('nc4', 'Encaminhada')).erro, 'Não conformidade não encontrada nesta obra.')
const ncO2 = (await dados.registrarNcFvs('fv3', 'fi3', { descricao: 'Tubo solto', severidade: 'Média', empreiteiro_id: 'e9' })).data
conferir('NC é numerada por obra: na obra 2 é NC-001', [ncO2.nc.codigo, ncO2.vistoria.respostas.fi3], ['NC-001', 'NC'])
conferir('NC na obra 2 não usa empresa da obra 1', (await dados.registrarNcFvs('fv3', 'fi4', { descricao: 'x', severidade: 'Baixa', empreiteiro_id: 'e2' })).erro, 'Empresa não encontrada nesta obra.')

dados.definirContexto({ obraId: 'o1' })
const o1 = (await dados.listarFvs()).data
conferir('obra 1: 2 vistorias e 4 NCs', [o1.vistorias.length, o1.ncs.length], [2, 4])
conferir('obra 1: em andamento primeiro', o1.vistorias.map((x) => x.id), ['fv2', 'fv1'])
conferir('obra 1: resumo (10 OK, 4 NC = 71%)', o1.resumo, { conformidadeGeral: 71, ncsAbertas: 3, vistoriasConcluidas: 1 })
conferir('vistoria concluída não aceita resposta', (await dados.responderItemFvs('fv1', 'fi9', 'OK')).erro, 'Vistoria concluída não muda.')
conferir('NC não entra pelo botão simples', (await dados.responderItemFvs('fv2', 'fi15', 'NC')).erro, 'Para marcar NC, detalhe a não conformidade.')
conferir('item com NC fica travado', (await dados.responderItemFvs('fv2', 'fi14', 'OK')).erro, 'Este item já tem não conformidade. Trate pelo fluxo da NC.')
conferir('finalizar com pendente é recusado', (await dados.finalizarVistoriaFvs('fv2')).erro, 'Falta 1 item para finalizar.')
conferir('responder o último item', (await dados.responderItemFvs('fv2', 'fi15', 'OK')).data.progresso.pendentes, 0)
conferir('agora finaliza', (await dados.finalizarVistoriaFvs('fv2')).data.status, 'Concluída')
const editado = (await dados.salvarModeloFvs({ id: 'fm2', nome: 'Revestimento Cerâmico', categoria: 'Acabamento', grupos: [{ nome: 'Execução', itens: [{ titulo: 'Só um item' }] }] })).data
conferir('editar modelo sobe a versão', [editado.versao, editado.grupos[0].itens[0].id !== ''], [2, true])
conferir('vistoria antiga continua com os itens do dia', (await dados.listarFvs()).data.vistorias.find((x) => x.id === 'fv2').progresso.total, 7)
conferir('novo modelo ganha o próximo código', (await dados.salvarModeloFvs({ nome: 'Contrapiso', categoria: 'Estrutura', grupos: [{ nome: 'Execução', itens: [{ titulo: 'Nível' }] }] })).data.codigo, 'FVS-03')
const nova = (await dados.criarVistoriaFvs({ modelo_id: 'fm1', ambiente: 'Lavabo' })).data
conferir('nova vistoria nasce em andamento com 9 itens', [nova.status, nova.progresso.total, nova.obra_id], ['Em andamento', 9, 'o1'])

// Mestre: encaminha e marca corrigida; não aprova nem edita modelo.
await dados.entrarComo('u2')
dados.definirContexto({ obraId: 'o1' })
const enc = (await dados.moverNcFvs('nc4', 'Encaminhada')).data
conferir('mestre encaminha e entra na timeline', [enc.status, enc.historico.at(-1).texto], ['Encaminhada', 'Encaminhada à Hidro Sul por Seu Raimundo'])
conferir('mestre não aprova', (await dados.moverNcFvs('nc2', 'Fechada')).erro, 'Só o engenheiro aprova ou reprova a correção.')
conferir('mestre não edita modelo', (await dados.salvarModeloFvs({ id: 'fm1', nome: 'x', categoria: 'Estrutura', grupos: [] })).erro, 'Só o engenheiro cria ou edita modelo de FVS.')
await dados.entrarComo('u1')
dados.definirContexto({ obraId: 'o1' })
conferir('engenheiro reprova com motivo: volta a encaminhada', (await dados.moverNcFvs('nc2', 'Encaminhada', { motivo: 'Ainda úmido' })).data.status, 'Encaminhada')
await dados.moverNcFvs('nc3', 'Corrigida')
const fechada = (await dados.moverNcFvs('nc3', 'Fechada')).data
conferir('aprovar fecha e grava a data', [fechada.status, fechada.fechada_em], ['Fechada', HOJE])
await dados.entrarComo('u3')
dados.definirContexto({ obraId: 'o1' })
conferir('arquiteta vê', (await dados.listarFvs()).erro, null)
conferir('arquiteta não responde ficha', (await dados.responderItemFvs('fv2', 'fi15', 'OK')).erro, 'Sem permissão para responder a ficha.')
conferir('arquiteta não mexe em NC', (await dados.moverNcFvs('nc4', 'Corrigida')).erro, 'Sem permissão para mudar a NC.')
await dados.entrarComo('u4')
dados.definirContexto({ obraId: 'o1' })
conferir('cliente não vê', (await dados.listarFvs()).erro, 'Sem permissão.')

console.log(`${ok}/${tot} — fvs`)
process.exit(ok === tot ? 0 : 1)
