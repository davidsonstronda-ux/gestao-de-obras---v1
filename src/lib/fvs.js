// Regra pura da FVS (Ficha de Verificação de Serviço), aba do módulo Qualidade.
// Sem React, sem banco. Textos idênticos aos CHECKs de fvs_modelos,
// fvs_vistorias e fvs_ncs (PRD-BACKEND.md).
import { diasEntre } from './datas.js'

export const CATEGORIAS_FVS = ['Impermeabilização', 'Estrutura', 'Instalações', 'Acabamento']
export const GRUPOS_SUGERIDOS = ['Pré-execução', 'Execução', 'Proteção e acabamento']
export const RESPOSTAS = ['OK', 'NC', 'N.A.']
export const SEVERIDADES = ['Baixa', 'Média', 'Alta']
const STATUS_VISTORIA_FVS = ['Em andamento', 'Concluída'] // nesta ordem na lista
export const FILTROS_NC = ['Em aberto', 'Fechadas', 'Todas'] // o primeiro é o padrão

// ── modelos ─────────────────────────────────────────────────────────────────
// Itens numerados por grupo: 1.1, 1.2, 2.1…
export function numerarItens(grupos) {
  return grupos.map((g, gi) => ({
    ...g,
    numero: gi + 1,
    itens: g.itens.map((item, ii) => ({ ...item, codigo: `${gi + 1}.${ii + 1}` })),
  }))
}

export const todosOsItens = (grupos) => grupos.flatMap((g) => g.itens)

// Próximo código de modelo: FVS-01, FVS-02… (o maior + 1).
export function proximoCodigoModelo(modelos) {
  const maior = modelos.reduce((m, x) => Math.max(m, Number(String(x.codigo).replace(/\D/g, '')) || 0), 0)
  return `FVS-${String(maior + 1).padStart(2, '0')}`
}

export function validarModelo(m) {
  const p = {}
  if (!String(m.nome || '').trim()) p.nome = 'Dê um nome ao modelo.'
  if (!CATEGORIAS_FVS.includes(m.categoria)) p.categoria = 'Escolha a categoria.'
  const grupos = m.grupos || []
  if (!grupos.length) p.grupos = 'O modelo precisa de pelo menos um grupo com um item.'
  else if (grupos.some((g) => !String(g.nome || '').trim())) p.grupos = 'Todo grupo precisa de nome.'
  else if (grupos.some((g) => !g.itens.length)) p.grupos = 'Todo grupo precisa de pelo menos um item.'
  else if (grupos.some((g) => g.itens.some((i) => !String(i.titulo || '').trim()))) p.grupos = 'Há item sem texto. Escreva ou remova.'
  return p
}

// ── vistoria ────────────────────────────────────────────────────────────────
// % de conformidade = OK ÷ (OK + NC), arredondado. Sem OK nem NC, não há % (null).
export function conformidade(ok, nc) {
  return ok + nc ? Math.round((ok / (ok + nc)) * 100) : null
}

export function progressoVistoria(grupos, respostas = {}) {
  const itens = todosOsItens(grupos)
  const conta = (r) => itens.filter((i) => respostas[i.id] === r).length
  const ok = conta('OK')
  const nc = conta('NC')
  const na = conta('N.A.')
  const verificados = ok + nc + na
  return { total: itens.length, ok, nc, na, verificados, pendentes: itens.length - verificados, conformidade: conformidade(ok, nc) }
}

// Só finaliza com todos os itens respondidos, e só uma vez.
export function validarFinalizar(vistoria) {
  if (vistoria.status === 'Concluída') return 'Esta vistoria já foi concluída.'
  const { pendentes } = progressoVistoria(vistoria.grupos, vistoria.respostas)
  if (pendentes) return pendentes === 1 ? 'Falta 1 item para finalizar.' : `Faltam ${pendentes} itens para finalizar.`
  return null
}

// Mudar a resposta de um item. NC só entra pelo painel (que cria a não
// conformidade); item que já tem NC fica travado.
export function validarResposta(vistoria, itemId, resposta, temNc) {
  if (vistoria.status === 'Concluída') return 'Vistoria concluída não muda.'
  if (!todosOsItens(vistoria.grupos).some((i) => i.id === itemId)) return 'Item não encontrado nesta ficha.'
  if (!RESPOSTAS.includes(resposta)) return 'Resposta inválida.'
  if (temNc) return 'Este item já tem não conformidade. Trate pelo fluxo da NC.'
  return null
}

export function validarNovaVistoria({ modelo_id, ambiente }) {
  const p = {}
  if (!modelo_id) p.modelo_id = 'Escolha o modelo da ficha.'
  if (!String(ambiente || '').trim()) p.ambiente = 'Diga o ambiente. Ex.: Banheiro social · Térreo'
  return p
}

// Lista de vistorias: em andamento primeiro, depois a mais nova; empate pelo id,
// para a ordem não mudar a cada carregamento.
export function ordenarVistorias(vistorias) {
  return [...vistorias].sort((a, b) => (
    STATUS_VISTORIA_FVS.indexOf(a.status) - STATUS_VISTORIA_FVS.indexOf(b.status)
    || (a.criada_em < b.criada_em ? 1 : a.criada_em > b.criada_em ? -1 : 0)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  ))
}

// % conforme geral da obra: soma de OK ÷ soma de OK + NC de todas as vistorias.
export function resumoFvs(vistorias, ncs) {
  let ok = 0
  let nc = 0
  for (const v of vistorias) {
    const p = progressoVistoria(v.grupos, v.respostas)
    ok += p.ok
    nc += p.nc
  }
  return {
    conformidadeGeral: conformidade(ok, nc),
    ncsAbertas: ncs.filter((n) => n.status !== 'Fechada').length,
    vistoriasConcluidas: vistorias.filter((v) => v.status === 'Concluída').length,
  }
}

// ── não conformidades ───────────────────────────────────────────────────────
export const codigoNc = (numero) => `NC-${String(numero).padStart(3, '0')}`

export function proximoNumeroNc(ncs) {
  return ncs.reduce((m, n) => Math.max(m, n.numero || 0), 0) + 1
}

export function validarNc({ descricao, severidade, empreiteiro_id }) {
  const p = {}
  if (!String(descricao || '').trim()) p.descricao = 'Descreva o problema.'
  if (!SEVERIDADES.includes(severidade)) p.severidade = 'Escolha a severidade.'
  if (!empreiteiro_id) p.empreiteiro_id = 'Escolha a empresa que corrige.'
  return p
}

// Os passos possíveis de cada situação. `soEngenheiro` = aprovar ou reprovar.
const PASSOS = {
  Aberta: [{ para: 'Encaminhada', rotulo: 'Encaminhar p/ correção' }],
  Encaminhada: [{ para: 'Corrigida', rotulo: 'Marcar corrigida' }],
  Corrigida: [
    { para: 'Fechada', rotulo: 'Aprovar e fechar', soEngenheiro: true },
    { para: 'Encaminhada', rotulo: 'Reprovar', soEngenheiro: true, pedeMotivo: true },
  ],
  Fechada: [],
}
export function passosNc(status, { podeMover, podeAprovar }) {
  return (PASSOS[status] || []).filter((p) => (p.soEngenheiro ? podeAprovar : podeMover))
}

// Confere o passo; devolve a mensagem do problema ou null.
export function validarPassoNc(atual, novo, { podeMover, podeAprovar, motivo }) {
  const passo = (PASSOS[atual] || []).find((p) => p.para === novo)
  if (!passo) return `De "${atual}" a NC não vai para "${novo}".`
  if (passo.soEngenheiro ? !podeAprovar : !podeMover) return passo.soEngenheiro ? 'Só o engenheiro aprova ou reprova a correção.' : 'Sem permissão para mudar a NC.'
  if (passo.pedeMotivo && !String(motivo || '').trim()) return 'Diga por que a correção foi reprovada.'
  return null
}

// O texto que entra na linha do tempo de cada passo.
export function textoDoPasso(atual, novo, { quem, empresa, motivo }) {
  if (novo === 'Aberta') return `Aberta por ${quem}`
  if (novo === 'Encaminhada' && atual === 'Corrigida') return `Reprovada por ${quem}: ${String(motivo).trim()}. Volta para correção.`
  if (novo === 'Encaminhada') return `Encaminhada à ${empresa} por ${quem}`
  if (novo === 'Corrigida') return `Marcada como corrigida por ${quem}`
  return `Aprovada e fechada por ${quem}`
}

// Dias em aberto: da abertura até hoje (ou até o fechamento).
export function diasEmAberto(nc, hoje) {
  return Math.max(0, diasEntre(nc.aberta_em, nc.fechada_em || hoje))
}

export function filtrarNcs(ncs, filtro) {
  if (filtro === 'Fechadas') return ncs.filter((n) => n.status === 'Fechada')
  if (filtro === 'Todas') return ncs
  return ncs.filter((n) => n.status !== 'Fechada')
}

// Alta primeiro, depois a mais antiga.
export function ordenarNcs(ncs) {
  const peso = (n) => (n.status === 'Fechada' ? 9 : 2 - SEVERIDADES.indexOf(n.severidade))
  return [...ncs].sort((a, b) => peso(a) - peso(b) || (a.aberta_em < b.aberta_em ? -1 : a.aberta_em > b.aberta_em ? 1 : a.numero - b.numero))
}
