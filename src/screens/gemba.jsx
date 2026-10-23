// Qualidade › aba Gemba Walk: observações de desperdício num quadro de 3 colunas,
// com o ranking de onde a obra mais perde. As regras (tipos, filtros, ranking,
// validação) moram em lib/gemba.js; a obra e a permissão, em lib/dados.js.
import { useState } from 'react'
import { criarObservacaoGemba, excluirObservacaoGemba, listarGemba, moverObservacaoGemba } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { pode } from '../lib/permissoes.js'
import { hoje } from '../lib/config.js'
import { formatarData, formatarDiaMes } from '../lib/datas.js'
import { estaVencido } from '../lib/qualidade.js'
import {
  DESPERDICIOS, FILTROS_GEMBA_VAZIOS, FILTROS_PRAZO_GEMBA, STATUS_GEMBA, alternarDesperdicio, filtrarObservacoes, ordenarObservacoes, rankingDesperdicios, validarObservacao,
} from '../lib/gemba.js'
import { Carregando, EstadoVazio, Erro, Folha, Icon, Meta, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'
import { Etiquetas, TirarFoto, classeDe } from './qualidadeComum.jsx'

let provisorios = 0 // id do cartão que aparece antes de o salvamento voltar

function NovaObservacao({ pessoas, aoFechar, aoCriar }) {
  const [campos, setCampos] = useState({ local: '', descricao: '', causa_raiz: '', acao: '', desperdicios: [], responsavel_id: '', prazo: hoje(), foto: '' })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const problemas = validarObservacao(campos, hoje())
  const mostrar = (c) => (tentou || tocados[c]) && problemas[c] && <div className="erro-campo" role="alert">{problemas[c]}</div>
  const mudar = (c, v) => setCampos((x) => ({ ...x, [c]: v }))
  const tocar = (c) => () => setTocados((t) => ({ ...t, [c]: true }))
  function salvar() {
    setTentou(true)
    if (!Object.keys(problemas).length) aoCriar(campos)
  }
  const texto = (c, rotulo, exemplo, longo) => (
    <label className="campo"><span>{rotulo} <em>*</em></span>
      {longo
        ? <textarea value={campos[c]} onChange={(e) => mudar(c, e.target.value)} onBlur={tocar(c)} placeholder={exemplo} />
        : <input type="text" value={campos[c]} onChange={(e) => mudar(c, e.target.value)} onBlur={tocar(c)} placeholder={exemplo} />}
      {mostrar(c)}
    </label>
  )
  return (
    <Folha titulo="Nova observação de Gemba" aoFechar={aoFechar}>
      <div className="form">
        {texto('local', 'Local', 'Ex.: Fachada')}
        {texto('descricao', 'O que foi visto', 'Ex.: argamassa subindo de carrinho pela escada', true)}
        <div className="campo"><span>Desperdícios <em>*</em></span>
          <div className="pills-dsp" role="group" aria-label="Desperdícios">
            {DESPERDICIOS.map((t) => {
              const marcado = campos.desperdicios.includes(t)
              return (
                <button key={t} type="button" className={`${classeDe(t)} pill ${marcado ? 'marcada' : ''}`} aria-pressed={marcado}
                  onClick={() => { mudar('desperdicios', alternarDesperdicio(campos.desperdicios, t)); tocar('desperdicios')() }}>
                  {marcado && <Icon nome="check" tamanho={16} />}{t}
                </button>
              )
            })}
          </div>
          {mostrar('desperdicios')}
        </div>
        {texto('causa_raiz', 'Causa raiz', 'Por que isso acontece?', true)}
        {texto('acao', 'Ação', 'O que será feito?', true)}
        <div className="duas-col">
          <label className="campo"><span>Responsável <em>*</em></span>
            <select value={campos.responsavel_id} onChange={(e) => { mudar('responsavel_id', e.target.value); tocar('responsavel_id')() }}>
              <option value="">Escolha…</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {mostrar('responsavel_id')}
          </label>
          <label className="campo"><span>Prazo</span>
            <input type="date" value={campos.prazo} min={hoje()} onChange={(e) => { mudar('prazo', e.target.value); tocar('prazo')() }} />
            {mostrar('prazo')}
          </label>
        </div>
        <div className="campo"><span>Foto</span>
          {campos.foto && <img className="nf-previa" src={campos.foto} alt="Prévia da foto" />}
          <TirarFoto rotulo="Fotografar" valor={campos.foto} aoMudar={(v) => mudar('foto', v)} />
        </div>
        <button className="botao largo" onClick={salvar}><Icon nome="check" />Registrar observação</button>
      </div>
    </Folha>
  )
}

function DetalheObservacao({ o, podeExcluir, aoFechar, aoExcluir }) {
  const [confirmando, setConfirmando] = useState(false)
  const vencida = estaVencido(o, hoje())
  return (
    <Folha titulo={o.local} aoFechar={aoFechar}>
      <div className="form">
        {o.foto && <img className="foto-registro" src={o.foto} alt={`Foto da observação em ${o.local}`} />}
        <Etiquetas tipos={o.desperdicios} />
        <div><div className="rotulo">O que foi visto</div><p className="descricao-registro">{o.descricao}</p></div>
        <div><div className="rotulo">Causa raiz</div><p className="descricao-registro">{o.causa_raiz}</p></div>
        <div><div className="rotulo">Ação</div><p className="descricao-registro">{o.acao}</p></div>
        <dl className="pares pares-registro">
          <dt>Situação</dt><dd>{o.status}</dd>
          <dt>Responsável</dt><dd>{o.responsavel}</dd>
          <dt>Prazo</dt><dd className={vencida ? 'vermelho' : ''}>{o.prazo ? formatarData(o.prazo) : 'Sem prazo'}</dd>
          <dt>Registrada em</dt><dd>{formatarData(o.criada_em)}</dd>
        </dl>
        {podeExcluir && !o.provisorio && (confirmando ? (
          <div className="cartao caixa-resolver perigo">
            <div>Excluir esta observação de vez? Não dá para desfazer.</div>
            <div className="acoes">
              <button className="botao contorno" onClick={() => setConfirmando(false)}>Cancelar</button>
              <button className="botao perigo" onClick={() => aoExcluir(o)}>Excluir</button>
            </div>
          </div>
        ) : <button className="link" onClick={() => setConfirmando(true)}>Excluir observação</button>)}
      </div>
    </Folha>
  )
}

function CartaoGemba({ o, podeMover, aoAbrir, aoMover }) {
  const vencida = estaVencido(o, hoje())
  return (
    <div className={`cartao cartao-gemba ${o.status === 'Resolvido' ? 'resolvido' : ''}`}>
      <button className="cartao-gemba-corpo" onClick={aoAbrir} aria-label={`Observação em ${o.local}${vencida ? ', vencida' : ''}: ${o.descricao}`}>
        {o.foto && <img className="foto-registro" src={o.foto} alt="" />}
        <div className="local-gemba"><Icon nome="obras" tamanho={16} />{o.local}</div>
        <div className="registro-desc">{o.descricao}</div>
        <Etiquetas tipos={o.desperdicios} />
        <Meta itens={[o.responsavel, o.prazo
          ? <span className={vencida ? 'tag vermelho prazo-gemba' : 'data-curta'}>{vencida ? 'venceu ' : 'até '}{formatarDiaMes(o.prazo)}</span>
          : 'sem prazo']} />
      </button>
      {podeMover && !o.provisorio && (
        <label className="mover-gemba"><span className="rotulo">Situação</span>
          <select className="filtro" value={o.status} onChange={(e) => aoMover(o, e.target.value)}>
            {STATUS_GEMBA.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
    </div>
  )
}

export default function Gemba({ filtros, setFiltros }) {
  const { perfil } = useSessao()
  const avisar = useAviso()
  const { carregando, data, erro, recarregar } = useCarregar(listarGemba)
  const [nova, setNova] = useState(false)
  const [abertaId, setAbertaId] = useState(null)
  // Mudanças otimistas: valem só sobre a leitura em que foram feitas (base).
  const [otimista, setOtimista] = useState({ base: null, status: {}, novas: [], removidas: [] })
  const podeMover = pode(perfil.role, 'registrarQualidade')
  const podeExcluir = pode(perfil.role, 'apagar')

  const vazio = { status: {}, novas: [], removidas: [] }
  const valendo = otimista.base === data ? otimista : vazio
  const anotar = (f) => setOtimista((o) => ({ ...f(o.base === data ? o : { ...vazio, base: data }), base: data }))
  const esquecer = () => setOtimista({ base: null, ...vazio })

  async function criar(campos) {
    setNova(false)
    const temp = { ...campos, id: `tmp-${++provisorios}`, status: 'Pendente', criada_em: hoje(), responsavel: data.pessoas.find((p) => p.id === campos.responsavel_id)?.nome || '—', provisorio: true }
    anotar((o) => ({ ...o, novas: [...o.novas, temp] }))
    const { erro: e } = await criarObservacaoGemba(campos)
    if (e) { esquecer(); return avisar(e, 'erro') }
    avisar('Observação registrada em "Pendente".')
    recarregar()
  }

  async function mover(o, status) {
    anotar((x) => ({ ...x, status: { ...x.status, [o.id]: status } }))
    const { erro: e } = await moverObservacaoGemba(o.id, status)
    if (e) { esquecer(); return avisar(e, 'erro') }
    avisar(`${o.local}: agora em "${status}".`)
    recarregar()
  }

  async function excluir(o) {
    setAbertaId(null)
    anotar((x) => ({ ...x, removidas: [...x.removidas, o.id] }))
    const { erro: e } = await excluirObservacaoGemba(o.id)
    if (e) { esquecer(); return avisar(e, 'erro') }
    avisar('Observação excluída.')
    recarregar()
  }

  if (carregando && !data) return <Carregando alto />
  if (erro) return <Erro mensagem={erro} aoTentar={recarregar} />

  const observacoes = [...data.observacoes, ...valendo.novas]
    .filter((o) => !valendo.removidas.includes(o.id))
    .map((o) => (valendo.status[o.id] ? { ...o, status: valendo.status[o.id] } : o))
  const aberta = observacoes.find((o) => o.id === abertaId)
  const folhas = (
    <>
      {nova && <NovaObservacao pessoas={data.pessoas} aoFechar={() => setNova(false)} aoCriar={criar} />}
      {aberta && <DetalheObservacao key={aberta.id} o={aberta} podeExcluir={podeExcluir} aoFechar={() => setAbertaId(null)} aoExcluir={excluir} />}
    </>
  )

  if (!observacoes.length) {
    return (
      <>
        <EstadoVazio icone="qualidade" titulo="Nenhuma observação de Gemba nesta obra"
          texto="Ande pela obra e registre o que vira desperdício: espera, retrabalho, transporte… O ranking mostra onde a obra mais perde."
          acao={podeMover ? 'Registrar a primeira observação' : null} aoAgir={() => setNova(true)} />
        {folhas}
      </>
    )
  }

  const ranking = rankingDesperdicios(observacoes)
  const maior = Math.max(1, ranking[0].quantidade)
  const visiveis = ordenarObservacoes(filtrarObservacoes(observacoes, filtros, hoje()), hoje())
  const mudar = (c, v) => setFiltros((f) => ({ ...f, [c]: v }))
  const comFiltro = JSON.stringify(filtros) !== JSON.stringify(FILTROS_GEMBA_VAZIOS)

  return (
    <>
      <div className="cartao">
        <div className="lista-cab"><TituloSecao>Onde a obra mais perde</TituloSecao><span className="rotulo">observações por tipo de desperdício</span></div>
        <div className="ranking-dsp">
          {ranking.map((r) => (
            <button key={r.tipo} className={`linha-ranking ${filtros.tipo === r.tipo ? 'selecionada' : ''}`} aria-pressed={filtros.tipo === r.tipo}
              onClick={() => mudar('tipo', filtros.tipo === r.tipo ? '' : r.tipo)} aria-label={`${r.tipo}: ${r.quantidade}. Filtrar`}>
              <span className="nome-ranking">{r.tipo}</span>
              <span className="trilho-ranking"><i className={classeDe(r.tipo)} style={{ width: `${(r.quantidade / maior) * 100}%` }} /></span>
              <b className="num">{r.quantidade}</b>
            </button>
          ))}
        </div>
      </div>

      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={visiveis.length}>Observações</TituloSecao>
          <div className="direita">
            {comFiltro && <button className="link" onClick={() => setFiltros(FILTROS_GEMBA_VAZIOS)}>Limpar filtros</button>}
            {podeMover && <button className="botao" onClick={() => setNova(true)}><Icon nome="mais_sinal" />Nova observação</button>}
          </div>
        </div>
        <div className="filtros-qualidade duas">
          <input type="search" className="entrada" value={filtros.busca} onChange={(e) => mudar('busca', e.target.value)} placeholder="Buscar local, descrição, causa ou ação" aria-label="Buscar" />
          <select className="filtro" value={filtros.tipo} onChange={(e) => mudar('tipo', e.target.value)} aria-label="Tipo de desperdício">
            <option value="">Todos os desperdícios</option>
            {DESPERDICIOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="ordenar" role="group" aria-label="Prazo">
            {FILTROS_PRAZO_GEMBA.map((f) => (
              <button key={f} className={filtros.prazo === f ? 'ativo' : ''} aria-pressed={filtros.prazo === f} onClick={() => mudar('prazo', f)}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="kanban empilha" role="list" aria-label="Quadro do Gemba">
        {STATUS_GEMBA.map((s) => {
          const daColuna = visiveis.filter((o) => o.status === s)
          return (
            <section key={s} className="coluna" role="listitem" aria-label={s}>
              <div className="coluna-cab"><TituloSecao conta={daColuna.length}>{s}</TituloSecao></div>
              {!daColuna.length && <div className="coluna-vazia">{comFiltro ? 'Nada com esses filtros.' : 'Nada aqui.'}</div>}
              {daColuna.map((o) => <CartaoGemba key={o.id} o={o} podeMover={podeMover} aoAbrir={() => setAbertaId(o.id)} aoMover={mover} />)}
            </section>
          )
        })}
      </div>
      {folhas}
    </>
  )
}
