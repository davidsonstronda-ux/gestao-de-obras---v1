// Qualidade › Relatório: a visão de impressão da obra escolhida, com os mesmos
// filtros que estão ativos nas abas. Imprimir usa a impressão do navegador
// (que também salva em PDF); o CSS de impressão esconde menu e botões.
// Os recortes são os das abas (lib/qualidade.js, lib/fvs.js, lib/gemba.js).
import { useState } from 'react'
import { listarFvs, listarGemba, listarVistoria } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { hoje } from '../lib/config.js'
import { formatarData } from '../lib/datas.js'
import { contarStatus, estaVencido, filtrarRegistros, notasDoHistorico, ordenarRegistros, pendentesPorResponsavel } from '../lib/qualidade.js'
import { filtrarNcs } from '../lib/fvs.js'
import { emAberto, filtrarObservacoes, ordenarObservacoes, rankingDesperdicios } from '../lib/gemba.js'
import { carimboDeGeracao, descreverFiltros } from '../lib/relatorio.js'
import { Carregando, Erro, Icon, Logo, Tag, useCarregar } from '../components/index.jsx'
import { COR_NC, COR_SEVERIDADE, COR_STATUS, COR_VISTORIA, Etiquetas, FotoRegistro, classeDe, pct } from './qualidadeComum.jsx'

const NADA = <p className="rel-nada">Nada com os filtros aplicados.</p>

function Secao({ titulo, children }) {
  return <section className="rel-secao"><h2>{titulo}</h2>{children}</section>
}

function RegistroImpresso({ r }) {
  const vencido = estaVencido(r, hoje())
  const notas = notasDoHistorico(r.observacoes)
  return (
    <article className="rel-registro">
      <div className="rel-fotos">
        <FotoRegistro src={r.foto} alt={`Foto do registro #${r.numero}`} />
        {r.foto_evidencia && <FotoRegistro src={r.foto_evidencia} alt={`Foto da correção do registro #${r.numero}`} />}
      </div>
      <div className="rel-registro-corpo">
        <div className="rel-registro-topo">
          <b className="num">#{r.numero}</b>
          <Tag cor={COR_STATUS[r.status]}>{r.status}</Tag>
          {vencido && <Tag cor="vermelho">Vencido</Tag>}
        </div>
        <dl className="rel-dados">
          <div><dt>Data da vistoria</dt><dd>{formatarData(r.data_vistoria)}</dd></div>
          <div><dt>Vistoriado por</dt><dd>{r.vistoriador}</dd></div>
          <div><dt>Responsável</dt><dd>{r.responsavel}</dd></div>
          <div><dt>Prazo</dt><dd className={vencido ? 'texto-vermelho' : ''}>{formatarData(r.prazo)}</dd></div>
          <div><dt>Local</dt><dd>{r.local}{r.pavimento ? ` · ${r.pavimento}` : ''}</dd></div>
          <div><dt>Empresa</dt><dd>{r.empresa}</dd></div>
          {r.resolvido_em && <div><dt>Resolvido em</dt><dd>{formatarData(r.resolvido_em)}</dd></div>}
        </dl>
        <p className="rel-desc">{r.descricao}</p>
        {notas.length > 0 && (
          <ul className="rel-notas">{notas.map((n, i) => <li key={i}><span className="data-curta">{n.carimbo}</span> {n.texto}</li>)}</ul>
        )}
      </div>
    </article>
  )
}

export default function Relatorio({ filtrosVistoria, filtroNc, filtrosGemba, aoVoltar }) {
  const { obra } = useSessao()
  const vistoria = useCarregar(listarVistoria)
  const fvs = useCarregar(listarFvs)
  const gemba = useCarregar(listarGemba)
  const [geradoEm] = useState(() => carimboDeGeracao(hoje()))
  const partes = [vistoria, fvs, gemba]

  const barra = (
    <div className="rel-barra no-print">
      <button className="link voltar-link" onClick={aoVoltar}><Icon nome="voltar" tamanho={18} />Voltar</button>
      <span className="rotulo">Usa os filtros que estão ativos em cada aba.</span>
      <button className="botao" disabled={partes.some((p) => !p.data)} onClick={() => window.print()}><Icon nome="enviar" />Imprimir</button>
    </div>
  )
  if (partes.some((p) => p.carregando && !p.data)) return <>{barra}<Carregando alto /></>
  const comErro = partes.find((p) => p.erro)
  if (comErro) return <>{barra}<Erro mensagem={comErro.erro} aoTentar={() => partes.forEach((p) => p.recarregar())} /></>

  const registros = ordenarRegistros(filtrarRegistros(vistoria.data.registros, filtrosVistoria, hoje()), hoje())
  const conta = contarStatus(registros)
  const porResponsavel = pendentesPorResponsavel(registros)
  const ncs = filtrarNcs(fvs.data.ncs, filtroNc)
  const ranking = rankingDesperdicios(gemba.data.observacoes)
  const maior = Math.max(1, ranking[0].quantidade)
  const abertas = emAberto(ordenarObservacoes(filtrarObservacoes(gemba.data.observacoes, filtrosGemba, hoje()), hoje()))
  const filtros = descreverFiltros({ vistoria: filtrosVistoria, pessoas: vistoria.data.pessoas, filtroNc, gemba: filtrosGemba })

  return (
    <>
      {barra}
      <div className="relatorio">
        <header className="rel-cab">
          <div className="rel-marca"><Logo /></div>
          <h1>RELATÓRIO DE QUALIDADE</h1>
          <div className="rel-obra">{obra.nome} <span className="obra-codigo">{obra.codigo}</span></div>
          <div className="rel-sub">{obra.cliente_nome} · emitido em <span className="data-curta">{formatarData(hoje())}</span></div>
          <ul className="rel-filtros">{filtros.map((f) => <li key={f}>{f}</li>)}</ul>
        </header>

        <Secao titulo="Vistoria">
          <div className="kpis quatro">
            <div className="cartao kpi"><div className="rotulo">Total</div><div className="valor num">{conta.Total}</div></div>
            <div className="cartao kpi vermelho"><div className="rotulo">Pendentes</div><div className="valor num">{conta.Pendente}</div></div>
            <div className="cartao kpi ambar"><div className="rotulo">Em andamento</div><div className="valor num">{conta['Em andamento']}</div></div>
            <div className="cartao kpi verde"><div className="rotulo">Resolvidos</div><div className="valor num">{conta.Resolvido}</div></div>
          </div>
          <h3>Pendentes por responsável <span className="rotulo">(pendentes e em andamento)</span></h3>
          {porResponsavel.length
            ? <div className="rel-responsaveis">{porResponsavel.map((p) => <span key={p.id} className="tag neutra">{p.nome} <b className="num">{p.quantidade}</b></span>)}</div>
            : NADA}
          <h3>Registros</h3>
          {registros.length ? registros.map((r) => <RegistroImpresso key={r.id} r={r} />) : NADA}
        </Secao>

        <Secao titulo="FVS — Fichas de Verificação de Serviço">
          <p className="rel-resumo">Conforme geral <b className="num">{pct(fvs.data.resumo.conformidadeGeral)}</b> · NCs em aberto <b className="num">{fvs.data.resumo.ncsAbertas}</b> · vistorias concluídas <b className="num">{fvs.data.resumo.vistoriasConcluidas}</b> de {fvs.data.vistorias.length}</p>
          <h3>Andamento das vistorias</h3>
          {fvs.data.vistorias.length ? (
            <table className="tabela-rel">
              <thead><tr><th>Ficha · ambiente</th><th>OK</th><th>NC</th><th>N.A.</th><th>Conformidade</th><th>Situação</th></tr></thead>
              <tbody>
                {fvs.data.vistorias.map((v) => (
                  <tr key={v.id}>
                    <td><b>{v.modelo_codigo}</b> {v.modelo_nome} · {v.ambiente}</td>
                    <td className="num">{v.progresso.ok}</td><td className="num">{v.progresso.nc}</td><td className="num">{v.progresso.na}</td>
                    <td className="num">{pct(v.progresso.conformidade)}</td>
                    <td><Tag cor={COR_VISTORIA[v.status]}>{v.status}</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : NADA}
          <h3>Não conformidades ({filtroNc.toLowerCase()})</h3>
          {ncs.length ? (
            <table className="tabela-rel">
              <thead><tr><th>Código</th><th>Título</th><th>Severidade</th><th>Situação</th><th>Empresa</th><th>Dias em aberto</th></tr></thead>
              <tbody>
                {ncs.map((n) => (
                  <tr key={n.id}>
                    <td className="num"><b>{n.codigo}</b></td><td>{n.titulo}<div className="rotulo">{n.ambiente}</div></td>
                    <td><Tag cor={COR_SEVERIDADE[n.severidade]}>{n.severidade}</Tag></td><td><Tag cor={COR_NC[n.status]}>{n.status}</Tag></td>
                    <td>{n.empresa}</td><td className="num">{n.diasEmAberto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : NADA}
        </Secao>

        <Secao titulo="Gemba Walk — desperdícios">
          <h3>Onde a obra mais perde</h3>
          <div className="ranking-dsp rel-ranking">
            {ranking.map((r) => (
              <div key={r.tipo} className="linha-ranking">
                <span className="nome-ranking">{r.tipo}</span>
                <span className="trilho-ranking"><i className={classeDe(r.tipo)} style={{ width: `${(r.quantidade / maior) * 100}%` }} /></span>
                <b className="num">{r.quantidade}</b>
              </div>
            ))}
          </div>
          <h3>Observações em aberto</h3>
          {abertas.length ? (
            <table className="tabela-rel">
              <thead><tr><th>Local</th><th>O que foi visto</th><th>Desperdícios</th><th>Ação</th><th>Responsável</th><th>Prazo</th></tr></thead>
              <tbody>
                {abertas.map((o) => {
                  const vencida = estaVencido(o, hoje())
                  return (
                    <tr key={o.id}>
                      <td><b>{o.local}</b><div className="rotulo">{o.status}</div></td><td>{o.descricao}</td><td><Etiquetas tipos={o.desperdicios} /></td>
                      <td>{o.acao}</td><td>{o.responsavel}</td>
                      <td className={`num ${vencida ? 'texto-vermelho' : ''}`}>{o.prazo ? formatarData(o.prazo) : '—'}{vencida && <div>vencido</div>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : NADA}
        </Secao>

        <footer className="rel-rodape">Relatório gerado automaticamente em {geradoEm}.</footer>
      </div>
    </>
  )
}
