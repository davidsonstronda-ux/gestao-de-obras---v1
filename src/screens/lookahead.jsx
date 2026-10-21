// Planejamento › Médio prazo (lookahead): o quadro de restrições das próximas
// 3 a 6 semanas, uma coluna por semana. Mover é por botões, sem arrastar.
// Quem decide (semana de cada restrição, vencida, prontas, o que pode voltar)
// é lib/planejamento.js; aqui só se mostra. Os dados vêm da lista única do
// Planejamento (screens/planejamento.jsx).
import { useState } from 'react'
import { moverRestricao, resolverRestricao, salvarRestricao } from '../lib/dados.js'
import { hoje } from '../lib/config.js'
import { formatarDiaMes } from '../lib/datas.js'
import {
  SEMANAS_LOOKAHEAD, SEMANAS_PADRAO, TIPOS_RESTRICAO, nomesUnicos, podeVoltarSemana, quadroLookahead, restricaoAberta,
  resumoLookahead, validarRestricao,
} from '../lib/planejamento.js'
import { EstadoVazio, Folha, Icon, Meta, Tag, TituloSecao, useAviso } from '../components/index.jsx'

// Cor (classe CSS) e ícone de cada tipo. O texto do tipo é o do banco.
const VISUAL = {
  'Material': { classe: 'tipo-material', icone: 'materiais' },
  'Mão de obra': { classe: 'tipo-mao-de-obra', icone: 'equipe' },
  'Método': { classe: 'tipo-metodo', icone: 'metodo' },
  'Equipamento': { classe: 'tipo-equipamento', icone: 'equipamento' },
  'Projeto': { classe: 'tipo-projeto', icone: 'projeto' },
  'Segurança': { classe: 'tipo-seguranca', icone: 'seguranca' },
  'Logística': { classe: 'tipo-logistica', icone: 'logistica' },
}

function SeloTipo({ tipo }) {
  const v = VISUAL[tipo]
  return <span className={`selo-tipo ${v.classe}`}><Icon nome={v.icone} />{tipo}</span>
}

function FichaRestricao({ restricao, itens, responsaveis, aoFechar, aoSalvar }) {
  const [campos, setCampos] = useState(() => restricao
    ? { id: restricao.id, descricao: restricao.descricao, tipo: restricao.tipo, atividade_id: restricao.atividade_id, prazo: restricao.prazo, responsavel: restricao.responsavel }
    : { descricao: '', tipo: '', atividade_id: '', prazo: hoje(), responsavel: '' })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const problemas = validarRestricao(campos, hoje())
  const mostrar = (c) => (tentou || tocados[c]) && problemas[c]
  const mudar = (c, v) => { setCampos((x) => ({ ...x, [c]: v })); setTocados((t) => ({ ...t, [c]: true })) }
  // Só quem executa (sem subatividades); o grupo aparece como título, sem poder ser escolhido.
  const atividades = itens.filter((i) => !i.arquivada)

  async function salvar() {
    setTentou(true)
    if (Object.keys(problemas).length) return
    setOcupado(true)
    await aoSalvar(campos)
    setOcupado(false)
  }

  return (
    <Folha titulo={restricao ? 'Editar restrição' : 'Nova restrição'} aoFechar={aoFechar}>
      <div className="form">
        <label className="campo"><span>O que impede <em>*</em></span>
          <input type="text" value={campos.descricao} placeholder="Ex.: Manta asfáltica em falta" autoComplete="off"
            onChange={(e) => mudar('descricao', e.target.value)} onBlur={() => setTocados((t) => ({ ...t, descricao: true }))} />
          {mostrar('descricao') && <div className="erro-campo" role="alert">{problemas.descricao}</div>}
        </label>
        <div className="campo"><span>Tipo <em>*</em></span>
          <div className="chips" style={{ marginTop: 0 }}>
            {TIPOS_RESTRICAO.map((t) => (
              <button key={t} type="button" className={`chip chip-tipo ${VISUAL[t].classe} ${campos.tipo === t ? 'marcado' : ''}`}
                aria-pressed={campos.tipo === t} onClick={() => mudar('tipo', t)}><Icon nome={VISUAL[t].icone} />{t}</button>
            ))}
          </div>
          {mostrar('tipo') && <div className="erro-campo" role="alert">{problemas.tipo}</div>}
        </div>
        <label className="campo"><span>Atividade que ela trava <em>*</em></span>
          <select value={campos.atividade_id} onChange={(e) => mudar('atividade_id', e.target.value)} onBlur={() => setTocados((t) => ({ ...t, atividade_id: true }))}>
            <option value="">Escolha a atividade…</option>
            {atividades.map((i) => <option key={i.id} value={i.id} disabled={i.ehGrupo}>{'  '.repeat(i.nivel)}{i.codigo} {i.titulo}</option>)}
          </select>
          {mostrar('atividade_id') && <div className="erro-campo" role="alert">{problemas.atividade_id}</div>}
        </label>
        <div className="duas-col">
          <label className="campo"><span>Prazo para resolver <em>*</em></span>
            <input type="date" value={campos.prazo} min={restricao ? undefined : hoje()} onChange={(e) => mudar('prazo', e.target.value)} />
            {mostrar('prazo') && <div className="erro-campo" role="alert">{problemas.prazo}</div>}
          </label>
          <label className="campo"><span>Quem resolve <em>*</em></span>
            <input type="text" list="responsaveis-restricao" value={campos.responsavel} placeholder="Nome" autoComplete="off"
              onChange={(e) => mudar('responsavel', e.target.value)} onBlur={() => setTocados((t) => ({ ...t, responsavel: true }))} />
            <datalist id="responsaveis-restricao">{responsaveis.map((n) => <option key={n} value={n} />)}</datalist>
            {mostrar('responsavel') && <div className="erro-campo" role="alert">{problemas.responsavel}</div>}
          </label>
        </div>
        <button className="botao largo" disabled={ocupado} onClick={salvar}><Icon nome="check" />Salvar</button>
      </div>
    </Folha>
  )
}

function CartaoRestricao({ r, podeEditar, ocupado, aoEditar, aoMover, aoResolver }) {
  const aberta = restricaoAberta(r)
  return (
    <article className={`cartao restricao ${VISUAL[r.tipo].classe} ${r.vencida ? 'vencida' : ''} ${aberta ? '' : 'resolvida'}`}>
      <button className="restricao-corpo" disabled={!podeEditar} onClick={aoEditar} aria-label={`${r.tipo}: ${r.descricao}${podeEditar ? '. Editar' : ''}`}>
        <div className="tags">
          <SeloTipo tipo={r.tipo} />
          {r.vencida && <Tag cor="vermelho">Vencida</Tag>}
          {!aberta && <Tag cor="verde">Resolvida</Tag>}
        </div>
        <div className="titulo">{r.descricao}</div>
        <Meta itens={[
          r.atividade && <span key="a"><span className="num">{r.atividade.codigo}</span> {r.atividade.titulo}</span>,
          r.responsavel,
          <span key="p">prazo <span className="data-curta">{formatarDiaMes(r.prazo)}</span></span>,
        ]} />
      </button>
      {podeEditar && (
        <div className="pedido-acoes">
          <button className="icone-botao" disabled={ocupado || !aberta || !podeVoltarSemana(r.prazo, hoje())} aria-label="Semana anterior" onClick={() => aoMover(-1)}><Icon nome="voltar" /></button>
          <button className={`botao ${aberta ? '' : 'contorno'}`} disabled={ocupado} onClick={aoResolver}>{aberta ? <><Icon nome="check" />Resolvida</> : 'Reabrir'}</button>
          <button className="icone-botao" disabled={ocupado || !aberta} aria-label="Próxima semana" onClick={() => aoMover(1)}><Icon nome="avancar" /></button>
        </div>
      )}
    </article>
  )
}

export default function MedioPrazo({ itens, restricoes, responsaveis, podeEditar, recarregar }) {
  const avisar = useAviso()
  const [semanas, setSemanas] = useState(SEMANAS_PADRAO)
  const [responsavel, setResponsavel] = useState('')
  const [mostrarResolvidas, setMostrarResolvidas] = useState(false)
  const [ficha, setFicha] = useState(null) // { nova: true } ou { restricao }
  const [ocupado, setOcupado] = useState(null) // id da restrição sendo mexida

  async function fazer(id, acao, sucesso) {
    setOcupado(id)
    const { erro } = await acao()
    setOcupado(null)
    if (erro) return avisar(erro, 'erro')
    avisar(sucesso)
    recarregar()
  }
  async function salvar(campos) {
    const { erro } = await salvarRestricao(campos)
    if (erro) return avisar(erro, 'erro')
    avisar('Salvo.')
    setFicha(null)
    recarregar()
  }

  const quadro = quadroLookahead(restricoes, { hoje: hoje(), semanas, responsavel, mostrarResolvidas })
  const resumo = resumoLookahead(itens, restricoes, { hoje: hoje(), semanas })
  const nomesNoFiltro = nomesUnicos(restricoes.filter((r) => !r.atividade?.arquivada).map((r) => r.responsavel))
  const algumaNoQuadro = quadro.semanas.some((s) => s.restricoes.length)
  const semNenhuma = !restricoes.some((r) => !r.atividade?.arquivada)
  const fichaAberta = ficha && (
    <FichaRestricao key={ficha.restricao?.id || 'nova'} restricao={ficha.restricao} itens={itens} responsaveis={responsaveis}
      aoFechar={() => setFicha(null)} aoSalvar={salvar} />
  )

  if (semNenhuma) {
    return (
      <>
        <EstadoVazio icone="alerta" titulo="Nenhuma restrição nas próximas semanas"
          texto="Restrição é o que impede uma atividade de começar: material, gente, projeto, equipamento… Registre agora para resolver antes da semana chegar."
          acao={podeEditar && itens.some((i) => !i.arquivada) ? 'Registrar a primeira restrição' : null} aoAgir={() => setFicha({ nova: true })} />
        {fichaAberta}
      </>
    )
  }

  return (
    <>
      <div className="kpis">
        <div className="cartao kpi destaque"><div className="rotulo">Restrições abertas</div><div className="valor num">{resumo.abertas}</div><div className="nota">em todas as semanas</div></div>
        <div className={`cartao kpi ${resumo.vencidas ? 'vermelho' : 'verde'}`}><div className="rotulo">Vencidas</div><div className="valor num">{resumo.vencidas}</div><div className="nota">{resumo.vencidas ? 'prazo passou e não resolveu' : 'nenhuma'}</div></div>
        <div className={`cartao kpi ${resumo.prontas < resumo.naJanela ? 'ambar' : 'verde'}`}>
          <div className="rotulo">Prontas para executar</div>
          <div className="valor num">{resumo.prontas} <span className="de">de {resumo.naJanela}</span></div>
          <div className="nota">atividades sem restrição aberta</div>
        </div>
      </div>
      {podeEditar && (
        <div className="acoes"><button className="botao" onClick={() => setFicha({ nova: true })}><Icon nome="mais_sinal" />Nova restrição</button></div>
      )}
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao>Semanas</TituloSecao>
          <div className="ordenar" role="group" aria-label="Quantas semanas ver">
            {SEMANAS_LOOKAHEAD.map((n) => <button key={n} className={semanas === n ? 'ativo' : ''} aria-pressed={semanas === n} onClick={() => setSemanas(n)}>{n}</button>)}
          </div>
          <div className="direita">
            <select className="filtro" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} aria-label="Filtrar por responsável">
              <option value="">Todos os responsáveis</option>
              {nomesNoFiltro.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className={`chip ${mostrarResolvidas ? 'ativo ok' : ''}`} aria-pressed={mostrarResolvidas} onClick={() => setMostrarResolvidas((x) => !x)}>Mostrar resolvidas</button>
          </div>
        </div>
      </div>
      <div className="kanban" role="list" aria-label="Restrições por semana">
        {quadro.semanas.map((s) => (
          <section key={s.inicio} className="coluna" role="listitem" aria-label={s.atual ? 'Esta semana' : `Semana de ${formatarDiaMes(s.inicio)}`}>
            <div className="coluna-cab">
              <TituloSecao conta={s.restricoes.length}>{s.atual ? 'Esta semana' : <span className="data-curta">{formatarDiaMes(s.inicio)} a {formatarDiaMes(s.fim)}</span>}</TituloSecao>
            </div>
            {!s.restricoes.length && <div className="coluna-vazia">{s.atual || algumaNoQuadro ? 'Nada travando.' : 'Nada com este filtro.'}</div>}
            {s.restricoes.map((r) => (
              <CartaoRestricao key={r.id} r={r} podeEditar={podeEditar} ocupado={ocupado === r.id}
                aoEditar={() => setFicha({ restricao: r })}
                aoMover={(d) => fazer(r.id, () => moverRestricao(r.id, d), d < 0 ? 'Voltou uma semana.' : 'Foi para a próxima semana.')}
                aoResolver={() => fazer(r.id, () => resolverRestricao(r.id, restricaoAberta(r)), restricaoAberta(r) ? 'Resolvida.' : 'Reaberta.')} />
            ))}
          </section>
        ))}
      </div>
      {quadro.depois > 0 && (
        <p className="nota-depois">
          {quadro.depois === 1 ? '1 restrição' : `${quadro.depois} restrições`} depois de <span className="data-curta">{formatarDiaMes(quadro.fimJanela)}</span>
          {semanas < SEMANAS_LOOKAHEAD.at(-1) ? '. Aumente as semanas para ver.' : '.'}
        </p>
      )}
      {fichaAberta}
    </>
  )
}
