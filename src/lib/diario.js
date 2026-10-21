// Regras do diário de obra. Fonte: PRD-FRONTEND.md "Diário do dia" e
// PRD-BACKEND.md "diarios" / "apontamentos".
import { diasEntre, somarDiasUteis } from './datas.js'
import { frenteVisivelNoRisco } from './atraso.js'

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

// Como o diário de um dia abre na tela. Dia sem diário conta como se fosse da
// própria pessoa: o mestre pode lançar o de ontem que esqueceu, não o de antes.
export function acessoAoDia({ role, userId, diario, data, hoje }) {
  if (data > hoje) return { editavel: false, motivo: 'Este dia ainda não chegou.' }
  const alvo = diario || { data, autor_id: userId }
  if (podeEditarDiario({ role, userId, diario: alvo, hoje })) return { editavel: true, motivo: null }
  if (role === 'Mestre' && alvo.autor_id !== userId) return { editavel: false, motivo: 'Só leitura: lançado por outra pessoa.' }
  if (role === 'Mestre') return { editavel: false, motivo: 'Só leitura: o prazo de edição deste diário acabou.' }
  return { editavel: false, motivo: 'Só leitura.' }
}

// Setas do topo: dia útil anterior/seguinte (segunda a sábado). Nunca passa de
// hoje; devolve null quando não há para onde ir.
export function diaVizinho(data, passo, hoje) {
  const alvo = somarDiasUteis(data, passo)
  return alvo > hoje ? null : alvo
}

// Frentes que entram no diário de um dia. Hoje: as do risco (em andamento ou
// com início vencido). Dia passado: as que tinham começado e não estavam
// concluídas naquele dia. Em qualquer dia, as já marcadas no diário entram,
// mesmo que hoje a frente esteja concluída.
export function frentesDoDia(frentes, data, hoje, idsMarcados = []) {
  return frentes.filter((f) => {
    if (idsMarcados.includes(f.id)) return true
    if (data === hoje) return frenteVisivelNoRisco(f, hoje)
    if (f.situacao === 'Concluída' && (!f.concluida_em || f.concluida_em < data)) return false
    return f.inicio_previsto <= data
  })
}
