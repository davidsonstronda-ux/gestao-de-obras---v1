// Ler e gerar planilha do cronograma (.xlsx e .csv), tudo local: nada sai do
// navegador. O SheetJS (xlsx) é a única biblioteca além do Supabase e entra por
// import() só aqui, quando alguém baixa ou importa (ver AGENTS.md, armadilhas).
// Sem React e sem window: recebe e devolve bytes; quem baixa/abre arquivo é a tela.
import { COLUNAS_MODELO, isoParaSerial, lerCsv } from './importarCronograma.js'
import { calendarioDaObra, diasUteisEntre, fimPelaDuracao } from './planejamento.js'
import { paraData, paraIso } from './datas.js'

const TAMANHO_MAXIMO = 5 * 1024 * 1024 // 5 MB: cronograma de obra cabe com folga
const carregarSheetJs = () => import('xlsx')

// Bytes do arquivo → matriz de células { texto, serial }. O ITEM usa o texto
// formatado da célula (cell.w), nunca o número; data do Excel vem em `serial`.
export async function lerArquivo(bytes, nomeArquivo) {
  const nome = String(nomeArquivo || '').toLowerCase()
  if (bytes.byteLength > TAMANHO_MAXIMO) return { erro: 'O arquivo passa de 5 MB. Salve só a aba do cronograma e tente de novo.' }
  if (nome.endsWith('.csv')) {
    return { matriz: lerCsv(textoDoCsv(bytes)).map((linha) => linha.map((texto) => ({ texto, serial: null }))), date1904: false }
  }
  if (!nome.endsWith('.xlsx')) return { erro: 'Use um arquivo .xlsx ou .csv.' }
  let XLSX
  let wb
  try {
    XLSX = await carregarSheetJs()
    wb = XLSX.read(bytes, { type: 'array', cellDates: false })
  } catch (_) {
    return { erro: 'Não deu para abrir a planilha. Confira se o arquivo não está corrompido ou protegido por senha.' }
  }
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws || !ws['!ref']) return { erro: 'A primeira aba da planilha está vazia.' }
  const area = XLSX.utils.decode_range(ws['!ref'])
  const matriz = []
  for (let r = area.s.r; r <= area.e.r; r++) {
    const linha = []
    for (let c = area.s.c; c <= area.e.c; c++) {
      const cel = ws[XLSX.utils.encode_cell({ r, c })]
      linha.push(cel ? { texto: cel.w ?? String(cel.v ?? ''), serial: cel.t === 'n' ? cel.v : null } : { texto: '', serial: null })
    }
    matriz.push(linha)
  }
  return { matriz, date1904: Boolean(wb.Workbook?.WBProps?.date1904) }
}

// CSV do Excel brasileiro costuma vir em Windows-1252 (ANSI), não em UTF-8.
export function textoDoCsv(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (_) {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

// ── modelo para baixar ──────────────────────────────────────────────────────
const proximoDia = (iso) => { const d = paraData(iso); d.setDate(d.getDate() + 1); return paraIso(d) }

// As linhas de exemplo do modelo (1, 2, 2.1, 2.2), a partir de `inicio`, nos
// dias de trabalho e feriados da obra (assim a duração do exemplo bate).
function linhasDoModelo(inicio, cal = calendarioDaObra(undefined, [])) {
  const fim1 = fimPelaDuracao(inicio, 5, cal)
  const ini21 = fimPelaDuracao(proximoDia(fim1), 1, cal)
  const fim21 = fimPelaDuracao(ini21, 8, cal)
  const ini22 = fimPelaDuracao(proximoDia(fim21), 1, cal)
  const fim22 = fimPelaDuracao(ini22, 6, cal)
  return [
    ['1', 'Serviços preliminares e demolição', inicio, fim1, 5],
    ['2', 'Instalações hidráulicas', ini21, fim22, diasUteisEntre(ini21, fim22, cal)],
    ['2.1', 'Tubulação de água fria e quente', ini21, fim21, 8],
    ['2.2', 'Rede de esgoto', ini22, fim22, 6],
  ]
}

const LINHAS_EM_BRANCO = 200 // linhas já com ITEM em formato texto, para o Excel não transformar 1.10 em 1.1

// Gera o .xlsx do modelo. ITEM sai como TEXTO (formato "@"); datas como data do
// Excel em dd/mm/aaaa; a 2ª aba explica como preencher.
export async function gerarModeloXlsx(inicio, cal) {
  const XLSX = await carregarSheetJs()
  const ws = {}
  const pos = (r, c) => XLSX.utils.encode_cell({ r, c })
  COLUNAS_MODELO.forEach((t, c) => { ws[pos(0, c)] = { t: 's', v: t } })
  linhasDoModelo(inicio, cal).forEach(([item, titulo, ini, fim, dur], i) => {
    const r = i + 1
    ws[pos(r, 0)] = { t: 's', v: item, z: '@' }
    ws[pos(r, 1)] = { t: 's', v: titulo }
    ws[pos(r, 2)] = { t: 'n', v: isoParaSerial(ini), z: 'dd/mm/yyyy' }
    ws[pos(r, 3)] = { t: 'n', v: isoParaSerial(fim), z: 'dd/mm/yyyy' }
    ws[pos(r, 4)] = { t: 'n', v: dur }
  })
  for (let r = 5; r <= LINHAS_EM_BRANCO; r++) ws[pos(r, 0)] = { t: 's', v: '', z: '@' }
  ws['!ref'] = `A1:E${LINHAS_EM_BRANCO + 1}`
  ws['!cols'] = [{ wch: 10 }, { wch: 42 }, { wch: 13 }, { wch: 13 }, { wch: 15 }]

  const ajuda = XLSX.utils.aoa_to_sheet([
    ['Como preencher o cronograma'],
    ['ITEM: o código da atividade. 1 é um item principal; 1.1 é subitem do 1; 1.1.1 é subitem do 1.1.'],
    ['A coluna ITEM está em formato de texto: digite 1.10 e ele continua 1.10 (não vira 1.1).'],
    ['Atividade: o nome do serviço.'],
    ['Início e Término: datas no formato DD/MM/AAAA.'],
    ['Duração (Dias): dias úteis. Pode deixar em branco: o app calcula pelas datas.'],
    ['Item que tem subitens pode ficar sem datas: elas saem dos subitens.'],
  ])
  ajuda['!cols'] = [{ wch: 95 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Cronograma')
  XLSX.utils.book_append_sheet(wb, ajuda, 'Como preencher')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
}
