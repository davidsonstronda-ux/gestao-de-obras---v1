// Materiais: o quadro (Kanban) de pedidos de material da obra escolhida.
// Mover é por botões, sem arrastar. As regras (quem entra em qual coluna, atraso,
// tempo na coluna, lead time) moram em lib/materiais.js; a aba Estoque, em
// screens/estoque.jsx e lib/estoque.js. Aqui só se mostra.
import { useState } from 'react'
import { criarPedido, listarCatalogoMateriais, listarEstoque, listarFrentesParaEscolha, listarPedidos, moverPedido, registrarBaixa } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { pode } from '../lib/permissoes.js'
import { hoje } from '../lib/config.js'
import { formatarDiaMes } from '../lib/datas.js'
import {
  CATEGORIAS, PRIORIDADES, STATUS_PEDIDO, TITULO_COLUNA, etiquetaPedido, formatarQuantidade, lerQuantidade,
  proximoStatus, rotuloDiasNaColuna, statusAnterior, validarMudanca, validarNovoPedido,
} from '../lib/materiais.js'
import { contarCriticos, geraEntrada, saldoDepois, situacaoInsumo } from '../lib/estoque.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Folha, Icon, Meta, Tag, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'
import Estoque, { BaixaEstoque } from './estoque.jsx'

// Texto do botão que leva o pedido para cada coluna.
const BOTAO_PARA = {
  'Em cotação': 'Cotar', 'A caminho': 'Comprei', 'No almoxarifado': 'Recebi', 'Entregue': 'Entreguei na frente',
}
// Colunas que pedem dados antes de entrar (abrem um formulário).
const PEDE_DADOS = ['A caminho', 'No almoxarifado', 'Entregue']

const soNumero = (t) => t.replace(/[^\d.,]/g, '')

function NovoPedido({ aoFechar, aoCriar }) {
  const catalogo = useCarregar(listarCatalogoMateriais)
  const frentes = useCarregar(listarFrentesParaEscolha)
  const [campos, setCampos] = useState({ material_id: '', quantidade: '', frente_id: '', prioridade: 'Normal' })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const problemas = validarNovoPedido(campos)
  const mostrar = (c) => (tentou || tocados[c]) && problemas[c]
  const material = catalogo.data?.find((m) => m.id === campos.material_id)
  const mudar = (c, v) => { setCampos((x) => ({ ...x, [c]: v })); setTocados((t) => ({ ...t, [c]: true })) }

  function salvar() {
    setTentou(true)
    if (Object.keys(problemas).length) return
    aoCriar(campos, { material, frente: frentes.data.find((f) => f.id === campos.frente_id)?.servico })
  }

  if (catalogo.erro || frentes.erro) {
    return <Folha titulo="Novo pedido" aoFechar={aoFechar}><Erro mensagem={catalogo.erro || frentes.erro} aoTentar={() => { catalogo.recarregar(); frentes.recarregar() }} /></Folha>
  }
  if (!catalogo.data || !frentes.data) return <Folha titulo="Novo pedido" aoFechar={aoFechar}><Carregando /></Folha>
  return (
    <Folha titulo="Novo pedido" aoFechar={aoFechar}>
      <div className="form">
        <label className="campo"><span>Material <em>*</em></span>
          <select value={campos.material_id} onChange={(e) => mudar('material_id', e.target.value)} onBlur={() => setTocados((t) => ({ ...t, material_id: true }))}>
            <option value="">Escolha o material…</option>
            {CATEGORIAS.map((cat) => (
              <optgroup key={cat} label={cat}>
                {catalogo.data.filter((m) => m.categoria === cat).map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.unidade})</option>)}
              </optgroup>
            ))}
          </select>
          {mostrar('material_id') && <div className="erro-campo" role="alert">{problemas.material_id}</div>}
        </label>
        <label className="campo"><span>Quantidade{material ? ` (${material.unidade})` : ''} <em>*</em></span>
          <input type="text" inputMode="decimal" autoComplete="off" placeholder="Ex.: 50" value={campos.quantidade}
            onChange={(e) => mudar('quantidade', soNumero(e.target.value))} />
          {mostrar('quantidade') && <div className="erro-campo" role="alert">{problemas.quantidade}</div>}
        </label>
        <label className="campo"><span>Frente <em>*</em></span>
          <select value={campos.frente_id} onChange={(e) => mudar('frente_id', e.target.value)} onBlur={() => setTocados((t) => ({ ...t, frente_id: true }))}>
            <option value="">Para qual frente?</option>
            {frentes.data.map((f) => <option key={f.id} value={f.id}>{f.servico}</option>)}
          </select>
          {mostrar('frente_id') && <div className="erro-campo" role="alert">{problemas.frente_id}</div>}
        </label>
        <div className="campo"><span>Prioridade</span>
          <div className="seg duas-opcoes">
            {PRIORIDADES.map((x) => (
              <button key={x} type="button" className={`opcao ${x === 'Crítico' ? 'nao' : ''} ${campos.prioridade === x ? 'marcada' : ''}`}
                aria-pressed={campos.prioridade === x} onClick={() => mudar('prioridade', x)}>{x}</button>
            ))}
          </div>
        </div>
        <button className="botao largo" onClick={salvar}><Icon nome="mais_sinal" />Fazer pedido</button>
      </div>
    </Folha>
  )
}

function SimNao({ rotulo, valor, aoMudar, erro }) {
  return (
    <div className="campo"><span>{rotulo} <em>*</em></span>
      <div className="anda duas-opcoes">
        <button type="button" className={`opcao sim ${valor === true ? 'marcada' : ''}`} aria-pressed={valor === true} onClick={() => aoMudar(true)}><Icon nome="check" />Sim</button>
        <button type="button" className={`opcao nao ${valor === false ? 'marcada' : ''}`} aria-pressed={valor === false} onClick={() => aoMudar(false)}><Icon nome="x" />Não</button>
      </div>
      {erro && <div className="erro-campo" role="alert">{erro}</div>}
    </div>
  )
}

// Formulário de quem entra em A caminho, No almoxarifado ou Entregue.
function Mover({ pedido, alvo, aoFechar, aoMover }) {
  const frentes = useCarregar(listarFrentesParaEscolha)
  const [dados, setDados] = useState({
    fornecedor: pedido.fornecedor || '', previsao_entrega: pedido.previsao_entrega || hoje(),
    qtd_bate_nf: null, estado_ok: null, avarias: '', foto_nf: '', frente_id: pedido.frente_id,
  })
  const [tentou, setTentou] = useState(false)
  const problemas = validarMudanca(pedido.status, alvo, dados)
  const erro = (c) => tentou && problemas[c]
  const mudar = (c, v) => setDados((x) => ({ ...x, [c]: v }))

  function salvar() {
    setTentou(true)
    if (Object.keys(problemas).length) return
    aoMover(pedido, alvo, dados)
  }

  const titulo = { 'A caminho': 'Comprado: quem entrega e quando?', 'No almoxarifado': 'Checklist de recebimento', 'Entregue': 'Entregue na frente' }[alvo]
  return (
    <Folha titulo={titulo} aoFechar={aoFechar}>
      <div className="form">
        <div className="rotulo">{pedido.material?.nome} · {formatarQuantidade(pedido.quantidade)} {pedido.material?.unidade}</div>
        {alvo === 'A caminho' && (
          <>
            <label className="campo"><span>Fornecedor <em>*</em></span>
              <input type="text" value={dados.fornecedor} onChange={(e) => mudar('fornecedor', e.target.value)} placeholder="Ex.: Depósito São Jorge" />
              {erro('fornecedor') && <div className="erro-campo" role="alert">{problemas.fornecedor}</div>}
            </label>
            <label className="campo"><span>Previsão de entrega <em>*</em></span>
              <input type="date" value={dados.previsao_entrega} onChange={(e) => mudar('previsao_entrega', e.target.value)} />
              {erro('previsao_entrega') && <div className="erro-campo" role="alert">{problemas.previsao_entrega}</div>}
            </label>
          </>
        )}
        {alvo === 'No almoxarifado' && (
          <>
            <SimNao rotulo="A quantidade bate com a NF?" valor={dados.qtd_bate_nf} aoMudar={(v) => mudar('qtd_bate_nf', v)} erro={erro('qtd_bate_nf')} />
            <SimNao rotulo="O material chegou em perfeito estado?" valor={dados.estado_ok} aoMudar={(v) => mudar('estado_ok', v)} erro={erro('estado_ok')} />
            {(dados.qtd_bate_nf === false || dados.estado_ok === false) && (
              <div className="erro-campo"><Icon nome="alerta" tamanho={16} /> O pedido vai ficar marcado com alerta de recebimento e não entra sozinho no estoque.</div>
            )}
            {geraEntrada(dados) && (
              <div className="nota-ok"><Icon nome="check" tamanho={16} /> Entra no estoque: +{formatarQuantidade(pedido.quantidade)} {pedido.material?.unidade}.</div>
            )}
            <label className="campo"><span>Avarias ou observação</span>
              <textarea value={dados.avarias} onChange={(e) => mudar('avarias', e.target.value)} placeholder="Ex.: 4 sacos rasgados" />
            </label>
            <div className="campo"><span>Foto da NF</span>
              <label className="botao contorno largo">
                <Icon nome="fotos" />{dados.foto_nf ? 'Trocar a foto' : 'Tirar ou escolher a foto'}
                <input type="file" accept="image/*" capture="environment" className="so-leitor"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) mudar('foto_nf', URL.createObjectURL(f)); e.target.value = '' }} />
              </label>
              {dados.foto_nf && <img className="nf-previa" src={dados.foto_nf} alt="Prévia da foto da NF" />}
            </div>
          </>
        )}
        {alvo === 'Entregue' && (
          <label className="campo"><span>Frente onde foi aplicado <em>*</em></span>
            <select value={dados.frente_id} onChange={(e) => mudar('frente_id', e.target.value)}>
              <option value="">Escolha a frente…</option>
              {(frentes.data || []).map((f) => <option key={f.id} value={f.id}>{f.servico}</option>)}
              {frentes.data && !frentes.data.some((f) => f.id === pedido.frente_id) && <option value={pedido.frente_id}>{pedido.frente}</option>}
            </select>
            {erro('frente_id') && <div className="erro-campo" role="alert">{problemas.frente_id}</div>}
          </label>
        )}
        <button className="botao largo" onClick={salvar}><Icon nome="check" />Confirmar</button>
      </div>
    </Folha>
  )
}

function CartaoPedido({ p, podeMover, ocupado, aoAvancar, aoVoltar }) {
  const seguinte = proximoStatus(p.status)
  const anterior = statusAnterior(p.status)
  return (
    <article className={`cartao pedido ${p.atrasado ? 'atrasado' : ''} ${p.prioridade === 'Crítico' ? 'critico' : ''}`}>
      <div className="titulo">{p.material?.nome || 'Material'}</div>
      <div className="qtd">{formatarQuantidade(p.quantidade)} <span>{p.material?.unidade}</span></div>
      <Meta itens={[p.frente]} />
      <div className="tags">
        {p.atrasado && <Tag cor="vermelho"><Icon nome="alerta" tamanho={14} />Atrasado</Tag>}
        <Tag cor={p.etiqueta.cor}>{p.etiqueta.texto}</Tag>
        {p.comProblema && <Tag cor="ambar">Recebido com problema</Tag>}
      </div>
      {(p.fornecedor || p.previsao_entrega) && (
        <Meta itens={[p.fornecedor, p.previsao_entrega && <>previsão <span className="data-curta">{formatarDiaMes(p.previsao_entrega)}</span></>]} />
      )}
      <Meta itens={[rotuloDiasNaColuna(p.diasNaColuna), p.leadTime !== null && <>lead time <span className="data-curta">{p.leadTime} d</span></>]} />
      {p.avarias && <div className="obs">{p.avarias}</div>}
      {p.foto_nf && <img className="nf-previa" src={p.foto_nf} alt="Foto da NF" />}
      {podeMover && (seguinte || anterior) && (
        <div className="pedido-acoes">
          {anterior && <button className="icone-botao" disabled={ocupado} onClick={aoVoltar} aria-label={`Voltar para ${anterior}`} title={`Voltar para ${anterior}`}><Icon nome="voltar" /></button>}
          {seguinte && <button className="botao" disabled={ocupado} onClick={aoAvancar}>{BOTAO_PARA[seguinte]}<Icon nome="avancar" /></button>}
        </div>
      )}
    </article>
  )
}

export default function Materiais() {
  const { perfil } = useSessao()
  const avisar = useAviso()
  const [aba, setAba] = useState('aberto') // 'aberto' | 'entregues' | 'estoque'
  const verEntregues = aba === 'entregues'
  const { carregando, data, erro, recarregar } = useCarregar(() => listarPedidos({ entregues: verEntregues }), [verEntregues])
  const estoque = useCarregar(listarEstoque)
  const [soCriticos, setSoCriticos] = useState(false)
  const [novo, setNovo] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [movendo, setMovendo] = useState(null) // { pedido, alvo }
  // Mudanças otimistas: valem só sobre a leitura em que foram feitas (base).
  // Quando a lista recarrega, a base muda e elas somem sozinhas.
  const [otimista, setOtimista] = useState({ base: null, status: {}, novos: [] })
  const [saldos, setSaldos] = useState({ base: null, valores: {} })
  const podeMover = pode(perfil.role, 'pedirMaterial')

  const valendo = otimista.base === data ? otimista : { status: {}, novos: [] }
  const anotar = (f) => setOtimista((o) => {
    const atual = o.base === data ? o : { base: data, status: {}, novos: [] }
    return { ...f(atual), base: data }
  })
  const saldosValendo = saldos.base === estoque.data ? saldos.valores : {}
  const insumos = (estoque.data?.insumos || []).map((i) => {
    if (saldosValendo[i.id] === undefined) return i
    const comSaldo = { ...i, saldo: saldosValendo[i.id] }
    return { ...comSaldo, situacao: situacaoInsumo(comSaldo) }
  })

  async function mover(p, alvo, dados = {}) {
    setMovendo(null)
    anotar((o) => ({ ...o, status: { ...o.status, [p.id]: alvo } }))
    const { data: movido, erro: e } = await moverPedido(p.id, alvo, dados)
    if (e) {
      anotar((o) => { const status = { ...o.status }; delete status[p.id]; return { ...o, status } })
      return avisar(e, 'erro')
    }
    if (movido.entrouNoEstoque) {
      avisar(`Recebido. Entrou no estoque: +${formatarQuantidade(movido.quantidade)} ${movido.material?.unidade || ''}.`)
      estoque.recarregar()
    } else {
      avisar(alvo === 'Entregue' ? 'Entregue na frente. O pedido saiu do quadro.' : `Pedido em "${TITULO_COLUNA[alvo]}".`)
    }
    recarregar()
  }

  function avancar(p) {
    const alvo = proximoStatus(p.status)
    if (PEDE_DADOS.includes(alvo)) setMovendo({ pedido: p, alvo })
    else mover(p, alvo)
  }

  async function criar(campos, previa) {
    setNovo(false)
    const temp = {
      ...campos, id: `tmp-${Date.now()}`, quantidade: lerQuantidade(campos.quantidade), status: 'Solicitar',
      material: previa.material, frente: previa.frente, etiqueta: etiquetaPedido(campos, previa.material?.categoria),
      diasNaColuna: 0, leadTime: null, atrasado: false, comProblema: false, provisorio: true,
    }
    anotar((o) => ({ ...o, novos: [...o.novos, temp] }))
    const { erro: e } = await criarPedido(campos)
    if (e) {
      anotar((o) => ({ ...o, novos: o.novos.filter((x) => x.id !== temp.id) }))
      return avisar(e, 'erro')
    }
    avisar('Pedido feito. Está em "Solicitar".')
    recarregar()
  }

  async function baixar(campos) {
    setBaixando(false)
    const insumo = insumos.find((i) => i.id === campos.insumo_id)
    const novoSaldo = saldoDepois(insumo.saldo, 'Saída', lerQuantidade(campos.quantidade))
    const base = estoque.data
    setSaldos({ base, valores: { ...saldosValendo, [insumo.id]: novoSaldo } })
    const { erro: e } = await registrarBaixa(campos)
    if (e) {
      setSaldos({ base, valores: { ...saldosValendo } })
      return avisar(e, 'erro')
    }
    avisar(`Baixa feita. Saldo de ${insumo.nome}: ${formatarQuantidade(novoSaldo)} ${insumo.unidade}.`)
    estoque.recarregar()
  }

  const abas = (
    <>
      <button className={`aba ${aba === 'aberto' ? 'ativa' : ''}`} onClick={() => setAba('aberto')}>Em aberto</button>
      <button className={`aba ${aba === 'entregues' ? 'ativa' : ''}`} onClick={() => setAba('entregues')}>Ver entregues{data?.totalEntregues ? ` (${data.totalEntregues})` : ''}</button>
      <button className={`aba ${aba === 'estoque' ? 'ativa' : ''}`} onClick={() => setAba('estoque')}>Estoque</button>
    </>
  )

  const criticos = contarCriticos(insumos)
  const c = data?.contadores
  const contadores = c && (
    <div className="kpis quatro">
      <div className="cartao kpi destaque"><div className="rotulo">Em cotação</div><div className="valor num">{c.emCotacao}</div><div className="nota">aguardando preço</div></div>
      <div className={`cartao kpi ${c.chegando ? 'verde' : ''}`}><div className="rotulo">Chegam em 7 dias</div><div className="valor num">{c.chegando}</div><div className="nota">a caminho</div></div>
      <div className={`cartao kpi ${c.atrasados ? 'vermelho' : ''}`}><div className="rotulo">Atrasados</div><div className="valor num">{c.atrasados}</div><div className="nota">{c.atrasados ? 'previsão vencida' : 'nenhum'}</div></div>
      <button className={`cartao kpi ${criticos ? 'vermelho' : ''} ${aba === 'estoque' && soCriticos ? 'selecionado' : ''}`}
        onClick={() => { setAba('estoque'); setSoCriticos(true) }} aria-label={`Insumos críticos: ${criticos}. Abrir o estoque`}>
        <div className="rotulo">Insumos críticos</div>
        <div className="valor num">{estoque.erro ? '—' : estoque.data ? criticos : '…'}</div>
        <div className="nota">{criticos ? 'no mínimo ou abaixo' : 'nenhum'}</div>
      </button>
    </div>
  )
  const acoes = podeMover && (
    <div className="acoes">
      <button className="botao" onClick={() => setNovo(true)}><Icon nome="mais_sinal" />Novo pedido</button>
      <button className="botao contorno" disabled={!estoque.data} onClick={() => setBaixando(true)}><Icon nome="materiais" />Baixa de estoque</button>
    </div>
  )

  let corpo
  if (carregando && !data) corpo = <Carregando alto />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (aba === 'estoque') {
    let tabela
    if (estoque.carregando && !estoque.data) tabela = <Carregando />
    else if (estoque.erro) tabela = <Erro mensagem={estoque.erro} aoTentar={estoque.recarregar} />
    else tabela = <Estoque insumos={insumos} soCriticos={soCriticos} setSoCriticos={setSoCriticos} />
    corpo = <>{contadores}{acoes}{tabela}</>
  } else if (!data.pedidos.length && !data.totalEntregues && !valendo.novos.length) {
    corpo = (
      <EstadoVazio icone="materiais" titulo="Nenhum pedido de material nesta obra"
        texto="Cada pedido vira um cartão que anda de Solicitar até Entregue na frente. Assim você vê o que está atrasado antes de a frente parar."
        acao={podeMover ? 'Fazer o primeiro pedido' : null} aoAgir={() => setNovo(true)} />
    )
  } else {
    const pedidos = [...data.pedidos, ...valendo.novos].map((p) => (valendo.status[p.id] ? { ...p, status: valendo.status[p.id], diasNaColuna: 0 } : p))
    const colunas = STATUS_PEDIDO.filter((s) => verEntregues || s !== 'Entregue')
    corpo = (
      <>
        {contadores}
        {acoes}
        <div className="kanban" role="list" aria-label="Quadro de pedidos">
          {colunas.map((s) => {
            const daColuna = pedidos.filter((p) => p.status === s)
            return (
              <section key={s} className="coluna" role="listitem" aria-label={TITULO_COLUNA[s]}>
                <div className="coluna-cab"><TituloSecao conta={daColuna.length}>{TITULO_COLUNA[s]}</TituloSecao></div>
                {!daColuna.length && <div className="coluna-vazia">Nada aqui.</div>}
                {daColuna.map((p) => (
                  <CartaoPedido key={p.id} p={p} podeMover={podeMover && !p.provisorio}
                    ocupado={Boolean(valendo.status[p.id])}
                    aoAvancar={() => avancar(p)} aoVoltar={() => mover(p, statusAnterior(p.status))} />
                ))}
              </section>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <>
      <Cabecalho abas={abas} />
      <main className="conteudo">{corpo}</main>
      {novo && <NovoPedido aoFechar={() => setNovo(false)} aoCriar={criar} />}
      {movendo && <Mover pedido={movendo.pedido} alvo={movendo.alvo} aoFechar={() => setMovendo(null)} aoMover={mover} />}
      {baixando && <BaixaEstoque insumos={insumos} aoFechar={() => setBaixando(false)} aoBaixar={baixar} />}
    </>
  )
}
