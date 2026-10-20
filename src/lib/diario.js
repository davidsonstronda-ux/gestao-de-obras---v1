// Regras do diário de obra. Fonte: PRD-FRONTEND.md "Diário do dia" e
// PRD-BACKEND.md "diarios" / "apontamentos".
import { diasEntre } from './datas.js'

export const CLIMAS = ['Sol', 'Nublado', 'Chuva']

// marcas: { [frente_id]: { situacao: 'Andou' | 'Não andou', motivo, motivo_detalhe } }
// Devolve a lista de problemas; vazia = pode salvar.
export function validarDiario({ clima, frentesIds, marcas }) {
  const erros = []
  if (!CLIMAS.includes(clima)) erros.push('Escolha o clima do dia.')
  const semMarca = frentesIds.filter((id) => !marcas[id] || !marcas[id].situacao)
  if (semMarca.length) {
    erros.push(`Faltam ${semMarca.length} ${semMarca.length === 1 ? 'frente' : 'frentes'} sem Andou/Não andou.`)
  }
  for (const id of frentesIds) {
    const m = marcas[id]
    if (!m || m.situacao !== 'Não andou') continue
    if (!m.motivo) erros.push('Toda frente que não andou precisa de motivo.')
    else if (m.motivo === 'Outro' && !(m.motivo_detalhe || '').trim()) erros.push('Motivo "Outro" precisa de detalhe.')
  }
  return [...new Set(erros)]
}

// O mestre edita o próprio diário até o fim do dia seguinte à data dele.
// O engenheiro edita qualquer um, a qualquer tempo. Os outros não editam.
export function podeEditarDiario({ role, userId, diario, hoje }) {
  if (role === 'Engenheiro') return true
  if (role !== 'Mestre') return false
  if (diario.autor_id && diario.autor_id !== userId) return false
  return diasEntre(diario.data, hoje) <= 1
}
