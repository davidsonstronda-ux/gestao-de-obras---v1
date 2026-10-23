// MEDIÇÃO — a regra pura (sem React, sem banco). Fonte: PRD-FRONTEND "Tela:
// Medição" e PRD-BACKEND "medicoes / medicao_itens", com os acréscimos de 23/10.
//
// O valor contratado é um por frente (tabela contratos). Uma medição é de um
// empreiteiro num período, com um item por frente dele. Medido = soma dos itens
// de medições Fechadas; Rascunho ainda não conta. A medir = o que o mestre
// concluiu (por ambiente) depois do fim da última medição fechada do empreiteiro.

import { diaSeguinte, formatarData, formatarDinheiro } from './datas.js'

export const SITUACOES_MEDICAO = ['Rascunho', 'Fechada']

// Dinheiro em centavos inteiros, para a soma não juntar lixo de vírgula.
const centavos = (v) => Math.round(Number(v || 0) * 100)
const reais = (c) => c / 100

// Arredonda para centavos (o que o banco guarda em numeric(14,2)).
export function arredondarCentavos(valor) {
  return reais(centavos(valor))
}

// Quanto ainda cabe medir numa frente: contratado − já medido, nunca negativo.
export function sobraDoContrato(contratado, jaMedido) {
  return reais(Math.max(centavos(contratado) - centavos(jaMedido), 0))
}

// O valor lançado é diferente do sugerido? Comparado em centavos. Em branco não difere.
export function difereDoSugerido(valor, sugerido) {
  return valor !== null && valor !== undefined && centavos(valor) !== centavos(sugerido)
}

// Ambientes concluídos de `inicio` a `fim`, as duas pontas incluídas.
export function concluidosNoPeriodo(ambientes, inicio, fim) {
  if (!inicio || !fim || fim < inicio) return []
  return ambientes.filter((a) => a.concluido_em && a.concluido_em >= inicio && a.concluido_em <= fim)
}

// Valor sugerido de uma frente: contratado × ambientes concluídos ÷ total de ambientes.
export function valorSugerido(valorContratado, concluidos, totalAmbientes) {
  if (!totalAmbientes || !concluidos) return 0
  return reais(Math.round((centavos(valorContratado) * concluidos) / totalAmbientes))
}

// Fim da última medição fechada de um empreiteiro (null se ainda não tem).
export function fimDaUltimaFechada(medicoesDoEmpreiteiro) {
  const fins = medicoesDoEmpreiteiro.filter((m) => m.situacao === 'Fechada').map((m) => m.periodo_fim).sort()
  return fins.at(-1) || null
}

// Uma frente na medição: contratado, medido, a medir e saldo.
// `ambientes` são as linhas de frente_ambientes dela; `medido` a soma dos itens
// dela em medições Fechadas; `desde` é o fim da última medição fechada.
export function resumoFrente({ valorContratado, ambientes, medido, desde }) {
  const saldo = sobraDoContrato(valorContratado, medido)
  const novos = ambientes.filter((a) => a.concluido_em && (!desde || a.concluido_em > desde)).length
  return {
    contratado: arredondarCentavos(valorContratado),
    medido: arredondarCentavos(medido),
    // Nunca sugere medir mais do que sobra do contrato.
    aMedir: Math.min(valorSugerido(valorContratado, novos, ambientes.length), saldo),
    saldo,
    pct: percentualMedido(medido, valorContratado),
    ambientesNovos: novos,
  }
}

// Soma as frentes de um empreiteiro (ou de toda a obra).
export function somarResumos(resumos) {
  const t = { contratado: 0, medido: 0, aMedir: 0, saldo: 0 }
  for (const r of resumos) for (const k of Object.keys(t)) t[k] += centavos(r[k])
  const total = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, reais(v)]))
  return { ...total, pct: percentualMedido(total.medido, total.contratado) }
}

// Total de uma medição: a soma dos valores dos itens.
export function totalDaMedicao(itens) {
  return reais(itens.reduce((s, i) => s + centavos(i.valor), 0))
}

// % medido do contratado, inteiro, de 0 a 100 (contrato zerado conta como 0).
export function percentualMedido(medido, contratado) {
  if (!contratado) return 0
  return Math.min(100, Math.floor((centavos(medido) / centavos(contratado)) * 100))
}

// Número de cada medição dentro do empreiteiro: a mais antiga é a nº 1.
export function numerarMedicoes(medicoes) {
  const porEmpreiteiro = new Map()
  const ordem = [...medicoes].sort((a, b) => (a.periodo_inicio < b.periodo_inicio ? -1 : a.periodo_inicio > b.periodo_inicio ? 1 : a.created_at < b.created_at ? -1 : 1))
  const numero = new Map()
  for (const m of ordem) {
    const n = (porEmpreiteiro.get(m.empreiteiro_id) || 0) + 1
    porEmpreiteiro.set(m.empreiteiro_id, n)
    numero.set(m.id, n)
  }
  return medicoes.map((m) => ({ ...m, numero: numero.get(m.id) }))
}

// Histórico: da mais recente para a mais antiga (pelo fim do período).
export function ordenarHistorico(medicoes) {
  return [...medicoes].sort((a, b) => (a.periodo_fim < b.periodo_fim ? 1 : a.periodo_fim > b.periodo_fim ? -1 : b.numero - a.numero))
}

// Lista de empreiteiros: quem tem algo a medir primeiro, depois pelo nome.
export function ordenarEmpreiteiros(lista) {
  return [...lista].sort((a, b) => (b.aMedir > 0) - (a.aMedir > 0) || a.nome.localeCompare(b.nome))
}

// ── nova medição ────────────────────────────────────────────────────────────

// Período padrão: do dia seguinte à última medição fechada até hoje. Sem
// medição fechada, começa no início previsto mais cedo das frentes do empreiteiro.
export function periodoPadrao({ ultimaFechada, iniciosPrevistos, hoje }) {
  let inicio = ultimaFechada ? diaSeguinte(ultimaFechada) : [...iniciosPrevistos].sort()[0] || hoje
  if (inicio > hoje) inicio = hoje
  return { inicio, fim: hoje }
}

// Sugerido de uma frente num período: ambientes concluídos de `inicio` a `fim`
// (inclusive), sem passar do que sobra do contrato.
export function sugeridoNoPeriodo({ valorContratado, ambientes, inicio, fim, jaMedido = 0 }) {
  const noPeriodo = concluidosNoPeriodo(ambientes, inicio, fim).length
  return Math.min(valorSugerido(valorContratado, noPeriodo, ambientes.length), sobraDoContrato(valorContratado, jaMedido))
}

// Dinheiro digitado: aceita "1.234,56", "1234,56", "1234.56" e "1.500".
// Devolve número ≥ 0 com centavos, ou null se não for número.
export function lerDinheiro(texto) {
  let t = String(texto ?? '').trim().replace(/^R\$\s*/, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, '')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return reais(Math.round(Number(t) * 100))
}

// Percentual digitado ("25", "12,5"); número ≥ 0 ou null.
export function lerPercentualDigitado(texto) {
  const t = String(texto ?? '').trim().replace('%', '').trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

// R$ ↔ %: o valor em R$ é o que vale (é ele que é gravado); o % sai dele.
export function valorDoPercentual(contratado, pct) {
  return reais(Math.round((centavos(contratado) * pct) / 100))
}
export function percentualDoValor(valor, contratado) {
  if (!contratado) return 0
  return Math.round((centavos(valor) / centavos(contratado)) * 10000) / 100
}

// Para preencher os campos: "15.500,00" e "25" / "12,5".
export function textoDinheiro(valor) {
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function textoPercentual(pct) {
  return Number(pct).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

// Problemas de uma medição, um por campo, para a tela avisar na hora e a camada
// de dados recusar. Chaves: 'periodo', 'total', 'valor:<frente>', 'justificativa:<frente>'.
// `linhas`: { frente_id, contratado, jaMedido, valor_sugerido, valor (número ou null), justificativa }.
export function validarMedicao({ periodo_inicio, periodo_fim, linhas }, { hoje, ultimaFechada }) {
  const p = {}
  // Última fechada terminando hoje: não sobra dia para uma medição nova.
  if (ultimaFechada && ultimaFechada >= hoje) p.periodo = 'A última medição fechada já vai até hoje: a próxima só pode começar amanhã.'
  else if (!periodo_inicio || !periodo_fim) p.periodo = 'Preencha o período (de e até).'
  else if (periodo_fim < periodo_inicio) p.periodo = 'O fim do período não pode ser antes do início.'
  else if (periodo_fim > hoje) p.periodo = 'O período não pode terminar depois de hoje.'
  else if (ultimaFechada && periodo_inicio <= ultimaFechada) p.periodo = `O período precisa começar depois de ${formatarData(ultimaFechada)}, fim da última medição fechada.`
  for (const l of linhas) {
    if (l.valor === null || l.valor === undefined) {
      p[`valor:${l.frente_id}`] = 'Digite o valor em R$ ou em % (pode ser 0).'
      continue
    }
    const sobra = sobraDoContrato(l.contratado, l.jaMedido)
    if (centavos(l.valor) > centavos(sobra)) p[`valor:${l.frente_id}`] = `Passa de 100% do contratado: sobram ${formatarDinheiro(sobra)} para medir.`
    else if (difereDoSugerido(l.valor, l.valor_sugerido) && !String(l.justificativa || '').trim()) {
      p[`justificativa:${l.frente_id}`] = 'O valor é diferente do sugerido: escreva a justificativa.'
    }
  }
  if (linhas.length && linhas.every((l) => l.valor === 0)) p.total = 'A medição está zerada: lance o valor de pelo menos uma frente.'
  return p
}

// ── ficha da medição ────────────────────────────────────────────────────────

// O que a tela guarda quando a pessoa digita R$ ou %: o outro campo sai dele.
export function campoPeloValor(texto, contratado) {
  const v = lerDinheiro(texto)
  return { reais: texto, pct: v === null ? '' : textoPercentual(percentualDoValor(v, contratado)) }
}
export function campoPeloPercentual(texto, contratado) {
  const p = lerPercentualDigitado(texto)
  return { pct: texto, reais: p === null ? '' : textoDinheiro(valorDoPercentual(contratado, p)) }
}

// Uma frente como aparece na ficha. Editável: o sugerido sai do período e o valor
// é o digitado (`campo`) ou, se a pessoa não mexeu, o sugerido. Fechada: o gravado.
// `frente`: { contratado, jaMedido, ambientes, item } (de fichaMedicao).
export function linhaDaFicha({ frente, campo, periodo, editavel }) {
  const noPeriodo = concluidosNoPeriodo(frente.ambientes, periodo.inicio, periodo.fim)
  const sugerido = editavel
    ? sugeridoNoPeriodo({ valorContratado: frente.contratado, ambientes: frente.ambientes, inicio: periodo.inicio, fim: periodo.fim, jaMedido: frente.jaMedido })
    : frente.item?.valor_sugerido ?? 0
  let valor = sugerido
  if (!editavel) valor = frente.item?.valor ?? 0
  else if (campo) valor = lerDinheiro(campo.reais)
  const texto = campo || { reais: textoDinheiro(valor ?? 0), pct: textoPercentual(percentualDoValor(valor ?? 0, frente.contratado)) }
  return {
    ...frente, noPeriodo, valor_sugerido: sugerido, valor,
    reais: texto.reais, pct: texto.pct,
    justificativa: (editavel ? campo?.justificativa : frente.item?.justificativa) || '',
    difere: difereDoSugerido(valor, sugerido),
  }
}

// O rodapé da ficha: total desta medição, acumulado com ela e o saldo depois.
// O % do acumulado não é travado em 100, para mostrar quanto passou.
export function resumoDaFicha(linhas) {
  const total = totalDaMedicao(linhas.map((l) => ({ valor: l.valor || 0 })))
  const contratado = totalDaMedicao(linhas.map((l) => ({ valor: l.contratado })))
  const acumulado = totalDaMedicao([...linhas.map((l) => ({ valor: l.jaMedido })), { valor: total }])
  return {
    total, acumulado,
    pctAcumulado: percentualDoValor(acumulado, contratado),
    saldoDepois: sobraDoContrato(contratado, acumulado),
    nadaSugerido: linhas.every((l) => !difereDoSugerido(l.valor_sugerido, 0)),
  }
}

// ── exportar para Excel (CSV) ───────────────────────────────────────────────
// Separador ";" e vírgula decimal, que é como o Excel em português abre direto.
const celula = (v) => {
  const t = String(v ?? '')
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}
const numeroCsv = (v) => (centavos(v) / 100).toFixed(2).replace('.', ',')
// O BOM no começo do arquivo faz o Excel ler os acentos certo; linha termina em
// CR+LF, como no Windows. Escritos por código para não virarem caractere invisível.
const BOM = String.fromCharCode(0xfeff)
const FIM_DE_LINHA = String.fromCharCode(13, 10)

export function medicaoCsv({ obra, empreiteiro, numero, periodo_inicio, periodo_fim, situacao, linhas }) {
  const total = totalDaMedicao(linhas)
  const tabela = [
    ['Obra', obra], ['Empreiteiro', empreiteiro], ['Medição nº', numero],
    ['Período', `${formatarData(periodo_inicio)} a ${formatarData(periodo_fim)}`], ['Situação', situacao], [],
    ['Frente', 'Contratado', 'Medido antes', 'Sugerido', 'Valor desta medição', '% do contratado', 'Justificativa'],
    ...linhas.map((l) => [l.servico, numeroCsv(l.contratado), numeroCsv(l.jaMedido), numeroCsv(l.valor_sugerido), numeroCsv(l.valor),
      textoPercentual(percentualDoValor(l.valor, l.contratado)), l.justificativa || '']),
    ['Total', '', '', '', numeroCsv(total)],
  ]
  return BOM + tabela.map((linha) => linha.map(celula).join(';') + FIM_DE_LINHA).join('')
}

export function nomeArquivoMedicao({ codigoObra, empreiteiro, numero }) {
  // Separa letra de acento (NFD) e fica só com o que é ASCII.
  const limpo = (t) => [...String(t).normalize('NFD')].filter((c) => c.charCodeAt(0) < 128).join('').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `medicao-${limpo(codigoObra)}-${limpo(empreiteiro)}-${numero}.csv`
}
