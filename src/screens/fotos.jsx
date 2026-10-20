import { useState } from 'react'
import { liberarFotos, listarFotos } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { pode } from '../lib/permissoes.js'
import { formatarDiaMes } from '../lib/datas.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Icon, Tag, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'

export default function Fotos() {
  const { perfil } = useSessao()
  const avisar = useAviso()
  const engenheiro = pode(perfil.role, 'liberarFoto')
  const [aguardando, setAguardando] = useState(false)
  const [escolhidas, setEscolhidas] = useState([])
  const [salvando, setSalvando] = useState(false)
  const { carregando, data, erro, recarregar } = useCarregar(() => listarFotos({ aguardando }), [aguardando])

  const abas = (
    <>
      <button className={`aba ${!aguardando ? 'ativa' : ''}`} onClick={() => { setAguardando(false); setEscolhidas([]) }}>Todas</button>
      {engenheiro && <button className={`aba ${aguardando ? 'ativa' : ''}`} onClick={() => { setAguardando(true); setEscolhidas([]) }}>Aguardando liberação</button>}
    </>
  )
  const alternar = (id) => setEscolhidas((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))

  async function liberar(visivel) {
    setSalvando(true)
    const { erro: e } = await liberarFotos(escolhidas, visivel)
    setSalvando(false)
    if (e) return avisar(e, 'erro')
    avisar(visivel ? `${escolhidas.length} foto(s) liberada(s) ao cliente.` : `${escolhidas.length} foto(s) tirada(s) do cliente.`)
    setEscolhidas([])
    recarregar()
  }

  let corpo
  if (carregando && !data) corpo = <Carregando alto />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (!data.length) {
    corpo = aguardando
      ? <EstadoVazio icone="check" titulo="Nenhuma foto aguardando liberação" texto="Todas as fotos desta obra já foram vistas por você." />
      : <EstadoVazio icone="fotos" titulo="Nenhuma foto ainda" texto="As fotos entram pelo Diário do dia, no botão Foto de cada frente." />
  } else {
    corpo = (
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={data.length}>{engenheiro ? 'Toque nas fotos para escolher' : 'Fotos'}</TituloSecao>
          {engenheiro && escolhidas.length > 0 && (
            <span className="direita">
              <button className="botao contorno" disabled={salvando} onClick={() => liberar(false)}>Tirar do cliente</button>
              <button className="botao" disabled={salvando} onClick={() => liberar(true)}><Icon nome="olho" />Liberar {escolhidas.length} ao cliente</button>
            </span>
          )}
        </div>
        <div className="galeria">
          {data.map((f) => {
            const conteudo = (
              <>
                <div className="img"><Icon nome="fotos" /></div>
                <span className="marca-foto">{f.visivel_cliente ? <Tag cor="destaque">Cliente vê</Tag> : <Tag cor="neutra">Só equipe</Tag>}</span>
                <div className="leg">
                  <b>{f.ambiente} <span className="data-curta">{formatarDiaMes(f.tirada_em)}</span></b>
                  <span className="rotulo">{f.frente}</span>
                </div>
              </>
            )
            return engenheiro
              ? <button key={f.id} className={`foto ${escolhidas.includes(f.id) ? 'escolhida' : ''}`} aria-pressed={escolhidas.includes(f.id)} onClick={() => alternar(f.id)}>{conteudo}</button>
              : <div key={f.id} className="foto">{conteudo}</div>
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <Cabecalho abas={abas} />
      <main className="conteudo">{corpo}</main>
    </>
  )
}
