import { useState } from 'react'
import { comentarFrente, detalheFrente } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { pode } from '../lib/permissoes.js'
import { formatarData, formatarDiaMes, formatarDinheiro, diaDaSemana } from '../lib/datas.js'
import { linkWhatsApp, textoCobranca } from '../lib/mensagens.js'
import { USAR_MOCK } from '../lib/config.js'
import { Cabecalho, Carregando, Erro, Icon, Meta, Regua, Tag, TituloSecao, corDe, useAviso, useCarregar } from '../components/index.jsx'

export default function Frente({ goto, params }) {
  const { perfil, obra } = useSessao()
  const avisar = useAviso()
  const { carregando, data: f, erro, recarregar } = useCarregar(() => detalheFrente(params.id), [params.id])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const voltar = { rotulo: 'Frentes', ir: () => goto('frentes') }
  if (carregando && !f) return <><Cabecalho voltar={voltar} titulo="Carregando…" /><main className="conteudo"><Carregando alto /></main></>
  if (erro) return <><Cabecalho voltar={voltar} titulo="Frente" /><main className="conteudo"><Erro mensagem={erro} aoTentar={recarregar} /></main></>

  const c = f.calculo
  const feitos = f.ambientes.filter((a) => a.concluido_em).length

  function cobrar() {
    const msg = textoCobranca({ empreiteiro: f.empreiteiro.nome, servico: f.servico, obra: obra.nome, diasSemAndar: c.diasSemAndar, dataLimite: c.folgaRestante >= 0 ? c.dataLimite : null })
    if (USAR_MOCK) avisar(`No app de verdade abre o WhatsApp com: "${msg}"`)
    else window.open(linkWhatsApp(f.empreiteiro.whatsapp, msg), '_blank', 'noopener')
  }
  async function enviar() {
    setEnviando(true)
    const { erro: e } = await comentarFrente(f.id, texto)
    setEnviando(false)
    if (e) return avisar(e, 'erro')
    setTexto('')
    avisar('Comentário registrado.')
    recarregar()
  }

  return (
    <>
      <Cabecalho voltar={voltar} titulo={f.servico}
        sub={<>{f.empreiteiro && <span>{f.empreiteiro.nome}</span>}<Tag>{c.risco}</Tag>{f.situacao !== 'Em andamento' && <Tag>{f.situacao}</Tag>}</>} />
      <main className="conteudo">
        <div className="kpis">
          <div className={`cartao kpi ${corDe(c.risco)}`}>
            <div className="rotulo">Folga que sobra</div><div className="valor num">{c.folgaRestante}</div>
            <div className="nota">{c.folgaRestante < 0 ? 'empurrando a entrega' : `decidir até ${formatarDiaMes(c.dataLimite)}`}</div>
          </div>
          <div className="cartao kpi">
            <div className="rotulo">Dias parado</div><div className="valor num">{c.diasSemAndar}</div>
            <div className="nota">{f.situacao === 'Não iniciada' ? 'não começou' : c.ultimoMotivo || 'andando'}</div>
          </div>
          <div className="cartao kpi">
            <div className="rotulo">Ambientes</div><div className="valor num">{feitos}/{f.ambientes.length}</div><div className="nota">concluídos</div>
          </div>
        </div>

        <div className="acoes">
          {pode(perfil.role, 'cobrar') && f.empreiteiro && <button className="botao" onClick={cobrar}><Icon nome="whats" />Cobrar {f.empreiteiro.nome}</button>}
          {pode(perfil.role, 'abrirPendencia') && (
            <button className="botao contorno" onClick={() => goto('pendencias', { novaPara: f.id })}><Icon nome="pendencias" />Abrir pendência</button>
          )}
        </div>

        <div className="grade-det">
          <div className="col">
            <div className="cartao">
              <div className="lista-cab"><TituloSecao>Cronograma e folga</TituloSecao></div>
              <Regua grande folgaDias={f.folga_dias} diasPerdidos={c.diasPerdidos} risco={c.risco}
                legenda={c.folgaRestante < 0 ? `estourou ${-c.folgaRestante} ${c.folgaRestante === -1 ? 'dia' : 'dias'}` : `sobram ${c.folgaRestante} de ${f.folga_dias}`} />
              <dl className="pares num">
                <dt>Início previsto</dt><dd>{formatarData(f.inicio_previsto)}</dd>
                <dt>Término previsto</dt><dd>{formatarData(f.termino_previsto)}</dd>
                <dt>Folga original</dt><dd>{f.folga_dias} dias</dd>
                <dt>Dias perdidos</dt><dd>{c.diasPerdidos} dias</dd>
              </dl>
              {f.valor_contratado !== null && (
                <div className="dinheiro">
                  <div className="rotulo">Valor contratado</div>
                  <div className="v num">{formatarDinheiro(f.valor_contratado)}</div>
                  <div className="so">Só o engenheiro vê</div>
                </div>
              )}
            </div>
            <div className="cartao">
              <div className="lista-cab"><TituloSecao conta={`${feitos}/${f.ambientes.length}`}>Ambientes</TituloSecao></div>
              {f.ambientes.map((a) => (
                <div key={a.id} className={`linha-lista ${a.concluido_em ? 'feito' : ''}`} style={{ minHeight: 52 }}>
                  <div className="amb"><span className="ok-ico">{a.concluido_em && <Icon nome="check" />}</span><span className="titulo">{a.nome}</span></div>
                  <div className="lado"><Tag cor={a.concluido_em ? 'verde' : 'neutra'}>{a.concluido_em ? formatarDiaMes(a.concluido_em) : 'Em aberto'}</Tag></div>
                </div>
              ))}
            </div>
          </div>

          <div className="cartao">
            <div className="lista-cab"><TituloSecao>Linha do tempo</TituloSecao></div>
            {!f.tempo.length && <div className="linha-lista"><div className="titulo">Nenhum lançamento ainda para esta frente.</div></div>}
            {f.tempo.map((t) => (
              <div key={t.id} className="linha-lista" style={{ alignItems: 'start' }}>
                <div>
                  <div className="titulo"><span className="data-curta">{formatarDiaMes(t.data)}</span><span className="dia-semana">{diaDaSemana(t.data)}</span></div>
                  <Meta itens={[t.autor, t.tipo === 'Não andou' ? t.motivo : null]} />
                  {t.texto && <div className="obs">{t.texto}</div>}
                  {t.detalhe && <div className="obs">{t.detalhe}</div>}
                  {t.fotos > 0 && <div className="fotos-mini">{Array.from({ length: t.fotos }, (_, i) => <div key={i} className="foto-mini"><Icon nome="fotos" /></div>)}</div>}
                </div>
                <div className="lado"><Tag>{t.tipo}</Tag></div>
              </div>
            ))}
            {pode(perfil.role, 'comentar') && (
              <div className="comentar">
                <label className="so-leitor" htmlFor="comentario">Comentário</label>
                <input id="comentario" type="text" placeholder="Registrar decisão ou comentário…" value={texto} onChange={(e) => setTexto(e.target.value)} />
                <button className="botao" disabled={enviando || !texto.trim()} onClick={enviar}>{enviando ? 'Enviando…' : 'Enviar'}</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
