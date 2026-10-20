import { useState } from 'react'
import { listarFrentesEmRisco } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { pode } from '../lib/permissoes.js'
import { formatarData, formatarDiaMes } from '../lib/datas.js'
import { rotuloPrazo } from '../lib/mensagens.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Meta, Regua, Tag, TituloSecao, corDe, useCarregar } from '../components/index.jsx'

const FILTROS = [['todas', 'Todas'], ['Estourou a folga', 'Estourou'], ['Atenção', 'Atenção'], ['No prazo', 'No prazo']]

export default function Frentes({ goto }) {
  const { perfil } = useSessao()
  const [filtro, setFiltro] = useState('todas')
  const [ordem, setOrdem] = useState('limite')
  const { carregando, data, erro, recarregar } = useCarregar(() => listarFrentesEmRisco({ ordem }), [ordem])

  const abas = FILTROS.map(([k, t]) => (
    <button key={k} className={`aba ${filtro === k ? 'ativa' : ''}`} onClick={() => setFiltro(k)}>{t}</button>
  ))

  let corpo
  if (carregando && !data) corpo = <Carregando alto />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (!data.frentes.length) {
    corpo = (
      <EstadoVazio icone="cronograma" titulo="Esta obra ainda não tem frentes em andamento"
        texto={data.escondidas ? `Há ${data.escondidas} frentes concluídas ou que ainda não chegaram na data de início.` : 'Importe o cronograma ou cadastre o primeiro serviço.'}
        acao={pode(perfil.role, 'cadastrar') ? 'Cadastrar frentes' : null} aoAgir={() => goto('cronograma')} />
    )
  } else {
    const conta = (r) => data.frentes.filter((f) => f.calculo.risco === r).length
    const lista = data.frentes.filter((f) => filtro === 'todas' || f.calculo.risco === filtro)
    const proxima = data.frentes.find((f) => f.calculo.risco === 'Atenção')
    const kpi = (risco, cor, nota) => (
      <button className={`cartao kpi ${conta(risco) ? cor : ''} ${filtro === risco ? 'selecionado' : ''}`}
        onClick={() => setFiltro(filtro === risco ? 'todas' : risco)} aria-pressed={filtro === risco}>
        <div className="rotulo">{risco}</div>
        <div className="valor num">{conta(risco)}</div>
        <div className="nota">{nota}</div>
      </button>
    )
    corpo = (
      <>
        <div className="kpis">
          {kpi('Estourou a folga', 'vermelho', 'empurrando a entrega')}
          {kpi('Atenção', 'ambar', proxima ? `próxima decisão até ${formatarDiaMes(proxima.calculo.dataLimite)}` : 'nenhuma')}
          {kpi('No prazo', 'verde', 'mais de 5 dias de folga')}
        </div>

        <div className="cartao entrega">
          <div className="linha">
            <div><div className="rotulo">Entrega prometida</div><div className="data num">{formatarData(data.entrega.data)}</div></div>
            {data.entrega.dePe ? <Tag cor="verde">De pé</Tag> : <Tag cor="vermelho">Em risco</Tag>}
          </div>
          {!data.entrega.dePe && (
            <div className="aviso-entrega">
              {data.entrega.estouradas} {data.entrega.estouradas === 1 ? 'frente já comeu' : 'frentes já comeram'} toda a folga e {data.entrega.estouradas === 1 ? 'empurra' : 'empurram'} a entrega.
            </div>
          )}
        </div>

        <div className="cartao">
          <div className="lista-cab">
            <TituloSecao conta={lista.length}>Frentes em risco</TituloSecao>
            <div className="direita">
              <div className="ordenar" role="group" aria-label="Ordenar por">
                <button className={ordem === 'limite' ? 'ativo' : ''} onClick={() => setOrdem('limite')}>Data limite</button>
                <button className={ordem === 'parado' ? 'ativo' : ''} onClick={() => setOrdem('parado')}>Dias parado</button>
              </div>
            </div>
          </div>
          {lista.map((f) => {
            const c = f.calculo
            return (
              <button key={f.id} className={`linha-lista ${c.risco === 'Estourou a folga' ? 'critica' : ''}`}
                onClick={() => goto('frente', { id: f.id })}>
                <div>
                  <div className="titulo">{f.servico}</div>
                  <Meta itens={[f.empreiteiro?.nome, f.situacao === 'Não iniciada' ? 'Não começou' : c.ultimoMotivo, f.temPendenciaAberta ? 'Pendência de projeto' : null]} />
                  <Regua folgaDias={f.folga_dias} diasPerdidos={c.diasPerdidos} risco={c.risco}
                    legenda={c.folgaRestante < 0 ? 'folga toda usada' : `${c.diasPerdidos} de ${f.folga_dias} dias de folga usados`} />
                </div>
                <div className="lado">
                  <div className="parado"><b>{c.diasSemAndar}</b><span>{c.diasSemAndar === 1 ? 'dia parado' : 'dias parado'}</span></div>
                  <span className={`tag ${corDe(f.calculo.risco)} num`}>{rotuloPrazo(f.calculo)}</span>
                </div>
              </button>
            )
          })}
          {!lista.length && <div className="linha-lista"><div className="titulo">Nenhuma frente com essa situação.</div></div>}
          <div className="lista-rod">
            <span className="rotulo">Mais {data.escondidas} concluídas ou ainda sem data de início</span>
            {pode(perfil.role, 'cadastrar') && <button className="link" onClick={() => goto('cronograma')}>Ver cronograma</button>}
          </div>
        </div>

        <div className="duas">
          {pode(perfil.role, 'lancarDiario') && (
            <button className="cartao mini" onClick={() => goto('diario')}>
              <div className="rotulo">Diário de hoje</div><div className="val">Lançar o diário</div>
            </button>
          )}
          <button className="cartao mini" onClick={() => goto('pendencias')}>
            <div className="rotulo">Pendências de projeto</div>
            <div className={`val ${data.pendenciasAbertas ? 'vermelho' : 'verde'}`}>
              {data.pendenciasAbertas ? `${data.pendenciasAbertas} aberta${data.pendenciasAbertas > 1 ? 's' : ''}` : 'Nenhuma aberta'}
            </div>
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Cabecalho abas={abas} />
      <main className="conteudo">{corpo}</main>
    </>
  )
}
