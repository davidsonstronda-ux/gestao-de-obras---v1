// Qualidade › aba FVS: vistorias por ficha (OK · NC · N.A.), não conformidades
// e modelos de ficha. As regras (numeração, %, passos da NC, validações) moram
// em lib/fvs.js; a obra e a permissão, em lib/dados.js. Aqui só se mostra.
import { useState } from 'react'
import { criarVistoriaFvs, finalizarVistoriaFvs, listarFvs, moverNcFvs, registrarNcFvs, responderItemFvs, salvarModeloFvs } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { pode } from '../lib/permissoes.js'
import { formatarData } from '../lib/datas.js'
import { formatarCarimbo } from '../lib/qualidade.js'
import {
  CATEGORIAS_FVS, FILTROS_NC, GRUPOS_SUGERIDOS, RESPOSTAS, SEVERIDADES, filtrarNcs, numerarItens, passosNc, progressoVistoria, proximoCodigoModelo, validarFinalizar, validarModelo,
  validarNc, validarNovaVistoria,
} from '../lib/fvs.js'
import { Carregando, EstadoVazio, Erro, Folha, Icon, Meta, Tag, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'
import { COR_NC, COR_SEVERIDADE, COR_VISTORIA, TirarFoto, pct } from './qualidadeComum.jsx'

const SECOES = [{ id: 'vistorias', rotulo: 'Vistorias' }, { id: 'ncs', rotulo: 'Não conformidades' }, { id: 'modelos', rotulo: 'Modelos' }]

// Barra em cores: verde OK, vermelho NC, cinza N.A.; o trilho é o que falta.
function BarraProgresso({ p }) {
  const largura = (n) => `${p.total ? (n / p.total) * 100 : 0}%`
  return (
    <div className="barra-fvs" role="img" aria-label={`${p.ok} OK, ${p.nc} NC, ${p.na} N.A., ${p.pendentes} por verificar`}>
      <i className="ok" style={{ width: largura(p.ok) }} /><i className="nc" style={{ width: largura(p.nc) }} /><i className="na" style={{ width: largura(p.na) }} />
    </div>
  )
}

// Fotos escolhidas no aparelho, com prévia local (sem envio no mock).
function FotosLocais({ fotos, aoMudar }) {
  return (
    <div className="campo"><span>Fotos</span>
      {fotos.length > 0 && (
        <div className="miniaturas">
          {fotos.map((f, i) => (
            <div key={f} className="miniatura">
              <img src={f} alt={`Foto ${i + 1}`} />
              <button type="button" className="icone-botao" aria-label={`Tirar a foto ${i + 1}`} onClick={() => aoMudar(fotos.filter((x) => x !== f))}><Icon nome="x" /></button>
            </div>
          ))}
        </div>
      )}
      <TirarFoto multiplas rotulo="Fotografar o problema" trocar="Mais uma foto" valor={fotos.length > 0} aoMudar={(novas) => aoMudar([...fotos, ...novas])} />
    </div>
  )
}

// Aviso de obrigatório na hora: ao sair do campo (tocado) ou ao tentar salvar.
function useAvisos(problemas) {
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  return {
    erro: (c) => (tentou || tocados[c]) && problemas[c] && <div className="erro-campo" role="alert">{problemas[c]}</div>,
    tocar: (c) => () => setTocados((t) => ({ ...t, [c]: true })),
    setTentou,
  }
}

function NovaVistoria({ modelos, aoFechar, aoCriar }) {
  const [campos, setCampos] = useState({ modelo_id: '', ambiente: '' })
  const problemas = validarNovaVistoria(campos)
  const { erro, tocar, setTentou } = useAvisos(problemas)
  function salvar() {
    setTentou(true)
    if (!Object.keys(problemas).length) aoCriar(campos)
  }
  return (
    <Folha titulo="Nova vistoria de FVS" aoFechar={aoFechar}>
      <div className="form">
        <label className="campo"><span>Modelo da ficha <em>*</em></span>
          <select value={campos.modelo_id} onChange={(e) => { setCampos((x) => ({ ...x, modelo_id: e.target.value })); tocar('modelo_id')() }} onBlur={tocar('modelo_id')}>
            <option value="">Escolha o modelo…</option>
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}
          </select>
          {erro('modelo_id')}
        </label>
        <label className="campo"><span>Ambiente <em>*</em></span>
          <input type="text" value={campos.ambiente} onChange={(e) => setCampos((x) => ({ ...x, ambiente: e.target.value }))} onBlur={tocar('ambiente')} placeholder="Ex.: Banheiro social · Térreo" />
          {erro('ambiente')}
        </label>
        <button className="botao largo" onClick={salvar}><Icon nome="seta" />Começar vistoria</button>
      </div>
    </Folha>
  )
}

function PainelNc({ item, empreiteiros, aoFechar, aoSalvar }) {
  const [campos, setCampos] = useState({ fotos: [], descricao: '', solucao: '', severidade: '', empreiteiro_id: '' })
  const problemas = validarNc(campos)
  const { erro, tocar, setTentou } = useAvisos(problemas)
  const mudar = (c, v) => setCampos((x) => ({ ...x, [c]: v }))
  function salvar() {
    setTentou(true)
    if (!Object.keys(problemas).length) aoSalvar(campos)
  }
  return (
    <Folha titulo={`Não conformidade · ${item.codigo}`} aoFechar={aoFechar}>
      <div className="form">
        <div className="rotulo">{item.titulo}</div>
        <FotosLocais fotos={campos.fotos} aoMudar={(v) => mudar('fotos', v)} />
        <label className="campo"><span>Descrição do problema <em>*</em></span>
          <textarea value={campos.descricao} onChange={(e) => mudar('descricao', e.target.value)} onBlur={tocar('descricao')} placeholder="O que está fora do padrão?" />
          {erro('descricao')}
        </label>
        <label className="campo"><span>Solução proposta</span>
          <textarea value={campos.solucao} onChange={(e) => mudar('solucao', e.target.value)} placeholder="Como corrigir?" />
        </label>
        <div className="campo"><span>Severidade <em>*</em></span>
          <div className="seg tres-opcoes">
            {SEVERIDADES.map((s) => (
              <button key={s} type="button" className={`opcao sev-${COR_SEVERIDADE[s]} ${campos.severidade === s ? 'marcada' : ''}`} aria-pressed={campos.severidade === s} onClick={() => mudar('severidade', s)}>{s}</button>
            ))}
          </div>
          {erro('severidade')}
        </div>
        <label className="campo"><span>Empresa responsável pela correção <em>*</em></span>
          <select value={campos.empreiteiro_id} onChange={(e) => { mudar('empreiteiro_id', e.target.value); tocar('empreiteiro_id')() }} onBlur={tocar('empreiteiro_id')}>
            <option value="">Escolha a empresa…</option>
            {empreiteiros.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          {erro('empreiteiro_id')}
        </label>
        <button className="botao perigo largo" onClick={salvar}><Icon nome="alerta" />Registrar NC</button>
      </div>
    </Folha>
  )
}

function FichaVistoria({ v, ncs, podeRegistrar, aoVoltar, aoResponder, aoMarcarNc, aoAbrirNc, aoFinalizar }) {
  const p = v.progresso
  const concluida = v.status === 'Concluída'
  const travada = concluida || !podeRegistrar
  const falta = validarFinalizar(v)
  return (
    <>
      <button className="link voltar-link" onClick={aoVoltar}><Icon nome="voltar" tamanho={18} />Vistorias</button>
      <div className="cartao ficha-cab">
        <div className="rotulo">{v.modelo_codigo} · {v.modelo_nome} · versão {v.modelo_versao}</div>
        <div className="ficha-titulo">
          <h2>{v.ambiente}</h2>
          {concluida ? <span className="selo-concluida"><Icon nome="check" tamanho={16} />Concluída</span> : <Tag cor="ambar">Em andamento</Tag>}
        </div>
        <Meta itens={[`aberta em ${formatarData(v.criada_em)} por ${v.criador}`, v.concluida_em && `concluída em ${formatarData(v.concluida_em)}`]} />
        <BarraProgresso p={p} />
        <div className="ficha-numeros">
          <span><b className="num">{p.verificados}</b> de <b className="num">{p.total}</b> itens verificados</span>
          <span>Conformidade <b className="num">{pct(p.conformidade)}</b></span>
        </div>
      </div>
      {numerarItens(v.grupos).map((g) => (
        <div key={g.numero} className="cartao">
          <div className="lista-cab"><TituloSecao>{g.numero}. {g.nome}</TituloSecao></div>
          {g.itens.map((item) => {
            const r = v.respostas[item.id]
            const nc = ncs.find((n) => n.item_id === item.id)
            return (
              <div key={item.id} className="item-fvs">
                <div className="item-fvs-texto">
                  <span className="data-curta">{item.codigo}</span>
                  <span>{item.titulo}</span>
                  {nc && <button className="tag-botao" onClick={() => aoAbrirNc(nc.id)}><Tag cor={COR_NC[nc.status]}>{nc.codigo}</Tag></button>}
                </div>
                <div className="respostas" role="group" aria-label={`Resposta do item ${item.codigo}`}>
                  {RESPOSTAS.map((op) => (
                    <button key={op} className={`opcao resp-${op === 'N.A.' ? 'na' : op.toLowerCase()} ${r === op ? 'marcada' : ''}`} aria-pressed={r === op}
                      disabled={travada || Boolean(nc) || r === op}
                      onClick={() => (op === 'NC' ? aoMarcarNc(item) : aoResponder(v, item.id, op))}>{op}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}
      {podeRegistrar && !concluida && (
        <div className="cartao ficha-rodape">
          <span className="rotulo">{falta || 'Todos os itens verificados.'}</span>
          <button className="botao" disabled={Boolean(falta)} onClick={() => aoFinalizar(v)}><Icon nome="check" />Finalizar vistoria</button>
        </div>
      )}
    </>
  )
}

function DetalheNc({ n, podeMover, podeAprovar, aoFechar, aoMover }) {
  const [motivo, setMotivo] = useState('')
  const [reprovando, setReprovando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const passos = passosNc(n.status, { podeMover, podeAprovar })
  return (
    <Folha titulo={`${n.codigo} · ${n.titulo}`} aoFechar={aoFechar}>
      <div className="form">
        <div className="acoes"><Tag cor={COR_NC[n.status]}>{n.status}</Tag><Tag cor={COR_SEVERIDADE[n.severidade]}>Severidade {n.severidade.toLowerCase()}</Tag></div>
        {n.fotos.length > 0 && <div className="miniaturas grandes">{n.fotos.map((f, i) => <div key={f} className="miniatura"><img src={f} alt={`Foto ${i + 1} da ${n.codigo}`} /></div>)}</div>}
        <div><div className="rotulo">Problema</div><p className="descricao-registro">{n.descricao}</p></div>
        {n.solucao && <div><div className="rotulo">Solução proposta</div><p className="descricao-registro">{n.solucao}</p></div>}
        <dl className="pares pares-registro">
          <dt>Ficha</dt><dd>{n.modelo_codigo} · {n.modelo_nome}</dd>
          <dt>Ambiente</dt><dd>{n.ambiente}</dd>
          <dt>Empresa</dt><dd>{n.empresa}</dd>
          <dt>Aberta em</dt><dd>{formatarData(n.aberta_em)}</dd>
          <dt>Dias em aberto</dt><dd>{n.diasEmAberto}</dd>
          {n.fechada_em && <><dt>Fechada em</dt><dd>{formatarData(n.fechada_em)}</dd></>}
        </dl>
        <div className="campo"><span>Linha do tempo</span>
          <ol className="timeline">
            {n.historico.map((h, i) => <li key={i} className={`t-${COR_NC[h.status]}`}><span className="data-curta">{formatarCarimbo(h.em)}</span>{h.texto}</li>)}
          </ol>
        </div>
        {reprovando ? (
          <div className="cartao caixa-resolver perigo">
            <label className="campo"><span>Por que a correção foi reprovada? <em>*</em></span>
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: ainda há peças ocas" />
            </label>
            {tentou && !motivo.trim() && <div className="erro-campo" role="alert">Diga por que a correção foi reprovada.</div>}
            <div className="acoes">
              <button className="botao contorno" onClick={() => setReprovando(false)}>Cancelar</button>
              <button className="botao perigo" onClick={() => { setTentou(true); if (motivo.trim()) aoMover(n, 'Encaminhada', motivo) }}>Reprovar</button>
            </div>
          </div>
        ) : passos.length > 0 && (
          <div className="acoes">
            {passos.map((p) => (
              <button key={p.rotulo} className={`botao ${p.pedeMotivo ? 'contorno' : ''}`} onClick={() => (p.pedeMotivo ? setReprovando(true) : aoMover(n, p.para))}>
                <Icon nome={p.pedeMotivo ? 'x' : 'check'} />{p.rotulo}
              </button>
            ))}
          </div>
        )}
      </div>
    </Folha>
  )
}

const itemVazio = () => ({ id: '', titulo: '' })
function EditorModelo({ modelo, proximoCodigo, aoFechar, aoSalvar }) {
  const [m, setM] = useState(() => (modelo
    ? { nome: modelo.nome, categoria: modelo.categoria, grupos: structuredClone(modelo.grupos) }
    : { nome: '', categoria: '', grupos: [{ nome: GRUPOS_SUGERIDOS[0], itens: [itemVazio()] }] }))
  const [removendo, setRemovendo] = useState(null) // índice do grupo esperando confirmação
  const problemas = validarModelo(m)
  const { erro, tocar, setTentou } = useAvisos(problemas)
  const mudarGrupo = (gi, f) => setM((x) => ({ ...x, grupos: x.grupos.map((g, i) => (i === gi ? f(g) : g)) }))
  const tirarGrupo = (gi) => { setM((x) => ({ ...x, grupos: x.grupos.filter((_, i) => i !== gi) })); setRemovendo(null) }
  function salvar() {
    setTentou(true)
    if (!Object.keys(problemas).length) aoSalvar({ id: modelo?.id, ...m })
  }
  return (
    <Folha titulo={modelo ? `Editar ${modelo.codigo}` : `Novo modelo · ${proximoCodigo}`} aoFechar={aoFechar}>
      <div className="form">
        {modelo && <div className="rotulo">Salvar cria a versão {modelo.versao + 1}. Vistorias já abertas continuam com a versão delas.</div>}
        <label className="campo"><span>Nome <em>*</em></span>
          <input type="text" value={m.nome} onChange={(e) => setM((x) => ({ ...x, nome: e.target.value }))} onBlur={tocar('nome')} placeholder="Ex.: Impermeabilização — Áreas Molhadas" />
          {erro('nome')}
        </label>
        <label className="campo"><span>Categoria <em>*</em></span>
          <select value={m.categoria} onChange={(e) => { setM((x) => ({ ...x, categoria: e.target.value })); tocar('categoria')() }} onBlur={tocar('categoria')}>
            <option value="">Escolha…</option>
            {CATEGORIAS_FVS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {erro('categoria')}
        </label>
        <datalist id="grupos-sugeridos">{GRUPOS_SUGERIDOS.map((g) => <option key={g} value={g} />)}</datalist>
        {m.grupos.map((g, gi) => (
          <div key={gi} className="cartao grupo-editor">
            <div className="grupo-editor-cab">
              <span className="data-curta">{gi + 1}.</span>
              <input type="text" list="grupos-sugeridos" value={g.nome} onChange={(e) => mudarGrupo(gi, (x) => ({ ...x, nome: e.target.value }))} aria-label={`Nome do grupo ${gi + 1}`} placeholder="Nome do grupo" />
              <button type="button" className="icone-botao" aria-label={`Remover o grupo ${gi + 1}`}
                onClick={() => (g.itens.some((i) => i.titulo.trim()) ? setRemovendo(gi) : tirarGrupo(gi))}><Icon nome="x" /></button>
            </div>
            {removendo === gi && (
              <div className="caixa-resolver perigo">
                <div>Remover o grupo "{g.nome || gi + 1}" e os {g.itens.length} itens dele?</div>
                <div className="acoes">
                  <button type="button" className="botao contorno" onClick={() => setRemovendo(null)}>Cancelar</button>
                  <button type="button" className="botao perigo" onClick={() => tirarGrupo(gi)}>Remover</button>
                </div>
              </div>
            )}
            {g.itens.map((item, ii) => (
              <div key={ii} className="item-editor">
                <span className="data-curta">{gi + 1}.{ii + 1}</span>
                <input type="text" value={item.titulo} aria-label={`Item ${gi + 1}.${ii + 1}`} placeholder="O que conferir"
                  onChange={(e) => mudarGrupo(gi, (x) => ({ ...x, itens: x.itens.map((it, k) => (k === ii ? { ...it, titulo: e.target.value } : it)) }))} />
                <button type="button" className="icone-botao" aria-label={`Remover o item ${gi + 1}.${ii + 1}`}
                  onClick={() => mudarGrupo(gi, (x) => ({ ...x, itens: x.itens.filter((_, k) => k !== ii) }))}><Icon nome="x" /></button>
              </div>
            ))}
            <button type="button" className="link" onClick={() => mudarGrupo(gi, (x) => ({ ...x, itens: [...x.itens, itemVazio()] }))}>+ Item</button>
          </div>
        ))}
        <button type="button" className="botao contorno" onClick={() => setM((x) => ({ ...x, grupos: [...x.grupos, { nome: GRUPOS_SUGERIDOS[x.grupos.length] || '', itens: [itemVazio()] }] }))}>
          <Icon nome="mais_sinal" />Grupo
        </button>
        {erro('grupos')}
        <button className="botao largo" onClick={salvar}><Icon nome="check" />Salvar modelo</button>
      </div>
    </Folha>
  )
}

function VerModelo({ modelo, aoFechar }) {
  return (
    <Folha titulo={`${modelo.codigo} · ${modelo.nome}`} aoFechar={aoFechar}>
      <div className="form">
        <Meta itens={[modelo.categoria, `versão ${modelo.versao}`, `${modelo.totalItens} itens`]} />
        {numerarItens(modelo.grupos).map((g) => (
          <div key={g.numero}>
            <div className="rotulo">{g.numero}. {g.nome}</div>
            <ul className="historico">{g.itens.map((i) => <li key={i.id}><span className="data-curta">{i.codigo}</span>{i.titulo}</li>)}</ul>
          </div>
        ))}
      </div>
    </Folha>
  )
}

export default function Fvs({ filtroNc, setFiltroNc }) {
  const { perfil } = useSessao()
  const avisar = useAviso()
  const { carregando, data, erro, recarregar } = useCarregar(listarFvs)
  const [secao, setSecao] = useState('vistorias')
  const [vistoriaId, setVistoriaId] = useState(null)
  const [ncId, setNcId] = useState(null)
  const [painelNc, setPainelNc] = useState(null) // item que está virando NC
  const [nova, setNova] = useState(false)
  const [modeloAberto, setModeloAberto] = useState(null) // modelo, 'novo' ou null
  // Mudanças otimistas: valem só sobre a leitura em que foram feitas (base).
  const [otimista, setOtimista] = useState({ base: null, respostas: {}, vistorias: {}, ncs: {} })
  const podeRegistrar = pode(perfil.role, 'registrarQualidade')
  const podeAprovar = pode(perfil.role, 'aprovarNc')
  const podeEditarModelo = pode(perfil.role, 'editarModeloFvs')

  const vazio = { respostas: {}, vistorias: {}, ncs: {} }
  const valendo = otimista.base === data ? otimista : vazio
  const anotar = (f) => setOtimista((o) => ({ ...f(o.base === data ? o : { ...vazio, base: data }), base: data }))
  const esquecer = () => setOtimista({ base: null, ...vazio })

  async function responder(v, itemId, resposta) {
    anotar((o) => ({ ...o, respostas: { ...o.respostas, [`${v.id}:${itemId}`]: resposta } }))
    const { erro: e } = await responderItemFvs(v.id, itemId, resposta)
    if (e) { esquecer(); return avisar(e, 'erro') }
    recarregar()
  }

  async function registrarNc(v, item, campos) {
    setPainelNc(null)
    anotar((o) => ({ ...o, respostas: { ...o.respostas, [`${v.id}:${item.id}`]: 'NC' } }))
    const { data: feito, erro: e } = await registrarNcFvs(v.id, item.id, campos)
    if (e) { esquecer(); return avisar(e, 'erro') }
    avisar(`${feito.nc.codigo} aberta para ${feito.nc.empresa}.`)
    recarregar()
  }

  async function finalizar(v) {
    anotar((o) => ({ ...o, vistorias: { ...o.vistorias, [v.id]: 'Concluída' } }))
    const { erro: e } = await finalizarVistoriaFvs(v.id)
    if (e) { esquecer(); return avisar(e, 'erro') }
    avisar('Vistoria concluída.')
    recarregar()
  }

  async function moverNc(n, para, motivo) {
    setNcId(null)
    anotar((o) => ({ ...o, ncs: { ...o.ncs, [n.id]: para } }))
    const { data: movida, erro: e } = await moverNcFvs(n.id, para, { motivo })
    if (e) { esquecer(); return avisar(e, 'erro') }
    avisar(`${movida.codigo}: ${movida.historico.at(-1).texto}.`)
    recarregar()
  }

  async function criarVistoria(campos) {
    setNova(false)
    const { data: criada, erro: e } = await criarVistoriaFvs(campos)
    if (e) return avisar(e, 'erro')
    avisar(`Vistoria aberta: ${criada.ambiente}.`)
    setVistoriaId(criada.id)
    setSecao('vistorias')
    recarregar()
  }

  async function salvarModelo(m) {
    setModeloAberto(null)
    const { data: salvo, erro: e } = await salvarModeloFvs(m)
    if (e) return avisar(e, 'erro')
    avisar(m.id ? `${salvo.codigo} salvo na versão ${salvo.versao}.` : `${salvo.codigo} criado.`)
    recarregar()
  }

  if (carregando && !data) return <Carregando alto />
  if (erro) return <Erro mensagem={erro} aoTentar={recarregar} />

  // Leitura + mudanças otimistas.
  const vistorias = data.vistorias.map((v) => {
    const respostas = { ...v.respostas }
    for (const [chave, r] of Object.entries(valendo.respostas)) {
      const [vid, iid] = chave.split(':')
      if (vid === v.id) respostas[iid] = r
    }
    return { ...v, respostas, status: valendo.vistorias[v.id] || v.status, progresso: progressoVistoria(v.grupos, respostas) }
  })
  const ncs = data.ncs.map((n) => (valendo.ncs[n.id] ? { ...n, status: valendo.ncs[n.id] } : n))
  const aberta = vistorias.find((v) => v.id === vistoriaId)
  const ncAberta = ncs.find((n) => n.id === ncId)
  const r = data.resumo

  const folhas = (
    <>
      {nova && <NovaVistoria modelos={data.modelos} aoFechar={() => setNova(false)} aoCriar={criarVistoria} />}
      {painelNc && <PainelNc item={painelNc.item} empreiteiros={data.empreiteiros} aoFechar={() => setPainelNc(null)} aoSalvar={(c) => registrarNc(painelNc.v, painelNc.item, c)} />}
      {ncAberta && <DetalheNc key={ncAberta.id + ncAberta.status} n={ncAberta} podeMover={podeRegistrar} podeAprovar={podeAprovar} aoFechar={() => setNcId(null)} aoMover={moverNc} />}
      {modeloAberto && (podeEditarModelo
        ? <EditorModelo modelo={modeloAberto === 'novo' ? null : modeloAberto} proximoCodigo={proximoCodigoModelo(data.modelos)} aoFechar={() => setModeloAberto(null)} aoSalvar={salvarModelo} />
        : <VerModelo modelo={modeloAberto} aoFechar={() => setModeloAberto(null)} />)}
    </>
  )

  if (aberta) {
    return (
      <>
        <FichaVistoria v={aberta} ncs={ncs.filter((n) => n.vistoria_id === aberta.id)} podeRegistrar={podeRegistrar}
          aoVoltar={() => setVistoriaId(null)} aoResponder={responder} aoMarcarNc={(item) => setPainelNc({ v: aberta, item })}
          aoAbrirNc={setNcId} aoFinalizar={finalizar} />
        {folhas}
      </>
    )
  }

  let corpo
  if (secao === 'vistorias') {
    corpo = !vistorias.length ? (
      <EstadoVazio icone="qualidade" titulo="Nenhuma vistoria de FVS nesta obra"
        texto="Escolha uma ficha-modelo e o ambiente; cada item vira OK, NC ou N.A., e a NC já abre o tratamento."
        acao={podeRegistrar && data.modelos.length ? 'Começar a primeira vistoria' : null} aoAgir={() => setNova(true)} />
    ) : (
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={vistorias.length}>Vistorias</TituloSecao>
          {podeRegistrar && <div className="direita"><button className="botao" onClick={() => setNova(true)}><Icon nome="mais_sinal" />Nova vistoria</button></div>}
        </div>
        {vistorias.map((v) => (
          <button key={v.id} className="linha-lista" onClick={() => setVistoriaId(v.id)}>
            <div>
              <div className="titulo">{v.ambiente}</div>
              <Meta itens={[`${v.modelo_codigo} · ${v.modelo_nome}`, `${v.progresso.verificados} de ${v.progresso.total} itens`, formatarData(v.criada_em)]} />
              <BarraProgresso p={v.progresso} />
            </div>
            <div className="lado">
              <span className="pct-fvs num">{pct(v.progresso.conformidade)}</span>
              <Tag cor={COR_VISTORIA[v.status]}>{v.status}</Tag>
            </div>
          </button>
        ))}
      </div>
    )
  } else if (secao === 'ncs') {
    const lista = filtrarNcs(ncs, filtroNc)
    corpo = (
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={lista.length}>Não conformidades</TituloSecao>
          <div className="direita">
            <select className="filtro" value={filtroNc} onChange={(e) => setFiltroNc(e.target.value)} aria-label="Quais NCs">
              {FILTROS_NC.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        {!lista.length && <div className="leitura"><Icon nome="check" />Nenhuma não conformidade aqui.</div>}
        {lista.map((n) => (
          <button key={n.id} className="linha-lista" onClick={() => setNcId(n.id)}>
            <div>
              <div className="titulo"><span className="data-curta">{n.codigo}</span> {n.titulo}</div>
              <Meta itens={[`${n.modelo_codigo} · ${n.ambiente}`, n.empresa, `${n.diasEmAberto} ${n.diasEmAberto === 1 ? 'dia' : 'dias'} ${n.status === 'Fechada' ? 'até fechar' : 'em aberto'}`]} />
            </div>
            <div className="lado">
              <Tag cor={COR_SEVERIDADE[n.severidade]}>{n.severidade}</Tag>
              <Tag cor={COR_NC[n.status]}>{n.status}</Tag>
            </div>
          </button>
        ))}
      </div>
    )
  } else {
    corpo = !data.modelos.length ? (
      <EstadoVazio icone="qualidade" titulo="Nenhum modelo de FVS" texto="O modelo é a lista do que conferir em cada serviço, dividida em grupos."
        acao={podeEditarModelo ? 'Criar o primeiro modelo' : null} aoAgir={() => setModeloAberto('novo')} />
    ) : (
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={data.modelos.length}>Modelos da empresa</TituloSecao>
          {podeEditarModelo && <div className="direita"><button className="botao" onClick={() => setModeloAberto('novo')}><Icon nome="mais_sinal" />Novo modelo</button></div>}
        </div>
        {data.modelos.map((m) => (
          <button key={m.id} className="linha-lista" onClick={() => setModeloAberto(m)}>
            <div>
              <div className="titulo"><span className="data-curta">{m.codigo}</span> {m.nome}</div>
              <Meta itens={[m.categoria, `versão ${m.versao}`, `${m.totalItens} itens em ${m.grupos.length} ${m.grupos.length === 1 ? 'grupo' : 'grupos'}`]} />
            </div>
            <div className="lado"><Icon nome={podeEditarModelo ? 'projeto' : 'seta'} tamanho={20} /></div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="kpis">
        <div className="cartao kpi destaque"><div className="rotulo">Conforme geral</div><div className="valor num">{pct(r.conformidadeGeral)}</div><div className="nota">OK ÷ (OK + NC)</div></div>
        <button className={`cartao kpi ${r.ncsAbertas ? 'vermelho' : 'verde'}`} onClick={() => { setSecao('ncs'); setFiltroNc('Em aberto') }} aria-label={`NCs em aberto: ${r.ncsAbertas}. Ver a lista`}>
          <div className="rotulo">NCs em aberto</div><div className="valor num">{r.ncsAbertas}</div><div className="nota">{r.ncsAbertas ? 'a tratar' : 'nenhuma'}</div>
        </button>
        <div className="cartao kpi verde"><div className="rotulo">Vistorias concluídas</div><div className="valor num">{r.vistoriasConcluidas}</div><div className="nota">de {vistorias.length}</div></div>
      </div>
      <div className="ordenar secoes-fvs" role="tablist" aria-label="Parte da FVS">
        {SECOES.map((s) => (
          <button key={s.id} role="tab" aria-selected={secao === s.id} className={secao === s.id ? 'ativo' : ''} onClick={() => setSecao(s.id)}>{s.rotulo}</button>
        ))}
      </div>
      {corpo}
      {folhas}
    </>
  )
}
