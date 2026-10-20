import { useEffect, useState } from 'react'
import { diarioDeHoje, salvarDiario } from '../lib/dados.js'
import { CLIMAS, validarDiario } from '../lib/diario.js'
import { MOTIVOS } from '../lib/atraso.js'
import { formatarData, diaDaSemana } from '../lib/datas.js'
import { Cabecalho, Carregando, EstadoVazio, Erro, Icon, TituloSecao, useAviso, useCarregar } from '../components/index.jsx'

const ICONE_CLIMA = { Sol: 'sol', Nublado: 'nublado', Chuva: 'chuva' }

export default function Diario({ goto }) {
  const avisar = useAviso()
  const { carregando, data, erro, recarregar } = useCarregar(diarioDeHoje)
  const [clima, setClima] = useState('Sol')
  const [marcas, setMarcas] = useState({})
  const [equipes, setEquipes] = useState({})
  const [ocorrencias, setOcorrencias] = useState('')
  const [concluidos, setConcluidos] = useState([])
  const [fotos, setFotos] = useState([])
  const [abertoConcluir, setAbertoConcluir] = useState(null)
  const [salvando, setSalvando] = useState(false)

  // Diário já lançado hoje: o formulário abre preenchido para editar.
  useEffect(() => {
    if (!data) return
    setMarcas(data.marcas)
    if (data.existente) {
      setClima(data.existente.clima)
      setOcorrencias(data.existente.ocorrencias || '')
      setEquipes(Object.fromEntries((data.existente.equipes || []).map((e) => [e.empreiteiro_id, e.pessoas])))
    }
  }, [data])

  const titulo = <Cabecalho abas={<button className="aba ativa">Hoje</button>} />
  if (carregando && !data) return <>{titulo}<main className="conteudo"><Carregando alto /></main></>
  if (erro) return <>{titulo}<main className="conteudo"><Erro mensagem={erro} aoTentar={recarregar} /></main></>
  if (!data.frentes.length) {
    return (
      <>{titulo}<main className="conteudo">
        <EstadoVazio icone="diario" titulo="Nenhuma frente em andamento nesta obra hoje"
          texto="Quando houver frente em andamento ou com início vencido, ela aparece aqui para você marcar." />
      </main></>
    )
  }

  const frentesIds = data.frentes.map((f) => f.id)
  const semMarca = frentesIds.filter((id) => !marcas[id]?.situacao).length
  const pessoas = Object.values(equipes).reduce((s, n) => s + n, 0)
  const marcar = (id, mudanca) => setMarcas((m) => ({ ...m, [id]: { ...m[id], ...mudanca } }))
  const alternarConcluido = (faId) => setConcluidos((c) => (c.includes(faId) ? c.filter((x) => x !== faId) : [...c, faId]))

  async function salvar() {
    const problemas = validarDiario({ clima, frentesIds, marcas })
    if (problemas.length) return avisar(problemas[0], 'erro')
    setSalvando(true)
    const { erro: e } = await salvarDiario({
      clima, ocorrencias, marcas, concluidos, fotos,
      equipes: Object.entries(equipes).filter(([, n]) => n > 0).map(([empreiteiro_id, n]) => ({ empreiteiro_id, pessoas: n })),
    })
    setSalvando(false)
    if (e) return avisar(e, 'erro')
    avisar(`Diário de ${formatarData(data.data)} salvo.`)
    goto('frentes')
  }

  const lanc = (f) => {
    const m = marcas[f.id] || {}
    const comecar = f.deveriaTerComecado
    const meusConcluidos = f.ambientesAbertos.filter((a) => concluidos.includes(a.id)).length
    const minhasFotos = fotos.filter((x) => x.frente_id === f.id).length
    return (
      <div key={f.id} className="lanc">
        <div className="cima">
          <div className="titulo">{f.servico}</div>
          {f.empreiteiro && <div className="rotulo" style={{ marginTop: 3 }}>{f.empreiteiro.nome}</div>}
        </div>
        <div className="anda">
          <button className={`opcao sim ${m.situacao === 'Andou' ? 'marcada' : ''}`} aria-pressed={m.situacao === 'Andou'}
            onClick={() => marcar(f.id, { situacao: 'Andou', motivo: null, motivo_detalhe: null })}>
            <Icon nome="check" />{comecar ? 'Começou' : 'Andou'}
          </button>
          <button className={`opcao nao ${m.situacao === 'Não andou' ? 'marcada' : ''}`} aria-pressed={m.situacao === 'Não andou'}
            onClick={() => marcar(f.id, { situacao: 'Não andou' })}>
            <Icon nome="x" />{comecar ? 'Não começou' : 'Não andou'}
          </button>
          {!comecar && f.ambientesAbertos.length > 0 && (
            <button className={`icone-botao ${meusConcluidos ? 'marcado' : ''}`} onClick={() => setAbertoConcluir(abertoConcluir === f.id ? null : f.id)}>
              <Icon nome="check" />Concluí{meusConcluidos > 0 && <span className="conta">{meusConcluidos}</span>}
            </button>
          )}
          <label className={`icone-botao ${minhasFotos ? 'marcado' : ''}`}>
            <Icon nome="fotos" />Foto{minhasFotos > 0 && <span className="conta">{minhasFotos}</span>}
            <input type="file" accept="image/*" capture="environment" className="so-leitor"
              onChange={(e) => {
                if (e.target.files?.length) setFotos((fs) => [...fs, ...Array.from(e.target.files, () => ({ frente_id: f.id }))])
                e.target.value = ''
              }} />
          </label>
        </div>
        {m.situacao === 'Não andou' && (
          <div className="sub">
            <div className="rotulo">Por que não andou?</div>
            <div className="chips">
              {MOTIVOS.map((x) => (
                <button key={x} className={`chip ${m.motivo === x ? 'ativo' : ''}`} aria-pressed={m.motivo === x} onClick={() => marcar(f.id, { motivo: x })}>{x}</button>
              ))}
            </div>
            {m.motivo === 'Outro' && (
              <label className="campo" style={{ marginTop: 10 }}>
                <span>Qual motivo? <em>*</em></span>
                <input type="text" value={m.motivo_detalhe || ''} onChange={(e) => marcar(f.id, { motivo_detalhe: e.target.value })} />
              </label>
            )}
          </div>
        )}
        {abertoConcluir === f.id && (
          <div className="sub">
            <div className="rotulo">Quais ambientes ficaram prontos hoje?</div>
            <div className="chips">
              {f.ambientesAbertos.map((a) => (
                <button key={a.id} className={`chip ${concluidos.includes(a.id) ? 'ativo ok' : ''}`} aria-pressed={concluidos.includes(a.id)}
                  onClick={() => alternarConcluido(a.id)}>{a.nome}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const andamento = data.frentes.filter((f) => !f.deveriaTerComecado)
  const atrasadas = data.frentes.filter((f) => f.deveriaTerComecado)

  return (
    <>
      {titulo}
      <main className="conteudo">
        <div className="kpis">
          <div className={`cartao kpi ${semMarca ? 'vermelho' : 'verde'}`}>
            <div className="rotulo">Sem marcação</div><div className="valor num">{semMarca}</div><div className="nota">de {frentesIds.length} frentes</div>
          </div>
          <div className="cartao kpi"><div className="rotulo">Pessoas hoje</div><div className="valor num">{pessoas}</div>
            <div className="nota">{Object.values(equipes).filter((n) => n > 0).length} empreiteiros</div></div>
          <div className="cartao kpi"><div className="rotulo">Fotos</div><div className="valor num">{fotos.length}</div>
            <div className="nota">{fotos.length ? 'aguardam liberação' : 'nenhuma ainda'}</div></div>
        </div>

        <div className="cartao">
          <div className="lista-cab">
            <TituloSecao conta={`${diaDaSemana(data.data)} ${formatarData(data.data)}`}>Clima de hoje</TituloSecao>
            {data.existente && <span className="direita"><span className="tag verde">Já lançado hoje</span></span>}
          </div>
          <div className="seg">
            {CLIMAS.map((c) => (
              <button key={c} className={`opcao ${clima === c ? 'marcada' : ''}`} aria-pressed={clima === c} onClick={() => setClima(c)}>
                <Icon nome={ICONE_CLIMA[c]} />{c}
              </button>
            ))}
          </div>
        </div>

        {andamento.length > 0 && (
          <div className="cartao">
            <div className="lista-cab"><TituloSecao conta={andamento.length}>Frentes em andamento</TituloSecao></div>
            {andamento.map(lanc)}
          </div>
        )}
        {atrasadas.length > 0 && (
          <div className="cartao">
            <div className="lista-cab alerta-cab"><TituloSecao conta={atrasadas.length}>Deveriam ter começado</TituloSecao></div>
            {atrasadas.map(lanc)}
          </div>
        )}

        <div className="cartao">
          <div className="lista-cab"><TituloSecao>Equipes presentes</TituloSecao></div>
          <div className="equipes">
            {data.empreiteiros.map((e) => {
              const n = equipes[e.id] || 0
              return (
                <div key={e.id} className="equipe">
                  <span className="n">{e.nome}</span>
                  <button className="passo" aria-label={`Menos uma pessoa da ${e.nome}`} onClick={() => setEquipes((q) => ({ ...q, [e.id]: Math.max(0, n - 1) }))}>−</button>
                  <span className="q num" aria-live="polite">{n}</span>
                  <button className="passo" aria-label={`Mais uma pessoa da ${e.nome}`} onClick={() => setEquipes((q) => ({ ...q, [e.id]: n + 1 }))}>+</button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="cartao">
          <div className="lista-cab"><label className="rotulo" htmlFor="ocorrencias">Ocorrências do dia</label></div>
          <div style={{ padding: 14 }}>
            <textarea id="ocorrencias" placeholder="Algo que aconteceu hoje e precisa ficar registrado…" value={ocorrencias} onChange={(e) => setOcorrencias(e.target.value)} />
          </div>
        </div>

        <div className="salvar">
          <div className="falta">{semMarca ? <><b className="num">{semMarca}</b>sem marcação</> : <span style={{ color: 'var(--verde)' }}>Tudo marcado</span>}</div>
          <button className="botao" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar diário de hoje'}</button>
        </div>
      </main>
    </>
  )
}
