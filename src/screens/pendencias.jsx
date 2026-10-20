import { useState } from 'react'
import { abrirPendencia, comentarPendencia, listarFrentesParaEscolha, listarPendencias, mudarSituacaoPendencia } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { pode } from '../lib/permissoes.js'
import { formatarDiaMes } from '../lib/datas.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Folha, Icon, Meta, Tag, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'

const ABAS = [['Aberta', 'Abertas'], ['Respondida', 'Respondidas'], ['Fechada', 'Fechadas'], ['Todas', 'Todas']]

function NovaPendencia({ frenteInicial, aoFechar, aoCriar }) {
  const avisar = useAviso()
  const { data: frentes } = useCarregar(listarFrentesParaEscolha)
  const [frente, setFrente] = useState(frenteInicial || '')
  const [pergunta, setPergunta] = useState('')
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    setSalvando(true)
    const { erro } = await abrirPendencia({ frente_id: frente, pergunta })
    setSalvando(false)
    if (erro) return avisar(erro, 'erro')
    avisar('Pendência aberta. O prazo de resposta vem da data limite da frente.')
    aoCriar()
  }
  return (
    <Folha titulo="Nova pendência de projeto" aoFechar={aoFechar}>
      <div className="form">
        <label className="campo"><span>Pergunta <em>*</em></span>
          <textarea value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex.: Altura do nicho do box da suíte master?" />
        </label>
        <label className="campo"><span>Frente que ela trava <em>*</em></span>
          <select value={frente} onChange={(e) => setFrente(e.target.value)}>
            <option value="">Escolha a frente…</option>
            {(frentes || []).map((f) => <option key={f.id} value={f.id}>{f.servico}</option>)}
          </select>
        </label>
        <button className="botao largo" disabled={salvando || !pergunta.trim() || !frente} onClick={salvar}>{salvando ? 'Abrindo…' : 'Abrir pendência'}</button>
      </div>
    </Folha>
  )
}

export default function Pendencias({ goto, params }) {
  const { perfil } = useSessao()
  const [aba, setAba] = useState('Aberta')
  const [nova, setNova] = useState(Boolean(params?.novaPara))
  const { carregando, data, erro, recarregar } = useCarregar(() => listarPendencias({ situacao: aba }), [aba])
  const podeAbrir = pode(perfil.role, 'abrirPendencia')

  const abas = ABAS.map(([k, t]) => <button key={k} className={`aba ${aba === k ? 'ativa' : ''}`} onClick={() => setAba(k)}>{t}</button>)
  let corpo
  if (carregando && !data) corpo = <Carregando />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (!data.length) {
    corpo = aba === 'Aberta' || aba === 'Todas'
      ? <EstadoVazio titulo="Nenhuma pendência de projeto aberta"
          texto="Quando surgir uma dúvida de projeto que trave uma frente, abra aqui. A arquiteta recebe, e o prazo de resposta já vem da data limite da frente."
          acao={podeAbrir ? 'Abrir a primeira pendência' : null} aoAgir={() => setNova(true)} />
      : <EstadoVazio titulo={`Nenhuma pendência ${aba.toLowerCase()}`} texto="Troque a aba para ver as outras." />
  } else {
    corpo = (
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={data.length}>Pendências</TituloSecao>
          {podeAbrir && <span className="direita"><button className="botao" onClick={() => setNova(true)}><Icon nome="mais_sinal" />Nova pendência</button></span>}
        </div>
        {data.map((p) => (
          <button key={p.id} className={`linha-lista ${p.situacao === 'Aberta' && p.folgaRestante < 0 ? 'critica' : ''}`} onClick={() => goto('pendencia', { id: p.id })}>
            <div>
              <div className="titulo">{p.pergunta}</div>
              <Meta itens={[p.frente?.servico, `aberta por ${p.abertaPor}`, `${p.comentarios.length} ${p.comentarios.length === 1 ? 'comentário' : 'comentários'}`]} />
            </div>
            <div className="lado">
              <Tag>{p.situacao}</Tag>
              {p.situacao !== 'Fechada' && p.prazo && <span className={`tag ${p.folgaRestante < 0 ? 'vermelho' : p.folgaRestante <= 5 ? 'ambar' : 'neutra'} num`}>responder até {formatarDiaMes(p.prazo)}</span>}
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      <Cabecalho abas={abas} />
      <main className="conteudo">{corpo}</main>
      {nova && <NovaPendencia frenteInicial={params?.novaPara} aoFechar={() => setNova(false)} aoCriar={() => { setNova(false); setAba('Aberta'); recarregar() }} />}
    </>
  )
}

export function Pendencia({ goto, params }) {
  const { perfil } = useSessao()
  const avisar = useAviso()
  const { carregando, data, erro, recarregar } = useCarregar(() => listarPendencias({ situacao: 'Todas' }), [params.id])
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const voltar = { rotulo: 'Pendências', ir: () => goto('pendencias') }
  const p = data?.find((x) => x.id === params.id)

  if (carregando && !data) return <><Cabecalho voltar={voltar} titulo="Carregando…" /><main className="conteudo"><Carregando /></main></>
  if (erro || !p) return <><Cabecalho voltar={voltar} titulo="Pendência" /><main className="conteudo"><Erro mensagem={erro || 'Pendência não encontrada nesta obra.'} /></main></>

  async function agir(promessa, sucesso) {
    setOcupado(true)
    const { erro: e } = await promessa
    setOcupado(false)
    if (e) return avisar(e, 'erro')
    avisar(sucesso)
    setTexto('')
    recarregar()
  }

  return (
    <>
      <Cabecalho voltar={voltar} titulo={p.pergunta}
        sub={<><span>{p.frente?.servico}</span><Tag>{p.situacao}</Tag>{p.situacao !== 'Fechada' && p.prazo && <span>responder até <span className="data-curta">{formatarDiaMes(p.prazo)}</span></span>}</>} />
      <main className="conteudo">
        <div className="acoes">
          {p.frente && <button className="botao contorno" onClick={() => goto('frente', { id: p.frente.id })}>Ver a frente</button>}
          {pode(perfil.role, 'fecharPendencia') && p.situacao !== 'Fechada' && (
            <button className="botao" disabled={ocupado} onClick={() => agir(mudarSituacaoPendencia(p.id, 'Fechada'), 'Pendência fechada.')}><Icon nome="check" />Fechar</button>
          )}
          {pode(perfil.role, 'fecharPendencia') && p.situacao === 'Fechada' && (
            <button className="botao contorno" disabled={ocupado} onClick={() => agir(mudarSituacaoPendencia(p.id, 'Aberta'), 'Pendência reaberta.')}>Reabrir</button>
          )}
        </div>
        <div className="cartao">
          <div className="lista-cab"><TituloSecao conta={`aberta por ${p.abertaPor} em ${formatarDiaMes(p.created_at.slice(0, 10))}`}>Conversa</TituloSecao></div>
          {!p.comentarios.length && <div className="linha-lista"><div className="titulo">Ninguém respondeu ainda.</div></div>}
          {p.comentarios.map((c) => (
            <div key={c.id} className="linha-lista" style={{ alignItems: 'start' }}>
              <div><Meta itens={[c.autor, <span key="d" className="data-curta">{formatarDiaMes(c.created_at.slice(0, 10))}</span>]} /><div className="obs">{c.texto}</div></div>
            </div>
          ))}
          {pode(perfil.role, 'comentar') && (
            <div className="comentar">
              <label className="so-leitor" htmlFor="resposta">Responder</label>
              <input id="resposta" type="text" placeholder="Responder…" value={texto} onChange={(e) => setTexto(e.target.value)} />
              <button className="botao" disabled={ocupado || !texto.trim()} onClick={() => agir(comentarPendencia(p.id, texto), 'Comentário enviado.')}>Enviar</button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
