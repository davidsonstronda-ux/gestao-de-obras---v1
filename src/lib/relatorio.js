// Regra pura do relatório de Qualidade: o texto dos filtros aplicados e o
// carimbo de "gerado em". Sem React, sem banco. Os recortes em si (o que entra
// em cada seção) são os mesmos das abas: filtrarRegistros, filtrarNcs e
// filtrarObservacoes.
import { formatarData } from './datas.js'

const juntar = (partes) => partes.filter(Boolean).join(' · ')

// Uma linha por aba, em português, para o cabeçalho do relatório.
export function descreverFiltros({ vistoria, pessoas = [], filtroNc, gemba }) {
  const busca = (t) => t.trim() && `busca "${t.trim()}"`
  const prazo = (p) => p !== 'Todos' && `prazo: ${p.toLowerCase()}`
  const linhaVistoria = juntar([
    vistoria.status && `situação: ${vistoria.status}`,
    vistoria.responsavel && `responsável: ${pessoas.find((p) => p.id === vistoria.responsavel)?.nome || '—'}`,
    prazo(vistoria.prazo),
    busca(vistoria.busca),
  ])
  const linhaGemba = juntar([gemba.tipo && `desperdício: ${gemba.tipo}`, prazo(gemba.prazo), busca(gemba.busca)])
  return [
    `Vistoria: ${linhaVistoria || 'todos os registros'}`,
    `Não conformidades: ${filtroNc.toLowerCase()}`,
    `Gemba Walk: ${linhaGemba ? `${linhaGemba} (só em aberto)` : 'observações em aberto'}`,
  ]
}

// '20/10/2026 às 14:18'. O dia vem de hoje() (fixo no mock); a hora, do relógio.
export function carimboDeGeracao(hojeIso, agora = new Date()) {
  const hh = String(agora.getHours()).padStart(2, '0')
  const mm = String(agora.getMinutes()).padStart(2, '0')
  return `${formatarData(hojeIso)} às ${hh}:${mm}`
}
