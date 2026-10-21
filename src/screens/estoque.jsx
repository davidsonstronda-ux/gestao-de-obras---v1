// Estoque (opcional) do módulo Materiais: a aba com os insumos da obra, a baixa
// de estoque e o histórico de cada insumo. Quem decide (crítico, saldo que não
// pode ficar negativo) é lib/estoque.js; aqui só se mostra.
import { useState } from 'react'
import { listarFrentesParaEscolha, listarMovimentos } from '../lib/dados.js'
import { hoje } from '../lib/config.js'
import { formatarData } from '../lib/datas.js'
import { filtrarInsumos, validarBaixa } from '../lib/estoque.js'
import { formatarQuantidade } from '../lib/materiais.js'
import { Carregando, EstadoVazio, Erro, Folha, Icon, Meta, Tag, TituloSecao, useCarregar } from '../components/index.jsx'

const soNumero = (t) => t.replace(/[^\d.,]/g, '')
const COR_SITUACAO = { 'Crítico': 'vermelho', 'OK': 'verde' }

function Historico({ insumo, aoFechar }) {
  const { carregando, data, erro, recarregar } = useCarregar(() => listarMovimentos(insumo.id), [insumo.id])
  let corpo
  if (carregando && !data) corpo = <Carregando />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (!data.length) corpo = <EstadoVazio icone="materiais" titulo="Nenhum movimento ainda" />
  else {
    corpo = data.map((m) => (
      <div key={m.id} className="linha-lista">
        <div>
          <div className="titulo">{m.tipo === 'Entrada' ? '+' : '−'}{formatarQuantidade(m.quantidade)} <span className="unidade">{insumo.unidade}</span></div>
          <Meta itens={[<span key="d" className="data-curta">{formatarData(m.data)}</span>, m.frente !== '—' && m.frente, m.origem === 'Pedido' ? 'do pedido recebido' : 'lançado à mão', m.autor]} />
        </div>
        <div className="lado"><Tag cor={m.tipo === 'Entrada' ? 'verde' : 'neutra'}>{m.tipo}</Tag></div>
      </div>
    ))
  }
  return (
    <Folha titulo={`Histórico: ${insumo.nome}`} aoFechar={aoFechar}>
      <div className="form" style={{ paddingBottom: 0 }}>
        <Meta itens={[<>saldo <b className="num">{formatarQuantidade(insumo.saldo)}</b> {insumo.unidade}</>, <>mínimo <b className="num">{formatarQuantidade(insumo.saldo_minimo)}</b></>]} />
      </div>
      <div>{corpo}</div>
    </Folha>
  )
}

// Saída manual. Data nasce com hoje; saldo nunca fica negativo.
export function BaixaEstoque({ insumos, aoFechar, aoBaixar }) {
  const frentes = useCarregar(listarFrentesParaEscolha)
  const [campos, setCampos] = useState({ insumo_id: '', quantidade: '', frente_id: '', data: hoje() })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const insumo = insumos.find((i) => i.id === campos.insumo_id)
  const problemas = validarBaixa({ ...campos, insumo }, hoje())
  const mostrar = (c) => (tentou || tocados[c]) && problemas[c]
  const mudar = (c, v) => { setCampos((x) => ({ ...x, [c]: v })); setTocados((t) => ({ ...t, [c]: true })) }

  function salvar() {
    setTentou(true)
    if (Object.keys(problemas).length) return
    aoBaixar(campos)
  }

  let corpo
  if (frentes.erro) corpo = <Erro mensagem={frentes.erro} aoTentar={frentes.recarregar} />
  else if (!frentes.data) corpo = <Carregando />
  else if (!insumos.length) corpo = <EstadoVazio icone="materiais" titulo="Nenhum insumo para dar baixa" texto="O estoque começa sozinho quando um pedido chega ao almoxarifado com o checklist OK." />
  else {
    corpo = (
      <div className="form">
        <label className="campo"><span>Insumo <em>*</em></span>
          <select value={campos.insumo_id} onChange={(e) => mudar('insumo_id', e.target.value)}>
            <option value="">Escolha o insumo…</option>
            {insumos.map((i) => <option key={i.id} value={i.id} disabled={i.saldo <= 0}>{i.nome} (saldo {formatarQuantidade(i.saldo)} {i.unidade})</option>)}
          </select>
          {mostrar('insumo_id') && <div className="erro-campo" role="alert">{problemas.insumo_id}</div>}
        </label>
        <label className="campo"><span>Quantidade{insumo ? ` (${insumo.unidade})` : ''} <em>*</em></span>
          <input type="text" inputMode="decimal" autoComplete="off" placeholder="Ex.: 5" value={campos.quantidade}
            onChange={(e) => mudar('quantidade', soNumero(e.target.value))} />
          {mostrar('quantidade') && <div className="erro-campo" role="alert">{problemas.quantidade}</div>}
        </label>
        <label className="campo"><span>Frente <em>*</em></span>
          <select value={campos.frente_id} onChange={(e) => mudar('frente_id', e.target.value)}>
            <option value="">Para qual frente?</option>
            {frentes.data.map((f) => <option key={f.id} value={f.id}>{f.servico}</option>)}
          </select>
          {mostrar('frente_id') && <div className="erro-campo" role="alert">{problemas.frente_id}</div>}
        </label>
        <label className="campo"><span>Data <em>*</em></span>
          <input type="date" value={campos.data} max={hoje()} onChange={(e) => mudar('data', e.target.value)} />
          {mostrar('data') && <div className="erro-campo" role="alert">{problemas.data}</div>}
        </label>
        <button className="botao largo" onClick={salvar}><Icon nome="check" />Dar baixa</button>
      </div>
    )
  }
  return <Folha titulo="Baixa de estoque" aoFechar={aoFechar}>{corpo}</Folha>
}

// A aba Estoque. Recebe os insumos já carregados pela tela de Materiais.
export default function Estoque({ insumos, soCriticos, setSoCriticos }) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(null)

  if (!insumos.length) {
    return <EstadoVazio icone="materiais" titulo="Nenhum insumo no estoque desta obra"
      texto="O estoque começa sozinho quando um pedido chega ao almoxarifado com o checklist OK." />
  }
  const lista = filtrarInsumos(insumos, { busca, soCriticos })
  return (
    <div className="cartao">
      <div className="lista-cab">
        <TituloSecao conta={lista.length}>Estoque</TituloSecao>
        <span className="direita">
          <label className="so-leitor" htmlFor="busca-insumo">Buscar insumo</label>
          <input id="busca-insumo" type="search" className="busca" placeholder="Buscar insumo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <button className={`chip ${soCriticos ? 'ativo' : ''}`} aria-pressed={soCriticos} onClick={() => setSoCriticos(!soCriticos)}>Só críticos</button>
        </span>
      </div>
      {!lista.length ? (
        <div className="linha-lista"><div className="titulo">Nenhum insumo com esse filtro.</div></div>
      ) : (
        <table className="tabela">
          <thead><tr><th>Insumo</th><th className="n">Saldo</th><th className="n">Mínimo</th><th>Situação</th></tr></thead>
          <tbody>
            {lista.map((i) => (
              <tr key={i.id} className={i.situacao === 'Crítico' ? 'critica' : ''}>
                <td><button className="link-linha" onClick={() => setAberto(i)}>{i.nome}<span className="unidade">{i.unidade}</span></button></td>
                <td className="n num">{formatarQuantidade(i.saldo)}</td>
                <td className="n num">{formatarQuantidade(i.saldo_minimo)}</td>
                <td><Tag cor={COR_SITUACAO[i.situacao]}>{i.situacao}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {aberto && <Historico insumo={aberto} aoFechar={() => setAberto(null)} />}
    </div>
  )
}
