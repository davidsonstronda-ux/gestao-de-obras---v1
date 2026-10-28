// Datas sempre como texto 'aaaa-mm-dd' (igual ao `date` do banco), tratadas no
// fuso local. Nunca use toISOString() para tirar o dia: ele converte para UTC e,
// no Brasil, depois das 21h vira o dia seguinte.

export function paraData(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function paraIso(data) {
  const a = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

// 'aaaa-mm-dd' -> 'dd/mm/aaaa'
export function formatarData(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// 'aaaa-mm-dd' -> 'dd/mm'
export function formatarDiaMes(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export function diaDaSemana(iso) {
  return SEMANA[paraData(iso).getDay()]
}

// Dias corridos de `de` até `ate` (ate − de).
export function diasEntre(de, ate) {
  return Math.round((paraData(ate) - paraData(de)) / 86400000)
}

// Dia útil de obra = segunda a sábado.
export function ehDiaUtil(iso) {
  return paraData(iso).getDay() !== 0
}

// Soma n dias úteis (segunda a sábado) a partir de `iso`. n negativo volta.
export function somarDiasUteis(iso, n) {
  const data = paraData(iso)
  const passo = n < 0 ? -1 : 1
  let faltam = Math.abs(n)
  while (faltam > 0) {
    data.setDate(data.getDate() + passo)
    if (data.getDay() !== 0) faltam--
  }
  return paraIso(data)
}

export function formatarDinheiro(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Para cartão pequeno: 141500 -> "R$ 141,5 mil".
export function formatarDinheiroCurto(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
}

// O dia corrido seguinte (sem pular domingo): '2026-10-31' -> '2026-11-01'.
export function diaSeguinte(iso) {
  const data = paraData(iso)
  data.setDate(data.getDate() + 1)
  return paraIso(data)
}
