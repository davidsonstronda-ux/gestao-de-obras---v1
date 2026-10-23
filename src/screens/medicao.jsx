// Medição (só engenheiro): por empreiteiro da obra, quanto foi contratado,
// medido, o que está a medir e o saldo; abaixo, o histórico de medições.
// Tocar num empreiteiro ou numa medição abre a ficha (nova, rascunho ou fechada).
// Quem faz as contas e decide o que pode é lib/medicao.js; aqui só se mostra.
import { useState } from 'react'
import { apagarRascunhoMedicao, fichaMedicao, listarMedicao, salvarMedicao } from '../lib/dados.js'
import { hoje } from '../lib/config.js'
import { formatarData, formatarDiaMes, formatarDinheiro } from '../lib/datas.js'
import {
  campoPeloPercentual, campoPeloValor, linhaDaFicha, medicaoCsv, nomeArquivoMedicao, percentualMedido, resumoDaFicha, textoDinheiro, textoPercentual,
  validarMedicao,
} from '../lib/medicao.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Folha, Icon, Meta, Tag, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'

const NADA_A_MEDIR = 'Nada a medir. O mestre ainda não concluiu nenhum serviço desde a última medição.'
const soNumero = (t) => t.replace(/[^\d.,]/g, '')

function BarraMedido({ pct }) {
  return (
    <div className="barra" role="img" aria-label={`${pct}% medido`} style={{ marginTop: 8 }}>
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}

function baixarCsv(texto, nome) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── ficha da medição ────────────────────────────────────────────────────────
// O valor em R$ é o que vale; o % é calculado dele (ou o R$ do %, se a pessoa
// digitar o %). Linha que a pessoa não mexeu acompanha o sugerido do período.
function FormMedicao({ ficha, aoMudar }) {
  const avisar = useAviso()
  const { editavel, frentes, ultimaFechada } = ficha
  const [periodo, setPeriodo] = useState(ficha.periodo)
  // Só as frentes que já têm valor gravado nascem "mexidas"; as outras seguem o sugerido.
  const [campos, setCampos] = useState(() => Object.fromEntries(frentes.filter((f) => f.item).map((f) => [f.frente_id, {
    ...campoPeloValor(textoDinheiro(f.item.valor), f.contratado), justificativa: f.item.justificativa || '',
  }])))
  const [tocouJust, setTocouJust] = useState({})
  const [tentou, setTentou] = useState(false)
  const [confirmando, setConfirmando] = useState(null) // 'fechar' | 'apagar'
  const [ocupado, setOcupado] = useState(false)

  const linhas = frentes.map((f) => linhaDaFicha({ frente: f, campo: campos[f.frente_id], periodo, editavel }))
  const problemas = editavel ? validarMedicao({ periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, linhas }, { hoje: hoje(), ultimaFechada }) : {}
  const temProblema = Object.keys(problemas).length > 0
  const resumo = resumoDaFicha(linhas)

  const mudar = (l, dados) => setCampos((x) => ({ ...x, [l.frente_id]: { reais: l.reais, pct: l.pct, justificativa: l.justificativa, ...x[l.frente_id], ...dados } }))

  async function salvar(fechar) {
    setTentou(true)
    setConfirmando(null)
    if (temProblema) return avisar('Confira os campos marcados em vermelho.', 'erro')
    setOcupado(true)
    const { erro } = await salvarMedicao({
      id: ficha.medicao?.id, empreiteiro_id: ficha.empreiteiro.id, periodo_inicio: periodo.inicio, periodo_fim: periodo.fim,
      itens: linhas.map((l) => ({ frente_id: l.frente_id, valor: l.valor, justificativa: l.justificativa })),
    }, { fechar })
    setOcupado(false)
    if (erro) return avisar(erro, 'erro')
    avisar(fechar ? `Medição nº ${ficha.numero} fechada.` : 'Rascunho salvo.')
    aoMudar()
  }

  async function apagar() {
    setOcupado(true)
    const { erro } = await apagarRascunhoMedicao(ficha.medicao.id)
    setOcupado(false)
    if (erro) return avisar(erro, 'erro')
    avisar(`Rascunho da medição nº ${ficha.numero} apagado.`)
    aoMudar()
  }

  function exportar() {
    baixarCsv(medicaoCsv({
      obra: ficha.obra.nome, empreiteiro: ficha.empreiteiro.nome, numero: ficha.numero, situacao: ficha.situacao,
      periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, linhas: linhas.map((l) => ({ ...l, valor: l.valor || 0 })),
    }), nomeArquivoMedicao({ codigoObra: ficha.obra.codigo, empreiteiro: ficha.empreiteiro.nome, numero: ficha.numero }))
    avisar('Arquivo baixado. Ele abre direto no Excel.')
  }

  return (
    <div className="form">
      <Meta itens={[<Tag key="s">{ficha.situacao}</Tag>, ficha.medicao?.fechada_em && `fechada em ${formatarData(ficha.medicao.fechada_em.slice(0, 10))}`,
        ultimaFechada && editavel && `última fechada até ${formatarData(ultimaFechada)}`]} />

      {editavel ? (
        <div>
          <div className="duas">
            <label className="campo"><span>De <em>*</em></span>
              <input type="date" value={periodo.inicio} max={hoje()} onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))} />
            </label>
            <label className="campo"><span>Até <em>*</em></span>
              <input type="date" value={periodo.fim} max={hoje()} onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))} />
            </label>
          </div>
          {problemas.periodo && <div className="erro-campo" role="alert" style={{ marginTop: 6 }}>{problemas.periodo}</div>}
        </div>
      ) : (
        <div className="rotulo">Período: {formatarData(periodo.inicio)} a {formatarData(periodo.fim)}</div>
      )}

      {editavel && resumo.nadaSugerido && <div className="aviso-campo">{NADA_A_MEDIR}</div>}

      {linhas.map((l) => {
        const erroValor = problemas[`valor:${l.frente_id}`]
        const erroJust = (tentou || tocouJust[l.frente_id]) && problemas[`justificativa:${l.frente_id}`]
        return (
          <div key={l.frente_id} className="cartao" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{l.servico}</div>
              <Meta itens={[<span key="c" className="num">contratado {formatarDinheiro(l.contratado)}</span>,
                <span key="j" className="num">medido antes {formatarDinheiro(l.jaMedido)} ({percentualMedido(l.jaMedido, l.contratado)}%)</span>]} />
              <Meta itens={[l.noPeriodo.length
                ? `concluído no período: ${l.noPeriodo.map((a) => `${a.nome} ${formatarDiaMes(a.concluido_em)}`).join(', ')}`
                : 'nenhum ambiente concluído no período',
              <span key="s" className="num">sugerido {formatarDinheiro(l.valor_sugerido)}</span>]} />
            </div>
            {editavel ? (
              <>
                <div className="duas">
                  <label className="campo"><span>Valor (R$)</span>
                    <input type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" value={l.reais} onChange={(e) => mudar(l, campoPeloValor(soNumero(e.target.value), l.contratado))} />
                  </label>
                  <label className="campo"><span>% do contratado</span>
                    <input type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={l.pct} onChange={(e) => mudar(l, campoPeloPercentual(soNumero(e.target.value), l.contratado))} />
                  </label>
                </div>
                {erroValor && <div className="erro-campo" role="alert">{erroValor}</div>}
                {l.difere && (
                  <label className="campo"><span>Justificativa <em>*</em></span>
                    <textarea value={l.justificativa} placeholder="Por que o valor é diferente do sugerido?"
                      onChange={(e) => mudar(l, { justificativa: e.target.value })}
                      onBlur={() => setTocouJust((t) => ({ ...t, [l.frente_id]: true }))} />
                    {erroJust && <div className="erro-campo" role="alert">{erroJust}</div>}
                  </label>
                )}
              </>
            ) : (
              <div>
                <b className="num" style={{ fontSize: 20 }}>{formatarDinheiro(l.valor)}</b>
                <span className="meta" style={{ display: 'inline-flex', marginLeft: 10 }}>{l.pct}% do contratado</span>
                {l.justificativa && <div className="meta">Justificativa: {l.justificativa}</div>}
              </div>
            )}
          </div>
        )
      })}

      <dl className="pares num cartao" style={{ margin: 0 }}>
        <dt>Total desta medição</dt><dd>{formatarDinheiro(resumo.total)}</dd>
        <dt>{editavel ? 'Acumulado com esta' : 'Acumulado até esta'}</dt><dd>{formatarDinheiro(resumo.acumulado)} ({textoPercentual(resumo.pctAcumulado)}%)</dd>
        <dt>Saldo depois</dt><dd>{formatarDinheiro(resumo.saldoDepois)}</dd>
      </dl>
      {tentou && problemas.total && <div className="erro-campo" role="alert">{problemas.total}</div>}

      {confirmando ? (
        <div className="cartao confirmar" role="alert">
          <p>{confirmando === 'fechar'
            ? 'Depois de fechada, a medição não muda mais. Fechar?'
            : `Apagar o rascunho da medição nº ${ficha.numero}? Os valores lançados nele somem.`}</p>
          <div className="acoes">
            {confirmando === 'fechar'
              ? <button className="botao" disabled={ocupado} onClick={() => salvar(true)}><Icon nome="check" />Fechar medição</button>
              : <button className="botao perigo" disabled={ocupado} onClick={apagar}>Apagar rascunho</button>}
            <button className="botao contorno" onClick={() => setConfirmando(null)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="acoes">
          {editavel && <button className="botao" disabled={ocupado} onClick={() => salvar(false)}><Icon nome="check" />Salvar rascunho</button>}
          {editavel && <button className="botao contorno" disabled={ocupado}
            onClick={() => { setTentou(true); if (temProblema) avisar('Confira os campos marcados em vermelho.', 'erro'); else setConfirmando('fechar') }}>Fechar medição</button>}
          <button className="botao contorno" disabled={ocupado || (editavel && temProblema)} onClick={exportar}><Icon nome="importar" />Exportar para Excel</button>
          {editavel && ficha.medicao && <button className="botao contorno" disabled={ocupado} onClick={() => setConfirmando('apagar')}>Apagar rascunho</button>}
        </div>
      )}
    </div>
  )
}

function FichaMedicao({ abrir, aoFechar, aoMudar }) {
  const { carregando, data, erro, recarregar } = useCarregar(() => fichaMedicao(abrir), [abrir.medicaoId, abrir.empreiteiroId])
  let corpo
  if (carregando && !data) corpo = <Carregando />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (!data.frentes.length) corpo = <EstadoVazio icone="medicao" titulo="Este empreiteiro não tem frente nesta obra" />
  // A chave remonta o formulário se a ficha trocar de medição: o estado dele nasce da ficha.
  else corpo = <FormMedicao key={data.medicao?.id || `nova-${data.empreiteiro.id}`} ficha={data} aoMudar={aoMudar} />
  const titulo = data ? `Medição nº ${data.numero} · ${data.empreiteiro.nome}` : 'Medição'
  return <Folha titulo={titulo} aoFechar={aoFechar}>{corpo}</Folha>
}

// ── lista ───────────────────────────────────────────────────────────────────
function Totais({ t }) {
  return (
    <div className="cartao">
      <div className="lista-cab"><TituloSecao>Obra inteira</TituloSecao><span className="direita num">{t.pct}% medido</span></div>
      <div style={{ padding: '0 14px' }}><BarraMedido pct={t.pct} /></div>
      <dl className="pares num">
        <dt>Contratado</dt><dd>{formatarDinheiro(t.contratado)}</dd>
        <dt>Medido até hoje</dt><dd>{formatarDinheiro(t.medido)}</dd>
        <dt>A medir</dt><dd>{formatarDinheiro(t.aMedir)}</dd>
        <dt>Saldo</dt><dd>{formatarDinheiro(t.saldo)}</dd>
      </dl>
      {t.aMedir === 0 && <div className="dinheiro"><div className="so">{NADA_A_MEDIR}</div></div>}
    </div>
  )
}

const rotuloAcao = (e) => (e.rascunho ? `Continuar rascunho nº ${e.rascunho}` : 'Nova medição')

function Empreiteiros({ lista, aoAbrir }) {
  return (
    <div className="cartao">
      <div className="lista-cab"><TituloSecao conta={lista.length}>Por empreiteiro</TituloSecao><span className="direita meta" style={{ marginTop: 0 }}>toque para medir</span></div>
      {/* A rolagem fica dentro do cartão: com o menu lateral aberto, quatro colunas de R$ passam da largura. */}
      <div className="so-computador" style={{ overflowX: 'auto' }}>
        <table className="tabela">
          <thead>
            <tr><th>Empreiteiro</th><th className="n">Contratado</th><th className="n">Medido</th><th className="n">A medir</th><th className="n">Saldo</th></tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e.id}>
                <td>
                  <button className="link-linha" onClick={() => aoAbrir({ empreiteiroId: e.id })}>{e.nome}</button>
                  <div className="meta" style={{ marginTop: 0 }}><span>{e.frentes} {e.frentes === 1 ? 'frente' : 'frentes'}</span><span>{rotuloAcao(e)}</span></div>
                  <BarraMedido pct={e.pct} />
                </td>
                <td className="n num">{formatarDinheiro(e.contratado)}</td>
                <td className="n num">{formatarDinheiro(e.medido)}<div className="meta" style={{ justifyContent: 'flex-end' }}>{e.pct}%</div></td>
                <td className="n num">{e.aMedir > 0 ? <Tag cor="ambar">{formatarDinheiro(e.aMedir)}</Tag> : formatarDinheiro(0)}</td>
                <td className="n num">{formatarDinheiro(e.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="so-celular">
        {lista.map((e) => (
          <button key={e.id} className="linha-lista" onClick={() => aoAbrir({ empreiteiroId: e.id })}>
            <div>
              <div className="titulo">{e.nome}</div>
              <Meta itens={[`${e.frentes} ${e.frentes === 1 ? 'frente' : 'frentes'}`, <span key="c" className="num">contratado {formatarDinheiro(e.contratado)}</span>]} />
              <BarraMedido pct={e.pct} />
              <Meta itens={[<span key="m" className="num">medido {formatarDinheiro(e.medido)} ({e.pct}%)</span>, <span key="s" className="num">saldo {formatarDinheiro(e.saldo)}</span>]} />
              <div className="acoes" style={{ marginTop: 8 }}>
                {e.aMedir > 0 && <Tag cor="ambar">a medir {formatarDinheiro(e.aMedir)}</Tag>}
                <Tag cor={e.rascunho ? 'ambar' : 'neutra'}>{rotuloAcao(e)}</Tag>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Historico({ lista, aoAbrir }) {
  return (
    <div className="cartao">
      <div className="lista-cab"><TituloSecao conta={lista.length}>Histórico de medições</TituloSecao></div>
      {!lista.length ? (
        <div className="linha-lista"><div className="titulo">Nenhuma medição lançada nesta obra ainda.</div></div>
      ) : lista.map((m) => (
        <button key={m.id} className="linha-lista" onClick={() => aoAbrir({ medicaoId: m.id })}>
          <div>
            <div className="titulo">Medição nº {m.numero} · {m.empreiteiro}</div>
            <Meta itens={[<span key="p" className="data-curta">{formatarData(m.periodo_inicio)} a {formatarData(m.periodo_fim)}</span>, m.fechada_em && `fechada em ${formatarData(m.fechada_em.slice(0, 10))}`]} />
          </div>
          <div className="lado"><b className="num">{formatarDinheiro(m.total)}</b><Tag>{m.situacao}</Tag></div>
        </button>
      ))}
    </div>
  )
}

export default function Medicao({ goto }) {
  const { carregando, data, erro, recarregar } = useCarregar(listarMedicao)
  const [aberta, setAberta] = useState(null) // { empreiteiroId } | { medicaoId }
  let corpo
  if (carregando && !data) corpo = <Carregando alto />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (!data.empreiteiros.length) {
    corpo = <EstadoVazio icone="medicao" titulo="Nenhum serviço contratado nesta obra"
      texto="A medição começa pelas frentes, cada uma com o seu empreiteiro e o valor contratado." acao="Cadastrar a primeira frente" aoAgir={() => goto('cronograma')} />
  } else {
    corpo = (
      <>
        <Totais t={data.totais} />
        <Empreiteiros lista={data.empreiteiros} aoAbrir={setAberta} />
        <Historico lista={data.historico} aoAbrir={setAberta} />
      </>
    )
  }
  return (
    <>
      <Cabecalho abas={<button className="aba ativa">Medição</button>} />
      <main className="conteudo">{corpo}</main>
      {aberta && <FichaMedicao abrir={aberta} aoFechar={() => setAberta(null)} aoMudar={() => { setAberta(null); recarregar() }} />}
    </>
  )
}
