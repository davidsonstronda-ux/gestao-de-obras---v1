// Importar cronograma por planilha para a EAP do Planejamento. Fonte:
// PLANO-DO-PROJETO.md, "Importar cronograma por planilha". Puro: sem React,
// sem banco, sem window. Recebe a planilha já lida como matriz de células
// ({ texto, serial }); quem lê o arquivo é lib/planilha.js.
// A hierarquia sai do código da coluna ITEM: 1 → 1.1 → 1.1.1, em qualquer profundidade.
import { formatarData } from './datas.js'
import { diasUteisEntre, fimPelaDuracao } from './planejamento.js'

export const COLUNAS_MODELO = ['ITEM', 'Atividade', 'Início', 'Término', 'Duração (Dias)']

const pad = (n) => String(n).padStart(2, '0')
const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// ── código da coluna ITEM ───────────────────────────────────────────────────
// Texto → código normalizado: '1.0' vira '1' (planilha antiga), '2.01' vira
// '2.1', vírgula vale ponto. 1.10 continua 1.10: por isso o ITEM é lido como
// texto, nunca como número. Devolve null se não for um código válido.
export function normalizarItem(texto) {
  const t = String(texto ?? '').trim().replace(/,/g, '.')
  if (!/^\d+(\.\d+)*$/.test(t)) return null
  const partes = t.split('.').map((p) => Number(p))
  while (partes.length > 1 && partes.at(-1) === 0) partes.pop()
  if (partes.some((p) => p < 1)) return null
  return partes.join('.')
}
const paiDoCodigo = (codigo) => (codigo.includes('.') ? codigo.slice(0, codigo.lastIndexOf('.')) : null)
const nivelDoCodigo = (codigo) => codigo.split('.').length - 1

// Ordena 1, 1.1, 1.2, 1.10, 2 (número a número, não como texto).
export function compararCodigos(a, b) {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === undefined) return -1
    if (y[i] === undefined) return 1
    if (x[i] !== y[i]) return x[i] - y[i]
  }
  return 0
}

// ── datas ───────────────────────────────────────────────────────────────────
// Data do Excel é um número de dias desde 30/12/1899 (ou 01/01/1904 em planilha
// antiga de Mac). A conta é feita em UTC só para somar dias inteiros: nada de
// fuso nem toISOString.
// Número que é data do Excel: de 1990 a 2100 (32874 a 73050). Outro número
// (45, 20102026) não é data e vai como texto, para a conferência acusar.
const ehSerialDeData = (v) => typeof v === 'number' && v >= 32874 && v <= 73050

export function serialParaIso(serial, date1904 = false) {
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30)
  const d = new Date(base + Math.floor(serial) * 86400000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
export function isoParaSerial(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000
}

// 'DD/MM/AAAA' (também D/M/AAAA, DD/MM/AA e AAAA-MM-DD) → 'aaaa-mm-dd'; inválida → null.
export function lerData(texto) {
  const t = String(texto ?? '').trim()
  let a, m, d
  const br = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (br) [d, m, a] = [Number(br[1]), Number(br[2]), Number(br[3].length === 2 ? `20${br[3]}` : br[3])]
  else if (iso) [a, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
  else return null
  if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(a, m, 0)).getUTCDate()) return null
  return `${a}-${pad(m)}-${pad(d)}`
}

// '5', '5 dias', '5d', '5,0' → 5. Vazio → null. Texto que não é número → NaN.
export function lerDuracao(texto) {
  const t = String(texto ?? '').trim()
  if (!t) return null
  const m = t.replace(',', '.').match(/^(\d+(\.\d+)?)\s*(d|dia|dias|days?)?$/i)
  return m ? Math.round(Number(m[1])) : NaN
}

// ── CSV (sem biblioteca) ────────────────────────────────────────────────────
// O Excel brasileiro salva CSV com ";" — o separador é o que mais aparece na
// 1ª linha (";", "," ou tabulação). Aspas protegem separador e quebra de linha.
export function lerCsv(texto) {
  const bom = String.fromCharCode(0xfeff) // o Excel põe esta marca invisível no começo do CSV
  const t = String(texto ?? '').replace(new RegExp(`^${bom}`), '')
  const primeira = t.split(/\r?\n/, 1)[0] || ''
  const conta = (c) => primeira.split(c).length - 1
  const sep = [';', ',', '\t'].sort((x, y) => conta(y) - conta(x))[0]
  const linhas = []
  let linha = []
  let campo = ''
  let aspas = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++ } else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) { linha.push(campo); campo = '' } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      linha.push(campo); linhas.push(linha); linha = []; campo = ''
    } else campo += c
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha) }
  return linhas
}

// ── da matriz às linhas de texto ────────────────────────────────────────────
const CABECALHOS = {
  item: ['item', 'codigo', 'cod', 'edt', 'eap'],
  titulo: ['atividade', 'nome', 'nome da tarefa', 'tarefa', 'descricao'],
  inicio: ['inicio'],
  fim: ['termino', 'fim'],
}

// Acha a linha do cabeçalho (pode haver título acima) e a coluna de cada campo.
function acharCabecalho(matriz) {
  for (let r = 0; r < Math.min(matriz.length, 20); r++) {
    const nomes = (matriz[r] || []).map((c) => semAcento(c?.texto))
    const col = (lista) => nomes.findIndex((n) => lista.includes(n))
    const colunas = {
      item: col(CABECALHOS.item), titulo: col(CABECALHOS.titulo), inicio: col(CABECALHOS.inicio), fim: col(CABECALHOS.fim),
      duracao: nomes.findIndex((n) => n.startsWith('duracao')),
    }
    if (colunas.item >= 0 && colunas.titulo >= 0 && colunas.inicio >= 0 && colunas.fim >= 0) return { linha: r, colunas }
  }
  return null
}

// Matriz de células → linhas de texto editáveis na conferência. Data que veio
// como data do Excel já sai como 'DD/MM/AAAA'. Linhas vazias ficam de fora.
export function extrairLinhas(matriz, { date1904 = false } = {}) {
  const cab = acharCabecalho(matriz)
  if (!cab) return { erro: `Não achei o cabeçalho. A planilha precisa das colunas ${COLUNAS_MODELO.slice(0, 4).join(', ')} (como no modelo).` }
  const { linha, colunas } = cab
  const texto = (row, c) => (c >= 0 ? String(row[c]?.texto ?? '').trim() : '')
  const data = (row, c) => {
    const cel = row[c]
    if (cel && ehSerialDeData(cel.serial)) return formatarData(serialParaIso(cel.serial, date1904))
    return texto(row, c)
  }
  const linhas = []
  for (let r = linha + 1; r < matriz.length; r++) {
    const row = matriz[r] || []
    const l = { n: r + 1, item: texto(row, colunas.item), titulo: texto(row, colunas.titulo), inicio: data(row, colunas.inicio), fim: data(row, colunas.fim), duracao: texto(row, colunas.duracao) }
    if (l.item || l.titulo || l.inicio || l.fim) linhas.push(l)
  }
  if (!linhas.length) return { erro: 'A planilha não tem nenhuma atividade abaixo do cabeçalho.' }
  return { linhas }
}

// ── conferência ─────────────────────────────────────────────────────────────
// Interpreta as linhas (as da planilha ou as corrigidas na tela): código,
// pai, nível, datas e duração, com os erros (bloqueiam) e avisos (não bloqueiam)
// de cada linha. Ordena pelos códigos. Grupo (tem filhos) pode vir sem datas:
// elas saem das filhas.
export function conferirCronograma(linhas, cal) {
  const codigos = linhas.map((l) => normalizarItem(l.item))
  const repetidos = new Set(codigos.filter((c, i) => c && codigos.indexOf(c) !== i))
  const existentes = new Set(codigos.filter(Boolean))
  const pais = new Set(codigos.filter(Boolean).map(paiDoCodigo).filter(Boolean))

  const itens = linhas.map((l, i) => {
    const codigo = codigos[i]
    const erros = []
    const avisos = []
    const ehGrupo = Boolean(codigo && pais.has(codigo))
    if (!l.item.trim()) erros.push('Falta o código na coluna ITEM.')
    else if (!codigo) erros.push(`Código inválido: "${l.item}". Use números separados por ponto (1, 1.1, 1.1.1).`)
    else if (repetidos.has(codigo)) erros.push(`Código repetido: o ${codigo} aparece em mais de uma linha.`)
    else if (paiDoCodigo(codigo) && !existentes.has(paiDoCodigo(codigo))) erros.push(`Falta o item ${paiDoCodigo(codigo)}, que seria o pai deste.`)
    if (!l.titulo.trim()) erros.push('Atividade sem nome.')

    let inicio = lerData(l.inicio)
    let fim = lerData(l.fim)
    const duracaoPlanilha = lerDuracao(l.duracao)
    const vazioInicio = !l.inicio.trim()
    const vazioFim = !l.fim.trim()
    if (!inicio && !(ehGrupo && vazioInicio)) erros.push(vazioInicio ? 'Falta a data de início.' : `Data de início inválida: "${l.inicio}". Use DD/MM/AAAA.`)
    if (!fim && inicio && vazioFim && Number.isFinite(duracaoPlanilha)) fim = fimPelaDuracao(inicio, duracaoPlanilha, cal)
    else if (!fim && !(ehGrupo && vazioFim)) erros.push(vazioFim ? 'Falta a data de término (ou a duração).' : `Data de término inválida: "${l.fim}". Use DD/MM/AAAA.`)
    if (inicio && fim && fim < inicio) erros.push('O término está antes do início.')
    if (Number.isNaN(duracaoPlanilha)) avisos.push(`Duração "${l.duracao}" não é um número; vale o que está nas datas.`)
    const duracao = inicio && fim && fim >= inicio ? diasUteisEntre(inicio, fim, cal) : null
    if (Number.isFinite(duracaoPlanilha) && duracao !== null && !vazioFim && duracaoPlanilha !== duracao) {
      avisos.push(`A planilha diz ${duracaoPlanilha} dias; pelas datas são ${duracao} dias úteis. Vale o que está nas datas.`)
    }
    return {
      n: l.n, codigo, titulo: l.titulo.trim(), inicio, fim, duracao, ehGrupo,
      nivel: codigo ? nivelDoCodigo(codigo) : 0, paiCodigo: codigo ? paiDoCodigo(codigo) : null, erros, avisos,
    }
  })

  // Grupo: na EAP as datas saem SEMPRE das subatividades (lib/planejamento.js,
  // montarEap). A conferência mostra essas, para não prometer outra coisa no
  // Longo prazo; se a planilha dizia diferente, fica um aviso. Data preenchida
  // e inválida continua erro, sem disfarce. Do nível mais fundo para cima.
  const porCodigo = new Map(itens.filter((i) => i.codigo && !repetidos.has(i.codigo)).map((i) => [i.codigo, i]))
  for (const g of [...porCodigo.values()].filter((i) => i.ehGrupo && !i.erros.some((e) => e.startsWith('Data'))).sort((a, b) => b.nivel - a.nivel)) {
    const desc = [...porCodigo.values()].filter((i) => i.codigo.startsWith(`${g.codigo}.`) && i.inicio && i.fim)
    if (!desc.length) {
      if (!g.inicio || !g.fim) g.erros.push('Grupo sem datas e sem subatividades com datas.')
      continue
    }
    const inicio = desc.map((i) => i.inicio).sort()[0]
    const fim = desc.map((i) => i.fim).sort().at(-1)
    if (g.inicio && g.fim && (g.inicio !== inicio || g.fim !== fim)) {
      g.avisos.push(`Na EAP o grupo vale de ${formatarData(inicio)} a ${formatarData(fim)}: as datas de um grupo saem das subatividades.`)
    }
    g.erros = g.erros.filter((e) => e !== 'O término está antes do início.')
    Object.assign(g, { inicio, fim, duracao: diasUteisEntre(inicio, fim, cal) })
  }

  // Ordem pelos códigos; sem código válido vai para o fim, na ordem da planilha.
  itens.sort((a, b) => (a.codigo && b.codigo ? compararCodigos(a.codigo, b.codigo) : a.codigo ? -1 : b.codigo ? 1 : a.n - b.n))
  return { itens, erros: itens.reduce((s, i) => s + i.erros.length, 0) }
}

// O código que cada linha vai ter na EAP depois de gravada: a EAP numera pela
// ordem (1, 2, 3…), então lacuna some (1, 3 → 1, 2) e, ao Adicionar, o nível
// principal continua depois das `raizesAtuais`. Devolve Map n → código.
export function codigosNaEap(itens, raizesAtuais = 0) {
  const final = new Map()
  const filhos = new Map()
  for (const it of itens) {
    if (!it.codigo || it.erros.length) continue
    const pai = it.paiCodigo ? final.get(it.paiCodigo) : ''
    if (pai === undefined) continue
    const n = (filhos.get(pai) ?? (pai ? 0 : raizesAtuais)) + 1
    filhos.set(pai, n)
    final.set(it.codigo, pai ? `${pai}.${n}` : String(n))
  }
  return new Map(itens.filter((i) => final.has(i.codigo) && !i.erros.length).map((i) => [i.n, final.get(i.codigo)]))
}
