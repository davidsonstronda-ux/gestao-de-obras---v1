// Relatórios: o BI da obra escolhida (só engenheiro). Os números e as séries
// saem de lib/bi.js; aqui só se desenha. Gráficos feitos à mão: barras e rosca
// em CSS, linhas em SVG. Painel sem dado mostra de onde o dado vem, nunca NaN.
import { createContext, useContext, useMemo, useState } from 'react'
import { dadosDoBi } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { hoje } from '../lib/config.js'
import { diaDaSemana, formatarData, formatarDiaMes, formatarDinheiro, formatarDinheiroCurto } from '../lib/datas.js'
import { PERIODOS, descreverFiltrosBi, montarBi } from '../lib/bi.js'
import { carimboDeGeracao } from '../lib/relatorio.js'
import { META_PPC } from '../lib/planejamento.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, ICONE_CLIMA, Icon, Logo, corDe, useCarregar } from '../components/index.jsx'

// ── peças comuns dos painéis ────────────────────────────────────────────────
// `aviso`: uma linha em âmbar quando um filtro não vale para parte do painel.
function Painel({ titulo, pergunta, largo, aviso, children }) {
  return (
    <section className={`cartao painel-bi ${largo ? 'largo' : ''}`}>
      <header className="painel-bi-cab">
        <h2>{titulo}</h2>
        {pergunta && <p>{pergunta}</p>}
        {aviso && <p className="bi-aviso">{aviso}</p>}
      </header>
      {children}
    </section>
  )
}

// Com empreiteiro ou período escolhido, painel vazio é "nada no recorte", não
// "cadastre o primeiro": a obra pode ter o dado, só não do filtro.
const ComFiltro = createContext(false)

function SemDados({ icone, texto }) {
  const comFiltro = useContext(ComFiltro)
  return (
    <div className="bi-sem-dados">
      <div className="ico"><Icon nome={icone} /></div>
      <b>Painel sem dados</b>
      <p>{comFiltro ? 'Nada com os filtros escolhidos.' : texto}</p>
    </div>
  )
}

function Grafico({ titulo, legenda, children }) {
  return (
    <figure className="bi-grafico">
      <figcaption>{titulo}</figcaption>
      {children}
      {legenda && (
        <ul className="bi-legenda">
          {legenda.map(([cor, texto]) => <li key={texto}><i className={`bi-cor ${cor}`} />{texto}</li>)}
        </ul>
      )}
    </figure>
  )
}

const pct = (n) => (n === null || n === undefined ? '—' : `${n}%`)

// ── Painel 1: Executivo ─────────────────────────────────────────────────────
function Indicadores({ evolucao, prazo, dataEntrega, custo }) {
  const atras = evolucao && evolucao.diferenca < 0
  const passou = prazo !== null && prazo < 0
  return (
    <div className="kpis bi-kpis">
      <div className={`cartao kpi ${!evolucao ? '' : atras ? 'vermelho' : 'verde'}`}>
        <div className="rotulo">Evolução</div>
        <div className="valor">{pct(evolucao?.real)}</div>
        <div className="nota bi-seta">
          {evolucao && <Icon nome="seta" tamanho={16} />}
          {evolucao ? `previsto ${evolucao.previsto}% · ${atras ? `${-evolucao.diferenca} pontos atrás` : evolucao.diferenca ? `${evolucao.diferenca} pontos à frente` : 'em dia'}` : 'sem planejamento'}
        </div>
      </div>
      <div className={`cartao kpi ${passou ? 'vermelho' : 'destaque'}`}>
        <div className="rotulo">Prazo</div>
        <div className="valor">{prazo === null ? '—' : Math.abs(prazo)}<span className="de"> dias</span></div>
        <div className="nota">{prazo === null ? 'sem data de entrega' : passou ? `a entrega era ${formatarData(dataEntrega)}` : `até a entrega, ${formatarData(dataEntrega)}`}</div>
      </div>
      <div className="cartao kpi destaque">
        <div className="rotulo">Custo medido</div>
        <div className="valor bi-dinheiro">{formatarDinheiro(custo)}</div>
        <div className="nota">das medições fechadas</div>
      </div>
    </div>
  )
}

// Curva S em SVG: escala de 0 a 100% no eixo Y, uma coluna por semana.
const CS = { alt: 220, esq: 40, dir: 14, topo: 14, base: 30, passo: 40, minimo: 520 }
function CurvaS({ pontos }) {
  // Poucas semanas: espaça mais, para o desenho não esticar e as letras não crescerem.
  const passo = Math.max(CS.passo, CS.minimo / Math.max(1, pontos.length - 1))
  const larg = CS.esq + CS.dir + Math.max(1, pontos.length - 1) * passo
  const x = (i) => CS.esq + i * passo
  const y = (p) => CS.topo + ((100 - p) / 100) * (CS.alt - CS.topo - CS.base)
  const linha = (lista) => lista.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')
  const previsto = pontos.map((p, i) => ({ i, v: p.previsto }))
  const real = pontos.map((p, i) => ({ i, v: p.real })).filter((p) => p.v !== null)
  const iHoje = pontos.findIndex((p) => p.atual)
  const area = real.length ? `M${x(real[0].i)},${y(0)} L${linha(real).replaceAll(' ', ' L')} L${x(real.at(-1).i)},${y(0)} Z` : ''
  const cadaRotulo = pontos.length > 16 ? 2 : 1
  return (
    <div className="bi-rolavel">
      <svg className="curva-s" viewBox={`0 0 ${larg} ${CS.alt}`} style={{ '--min': `${larg}px` }} role="img"
        aria-label={`Curva S: hoje ${pct(real.at(-1)?.v)} realizado; previsto até o domingo desta semana, ${pct(pontos[iHoje]?.previsto)}`}>
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line className="grade" x1={CS.esq} x2={larg - CS.dir} y1={y(p)} y2={y(p)} />
            <text className="eixo" x={CS.esq - 6} y={y(p) + 4} textAnchor="end">{p}%</text>
          </g>
        ))}
        {pontos.map((p, i) => i % cadaRotulo === 0 && (
          <text key={p.semana} className="eixo" x={x(i)} y={CS.alt - 10} textAnchor="middle">{formatarDiaMes(p.semana)}</text>
        ))}
        {iHoje >= 0 && (
          <g>
            <line className="hoje" x1={x(iHoje)} x2={x(iHoje)} y1={CS.topo} y2={y(0)} />
            <text className="eixo forte" x={x(iHoje)} y={CS.topo - 2} textAnchor="middle">hoje</text>
          </g>
        )}
        {area && <path className="area-real" d={area} />}
        <polyline className="linha-prevista" points={linha(previsto)} />
        {real.length > 0 && <polyline className="linha-real" points={linha(real)} />}
        {real.map((p) => <circle key={p.i} className="ponto-real" cx={x(p.i)} cy={y(p.v)} r="3.5"><title>{`${formatarDiaMes(pontos[p.i].semana)}: real ${p.v}% · previsto ${pontos[p.i].previsto}%`}</title></circle>)}
      </svg>
    </div>
  )
}

function Rosca({ valor, rotulo }) {
  const v = valor ?? 0
  return (
    <div className="rosca" style={{ '--v': `${v}%` }} role="img" aria-label={`${rotulo}: ${pct(valor)}`}>
      <div className="rosca-furo"><b>{pct(valor)}</b><span>{rotulo}</span></div>
    </div>
  )
}

function PainelExecutivo({ e, aviso }) {
  return (
    <Painel titulo="Executivo" pergunta="Como está a saúde da obra hoje?" largo aviso={aviso}>
      <Indicadores evolucao={e.evolucao} prazo={e.prazo} dataEntrega={e.dataEntrega} custo={e.custo} />
      <div className="bi-exec-graficos">
        <Grafico titulo="Curva S — % acumulado por semana"
          legenda={e.curva.length ? [['previsto', 'Previsto (datas do Planejamento)'], ['real', 'Real (concluídas; hoje, o % de hoje)']] : null}>
          {e.curva.length ? <CurvaS pontos={e.curva} /> : <SemDados icone="planejamento" texto="Monte a EAP no Planejamento para liberar a Curva S." />}
        </Grafico>
        <Grafico titulo="PPC geral" legenda={e.ppc.ppc === null ? null : [['real', 'Concluídas na semana'], ['nao', 'Não concluídas']]}>
          {e.ppc.ppc === null
            ? <SemDados icone="planejamento" texto="O PPC sai das semanas já fechadas do Curto prazo." />
            : (
              <div className="bi-ppc">
                <Rosca valor={e.ppc.ppc} rotulo="PPC" />
                <p><b className="num">{e.ppc.concluidas}</b> de <b className="num">{e.ppc.planejadas}</b> atividades planejadas foram concluídas na semana, somando as semanas fechadas.</p>
              </div>
            )}
        </Grafico>
      </div>
    </Painel>
  )
}

// ── Painel 2: Ritmo & Produção ──────────────────────────────────────────────
// PPC por semana: cada coluna é 100% da semana; verde = concluídas, vermelho = não.
function PpcSemanal({ semanas }) {
  return (
    <div className="bi-rolavel">
      <div className="bi-colunas" style={{ '--n': semanas.length, '--meta': `${META_PPC}%` }}>
        {semanas.map((s) => (
          <div key={s.semana} className="bi-coluna" title={`Semana de ${formatarData(s.semana)}: ${s.concluidas} de ${s.planejadas} concluídas`}>
            <b className="num">{s.ppc}%</b>
            <div className="bi-pilha">
              <i className="nao" style={{ flexGrow: s.naoConcluidas }} />
              <i className="sim" style={{ flexGrow: s.concluidas }} />
            </div>
            <span className="data-curta">{formatarDiaMes(s.semana)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Barras deitadas, maior primeiro: nome, barra, quantidade e um texto à direita.
// `maximo` fixa a escala (100 para %); sem ele, a maior barra enche o trilho.
function BarrasDeitadas({ itens, maximo }) {
  const maior = maximo || Math.max(1, ...itens.map((i) => i.valor))
  return (
    <ul className="bi-barras-h">
      {itens.map((i) => (
        <li key={i.nome}>
          <span className="nome">{i.nome}</span>
          <span className="trilho"><i className={i.cor || ''} style={{ width: `${(i.valor / maior) * 100}%` }} /></span>
          <span className="valor num">{i.texto}</span>
        </li>
      ))}
    </ul>
  )
}

// Colunas = pessoas no canteiro em cada dia de diário; em cima, o clima. Dia de
// chuva com fundo azulado: dá para ver a paralisação.
function ClimaEfetivo({ dias }) {
  const maior = Math.max(1, ...dias.map((d) => d.pessoas))
  return (
    <div className="bi-rolavel">
      <div className="bi-efetivo" style={{ '--n': dias.length }}>
        {dias.map((d) => (
          <div key={d.data} className={`bi-dia ${d.clima === 'Chuva' ? 'chuva' : ''}`} title={`${formatarData(d.data)}: ${d.clima}, ${d.pessoas} pessoas`}>
            <span className={`clima ${ICONE_CLIMA[d.clima] || ''}`}><Icon nome={ICONE_CLIMA[d.clima] || 'sol'} tamanho={18} /></span>
            <div className="bi-dia-barra"><b className="num">{d.pessoas}</b><i style={{ height: `${(d.pessoas / maior) * 100}%` }} /></div>
            <span className="data-curta">{formatarDiaMes(d.data)}</span>
            <span className="dia-semana">{diaDaSemana(d.data)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PainelRitmo({ r }) {
  return (
    <Painel titulo="Ritmo & Produção" pergunta="O plano da semana está sendo cumprido? O que trava?">
      <Grafico titulo="PPC por semana" legenda={r.ppcSemanal.length ? [['sim', 'Concluídas'], ['nao-feita', 'Não concluídas'], ['meta', `Meta ${META_PPC}%`]] : null}>
        {r.ppcSemanal.length
          ? <PpcSemanal semanas={r.ppcSemanal} />
          : <SemDados icone="planejamento" texto="O PPC aparece quando o Curto prazo tiver uma semana fechada." />}
      </Grafico>
      <Grafico titulo="Pareto das causas">
        {r.pareto.length
          ? <BarrasDeitadas itens={r.pareto.map((c) => ({ nome: c.causa, valor: c.quantidade, cor: 'vermelho', texto: `${c.quantidade} · ${c.pct}% · acum. ${c.acumulado}%` }))} />
          : <SemDados icone="alerta" texto="Nada ficou como “Não realizado” no Kanban nem como “Não andou” no diário." />}
      </Grafico>
      <Grafico titulo="Clima & efetivo por dia" legenda={r.efetivo.length ? [['real', 'Pessoas no canteiro'], ['chuva', 'Dia de chuva']] : null}>
        {r.efetivo.length
          ? <ClimaEfetivo dias={r.efetivo} />
          : <SemDados icone="diario" texto="Lance o primeiro diário para liberar este painel." />}
      </Grafico>
    </Painel>
  )
}

// ── Painel 3: Contratos & Medições ──────────────────────────────────────────
function MiniCartoes({ itens }) {
  return (
    <div className="bi-mini" style={{ '--n': itens.length }}>
      {itens.map((i) => (
        <div key={i.rotulo} className={`bi-mini-cartao ${i.cor || ''}`}>
          <span className="rotulo">{i.rotulo}</span>
          <b className="num">{i.valor}</b>
          {i.nota && <span className="nota num">{i.nota}</span>}
        </div>
      ))}
    </div>
  )
}

function MatrizEmpreiteiros({ linhas }) {
  return (
    <div className="bi-rolavel">
      <table className="bi-tabela">
        <thead><tr><th>Empreiteiro</th><th className="dir">Contratado</th><th>% medido</th><th className="dir">Saldo a medir</th></tr></thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id}>
              <td>{l.nome}</td>
              <td className="dir num">{formatarDinheiro(l.contratado)}</td>
              <td>
                <div className="bi-celula-barra" title={`Medido: ${formatarDinheiro(l.medido)}`}>
                  <span className="trilho"><i style={{ width: `${l.pct}%` }} /></span>
                  <b className="num">{l.pct}%</b>
                </div>
              </td>
              <td className="dir num">{formatarDinheiro(l.saldo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PainelContratos({ c, aviso }) {
  const semContrato = !c.matriz.length
  return (
    <Painel titulo="Contratos & Medições" pergunta="Quanto já foi medido e quanto ainda vai sair do caixa?" aviso={aviso}>
      <Grafico titulo="Fluxo dos contratos (pela situação da frente)">
        <MiniCartoes itens={c.fluxo.map((f) => ({
          rotulo: f.situacao, valor: f.quantidade, nota: formatarDinheiroCurto(f.valor), cor: f.quantidade ? corDe(f.situacao) : '',
        }))} />
      </Grafico>
      <Grafico titulo="Matriz de empreiteiros">
        {semContrato
          ? <SemDados icone="medicao" texto="Cadastre as frentes com o valor contratado para liberar este painel." />
          : <MatrizEmpreiteiros linhas={c.matriz} />}
      </Grafico>
      <Grafico titulo="Saldo a medir por contrato">
        {c.saldos.length
          ? <BarrasDeitadas itens={c.saldos.map((s) => ({ nome: s.servico, valor: s.saldo, texto: formatarDinheiro(s.saldo) }))} />
          : <SemDados icone="medicao" texto={semContrato ? 'Nenhum contrato nesta obra ainda.' : 'Tudo o que foi contratado já está medido.'} />}
      </Grafico>
    </Painel>
  )
}

// ── Painel 4: Materiais ─────────────────────────────────────────────────────
// Colunas pequenas com o valor em cima; valor null vira "—" e coluna vazia.
function ColunasPequenas({ itens, unidade }) {
  const maior = Math.max(1, ...itens.map((i) => i.valor ?? 0))
  return (
    <div className="bi-colunas-p" style={{ '--n': itens.length }}>
      {itens.map((i) => (
        <div key={i.rotulo} className="bi-coluna-p">
          <b className="num">{i.valor === null ? '—' : `${i.valor}${unidade}`}</b>
          <div className="caixa">{i.valor !== null && <i style={{ height: `${(i.valor / maior) * 100}%` }} />}</div>
          <span className="data-curta">{i.rotulo}</span>
        </div>
      ))}
    </div>
  )
}

function EntradasSaidas({ semanas }) {
  const maior = Math.max(1, ...semanas.flatMap((s) => [s.entradas, s.saidas]))
  return (
    <div className="bi-colunas-p" style={{ '--n': semanas.length }}>
      {semanas.map((s) => (
        <div key={s.semana} className="bi-coluna-p" title={`Semana de ${formatarData(s.semana)}: ${s.entradas} entradas, ${s.saidas} saídas`}>
          <b className="num">{s.entradas}·{s.saidas}</b>
          <div className="caixa dupla">
            <i className="bi-entra" style={{ height: `${(s.entradas / maior) * 100}%` }} />
            <i className="bi-sai" style={{ height: `${(s.saidas / maior) * 100}%` }} />
          </div>
          <span className="data-curta">{formatarDiaMes(s.semana)}</span>
        </div>
      ))}
    </div>
  )
}

function PainelMateriais({ m, aviso }) {
  const total = m.etapas.reduce((s, e) => s + e.quantidade, 0)
  return (
    <Painel titulo="Materiais" pergunta="O canteiro está esperando material?" aviso={aviso}>
      {total === 0
        ? <SemDados icone="materiais" texto="Faça o primeiro pedido em Materiais para liberar este painel." />
        : (
          <>
            <Grafico titulo="Pedidos por etapa">
              <MiniCartoes itens={m.etapas.map((e) => ({ rotulo: e.status, valor: e.quantidade, cor: e.quantidade ? 'destaque' : '' }))} />
            </Grafico>
            <div className={`bi-alerta ${m.atrasados.length ? 'vermelho' : 'verde'}`}>
              <div className="bi-alerta-topo">
                <Icon nome={m.atrasados.length ? 'alerta' : 'check'} tamanho={20} />
                <b className="num">{m.atrasados.length}</b>
                <span>{m.atrasados.length === 1 ? 'pedido atrasado' : 'pedidos atrasados'}</span>
                <span className="bi-alerta-extra">{m.criticos} {m.criticos === 1 ? 'crítico' : 'críticos'} em aberto</span>
              </div>
              {m.atrasados.length > 0 && (
                <ul>
                  {m.atrasados.map((p) => (
                    <li key={p.id}><b>{p.material}</b> · {p.frente} · <span className="num">{p.dias} {p.dias === 1 ? 'dia' : 'dias'}</span> de atraso{p.critico ? ' · crítico' : ''}</li>
                  ))}
                </ul>
              )}
            </div>
            <Grafico titulo="Lead time (do pedido à chegada no almoxarifado)">
              {m.leadTime.media === null
                ? <SemDados icone="materiais" texto="Nenhum pedido chegou ao almoxarifado ainda." />
                : (
                  <div className="bi-lead">
                    <div className="bi-lead-numero"><b className="num">{m.leadTime.media}</b><span>dias em média<br />({m.leadTime.pedidos} {m.leadTime.pedidos === 1 ? 'pedido' : 'pedidos'})</span></div>
                    <ColunasPequenas unidade="d" itens={m.leadTime.tendencia.map((t) => ({ rotulo: formatarDiaMes(t.semana), valor: t.media }))} />
                  </div>
                )}
            </Grafico>
          </>
        )}
      {m.estoque && (
        <>
          <Grafico titulo="Estoque: insumos críticos (saldo no mínimo ou abaixo)">
            {m.estoque.criticos.length
              ? <ul className="bi-criticos">{m.estoque.criticos.map((i) => <li key={i.id}><b>{i.nome}</b><span className="num">{i.saldo} de mínimo {i.minimo} · {i.unidade}</span></li>)}</ul>
              : <p className="bi-nota">Nenhum insumo crítico.</p>}
          </Grafico>
          <Grafico titulo="Estoque: entradas × saídas por semana (lançamentos)" legenda={[['real', 'Entradas'], ['bi-sai', 'Saídas']]}>
            <EntradasSaidas semanas={m.estoque.semanas} />
          </Grafico>
        </>
      )}
    </Painel>
  )
}

// ── Painel 5: Qualidade & Entrega ───────────────────────────────────────────
// Cores por empresa na rosca: até 6 fatias; da 6ª empresa em diante vira "Outras".
const CORES_EMPRESA = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)']
function RoscaPorEmpresa({ empresas }) {
  const fatias = empresas.length > 6
    ? [...empresas.slice(0, 5), { id: 'outras', nome: 'Outras', total: empresas.slice(5).reduce((s, e) => s + e.total, 0) }]
    : empresas
  const total = fatias.reduce((s, e) => s + e.total, 0)
  const ate = (i) => (fatias.slice(0, i).reduce((s, e) => s + e.total, 0) / total) * 100
  const partes = fatias.map((e, i) => `${CORES_EMPRESA[i]} ${ate(i)}% ${ate(i + 1)}%`)
  return (
    <div className="bi-rosca-empresas">
      <div className="rosca" style={{ background: `conic-gradient(${partes.join(', ')})` }} role="img" aria-label={`${total} pendências em ${fatias.length} empresas`}>
        <div className="rosca-furo"><b>{total}</b><span>{total === 1 ? 'pendência' : 'pendências'}</span></div>
      </div>
      <ul className="bi-legenda coluna">
        {fatias.map((e, i) => (
          <li key={e.id}>
            <i className="bi-cor" style={{ background: CORES_EMPRESA[i] }} />
            <span className="nome">{e.nome}</span>
            <b className="num">{e.total}</b>
            {e.vistoria !== undefined && <span className="detalhe">{e.vistoria} vistoria · {e.nc} NC</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Treemap simplificado: cada local é um bloco que cresce com o nº de pendências.
function MapaPorLocal({ locais }) {
  const maior = Math.max(...locais.map((l) => l.quantidade))
  return (
    <div className="bi-mapa">
      {locais.map((l) => (
        <div key={l.local} className="bi-bloco" style={{ flexGrow: l.quantidade, flexBasis: `${l.quantidade * 90}px`, '--forca': l.quantidade / maior }}>
          <b>{l.local}</b>
          <span className="num">{l.quantidade} {l.quantidade === 1 ? 'pendência' : 'pendências'}</span>
        </div>
      ))}
    </div>
  )
}

function PainelQualidade({ q, filtrandoEmpresa }) {
  return (
    <Painel titulo="Qualidade & Entrega" pergunta="Quem precisa ser cobrado antes de liberar o pagamento?"
      aviso={filtrandoEmpresa ? 'O % conforme da FVS e os desperdícios do Gemba são da obra inteira: não têm empreiteiro.' : null}>
      <Grafico titulo="% conforme por modelo de FVS">
        {q.conforme.length
          ? <BarrasDeitadas maximo={100} itens={q.conforme.map((m) => ({
            nome: m.modelo, valor: m.pct, cor: m.abaixoDaMeta ? 'vermelho' : 'verde', texto: `${m.pct}% · ${m.ok} OK · ${m.nc} NC`,
          }))} />
          : <SemDados icone="qualidade" texto="Faça a primeira vistoria de FVS para liberar este painel." />}
      </Grafico>
      <Grafico titulo="Pendências por empresa (vistoria + NC em aberto)">
        {q.porEmpresa.length
          ? <RoscaPorEmpresa empresas={q.porEmpresa} />
          : <SemDados icone="qualidade" texto="Nenhuma pendência de vistoria nem NC em aberto." />}
      </Grafico>
      <Grafico titulo="Mapa de pendências por local">
        {q.porLocal.length
          ? <MapaPorLocal locais={q.porLocal} />
          : <SemDados icone="qualidade" texto="Nenhum registro de vistoria em aberto." />}
      </Grafico>
      <Grafico titulo="Ranking de desperdícios (Gemba)">
        {q.desperdicios.length
          ? <BarrasDeitadas itens={q.desperdicios.map((d) => ({ nome: d.tipo, valor: d.quantidade, texto: String(d.quantidade) }))} />
          : <SemDados icone="qualidade" texto="Registre a primeira observação de Gemba para liberar este painel." />}
      </Grafico>
    </Painel>
  )
}

// ── filtros (valem para todos os painéis) ───────────────────────────────────
function BarraDeFiltros({ filtros, empreiteiros, aoMudar, podeImprimir }) {
  return (
    <div className="cartao bi-filtros no-print">
      <label className="bi-filtro">
        <span className="rotulo">Empreiteiro</span>
        <select className="filtro" value={filtros.empreiteiroId} onChange={(e) => aoMudar({ ...filtros, empreiteiroId: e.target.value })}>
          <option value="">Todos</option>
          {empreiteiros.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </label>
      <div className="bi-filtro">
        <span className="rotulo">Período</span>
        <div className="ordenar" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p} className={filtros.periodo === p ? 'ativo' : ''} aria-pressed={filtros.periodo === p} onClick={() => aoMudar({ ...filtros, periodo: p })}>{p}</button>
          ))}
        </div>
      </div>
      <button className="botao bi-imprimir" disabled={!podeImprimir} onClick={() => window.print()}>
        <Icon nome="enviar" />Imprimir relatório executivo
      </button>
    </div>
  )
}

// ── a tela ──────────────────────────────────────────────────────────────────
const FILTROS_INICIAIS = { empreiteiroId: '', periodo: 'Tudo' }

export default function Relatorios() {
  const { obra } = useSessao()
  const { carregando, data, erro, recarregar } = useCarregar(dadosDoBi)
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [geradoEm] = useState(() => carimboDeGeracao(hoje()))
  const bi = useMemo(() => (data ? montarBi(data, filtros, hoje()) : null), [data, filtros])
  const comPeriodo = filtros.periodo !== 'Tudo'
  const comEmpreiteiro = Boolean(filtros.empreiteiroId)

  let corpo
  if (carregando && !data) corpo = <Carregando alto />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (bi.vazio) {
    corpo = <EstadoVazio icone="relatorios" titulo="Esta obra ainda não tem registros para o painel"
      texto="Os gráficos saem do Planejamento, do Diário, da Medição, de Materiais e da Qualidade. Lance o primeiro registro em qualquer um deles." />
  } else {
    corpo = (
      <div className="relatorio-bi">
        <header className="rel-cab so-impressao">
          <div className="rel-marca"><Logo /></div>
          <h1>RELATÓRIO EXECUTIVO DA OBRA</h1>
          <div className="rel-obra">{obra.nome} <span className="obra-codigo">{obra.codigo}</span></div>
          <div className="rel-sub">{obra.cliente_nome} · emitido em <span className="data-curta">{formatarData(hoje())}</span></div>
          <p className="rel-filtros">{descreverFiltrosBi(filtros, data.empreiteiros, hoje())}</p>
        </header>
        <ComFiltro.Provider value={comPeriodo || comEmpreiteiro}>
          <div className="grade-bi">
            <PainelExecutivo e={bi.executivo} aviso={comPeriodo ? 'Evolução e prazo são a posição de hoje; o período recorta a Curva S, o PPC e o custo medido.' : null} />
            <PainelRitmo r={bi.ritmo} />
            <PainelQualidade q={bi.qualidade} filtrandoEmpresa={comEmpreiteiro} />
            <PainelContratos c={bi.contratos} aviso={comPeriodo ? 'Contratos e saldos são a posição de hoje: o período não muda.' : null} />
            <PainelMateriais m={bi.materiais} aviso={[
              comPeriodo && 'Pedidos por etapa, atrasados, estoque e a tendência do lead time são a posição de hoje; o lead time médio segue o período.',
              comEmpreiteiro && 'Os insumos críticos do estoque são da obra inteira: não têm empreiteiro.',
            ].filter(Boolean).join(' ') || null} />
          </div>
        </ComFiltro.Provider>
        <footer className="rel-rodape so-impressao">Gerado automaticamente em {geradoEm}.</footer>
      </div>
    )
  }
  return (
    <>
      <Cabecalho abas={<button className="aba ativa">Relatórios</button>} />
      <main className="conteudo conteudo-bi">
        {data && <BarraDeFiltros filtros={filtros} empreiteiros={data.empreiteiros} aoMudar={setFiltros} podeImprimir={Boolean(bi && !bi.vazio)} />}
        {corpo}
      </main>
    </>
  )
}
