// Planejamento › EAP: baixar a planilha modelo e importar o cronograma (.xlsx ou
// .csv). Tudo no navegador: nada sai do aparelho. Antes de gravar, a tela de
// conferência mostra a árvore e os erros; só "Confirmar importação" grava.
// Quem lê o arquivo é lib/planilha.js; quem interpreta e acha erro é
// lib/importarCronograma.js; aqui só se mostra e se corrige.
import { useRef, useState } from 'react'
import { importarCronograma } from '../lib/dados.js'
import { hoje } from '../lib/config.js'
import { formatarData } from '../lib/datas.js'
import { calendarioDaObra } from '../lib/planejamento.js'
import { codigosNaEap, conferirCronograma, extrairLinhas } from '../lib/importarCronograma.js'
import { gerarModeloXlsx, lerArquivo } from '../lib/planilha.js'
import { Folha, Icon, Meta, Tag, useAviso } from '../components/index.jsx'

const soData = (t) => t.replace(/[^\d/]/g, '').slice(0, 10)
const ordemDe = (conf) => conf.itens.map((i) => i.n)

function Conferencia({ linhasIniciais, nomeArquivo, calendario, atuais, raizes, aoFechar, aoImportar }) {
  const cal = calendarioDaObra(calendario, calendario.feriados)
  const [linhas, setLinhas] = useState(linhasIniciais)
  // A ordem na tela só muda ao sair do campo ITEM (ou ao tirar linha), para a
  // linha não pular de lugar enquanto se digita o código.
  const [ordem, setOrdem] = useState(() => ordemDe(conferirCronograma(linhasIniciais, cal)))
  const [modo, setModo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const conf = conferirCronograma(linhas, cal)
  const porN = new Map(conf.itens.map((i) => [i.n, i]))
  // O código que fica na EAP (antes de escolher Adicionar/Substituir, não dá para saber).
  const naEap = !atuais || modo ? codigosNaEap(conf.itens, modo === 'adicionar' ? raizes : 0) : new Map()
  const linhaDe = new Map(linhas.map((l) => [l.n, l]))
  const mudar = (n, campo, valor) => setLinhas((ls) => ls.map((l) => (l.n === n ? { ...l, [campo]: valor } : l)))
  const reordenar = () => setOrdem(ordemDe(conf))
  function tirar(n) {
    const resto = linhas.filter((l) => l.n !== n)
    setLinhas(resto)
    setOrdem(ordemDe(conferirCronograma(resto, cal)))
  }
  const comErro = conf.itens.filter((i) => i.erros.length).length
  const falta = !conf.itens.length ? 'Não sobrou nenhuma linha para importar.'
    : conf.erros ? `Corrija ${comErro === 1 ? 'a linha em vermelho' : `as ${comErro} linhas em vermelho`} para importar.`
      : atuais && !modo ? 'Escolha o que fazer com as atividades atuais.' : null

  async function confirmar() {
    setSalvando(true)
    await aoImportar(linhas, atuais ? modo : undefined)
    setSalvando(false)
  }

  return (
    <Folha titulo="Conferir a importação" aoFechar={aoFechar}>
      <div className="form">
        <div className="imp-resumo">
          <Meta itens={[nomeArquivo, `${conf.itens.length} ${conf.itens.length === 1 ? 'atividade' : 'atividades'}`]} />
          {conf.erros ? <Tag cor="vermelho">{conf.erros} {conf.erros === 1 ? 'erro' : 'erros'}</Tag> : conf.itens.length ? <Tag cor="verde">Tudo certo</Tag> : null}
        </div>
        <p className="meta" style={{ margin: 0 }}>Confira a árvore como o app entendeu. Dá para corrigir o código, o nome e as datas aqui mesmo. Nada é gravado antes de "Confirmar importação".</p>
        <div className="cartao imp-lista">
          {ordem.filter((n) => porN.has(n)).map((n) => {
            const it = porN.get(n)
            const l = linhaDe.get(n)
            return (
              <div key={n} className={`imp-linha ${it.erros.length ? 'com-erro' : ''} ${it.ehGrupo ? 'grupo' : ''}`} style={{ '--nivel': it.nivel }}>
                <div className="imp-campos">
                  <input className="imp-codigo" value={l.item} aria-label={`ITEM da linha ${n}`} autoComplete="off" inputMode="decimal"
                    onChange={(e) => mudar(n, 'item', e.target.value)} onBlur={reordenar} />
                  <input className="imp-titulo" value={l.titulo} aria-label={`Atividade da linha ${n}`} placeholder="Nome da atividade" autoComplete="off"
                    onChange={(e) => mudar(n, 'titulo', e.target.value)} />
                  <button className="icone-botao imp-tirar" aria-label={`Tirar a linha ${n} da importação`} onClick={() => tirar(n)}><Icon nome="x" /></button>
                  <input className="imp-data imp-inicio" value={l.inicio} aria-label={`Início da linha ${n}`} inputMode="numeric" autoComplete="off"
                    placeholder={it.ehGrupo && it.inicio ? formatarData(it.inicio) : 'DD/MM/AAAA'} onChange={(e) => mudar(n, 'inicio', soData(e.target.value))} />
                  <input className="imp-data imp-fim" value={l.fim} aria-label={`Término da linha ${n}`} inputMode="numeric" autoComplete="off"
                    placeholder={(it.ehGrupo || l.duracao) && it.fim ? formatarData(it.fim) : 'DD/MM/AAAA'} onChange={(e) => mudar(n, 'fim', soData(e.target.value))} />
                </div>
                <Meta itens={[it.duracao !== null && <b key="d" className="num">{it.duracao} {it.duracao === 1 ? 'dia útil' : 'dias úteis'}</b>, naEap.get(n) && naEap.get(n) !== it.codigo && <span key="c">na EAP vira <b className="num">{naEap.get(n)}</b></span>, `linha ${n} da planilha`, it.ehGrupo && 'grupo: as datas saem das subatividades', !l.fim && it.fim && !it.ehGrupo && 'término calculado pela duração']} />
                {it.erros.map((e) => <div key={e} className="erro-campo" role="alert">{e}</div>)}
                {it.avisos.map((a) => <div key={a} className="aviso-campo">{a}</div>)}
              </div>
            )
          })}
          {!conf.itens.length && <div className="coluna-vazia" style={{ margin: 14 }}>Todas as linhas foram tiradas.</div>}
        </div>

        {atuais > 0 && (
          <div className="campo"><span>Esta obra já tem {atuais} {atuais === 1 ? 'atividade' : 'atividades'}. O que fazer com elas? <em>*</em></span>
            <div className="seg duas-opcoes">
              <button type="button" className={`opcao ${modo === 'adicionar' ? 'marcada' : ''}`} aria-pressed={modo === 'adicionar'} onClick={() => setModo('adicionar')}>Adicionar</button>
              <button type="button" className={`opcao nao ${modo === 'substituir' ? 'marcada' : ''}`} aria-pressed={modo === 'substituir'} onClick={() => setModo('substituir')}>Substituir</button>
            </div>
            <div className="meta" style={{ marginTop: 0 }}>
              {modo === 'substituir' ? `As ${atuais} atuais vão para Arquivadas (nada se apaga; dá para desarquivar). As importadas começam do 1.`
                : modo === 'adicionar' ? 'As importadas entram depois das atuais, com os códigos renumerados.'
                  : 'Adicionar: entram depois das atuais. Substituir: as atuais vão para Arquivadas.'}
            </div>
          </div>
        )}

        {falta && <div className="meta" role="status" style={{ marginTop: 0 }}>{falta}</div>}
        <div className="acoes">
          <button className="botao" disabled={Boolean(falta) || salvando} onClick={confirmar}><Icon nome="check" />Confirmar importação</button>
          <button className="botao contorno" onClick={aoFechar}>Cancelar</button>
        </div>
      </div>
    </Folha>
  )
}

// Os dois botões da EAP (engenheiro) e a conferência que o "Importar" abre.
export default function PlanilhaCronograma({ calendario, atuais, raizes, recarregar }) {
  const avisar = useAviso()
  const arquivo = useRef(null)
  const [ocupado, setOcupado] = useState(null) // 'baixando' | 'lendo'
  const [lida, setLida] = useState(null) // { linhas, nome }

  async function baixarModelo() {
    setOcupado('baixando')
    try {
      const bytes = await gerarModeloXlsx(hoje(), calendarioDaObra(calendario, calendario.feriados))
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'cronograma-modelo.xlsx'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      avisar('Planilha modelo baixada. Preencha no Excel e use "Importar planilha".')
    } catch (_) {
      avisar('Não deu para gerar a planilha modelo. Tente de novo.', 'erro')
    }
    setOcupado(null)
  }

  async function escolher(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // deixa escolher o mesmo arquivo de novo
    if (!file) return
    setOcupado('lendo')
    const lido = await lerArquivo(new Uint8Array(await file.arrayBuffer()), file.name)
    const extraido = lido.erro ? lido : extrairLinhas(lido.matriz, lido)
    setOcupado(null)
    if (extraido.erro) return avisar(extraido.erro, 'erro')
    setLida({ linhas: extraido.linhas, nome: file.name })
  }

  async function importar(linhas, modo) {
    const { data, erro } = await importarCronograma(linhas, modo)
    if (erro) return avisar(erro, 'erro')
    avisar(`${data.criadas} ${data.criadas === 1 ? 'atividade importada' : 'atividades importadas'}.${data.arquivadas ? ` ${data.arquivadas} foram para Arquivadas.` : ''}`)
    setLida(null)
    recarregar()
  }

  return (
    <>
      <button className="botao contorno" disabled={Boolean(ocupado)} onClick={baixarModelo}>
        <Icon nome="importar" />{ocupado === 'baixando' ? 'Gerando…' : 'Baixar planilha modelo'}
      </button>
      <button className="botao contorno" disabled={Boolean(ocupado)} onClick={() => arquivo.current?.click()}>
        <Icon nome="enviar" />{ocupado === 'lendo' ? 'Lendo a planilha…' : 'Importar planilha'}
      </button>
      <input ref={arquivo} type="file" accept=".xlsx,.csv" hidden onChange={escolher} />
      {lida && (
        <Conferencia linhasIniciais={lida.linhas} nomeArquivo={lida.nome} calendario={calendario} atuais={atuais} raizes={raizes}
          aoFechar={() => setLida(null)} aoImportar={importar} />
      )}
    </>
  )
}
