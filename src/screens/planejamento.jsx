// Planejamento (Last Planner + EAP): as abas internas do módulo sobre a MESMA
// lista de atividades da obra, carregada uma vez só aqui em cima. EAP (a base:
// árvore, ficha, calendário), Longo prazo (cronograma), Médio prazo (em
// screens/lookahead.jsx) e Curto prazo (em screens/semana.jsx). Quem decide
// (código, grupo, dias úteis, previsto, escala) é lib/planejamento.js.
import { useEffect, useRef, useState } from 'react'
import { adicionarFeriado, arquivarAtividade, listarPlanejamento, moverAtividade, removerFeriado, salvarAtividade, salvarDiasDeTrabalho } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { abasDoPlanejamento, pode } from '../lib/permissoes.js'
import { hoje } from '../lib/config.js'
import { formatarData, formatarDiaMes } from '../lib/datas.js'
import {
  NOMES_DIAS, VISOES, atrasDoPrevisto, descendentes, montarEscala, paisPossiveis, posicaoDoDia, posicaoNaEscala, resumoObra,
  validarAtividade, validarFeriado, visiveisNaEap,
} from '../lib/planejamento.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Folha, Icon, Meta, Tag, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'
import MedioPrazo from './lookahead.jsx'
import CurtoPrazo from './semana.jsx'
import PlanilhaCronograma from './importar.jsx'

const soDigitos = (t) => t.replace(/\D/g, '').slice(0, 3)
const diasUteis = (n) => `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`

// Ficha da atividade: criar, editar, subatividade, ordem e arquivar.
// Para quem só vê (arquiteta), os campos aparecem travados e sem botões.
function FichaAtividade({ item, paiInicial, itens, frentes, podeEditar, aoFechar, aoMudar }) {
  const avisar = useAviso()
  const [campos, setCampos] = useState(() => item
    ? { titulo: item.titulo, pai_id: item.pai_id || '', inicio: item.inicio, fim: item.fim, frente_id: item.frente_id || '', progresso: String(item.progresso) }
    : { titulo: '', pai_id: paiInicial || '', inicio: hoje(), fim: hoje(), frente_id: '', progresso: '' })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const ehGrupo = Boolean(item?.ehGrupo)
  const problemas = validarAtividade(campos, { ehGrupo })
  const mostrar = (c) => (tentou || tocados[c]) && problemas[c]
  const mudar = (c, v) => { setCampos((x) => ({ ...x, [c]: v })); setTocados((t) => ({ ...t, [c]: true })) }
  const pais = paisPossiveis(itens, itens, item?.id)
  const filhasAtivas = item ? descendentes(itens, item.id).filter((id) => !itens.find((i) => i.id === id)?.arquivada).length : 0

  async function fazer(acao, sucesso) {
    setOcupado(true)
    const { erro } = await acao()
    setOcupado(false)
    if (erro) return avisar(erro, 'erro')
    avisar(sucesso)
    aoMudar()
  }
  function salvar() {
    setTentou(true)
    if (Object.keys(problemas).length) return
    fazer(() => salvarAtividade({ ...campos, id: item?.id }), 'Salvo.')
  }

  const titulo = !item ? (paiInicial ? 'Nova subatividade' : 'Nova atividade') : `${item.codigo ? `${item.codigo} ` : ''}${item.titulo}`
  return (
    <Folha titulo={titulo} aoFechar={aoFechar}>
      <div className="form">
        {item?.arquivada && <div className="meta" style={{ marginTop: 0 }}>Arquivada: para mudar alguma coisa, desarquive primeiro.</div>}
        {/* Arquivada fica só leitura: o "Dentro de" não lista pai arquivado e salvaria a atividade no nível principal. */}
        <fieldset className="sem-borda form" style={{ padding: 0 }} disabled={!podeEditar || ocupado || Boolean(item?.arquivada)}>
          <label className="campo"><span>Título <em>*</em></span>
            <input type="text" value={campos.titulo} placeholder="Ex.: Reboco da sala" autoComplete="off"
              onChange={(e) => mudar('titulo', e.target.value)} onBlur={() => setTocados((t) => ({ ...t, titulo: true }))} />
            {mostrar('titulo') && <div className="erro-campo" role="alert">{problemas.titulo}</div>}
          </label>
          <label className="campo"><span>Dentro de</span>
            <select value={campos.pai_id} onChange={(e) => mudar('pai_id', e.target.value)}>
              <option value="">Nível principal</option>
              {pais.map((p) => <option key={p.id} value={p.id}>{'  '.repeat(p.nivel)}{p.codigo} {p.titulo}</option>)}
            </select>
          </label>
          {ehGrupo ? (
            <div className="campo"><span>Datas e % realizado</span>
              <Meta itens={[<span key="d" className="data-curta">{formatarData(item.inicio)} a {formatarData(item.fim)}</span>, diasUteis(item.duracao), `${item.progresso}%`]} />
              <div className="meta">Calculados das subatividades.</div>
            </div>
          ) : (
            <>
              <div className="duas-col">
                <label className="campo"><span>Início <em>*</em></span>
                  <input type="date" value={campos.inicio} onChange={(e) => mudar('inicio', e.target.value)} />
                  {mostrar('inicio') && <div className="erro-campo" role="alert">{problemas.inicio}</div>}
                </label>
                <label className="campo"><span>Fim <em>*</em></span>
                  <input type="date" value={campos.fim} min={campos.inicio || undefined} onChange={(e) => mudar('fim', e.target.value)} />
                  {mostrar('fim') && <div className="erro-campo" role="alert">{problemas.fim}</div>}
                </label>
              </div>
              <label className="campo"><span>% realizado</span>
                <input type="text" inputMode="numeric" autoComplete="off" placeholder="0 a 100" value={campos.progresso}
                  onChange={(e) => mudar('progresso', soDigitos(e.target.value))} />
                {mostrar('progresso') && <div className="erro-campo" role="alert">{problemas.progresso}</div>}
              </label>
            </>
          )}
          <label className="campo"><span>Frente ligada</span>
            <select value={campos.frente_id} onChange={(e) => mudar('frente_id', e.target.value)}>
              <option value="">Nenhuma</option>
              {frentes.map((f) => <option key={f.id} value={f.id}>{f.servico}</option>)}
            </select>
          </label>
        </fieldset>

        {podeEditar && (
          confirmando ? (
            <div className="cartao confirmar" role="alert">
              <p>Arquivar <b>{item.titulo}</b>{filhasAtivas ? <> e {filhasAtivas === 1 ? 'a subatividade' : `as ${filhasAtivas} subatividades`}</> : ''}? Some da árvore; dá para desarquivar depois.</p>
              <div className="acoes">
                <button className="botao perigo" disabled={ocupado} onClick={() => fazer(() => arquivarAtividade(item.id, true), 'Arquivada.')}>Arquivar</button>
                <button className="botao contorno" onClick={() => setConfirmando(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              {!item?.arquivada && <button className="botao largo" disabled={ocupado} onClick={salvar}><Icon nome="check" />Salvar</button>}
              {item && (
                <div className="acoes">
                  {!item.arquivada && <button className="botao contorno" disabled={ocupado} onClick={() => aoMudar({ subDe: item.id })}><Icon nome="mais_sinal" />Subatividade</button>}
                  {!item.arquivada && <button className="icone-botao" disabled={ocupado} aria-label="Subir na ordem" onClick={() => fazer(() => moverAtividade(item.id, -1), 'Subiu.')}><span aria-hidden="true">↑</span>Subir</button>}
                  {!item.arquivada && <button className="icone-botao" disabled={ocupado} aria-label="Descer na ordem" onClick={() => fazer(() => moverAtividade(item.id, 1), 'Desceu.')}><span aria-hidden="true">↓</span>Descer</button>}
                  {item.arquivada
                    ? <button className="botao contorno" disabled={ocupado} onClick={() => fazer(() => arquivarAtividade(item.id, false), 'Desarquivada.')}>Desarquivar</button>
                    : <button className="botao contorno" disabled={ocupado} onClick={() => setConfirmando(true)}>Arquivar</button>}
                </div>
              )}
            </>
          )
        )}
      </div>
    </Folha>
  )
}

// Calendário da obra: dias de trabalho e feriados. Muda as durações na hora.
function Calendario({ calendario, podeEditar, aoFechar, aoMudar }) {
  const avisar = useAviso()
  const [dias, setDias] = useState(calendario.dias_semana)
  const [novo, setNovo] = useState({ data: hoje(), nome: '' })
  const [tentou, setTentou] = useState(false)
  const [removendo, setRemovendo] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const problemas = validarFeriado(novo, calendario.feriados)
  const mudouDias = dias.join() !== calendario.dias_semana.join()

  async function fazer(acao, sucesso, depois) {
    setOcupado(true)
    const { erro } = await acao()
    setOcupado(false)
    if (erro) return avisar(erro, 'erro')
    avisar(sucesso)
    depois?.()
    aoMudar()
  }
  const alternar = (d) => setDias((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d].sort((a, b) => a - b)))
  function adicionar() {
    setTentou(true)
    if (Object.keys(problemas).length) return
    fazer(() => adicionarFeriado(novo), 'Feriado incluído.', () => { setNovo({ data: hoje(), nome: '' }); setTentou(false) })
  }

  return (
    <Folha titulo="Calendário da obra" aoFechar={aoFechar}>
      <div className="form">
        <div className="campo"><span>Dias de trabalho</span>
          <div className="chips" style={{ marginTop: 0 }}>
            {NOMES_DIAS.map((nome, d) => (
              <button key={nome} type="button" className={`chip ${dias.includes(d) ? 'ativo ok' : ''}`} aria-pressed={dias.includes(d)}
                disabled={!podeEditar || ocupado} onClick={() => alternar(d)}>{nome}</button>
            ))}
          </div>
          {!dias.length && <div className="erro-campo" role="alert">Escolha pelo menos um dia de trabalho.</div>}
        </div>
        {podeEditar && mudouDias && (
          <button className="botao largo" disabled={ocupado || !dias.length} onClick={() => fazer(() => salvarDiasDeTrabalho(dias), 'Dias de trabalho salvos.')}>
            <Icon nome="check" />Salvar dias de trabalho
          </button>
        )}

        <div className="campo"><span>Feriados</span>
          {!calendario.feriados.length && <div className="meta">Nenhum feriado nesta obra.</div>}
          <div className="cartao">
            {calendario.feriados.map((f) => (
              <div key={f.id} className="linha-lista">
                <div>
                  <div className="titulo" style={{ fontSize: 16 }}>{f.nome}</div>
                  <Meta itens={[<span key="d" className="data-curta">{formatarData(f.data)}</span>]} />
                </div>
                {podeEditar && (
                  <div className="lado">
                    {removendo === f.id ? (
                      <>
                        <button className="botao perigo" disabled={ocupado} onClick={() => fazer(() => removerFeriado(f.id), 'Feriado removido.', () => setRemovendo(null))}>Remover</button>
                        <button className="icone-botao" onClick={() => setRemovendo(null)}>Cancelar</button>
                      </>
                    ) : (
                      <button className="icone-botao" aria-label={`Remover ${f.nome}`} onClick={() => setRemovendo(f.id)}><Icon nome="x" /></button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {podeEditar && (
          <div className="campo"><span>Incluir feriado</span>
            <div className="duas-col">
              <label className="campo"><span>Data <em>*</em></span>
                <input type="date" value={novo.data} onChange={(e) => setNovo((x) => ({ ...x, data: e.target.value }))} />
                {tentou && problemas.data && <div className="erro-campo" role="alert">{problemas.data}</div>}
              </label>
              <label className="campo"><span>Nome <em>*</em></span>
                <input type="text" value={novo.nome} placeholder="Ex.: Padroeira" autoComplete="off" onChange={(e) => setNovo((x) => ({ ...x, nome: e.target.value }))} />
                {tentou && problemas.nome && <div className="erro-campo" role="alert">{problemas.nome}</div>}
              </label>
            </div>
            <button className="botao contorno largo" disabled={ocupado} onClick={adicionar}><Icon nome="mais_sinal" />Incluir feriado</button>
          </div>
        )}
      </div>
    </Folha>
  )
}

function LinhaEap({ i, aoAbrir }) {
  return (
    <button className={`linha-lista eap ${i.ehGrupo ? 'grupo' : ''} ${i.arquivada ? 'arquivada' : ''}`} style={{ '--nivel': i.nivel }} onClick={aoAbrir}>
      <div className="eap-corpo">
        <span className="eap-codigo">{i.codigo || '—'}</span>
        <div>
          <div className="titulo">{i.titulo}</div>
          <Meta itens={[
            <span key="d" className="data-curta">{formatarDiaMes(i.inicio)} a {formatarDiaMes(i.fim)}</span>,
            diasUteis(i.duracao),
            i.frente && `Frente: ${i.frente}`,
            i.arquivada && <Tag key="a" cor="neutra">Arquivada</Tag>,
          ]} />
        </div>
      </div>
      <div className="lado eap-pct" aria-label={`${i.progresso}% realizado`}>
        <span className="num">{i.progresso}%</span>
        <div className="barra"><i style={{ width: `${i.progresso}%` }} /></div>
      </div>
    </button>
  )
}

function Eap({ data, podeEditar, aoAbrir, aoCriar, recarregar }) {
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)
  const [vendoCalendario, setVendoCalendario] = useState(false)

  const arquivadas = data.itens.filter((i) => i.arquivada).length
  const planilha = podeEditar && (
    <PlanilhaCronograma calendario={data.calendario} atuais={data.itens.length - arquivadas}
      raizes={data.itens.filter((i) => i.nivel === 0 && !i.arquivada).length} recarregar={recarregar} />
  )
  if (!data.itens.length) {
    return (
      <>
        <EstadoVazio icone="planejamento" titulo="Esta obra ainda não tem atividades planejadas"
          texto="A EAP é a base do planejamento: quebre a obra em atividades e subatividades, ou traga o cronograma de uma planilha. O código 1, 1.1, 1.2.1 sai sozinho."
          acao={podeEditar ? 'Criar a primeira atividade' : null} aoAgir={() => aoCriar()} />
        {planilha && <div className="acoes" style={{ justifyContent: 'center' }}>{planilha}</div>}
      </>
    )
  }
  const lista = visiveisNaEap(data.itens, mostrarArquivadas)
  const { dias_semana: dias, feriados } = data.calendario
  return (
    <>
      {podeEditar && (
        <div className="acoes">
          <button className="botao" onClick={() => aoCriar()}><Icon nome="mais_sinal" />Nova atividade</button>
          <button className="botao contorno" onClick={() => setVendoCalendario(true)}><Icon nome="cronograma" />Calendário</button>
          {planilha}
        </div>
      )}
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={data.itens.length - arquivadas}>Atividades</TituloSecao>
          <div className="direita">
            <button className="link" onClick={() => setVendoCalendario(true)}>
              Trabalho {dias.map((d) => NOMES_DIAS[d].toLowerCase()).join(', ')}{feriados.length ? ` · ${feriados.length} ${feriados.length === 1 ? 'feriado' : 'feriados'}` : ''}
            </button>
            {arquivadas > 0 && (
              <button className={`chip ${mostrarArquivadas ? 'ativo ok' : ''}`} aria-pressed={mostrarArquivadas} onClick={() => setMostrarArquivadas((x) => !x)}>
                Mostrar arquivadas ({arquivadas})
              </button>
            )}
          </div>
        </div>
        {!lista.length && <div className="coluna-vazia" style={{ margin: 14 }}>Todas as atividades estão arquivadas.</div>}
        {lista.map((i) => <LinhaEap key={i.id} i={i} aoAbrir={() => aoAbrir(i.id)} />)}
      </div>
      {vendoCalendario && (
        <Calendario calendario={data.calendario} podeEditar={podeEditar} aoFechar={() => setVendoCalendario(false)} aoMudar={recarregar} />
      )}
    </>
  )
}

// ── Longo prazo: cronograma em barras (computador) ou lista (celular) ──────
const LARGURA_COLUNA = { 'Semana': 64, 'Mês': 140 }
const realEPrevisto = (i) => `real ${i.progresso}% · previsto ${i.previsto}%`

function ResumoObra({ resumo }) {
  const d = resumo.diferenca
  return (
    <div className="kpis">
      <div className="cartao kpi destaque"><div className="rotulo">Previsto hoje</div><div className="valor num">{resumo.previsto}%</div><div className="nota">em {formatarDiaMes(hoje())}</div></div>
      <div className="cartao kpi"><div className="rotulo">Realizado</div><div className="valor num">{resumo.real}%</div><div className="nota">da obra planejada</div></div>
      <div className={`cartao kpi ${d < 0 ? 'vermelho' : 'verde'}`}>
        <div className="rotulo">Diferença</div>
        <div className="valor num">{d > 0 ? '+' : ''}{d}</div>
        <div className="nota">{d === 0 ? 'em dia com o previsto' : `${Math.abs(d) === 1 ? 'ponto' : 'pontos'} ${d < 0 ? 'atrás do' : 'à frente do'} previsto`}</div>
      </div>
    </div>
  )
}

function Gantt({ ativos, escala, largura, aoAbrir }) {
  const hojeEm = posicaoDoDia(hoje(), escala)
  const rolagem = useRef(null)
  // Abre (e troca de escala) já rolado até hoje, no meio da área das barras.
  useEffect(() => {
    const el = rolagem.current
    if (!el || hojeEm === null) return
    const rotulo = el.querySelector('.gantt-rotulo')?.offsetWidth || 0
    el.scrollLeft = Math.max(0, (hojeEm / 100) * largura - (el.clientWidth - rotulo) / 2)
  }, [hojeEm, largura])
  return (
    <div className="gantt-rolagem so-computador" ref={rolagem}>
      <div className="gantt" style={{ '--trilha': `${largura}px` }}>
        <div className="gantt-cab">
          <div className="gantt-rotulo">Atividade</div>
          <div className="gantt-trilha">
            {escala.colunas.map((c) => <span key={c.inicio} style={{ width: `${(c.dias / escala.total) * 100}%` }}>{c.rotulo}</span>)}
            {hojeEm !== null && <em className="gantt-hoje-rotulo" style={{ left: `${hojeEm}%` }}>hoje</em>}
          </div>
        </div>
        <div className="gantt-corpo">
          <div className="gantt-grade" aria-hidden="true">
            {escala.colunas.map((c) => <span key={c.inicio} style={{ width: `${(c.dias / escala.total) * 100}%` }} />)}
            {hojeEm !== null && <i className="gantt-hoje" style={{ left: `${hojeEm}%` }} />}
          </div>
          {ativos.map((i) => {
            const p = posicaoNaEscala(i.inicio, i.fim, escala)
            return (
              <button key={i.id} className={`gantt-linha ${i.ehGrupo ? 'grupo' : ''}`} onClick={() => aoAbrir(i.id)}
                aria-label={`${i.codigo} ${i.titulo}: ${formatarData(i.inicio)} a ${formatarData(i.fim)}, ${realEPrevisto(i)}`}>
                <div className="gantt-rotulo" style={{ '--nivel': i.nivel }}>
                  <span className="eap-codigo">{i.codigo}</span>
                  <span className="gantt-nome">
                    <span className="titulo">{i.titulo}</span>
                    <span className={`gantt-pct ${atrasDoPrevisto(i) ? 'atras' : ''}`}>{realEPrevisto(i)}</span>
                  </span>
                </div>
                <div className="gantt-trilha">
                  <div className="gantt-barra" style={{ left: `${p.esquerda}%`, width: `${p.largura}%` }}>
                    <i style={{ width: `${i.progresso}%` }} />
                    <b style={{ left: `${i.previsto}%` }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LongoPrazo({ itens, aoAbrir, irParaEap }) {
  const [visao, setVisao] = useState('Semana')
  const escala = montarEscala(itens, visao)
  if (!escala) {
    return (
      <EstadoVazio icone="cronograma" titulo="Sem atividades para pôr no cronograma"
        texto="O cronograma sai da EAP: cada atividade vira uma barra com início, fim e % realizado."
        acao="Ir para a EAP" aoAgir={irParaEap} />
    )
  }
  const ativos = itens.filter((i) => !i.arquivada)
  const resumo = resumoObra(itens)
  return (
    <>
      <ResumoObra resumo={resumo} />
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao>Cronograma</TituloSecao>
          <span className="meta" style={{ marginTop: 0 }}><span className="data-curta">{formatarData(resumo.inicio)} a {formatarData(resumo.fim)}</span></span>
          <div className="direita">
            <div className="ordenar so-computador" role="group" aria-label="Escala do cronograma">
              {VISOES.map((v) => <button key={v} className={visao === v ? 'ativo' : ''} aria-pressed={visao === v} onClick={() => setVisao(v)}>{v}</button>)}
            </div>
          </div>
        </div>
        <Gantt ativos={ativos} escala={escala} largura={escala.colunas.length * LARGURA_COLUNA[visao]} aoAbrir={aoAbrir} />
        <div className="so-celular">
          {ativos.map((i) => (
            <button key={i.id} className={`linha-lista eap ${i.ehGrupo ? 'grupo' : ''}`} style={{ '--nivel': i.nivel }} onClick={() => aoAbrir(i.id)}>
              <div className="eap-corpo">
                <span className="eap-codigo">{i.codigo}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="titulo">{i.titulo}</div>
                  <Meta itens={[<span key="d" className="data-curta">{formatarDiaMes(i.inicio)} a {formatarDiaMes(i.fim)}</span>, diasUteis(i.duracao)]} />
                  <div className="barra-prevista" aria-hidden="true">
                    <div className="barra"><i style={{ width: `${i.progresso}%` }} /></div>
                    <b style={{ left: `${i.previsto}%` }} />
                  </div>
                  <div className={`gantt-pct ${atrasDoPrevisto(i) ? 'atras' : ''}`}>{realEPrevisto(i)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="gantt-legenda" aria-hidden="true">
          <span className="so-computador"><i className="leg-plan" />Planejado</span>
          <span><i className="leg-real" />Realizado</span>
          <span><i className="leg-prev" />Previsto hoje</span>
          <span className="so-computador"><i className="leg-hoje" />Hoje</span>
        </div>
      </div>
    </>
  )
}

const ROTULO_ABA = { eap: 'EAP', longo: 'Longo prazo', medio: 'Médio prazo', curto: 'Curto prazo' }

export default function Planejamento() {
  const { perfil } = useSessao()
  const podeEditar = pode(perfil.role, 'planejar')
  const abas = abasDoPlanejamento(perfil.role) // o mestre só tem o Curto prazo
  // Uma lista só para todas as abas: o que muda numa, as outras já leem.
  const { carregando, data, erro, recarregar } = useCarregar(listarPlanejamento)
  const [aba, setAba] = useState(abas[0])
  const [ficha, setFicha] = useState(null) // { id } para abrir uma; { nova: true, paiId } para criar

  // Depois de salvar: recarrega a lista; "Subatividade" troca a ficha aberta por uma nova.
  function depoisDaFicha(proximo) {
    setFicha(proximo?.subDe ? { nova: true, paiId: proximo.subDe } : null)
    recarregar()
  }
  const abrir = (id) => setFicha({ id })

  let corpo
  if (carregando && !data) corpo = <Carregando alto />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (aba === 'longo') corpo = <LongoPrazo itens={data.itens} aoAbrir={abrir} irParaEap={() => setAba('eap')} />
  else if (aba === 'medio') {
    corpo = <MedioPrazo itens={data.itens} restricoes={data.restricoes} responsaveis={data.responsaveis} podeEditar={podeEditar} recarregar={recarregar} />
  } else if (aba === 'curto') {
    corpo = (
      <CurtoPrazo itens={data.itens} subtarefas={data.subtarefas} naoRealizados={data.naoRealizados}
        podeMover={pode(perfil.role, 'moverCurtoPrazo')} podeApagar={pode(perfil.role, 'apagar')}
        irParaEap={abas.includes('eap') ? () => setAba('eap') : null} recarregar={recarregar} />
    )
  } else corpo = <Eap data={data} podeEditar={podeEditar} aoAbrir={abrir} aoCriar={() => setFicha({ nova: true })} recarregar={recarregar} />

  const aberta = ficha?.id && data?.itens.find((i) => i.id === ficha.id)
  return (
    <>
      <Cabecalho abas={abas.map((id) => (
        <button key={id} className={`aba ${aba === id ? 'ativa' : ''}`} aria-current={aba === id ? 'page' : undefined} onClick={() => setAba(id)}>{ROTULO_ABA[id]}</button>
      ))} />
      <main className="conteudo">{corpo}</main>
      {data && ficha && (aberta || ficha.nova) && (
        <FichaAtividade key={ficha.id || `nova-${ficha.paiId || ''}`} item={aberta || null} paiInicial={ficha.paiId}
          itens={data.itens} frentes={data.frentes} podeEditar={podeEditar}
          aoFechar={() => setFicha(null)} aoMudar={depoisDaFicha} />
      )}
    </>
  )
}
