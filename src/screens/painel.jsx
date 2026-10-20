import { painelCliente } from '../lib/dados.js'
import { formatarData, formatarDiaMes } from '../lib/datas.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Icon, TituloSecao, useCarregar } from '../components/index.jsx'

// O cliente vê só: data prometida, avanço por ambiente e fotos liberadas da semana.
// Sem empreiteiro, sem serviço, sem valores, sem aviso de risco (decisões de 20/10).
export default function Painel() {
  const { carregando, data, erro, recarregar } = useCarregar(painelCliente)

  let corpo
  if (carregando && !data) corpo = <Carregando alto />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else {
    const geral = data.ambientes.length ? Math.round(data.ambientes.reduce((s, a) => s + a.pct, 0) / data.ambientes.length) : 0
    corpo = (
      <>
        <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="cartao kpi destaque"><div className="rotulo">Entrega prevista</div><div className="valor num" style={{ fontSize: 30 }}>{formatarData(data.data_entrega)}</div></div>
          <div className="cartao kpi destaque"><div className="rotulo">Avanço geral</div><div className="valor num">{geral}%</div></div>
        </div>
        <div className="cartao">
          <div className="lista-cab"><TituloSecao>Avanço por ambiente</TituloSecao></div>
          {data.ambientes.map((a) => (
            <div key={a.id} className="amb-barra">
              <div className="topo"><span className="titulo" style={{ fontSize: 17, fontWeight: 600 }}>{a.nome}</span><b className="num">{a.pct}%</b></div>
              <div className="barra"><i style={{ width: `${a.pct}%` }} /></div>
            </div>
          ))}
        </div>
        {data.fotos.length ? (
          <div className="cartao">
            <div className="lista-cab"><TituloSecao conta={data.fotos.length}>Fotos da semana</TituloSecao></div>
            <div className="galeria">
              {data.fotos.map((f) => (
                <div key={f.id} className="foto">
                  <div className="img"><Icon nome="fotos" /></div>
                  <div className="leg"><b>{f.ambiente}</b><span className="rotulo data-curta">{formatarDiaMes(f.tirada_em)}</span></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EstadoVazio icone="fotos" titulo="As fotos desta semana aparecem aqui em breve" />
        )}
      </>
    )
  }
  return (
    <>
      <Cabecalho />
      <main className="conteudo">{corpo}</main>
    </>
  )
}
