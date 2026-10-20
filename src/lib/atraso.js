// A regra central do app: quanto de folga cada frente ainda tem, e até quando
// dá para decidir antes de empurrar a entrega. Fonte: PLANO-DO-PROJETO.md,
// "Como o sistema calcula o atraso". Regra pura: sem React, sem banco.
import { diasEntre, somarDiasUteis } from './datas.js'

export const RISCOS = ['Estourou a folga', 'Atenção', 'No prazo']
export const LIMITE_ATENCAO = 5 // dias úteis de folga ou menos = Atenção [DESCOBRIR NO USO]

export const MOTIVOS = [
  'Falta material',
  'Falta gente',
  'Aguardando projeto',
  'Aguardando outra frente',
  'Chuva',
  'Outro',
]

export function riscoDaFolga(folgaRestante) {
  if (folgaRestante < 0) return 'Estourou a folga'
  if (folgaRestante <= LIMITE_ATENCAO) return 'Atenção'
  return 'No prazo'
}

// Frente que aparece em "Frentes em risco": em andamento, ou que deveria ter
// começado e não começou. Concluídas e as que ainda não chegaram na data ficam fora.
export function frenteVisivelNoRisco(frente, hoje) {
  if (frente.situacao === 'Concluída') return false
  if (frente.situacao === 'Em andamento') return true
  return frente.inicio_previsto <= hoje
}

// diarios: diários DA MESMA OBRA ({ id, data }).
// apontamentos: apontamentos DESTA FRENTE ({ diario_id, situacao, motivo }).
export function calcularFrente(frente, diarios, apontamentos, hoje) {
  const porDiario = new Map(apontamentos.map((a) => [a.diario_id, a]))
  const fim = frente.situacao === 'Concluída' && frente.concluida_em ? frente.concluida_em : hoje

  // Dia perdido: diário lançado, a partir do início previsto, em que a frente
  // não recebeu "Andou". Dia sem diário nenhum não conta.
  const doPeriodo = diarios
    .filter((d) => d.data >= frente.inicio_previsto && d.data <= fim)
    .sort((a, b) => (a.data < b.data ? -1 : 1))

  let diasPerdidos = 0
  let ultimoAndou = null
  let ultimoMotivo = null
  for (const d of doPeriodo) {
    const ap = porDiario.get(d.id)
    if (ap && ap.situacao === 'Andou') {
      ultimoAndou = d.data
    } else {
      diasPerdidos++
      if (ap && ap.motivo) ultimoMotivo = ap.motivo
    }
  }
  const folgaRestante = frente.folga_dias - diasPerdidos
  const referencia = ultimoAndou || frente.inicio_previsto
  const diasSemAndar = Math.max(0, diasEntre(referencia, hoje))

  return {
    diasPerdidos,
    folgaRestante,
    dataLimite: somarDiasUteis(hoje, folgaRestante),
    risco: riscoDaFolga(folgaRestante),
    diasSemAndar,
    ultimoAndou,
    ultimoMotivo,
  }
}

// Quanto da folga já foi comido, de 0 a 1 (1 = estourou ou passou). É a "régua
// de folga" de cada frente na tela. Folga 0 com qualquer dia perdido = 1.
export function folgaConsumida(folgaDias, diasPerdidos) {
  if (diasPerdidos <= 0) return 0
  if (folgaDias <= 0) return 1
  return Math.min(1, diasPerdidos / folgaDias)
}

// Ordem da tela Frentes em risco: "Estourou a folga" sempre no topo; dentro de
// cada grupo, pela data limite (menos folga primeiro) ou por dias sem andar.
export function ordenarFrentes(lista, ordem = 'limite') {
  const topo = (f) => (f.calculo.risco === 'Estourou a folga' ? 0 : 1)
  return [...lista].sort((a, b) => {
    const t = topo(a) - topo(b)
    if (t) return t
    if (ordem === 'parado') return b.calculo.diasSemAndar - a.calculo.diasSemAndar
    return a.calculo.folgaRestante - b.calculo.folgaRestante
  })
}

// "A entrega está de pé?" — por obra.
export function situacaoEntrega(frentesCalculadas) {
  const estouradas = frentesCalculadas.filter((f) => f.calculo.risco === 'Estourou a folga').length
  return { dePe: estouradas === 0, estouradas }
}
