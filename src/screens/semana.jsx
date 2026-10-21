// Planejamento › Curto prazo: a semana em Kanban (A fazer · Em andamento ·
// Concluído), as subtarefas de cada atividade, o "não realizado" com a causa e
// o PPC. Mover é por botões, sem arrastar. Quem decide (quem entra na semana,
// coluna, PPC, o que se pode marcar) é lib/planejamento.js; aqui só se mostra.
// Os dados vêm da lista única do Planejamento (screens/planejamento.jsx).
import { useState } from 'react'
import { criarSubtarefa, desfazerNaoRealizado, marcarNaoRealizado, marcarSubtarefa, moverNoKanban, removerSubtarefa } from '../lib/dados.js'
import { hoje } from '../lib/config.js'
import { formatarData, formatarDiaMes } from '../lib/datas.js'
import { MOTIVOS } from '../lib/atraso.js'
import {
  META_PPC, STATUS_ATIVIDADE, atividadesDaSemana, colunaAnterior, faixaPpc, podeMarcarNaoRealizado, podeMoverNaSemana,
  ppcDaSemana, proximaColuna, resumoSubtarefas, semanaDe, semanaVizinha, tempoDaSemana, validarCausa,
} from '../lib/planejamento.js'
import { EstadoVazio, Folha, Icon, Meta, Tag, TituloSecao, useAviso } from '../components/index.jsx'

const COR_FAIXA = { 'Bom': 'verde', 'Regular': 'ambar', 'Baixo': 'vermelho' }
const textoCausa = (x) => (x.causa === 'Outro' && x.causa_detalhe ? x.causa_detalhe : x.causa)
const periodo = (s) => <span className="data-curta">{formatarDiaMes(s.inicio)} a {formatarDiaMes(s.fim)}</span>

// Escolher a causa (motivos do diário). "Outro" pede o detalhe.
function EscolherCausa({ titulo, aoSalvar, aoCancelar }) {
  const [causa, setCausa] = useState('')
  const [detalhe, setDetalhe] = useState('')
  const [tentou, setTentou] = useState(false)
  const problema = validarCausa({ causa, causa_detalhe: detalhe })
  return (
    <div className="cartao confirmar">
      <p><b>{titulo}</b> Qual foi a causa?</p>
      <div className="chips" style={{ marginTop: 0 }}>
        {MOTIVOS.map((m) => <button key={m} type="button" className={`chip ${causa === m ? 'ativo' : ''}`} aria-pressed={causa === m} onClick={() => setCausa(m)}>{m}</button>)}
      </div>
      {causa === 'Outro' && (
        <label className="campo"><span>Qual? <em>*</em></span>
          <input type="text" value={detalhe} autoComplete="off" placeholder="Explique em poucas palavras" onChange={(e) => setDetalhe(e.target.value)} />
        </label>
      )}
      {tentou && problema && <div className="erro-campo" role="alert">{problema}</div>}
      <div className="acoes">
        <button className="botao perigo" onClick={() => { setTentou(true); if (!problema) aoSalvar({ causa, causa_detalhe: detalhe }) }}>Salvar causa</button>
        <button className="botao contorno" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  )
}

function LinhaSubtarefa({ s, podeMexer, podeApagar, aoMarcar, aoRemover }) {
  const [modo, setModo] = useState(null) // 'causa' | 'apagar'
  const feita = s.situacao === 'Feita'
  return (
    <div className="subtarefa">
      <div className="subtarefa-linha">
        <button className={`marcar ${feita ? 'feita' : ''}`} disabled={!podeMexer} aria-pressed={feita}
          aria-label={`${s.titulo}: ${feita ? 'feita' : 'marcar como feita'}`} onClick={() => aoMarcar(feita ? 'Pendente' : 'Feita')}>
          {feita && <Icon nome="check" />}
        </button>
        <div className="subtarefa-texto">
          <span className={feita ? 'riscado' : ''}>{s.titulo}</span>
          {s.situacao === 'Não realizado' && <span className="meta" style={{ marginTop: 0 }}><Tag cor="vermelho">Não realizada</Tag> {textoCausa(s)}</span>}
        </div>
        {podeMexer && !modo && (
          <div className="lado">
            {s.situacao === 'Não realizado'
              ? <button className="icone-botao" onClick={() => aoMarcar('Pendente')}>Desfazer</button>
              : !feita && <button className="icone-botao" onClick={() => setModo('causa')}>Não realizada</button>}
            {podeApagar && <button className="icone-botao" aria-label={`Apagar ${s.titulo}`} onClick={() => setModo('apagar')}><Icon nome="x" /></button>}
          </div>
        )}
      </div>
      {modo === 'causa' && (
        <EscolherCausa titulo="Subtarefa não realizada." aoCancelar={() => setModo(null)} aoSalvar={(c) => { setModo(null); aoMarcar('Não realizado', c) }} />
      )}
      {modo === 'apagar' && (
        <div className="cartao confirmar" role="alert">
          <p>Apagar a subtarefa <b>{s.titulo}</b>? Não dá para desfazer.</p>
          <div className="acoes">
            <button className="botao perigo" onClick={() => { setModo(null); aoRemover() }}>Apagar</button>
            <button className="botao contorno" onClick={() => setModo(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// A ficha da atividade nesta semana: coluna, subtarefas e "não realizado".
function FichaDaSemana({ a, semana, podeMover, podeApagar, aoFechar, fazer }) {
  const [nova, setNova] = useState('')
  const [tentou, setTentou] = useState(false)
  const [marcandoNr, setMarcandoNr] = useState(false)
  const tempo = tempoDaSemana(semana, hoje())
  const podeColuna = podeMover && podeMoverNaSemana(semana, hoje())
  const podeSub = podeMover && tempo !== 'futura'
  const podeNr = podeMover && podeMarcarNaoRealizado(a, semana, hoje())
  const r = resumoSubtarefas(a.subtarefas)

  function incluir() {
    setTentou(true)
    if (!nova.trim()) return
    fazer(() => criarSubtarefa(a.id, nova), 'Subtarefa incluída.', () => { setNova(''); setTentou(false) })
  }

  return (
    <Folha titulo={`${a.codigo} ${a.titulo}`} aoFechar={aoFechar}>
      <div className="form">
        <Meta itens={[
          <span key="d" className="data-curta">{formatarData(a.inicio)} a {formatarData(a.fim)}</span>,
          a.frente && `Frente: ${a.frente}`, `${a.progresso}% realizado`,
          a.acumulada && <Tag key="ac" cor="ambar">Acumulada</Tag>,
          a.concluida_em && `concluída em ${formatarDiaMes(a.concluida_em)}`,
        ]} />
        {podeColuna ? (
          <label className="campo"><span>Coluna</span>
            <select value={a.coluna} onChange={(e) => fazer(() => moverNoKanban(a.id, e.target.value), `Foi para ${e.target.value}.`)}>
              {STATUS_ATIVIDADE.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        ) : <div className="meta" style={{ marginTop: 0 }}>Coluna nesta semana: <b>{a.coluna}</b></div>}

        <div className="campo"><span>Subtarefas {r.total > 0 && <span className="num">{r.feitas} de {r.total}</span>}</span>
          {!r.total && <div className="meta" style={{ marginTop: 0 }}>Nenhuma subtarefa. Quebre a atividade em passos para acompanhar na semana.</div>}
          {a.subtarefas.length > 0 && (
            <div className="cartao">
              {a.subtarefas.map((s) => (
                <LinhaSubtarefa key={s.id} s={s} podeMexer={podeSub} podeApagar={podeApagar}
                  aoMarcar={(situacao, causa) => fazer(() => marcarSubtarefa(s.id, situacao, causa), situacao === 'Feita' ? 'Feita.' : 'Salvo.')}
                  aoRemover={() => fazer(() => removerSubtarefa(s.id), 'Subtarefa apagada.')} />
              ))}
            </div>
          )}
          {podeSub && (
            <div className="incluir">
              <input type="text" value={nova} placeholder="Nova subtarefa" autoComplete="off" aria-label="Nova subtarefa"
                onChange={(e) => setNova(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && incluir()} />
              <button className="botao contorno" onClick={incluir}><Icon nome="mais_sinal" />Incluir</button>
            </div>
          )}
          {tentou && !nova.trim() && <div className="erro-campo" role="alert">Escreva a subtarefa.</div>}
        </div>

        {a.naoRealizado ? (
          <div className="cartao confirmar">
            <p><Tag cor="vermelho">Não realizado nesta semana</Tag> {textoCausa(a.naoRealizado)}{a.naoRealizado.autor ? ` · por ${a.naoRealizado.autor}` : ''}</p>
            {podeNr && <div className="acoes"><button className="botao contorno" onClick={() => fazer(() => desfazerNaoRealizado(a.id, semana.inicio), 'Desfeito.')}>Desfazer</button></div>}
          </div>
        ) : podeNr && (marcandoNr
          ? <EscolherCausa titulo="Não realizado nesta semana." aoCancelar={() => setMarcandoNr(false)}
              aoSalvar={(c) => fazer(() => marcarNaoRealizado(a.id, semana.inicio, c), 'Não realizado registrado.', () => setMarcandoNr(false))} />
          : <button className="botao contorno largo" onClick={() => setMarcandoNr(true)}>Não realizado nesta semana</button>)}
      </div>
    </Folha>
  )
}

function CartaoSemana({ a, podeMoverAqui, ocupado, aoAbrir, aoMover }) {
  const r = resumoSubtarefas(a.subtarefas)
  const proxima = proximaColuna(a.coluna)
  return (
    <article className={`cartao restricao cartao-semana ${a.naoRealizado ? 'vencida' : ''}`}>
      <button className="restricao-corpo" onClick={aoAbrir} aria-label={`${a.codigo} ${a.titulo}. Abrir`}>
        {(a.acumulada || a.naoRealizado) && (
          <div className="tags">
            {a.acumulada && <Tag cor="ambar">Acumulada</Tag>}
            {a.naoRealizado && <Tag cor="vermelho">Não realizado</Tag>}
          </div>
        )}
        <div className="titulo"><span className="codigo-cartao">{a.codigo}</span> {a.titulo}</div>
        <Meta itens={[
          <span key="d">até <span className="data-curta">{formatarDiaMes(a.fim)}</span></span>,
          r.total > 0 && `${r.feitas} de ${r.total} subtarefas`,
          a.naoRealizado && `Causa: ${textoCausa(a.naoRealizado)}`,
        ]} />
      </button>
      {podeMoverAqui && (
        <div className="pedido-acoes">
          {a.coluna === 'Em andamento' && (
            <button className="icone-botao" disabled={ocupado} aria-label="Voltar para A fazer" onClick={() => aoMover(colunaAnterior(a.coluna))}><Icon nome="voltar" /></button>
          )}
          {proxima
            ? <button className="botao" disabled={ocupado} onClick={() => aoMover(proxima)}>{proxima === 'Concluído' ? <><Icon nome="check" />Concluir</> : <>Iniciar<Icon nome="avancar" /></>}</button>
            : <button className="botao contorno" disabled={ocupado} onClick={() => aoMover('Em andamento')}>Reabrir</button>}
        </div>
      )}
    </article>
  )
}

export default function CurtoPrazo({ itens, subtarefas, naoRealizados, podeMover, podeApagar, irParaEap, recarregar }) {
  const avisar = useAviso()
  const [semana, setSemana] = useState(() => semanaDe(hoje()))
  const [aberta, setAberta] = useState(null) // id da atividade com a ficha aberta
  const [ocupado, setOcupado] = useState(null)

  async function fazer(acao, sucesso, depois) {
    const { erro } = await acao()
    if (erro) return avisar(erro, 'erro')
    avisar(sucesso)
    depois?.()
    recarregar()
  }
  async function mover(id, coluna) {
    setOcupado(id)
    await fazer(() => moverNoKanban(id, coluna), coluna === 'Concluído' ? 'Concluída.' : `Foi para ${coluna}.`)
    setOcupado(null)
  }

  const tempo = tempoDaSemana(semana, hoje())
  const podeMoverAqui = podeMover && podeMoverNaSemana(semana, hoje())
  const daSemana = atividadesDaSemana(itens, semana).map((a) => ({
    ...a,
    subtarefas: subtarefas.filter((s) => s.atividade_id === a.id),
    naoRealizado: naoRealizados.find((n) => n.atividade_id === a.id && n.semana === semana.inicio) || null,
  }))
  const { concluidas, planejadas, ppc } = ppcDaSemana(daSemana)
  const faixa = faixaPpc(ppc)
  const naoFeitas = daSemana.filter((a) => a.naoRealizado).length
  const fichaDe = aberta && daSemana.find((a) => a.id === aberta)

  const navegacao = (
    <div className="cartao semana-nav">
      <button className="icone-botao" aria-label="Semana anterior" onClick={() => setSemana((s) => semanaVizinha(s, -1))}><Icon nome="voltar" /></button>
      <div className="semana-rotulo">
        <b>{tempo === 'atual' ? 'Esta semana' : tempo === 'passada' ? 'Semana que passou' : 'Semana que vem'}</b>
        {periodo(semana)}
      </div>
      <button className="icone-botao" aria-label="Próxima semana" onClick={() => setSemana((s) => semanaVizinha(s, 1))}><Icon nome="avancar" /></button>
    </div>
  )
  const aviso = tempo !== 'atual' && (
    <p className="nota-depois">
      {tempo === 'passada' ? 'Semana que já passou: dá para registrar o que não foi realizado e as subtarefas.' : 'Semana futura: só para ver o que vem.'}{' '}
      <button className="link" onClick={() => setSemana(semanaDe(hoje()))}>Voltar para esta semana</button>
    </p>
  )

  if (!daSemana.length) {
    return (
      <>
        {navegacao}
        {aviso}
        <EstadoVazio icone="cronograma" titulo="Nenhuma atividade planejada para esta semana"
          texto="Entram aqui as atividades da EAP cujo período cruza a semana e as que já deviam ter terminado."
          acao={irParaEap ? 'Ir para a EAP' : null} aoAgir={irParaEap} />
      </>
    )
  }

  return (
    <>
      {navegacao}
      {aviso}
      <div className={`cartao ppc ${faixa ? COR_FAIXA[faixa] : ''}`}>
        <div>
          <div className="rotulo">PPC da semana</div>
          <div className="ppc-valor num">{ppc}%</div>
        </div>
        <div className="ppc-detalhe">
          <div className={`barra ${faixa ? COR_FAIXA[faixa] : ''}`}><i style={{ width: `${ppc}%` }} /></div>
          <div className="ppc-linha"><b className="num">{concluidas} de {planejadas}</b> concluídas{naoFeitas ? <> · <b className="num">{naoFeitas}</b> não {naoFeitas === 1 ? 'realizada' : 'realizadas'}</> : ''}{faixa && <Tag cor={COR_FAIXA[faixa]}>{faixa}</Tag>}</div>
          <div className="meta" style={{ marginTop: 0 }}>Percentual do Plano Concluído: quanto do que foi planejado para a semana foi cumprido. Meta: {META_PPC}%.</div>
        </div>
      </div>
      <div className="kanban" role="list" aria-label="Atividades da semana">
        {STATUS_ATIVIDADE.map((col) => {
          const daColuna = daSemana.filter((a) => a.coluna === col).sort((x, y) => Number(y.acumulada) - Number(x.acumulada) || (x.fim < y.fim ? -1 : 1))
          return (
            <section key={col} className="coluna" role="listitem" aria-label={col}>
              <div className="coluna-cab"><TituloSecao conta={daColuna.length}>{col}</TituloSecao></div>
              {!daColuna.length && <div className="coluna-vazia">Nada aqui.</div>}
              {daColuna.map((a) => (
                <CartaoSemana key={a.id} a={a} podeMoverAqui={podeMoverAqui} ocupado={ocupado === a.id}
                  aoAbrir={() => setAberta(a.id)} aoMover={(c) => mover(a.id, c)} />
              ))}
            </section>
          )
        })}
      </div>
      {fichaDe && (
        <FichaDaSemana key={`${fichaDe.id}:${semana.inicio}`} a={fichaDe} semana={semana} podeMover={podeMover} podeApagar={podeApagar}
          aoFechar={() => setAberta(null)} fazer={fazer} />
      )}
    </>
  )
}
