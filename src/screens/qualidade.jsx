// Qualidade: a aba Vistoria (registros de problema até a correção com foto), as
// abas FVS e Gemba Walk (screens/fvs.jsx e screens/gemba.jsx) e o relatório
// (screens/relatorio.jsx). Os filtros das três abas moram aqui, para o relatório
// usar os mesmos. As regras (filtros, contagens, passo de situação, observações)
// moram em lib/qualidade.js; a obra e a permissão, em lib/dados.js.
import { useState } from 'react'
import { anotarRegistroVistoria, criarRegistroVistoria, excluirRegistroVistoria, listarVistoria, moverRegistroVistoria } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { pode } from '../lib/permissoes.js'
import { hoje } from '../lib/config.js'
import { formatarData, formatarDiaMes } from '../lib/datas.js'
import {
  FILTROS_PRAZO, FILTROS_VISTORIA_VAZIOS, STATUS_REGISTRO, contarStatus, estaVencido, filtrarRegistros, notasDoHistorico, ordenarRegistros,
  mudancaDeSituacao, pendentesPorResponsavel, proximoStatusRegistro, validarRegistro,
} from '../lib/qualidade.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Folha, Icon, Meta, Tag, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'
import { FILTROS_NC } from '../lib/fvs.js'
import { FILTROS_GEMBA_VAZIOS } from '../lib/gemba.js'
import { COR_STATUS, FotoRegistro, TirarFoto } from './qualidadeComum.jsx'
import Fvs from './fvs.jsx'
import Gemba from './gemba.jsx'
import Relatorio from './relatorio.jsx'

const BOTAO_PARA = { 'Em andamento': 'Colocar em andamento', Resolvido: 'Resolver' }

function NovoRegistro({ empreiteiros, pessoas, aoFechar, aoCriar }) {
  const [campos, setCampos] = useState({ foto: '', descricao: '', local: '', pavimento: '', empreiteiro_id: '', responsavel_id: '', prazo: hoje(), observacao: '' })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const problemas = validarRegistro(campos, hoje())
  const mostrar = (c) => (tentou || tocados[c]) && problemas[c] && <div className="erro-campo" role="alert">{problemas[c]}</div>
  const mudar = (c, v) => setCampos((x) => ({ ...x, [c]: v }))
  const tocar = (c) => () => setTocados((t) => ({ ...t, [c]: true }))

  function salvar() {
    setTentou(true)
    if (Object.keys(problemas).length) return
    aoCriar(campos)
  }

  return (
    <Folha titulo="Novo registro de vistoria" aoFechar={aoFechar}>
      <div className="form">
        <div className="campo"><span>Foto do problema</span>
          {campos.foto && <img className="nf-previa" src={campos.foto} alt="Prévia da foto do problema" />}
          <TirarFoto rotulo="Fotografar o problema" valor={campos.foto} aoMudar={(v) => mudar('foto', v)} />
        </div>
        <label className="campo"><span>Descrição <em>*</em></span>
          <textarea value={campos.descricao} onChange={(e) => mudar('descricao', e.target.value)} onBlur={tocar('descricao')} placeholder="Ex.: rejunte falhando no box" />
          {mostrar('descricao')}
        </label>
        <div className="duas-col">
          <label className="campo"><span>Local <em>*</em></span>
            <input type="text" value={campos.local} onChange={(e) => mudar('local', e.target.value)} onBlur={tocar('local')} placeholder="Ex.: Banho social" />
            {mostrar('local')}
          </label>
          <label className="campo"><span>Pavimento</span>
            <input type="text" value={campos.pavimento} onChange={(e) => mudar('pavimento', e.target.value)} placeholder="Ex.: Térreo" />
          </label>
        </div>
        <label className="campo"><span>Empresa que corrige <em>*</em></span>
          <select value={campos.empreiteiro_id} onChange={(e) => { mudar('empreiteiro_id', e.target.value); tocar('empreiteiro_id')() }} onBlur={tocar('empreiteiro_id')}>
            <option value="">Escolha a empresa…</option>
            {empreiteiros.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          {mostrar('empreiteiro_id')}
        </label>
        <div className="duas-col">
          <label className="campo"><span>Quem acompanha <em>*</em></span>
            <select value={campos.responsavel_id} onChange={(e) => { mudar('responsavel_id', e.target.value); tocar('responsavel_id')() }} onBlur={tocar('responsavel_id')}>
              <option value="">Escolha…</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {mostrar('responsavel_id')}
          </label>
          <label className="campo"><span>Prazo <em>*</em></span>
            <input type="date" value={campos.prazo} min={hoje()} onChange={(e) => { mudar('prazo', e.target.value); tocar('prazo')() }} />
            {mostrar('prazo')}
          </label>
        </div>
        <label className="campo"><span>Observação</span>
          <textarea value={campos.observacao} onChange={(e) => mudar('observacao', e.target.value)} placeholder="Opcional. Entra no histórico com data e hora." />
        </label>
        <button className="botao largo" onClick={salvar}><Icon nome="check" />Registrar</button>
      </div>
    </Folha>
  )
}

function DetalheRegistro({ r, podeRegistrar, podeExcluir, aoFechar, aoMover, aoAnotar, aoExcluir }) {
  const [nota, setNota] = useState('')
  const [resolvendo, setResolvendo] = useState(false)
  const [evidencia, setEvidencia] = useState('')
  const [tentouResolver, setTentouResolver] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const proximo = proximoStatusRegistro(r.status)
  const vencido = estaVencido(r, hoje())
  const notas = notasDoHistorico(r.observacoes)

  function anotar() {
    if (!nota.trim()) return
    aoAnotar(r, nota)
    setNota('')
  }
  function resolver() {
    setTentouResolver(true)
    if (evidencia) aoMover(r, 'Resolvido', { foto_evidencia: evidencia })
  }

  return (
    <Folha titulo={`#${r.numero} · ${r.local}`} aoFechar={aoFechar}>
      <div className="form">
        <div className="fotos-registro">
          <figure><FotoRegistro src={r.foto} alt="Foto do problema" /><figcaption className="rotulo">Problema</figcaption></figure>
          {r.status === 'Resolvido' && <figure><FotoRegistro src={r.foto_evidencia} alt="Foto da correção" /><figcaption className="rotulo">Correção</figcaption></figure>}
        </div>
        <div className="acoes">
          <Tag cor={COR_STATUS[r.status]}>{r.status}</Tag>
          {vencido && <Tag cor="vermelho">Vencido</Tag>}
          {r.provisorio && <Tag cor="neutra">Salvando…</Tag>}
        </div>
        <p className="descricao-registro">{r.descricao}</p>
        <dl className="pares pares-registro">
          <dt>Local</dt><dd>{r.local}{r.pavimento ? ` · ${r.pavimento}` : ''}</dd>
          <dt>Empresa que corrige</dt><dd>{r.empresa}</dd>
          <dt>Quem acompanha</dt><dd>{r.responsavel}</dd>
          <dt>Prazo</dt><dd className={vencido ? 'vermelho' : ''}>{formatarData(r.prazo)}</dd>
          <dt>Vistoria</dt><dd>{formatarData(r.data_vistoria)} · {r.vistoriador}</dd>
          {r.resolvido_em && <><dt>Resolvido em</dt><dd>{formatarData(r.resolvido_em)}</dd></>}
        </dl>

        {podeRegistrar && proximo && !r.provisorio && !resolvendo && (
          <button className="botao largo" onClick={() => (proximo === 'Resolvido' ? setResolvendo(true) : aoMover(r, proximo))}>
            <Icon nome={proximo === 'Resolvido' ? 'check' : 'seta'} />{BOTAO_PARA[proximo]}
          </button>
        )}
        {resolvendo && (
          <div className="cartao caixa-resolver">
            <div className="rotulo">Foto da correção <em className="obrigatorio">*</em></div>
            {evidencia && <img className="nf-previa" src={evidencia} alt="Prévia da foto da correção" />}
            <TirarFoto rotulo="Fotografar a correção" valor={evidencia} aoMudar={setEvidencia} />
            {tentouResolver && !evidencia && <div className="erro-campo" role="alert">Tire a foto da correção para resolver.</div>}
            <div className="acoes">
              <button className="botao contorno" onClick={() => { setResolvendo(false); setEvidencia(''); setTentouResolver(false) }}>Cancelar</button>
              <button className="botao" onClick={resolver}><Icon nome="check" />Confirmar resolução</button>
            </div>
          </div>
        )}

        <div className="campo"><span>Observações</span>
          {podeRegistrar && !r.provisorio && (
            <div className="comentar sem-borda">
              <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && anotar()} placeholder="Adicionar observação…" aria-label="Nova observação" />
              <button className="botao" disabled={!nota.trim()} onClick={anotar}>Adicionar</button>
            </div>
          )}
          {notas.length
            ? <ul className="historico">{notas.map((n, i) => <li key={i}><span className="data-curta">{n.carimbo}</span>{n.texto}</li>)}</ul>
            : <div className="rotulo">Nenhuma observação ainda.</div>}
        </div>

        {podeExcluir && !r.provisorio && (
          confirmandoExclusao ? (
            <div className="cartao caixa-resolver perigo">
              <div>Excluir o registro #{r.numero} de vez? Não dá para desfazer.</div>
              <div className="acoes">
                <button className="botao contorno" onClick={() => setConfirmandoExclusao(false)}>Cancelar</button>
                <button className="botao perigo" onClick={() => aoExcluir(r)}>Excluir</button>
              </div>
            </div>
          ) : <button className="link" onClick={() => setConfirmandoExclusao(true)}>Excluir registro</button>
        )}
      </div>
    </Folha>
  )
}

function CartaoRegistro({ r, aoAbrir }) {
  const vencido = estaVencido(r, hoje())
  return (
    <button className={`cartao registro ${r.status === 'Resolvido' ? 'resolvido' : ''}`} onClick={aoAbrir}
      aria-label={`Registro #${r.numero}, ${r.status}${vencido ? ', vencido' : ''}: ${r.descricao}`}>
      <div className="registro-topo">
        <span className="registro-num">#{r.numero}</span>
        <Tag cor={COR_STATUS[r.status]}>{r.status}</Tag>
      </div>
      <div className="registro-foto">
        <FotoRegistro src={r.foto} alt={`Foto do registro #${r.numero}`} />
        {vencido && <span className="selo-vencido">Vencido</span>}
      </div>
      <div className="registro-corpo">
        <div className="registro-desc">{r.descricao}</div>
        <Meta itens={[r.local, r.empresa]} />
        <Meta itens={[r.responsavel, <>prazo <span className={`data-curta ${vencido ? 'texto-vermelho' : ''}`}>{formatarDiaMes(r.prazo)}</span></>]} />
      </div>
    </button>
  )
}

function Vistoria({ filtros, setFiltros }) {
  const { perfil } = useSessao()
  const avisar = useAviso()
  const { carregando, data, erro, recarregar } = useCarregar(listarVistoria)
  const [novo, setNovo] = useState(false)
  const [abertoId, setAbertoId] = useState(null)
  // Mudanças otimistas: valem só sobre a leitura em que foram feitas (base).
  // Quando a lista recarrega, a base muda e elas somem sozinhas.
  const [otimista, setOtimista] = useState({ base: null, trocas: {}, novos: [], removidos: [] })
  const podeRegistrar = pode(perfil.role, 'registrarQualidade')
  const podeExcluir = pode(perfil.role, 'apagar')

  const vazio = { trocas: {}, novos: [], removidos: [] }
  const valendo = otimista.base === data ? otimista : vazio
  const anotar = (f) => setOtimista((o) => ({ ...f(o.base === data ? o : { ...vazio, base: data }), base: data }))
  const desfazer = (id) => anotar((o) => {
    const trocas = { ...o.trocas }
    delete trocas[id]
    return { ...o, trocas, novos: o.novos.filter((x) => x.id !== id), removidos: o.removidos.filter((x) => x !== id) }
  })

  async function criar(campos) {
    setNovo(false)
    const nomeDe = (lista, id) => lista.find((x) => x.id === id)?.nome || '—'
    const temp = {
      ...campos, id: `tmp-${Date.now()}`, numero: '…', status: 'Pendente', data_vistoria: hoje(), vistoriador: perfil.nome,
      empresa: nomeDe(data.empreiteiros, campos.empreiteiro_id), responsavel: nomeDe(data.pessoas, campos.responsavel_id),
      foto_evidencia: '', observacoes: '', provisorio: true,
    }
    anotar((o) => ({ ...o, novos: [...o.novos, temp] }))
    const { data: criado, erro: e } = await criarRegistroVistoria(campos)
    if (e) { desfazer(temp.id); return avisar(e, 'erro') }
    avisar(`Registro #${criado.numero} criado.`)
    recarregar()
  }

  async function mover(r, alvo, extra) {
    setAbertoId(null)
    anotar((o) => ({ ...o, trocas: { ...o.trocas, [r.id]: { ...r, ...mudancaDeSituacao(alvo, extra, hoje()) } } }))
    const { erro: e } = await moverRegistroVistoria(r.id, alvo, extra)
    if (e) { desfazer(r.id); return avisar(e, 'erro') }
    avisar(alvo === 'Resolvido' ? `#${r.numero} resolvido.` : `#${r.numero} em andamento.`)
    recarregar()
  }

  async function anotarNota(r, texto) {
    const { data: atualizado, erro: e } = await anotarRegistroVistoria(r.id, texto)
    if (e) return avisar(e, 'erro')
    anotar((o) => ({ ...o, trocas: { ...o.trocas, [r.id]: atualizado } }))
    avisar('Observação adicionada.')
  }

  async function excluir(r) {
    setAbertoId(null)
    anotar((o) => ({ ...o, removidos: [...o.removidos, r.id] }))
    const { erro: e } = await excluirRegistroVistoria(r.id)
    if (e) { desfazer(r.id); return avisar(e, 'erro') }
    avisar(`Registro #${r.numero} excluído.`)
    recarregar()
  }

  if (carregando && !data) return <Carregando alto />
  if (erro) return <Erro mensagem={erro} aoTentar={recarregar} />

  const registros = ordenarRegistros(
    [...data.registros, ...valendo.novos].filter((r) => !valendo.removidos.includes(r.id)).map((r) => valendo.trocas[r.id] || r),
    hoje(),
  )
  const aberto = registros.find((r) => r.id === abertoId)
  const folhas = (
    <>
      {novo && <NovoRegistro empreiteiros={data.empreiteiros} pessoas={data.pessoas} aoFechar={() => setNovo(false)} aoCriar={criar} />}
      {aberto && (
        <DetalheRegistro key={aberto.id} r={aberto} podeRegistrar={podeRegistrar} podeExcluir={podeExcluir}
          aoFechar={() => setAbertoId(null)} aoMover={mover} aoAnotar={anotarNota} aoExcluir={excluir} />
      )}
    </>
  )

  if (!registros.length) {
    return (
      <>
        <EstadoVazio icone="qualidade" titulo="Nenhum registro de vistoria nesta obra"
          texto="Cada problema achado na obra vira um cartão com foto, empresa que corrige e prazo, até a foto da correção."
          acao={podeRegistrar ? 'Fotografar o primeiro problema' : null} aoAgir={() => setNovo(true)} />
        {folhas}
      </>
    )
  }

  const conta = contarStatus(registros)
  const porResponsavel = pendentesPorResponsavel(registros)
  const visiveis = filtrarRegistros(registros, filtros, hoje())
  const mudar = (c, v) => setFiltros((f) => ({ ...f, [c]: v }))
  const comFiltro = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VISTORIA_VAZIOS)
  const kpi = (status, rotulo, cor, nota) => (
    <button className={`cartao kpi ${cor} ${status && filtros.status === status ? 'selecionado' : ''}`} aria-pressed={Boolean(status) && filtros.status === status}
      aria-label={`${rotulo}: ${status ? conta[status] : conta.Total}. ${status ? 'Filtrar' : 'Mostrar todos'}`}
      onClick={() => mudar('status', filtros.status === status ? '' : status)}>
      <div className="rotulo">{rotulo}</div><div className="valor num">{status ? conta[status] : conta.Total}</div><div className="nota">{nota}</div>
    </button>
  )

  return (
    <>
      <div className="kpis quatro">
        {kpi('', 'Total', '', 'registros')}
        {kpi('Pendente', 'Pendentes', 'vermelho', 'a começar')}
        {kpi('Em andamento', 'Em andamento', 'ambar', 'sendo corrigidos')}
        {kpi('Resolvido', 'Resolvidos', 'verde', 'com foto da correção')}
      </div>

      {porResponsavel.length > 0 && (
        <div className="cartao">
          <div className="lista-cab"><TituloSecao>Pendentes por responsável</TituloSecao><span className="rotulo">pendentes e em andamento</span></div>
          <div className="rolagem-lateral">
            {porResponsavel.map((p) => <span key={p.id} className="tag neutra">{p.nome}<b className="num">{p.quantidade}</b></span>)}
          </div>
        </div>
      )}

      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={visiveis.length}>Registros</TituloSecao>
          <div className="direita">
            {comFiltro && <button className="link" onClick={() => setFiltros(FILTROS_VISTORIA_VAZIOS)}>Limpar filtros</button>}
            {podeRegistrar && <button className="botao so-largo" onClick={() => setNovo(true)}><Icon nome="fotos" />Novo registro</button>}
          </div>
        </div>
        <div className="filtros-qualidade">
          <input type="search" className="entrada" value={filtros.busca} onChange={(e) => mudar('busca', e.target.value)} placeholder="Buscar descrição, local ou nº" aria-label="Buscar" />
          <select className="filtro" value={filtros.status} onChange={(e) => mudar('status', e.target.value)} aria-label="Situação">
            <option value="">Todas as situações</option>
            {STATUS_REGISTRO.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="filtro" value={filtros.responsavel} onChange={(e) => mudar('responsavel', e.target.value)} aria-label="Responsável">
            <option value="">Todos os responsáveis</option>
            {data.pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <div className="ordenar" role="group" aria-label="Prazo">
            {FILTROS_PRAZO.map((f) => (
              <button key={f} className={filtros.prazo === f ? 'ativo' : ''} aria-pressed={filtros.prazo === f} onClick={() => mudar('prazo', f)}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {visiveis.length ? (
        <div className="grade-registros">
          {visiveis.map((r) => <CartaoRegistro key={r.id} r={r} aoAbrir={() => setAbertoId(r.id)} />)}
        </div>
      ) : (
        <div className="cartao vazio">
          <h2>Nada com esses filtros</h2>
          <p>Nenhum registro bate com a busca e os filtros escolhidos.</p>
          <button className="botao contorno" onClick={() => setFiltros(FILTROS_VISTORIA_VAZIOS)}>Limpar filtros</button>
        </div>
      )}

      {podeRegistrar && (
        <button className="fab" onClick={() => setNovo(true)} aria-label="Novo registro: fotografar problema"><Icon nome="fotos" /></button>
      )}
      {folhas}
    </>
  )
}

const ABAS = [{ id: 'vistoria', rotulo: 'Vistoria' }, { id: 'fvs', rotulo: 'FVS' }, { id: 'gemba', rotulo: 'Gemba Walk' }]

export default function Qualidade() {
  const [aba, setAba] = useState('vistoria')
  const [relatorio, setRelatorio] = useState(false)
  // Filtros de cada aba: ficam aqui para sobreviver à troca de aba e o relatório usar os mesmos.
  const [filtrosVistoria, setFiltrosVistoria] = useState(FILTROS_VISTORIA_VAZIOS)
  const [filtroNc, setFiltroNc] = useState(FILTROS_NC[0])
  const [filtrosGemba, setFiltrosGemba] = useState(FILTROS_GEMBA_VAZIOS)
  const abas = (
    <>
      {ABAS.map((a) => (
        <button key={a.id} className={`aba ${!relatorio && aba === a.id ? 'ativa' : ''}`} aria-current={!relatorio && aba === a.id ? 'page' : undefined}
          onClick={() => { setAba(a.id); setRelatorio(false) }}>{a.rotulo}</button>
      ))}
      <button className={`aba aba-relatorio ${relatorio ? 'ativa' : ''}`} aria-current={relatorio ? 'page' : undefined} onClick={() => setRelatorio(true)}>
        <Icon nome="diario" tamanho={18} />Relatório
      </button>
    </>
  )
  let corpo
  if (relatorio) corpo = <Relatorio filtrosVistoria={filtrosVistoria} filtroNc={filtroNc} filtrosGemba={filtrosGemba} aoVoltar={() => setRelatorio(false)} />
  else if (aba === 'vistoria') corpo = <Vistoria filtros={filtrosVistoria} setFiltros={setFiltrosVistoria} />
  else if (aba === 'fvs') corpo = <Fvs filtroNc={filtroNc} setFiltroNc={setFiltroNc} />
  else corpo = <Gemba filtros={filtrosGemba} setFiltros={setFiltrosGemba} />
  return (
    <>
      <Cabecalho abas={abas} />
      <main className="conteudo">{corpo}</main>
    </>
  )
}
