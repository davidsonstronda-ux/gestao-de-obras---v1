import { useState } from 'react'
import { listarObrasCadastro, salvarObra } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { SITUACOES_OBRA } from '../lib/permissoes.js'
import { formatarData } from '../lib/datas.js'
import { hoje } from '../lib/config.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Folha, Icon, Meta, Tag, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'

const VAZIA = { nome: '', codigo: '', endereco: '', cliente_nome: '', data_inicio: '', data_entrega: '', situacao: 'Em andamento' }

function FormObra({ obra, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const [d, setD] = useState(obra || { ...VAZIA, data_inicio: hoje() })
  const [salvando, setSalvando] = useState(false)
  const campo = (nome) => ({ value: d[nome] || '', onChange: (e) => setD({ ...d, [nome]: e.target.value }) })
  async function salvar() {
    setSalvando(true)
    const { data, erro } = await salvarObra({ ...d, codigo: d.codigo.trim().toUpperCase() })
    setSalvando(false)
    if (erro) return avisar(erro, 'erro')
    avisar(obra ? 'Obra atualizada.' : 'Obra criada. Ela já está selecionada.')
    aoSalvar(data)
  }
  return (
    <Folha titulo={obra ? 'Editar obra' : 'Nova obra'} aoFechar={aoFechar}>
      <div className="form">
        <label className="campo"><span>Nome <em>*</em></span><input type="text" {...campo('nome')} placeholder="Ex.: Residência Alto da Boa Vista" /></label>
        <div className="duas-col">
          <label className="campo"><span>Código / apelido <em>*</em></span><input type="text" {...campo('codigo')} placeholder="Ex.: RABV" maxLength={12} /></label>
          <label className="campo"><span>Situação <em>*</em></span>
            <select {...campo('situacao')}>{SITUACOES_OBRA.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
        </div>
        <label className="campo"><span>Cliente <em>*</em></span><input type="text" {...campo('cliente_nome')} /></label>
        <label className="campo"><span>Endereço</span><input type="text" {...campo('endereco')} /></label>
        <div className="duas-col">
          <label className="campo"><span>Data de início <em>*</em></span><input type="date" {...campo('data_inicio')} /></label>
          <label className="campo"><span>Data-meta de entrega <em>*</em></span><input type="date" {...campo('data_entrega')} /></label>
        </div>
        <button className="botao largo" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar obra'}</button>
      </div>
    </Folha>
  )
}

export default function Obras() {
  const { obraId, recarregarObras } = useSessao()
  const { carregando, data, erro, recarregar } = useCarregar(listarObrasCadastro)
  const [editando, setEditando] = useState(null) // null | 'nova' | obra

  async function depoisDeSalvar(obra) {
    setEditando(null)
    recarregar()
    await recarregarObras(editando === 'nova' ? obra.id : null)
  }

  let corpo
  if (carregando && !data) corpo = <Carregando />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (!data.length) corpo = <EstadoVazio icone="obras" titulo="Nenhuma obra cadastrada" texto="Crie a primeira obra para começar a lançar frentes e diário." acao="Criar a primeira obra" aoAgir={() => setEditando('nova')} />
  else {
    corpo = (
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={data.length}>Obras</TituloSecao>
          <span className="direita"><button className="botao" onClick={() => setEditando('nova')}><Icon nome="mais_sinal" />Nova obra</button></span>
        </div>
        {data.map((o) => (
          <button key={o.id} className="linha-lista" onClick={() => setEditando(o)}>
            <div>
              <div className="titulo">{o.nome}</div>
              <Meta itens={[<span key="c" className="obra-codigo">{o.codigo}</span>, o.cliente_nome, <span key="i">início <span className="data-curta">{formatarData(o.data_inicio)}</span></span>, <span key="e">entrega <span className="data-curta">{formatarData(o.data_entrega)}</span></span>]} />
            </div>
            <div className="lado">{o.id === obraId && <Tag cor="destaque">Atual</Tag>}<Tag>{o.situacao}</Tag></div>
          </button>
        ))}
        <div className="lista-rod"><span className="rotulo">Concluída sai do seletor de obra; Parada continua nele.</span></div>
      </div>
    )
  }

  return (
    <>
      <Cabecalho abas={<button className="aba ativa">Obras</button>} />
      <main className="conteudo">{corpo}</main>
      {editando && <FormObra obra={editando === 'nova' ? null : editando} aoFechar={() => setEditando(null)} aoSalvar={depoisDeSalvar} />}
    </>
  )
}
