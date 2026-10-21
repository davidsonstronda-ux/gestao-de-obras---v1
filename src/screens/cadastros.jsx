// Cadastros da obra: Frentes e cronograma, Empreiteiros e ambientes, Equipe,
// e a tela "Mais" do celular. Nesta etapa, listas com os dados de exemplo; os
// formulários de criar/editar e a importação do cronograma vêm no próximo passo.
import { useState } from 'react'
import { liberarPessoa, listarEmpreiteirosEAmbientes, listarEquipe, listarFrentesCadastro, listarMinhasObras, salvarLogo } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { MENUS, PERFIS, pode } from '../lib/permissoes.js'
import { formatarDiaMes, formatarDinheiro } from '../lib/datas.js'
import { Cabecalho, CADASTROS, Carregando, EstadoVazio, Erro, Folha, Icon, LOGO_PADRAO, Meta, ROTULOS, Tag, TituloSecao, corDe, useAviso, useCarregar } from '../components/index.jsx'

function EmBreve({ oque }) {
  const avisar = useAviso()
  return <button className="botao" onClick={() => avisar(`${oque}: entra no próximo passo da construção.`)}><Icon nome="mais_sinal" />{oque}</button>
}

export function Mais({ goto }) {
  const { perfil } = useSessao()
  // O mestre também tem "Mais" (Materiais e Planejamento), mas sem os Cadastros.
  const cadastra = pode(perfil.role, 'cadastrar')
  const telas = [...(MENUS[perfil.role].noMais || []), ...(cadastra ? CADASTROS : [])]
  return (
    <>
      <Cabecalho abas={<button className="aba ativa">{cadastra ? 'Cadastros' : 'Mais'}</button>} />
      <main className="conteudo">
        <div className="cartao">
          {telas.map((c) => (
            <button key={c} className="linha-lista" onClick={() => goto(c)}>
              <div className="amb"><Icon nome={c} tamanho={24} /><span className="titulo">{ROTULOS[c]}</span></div>
              <div className="lado"><Icon nome="seta" tamanho={20} /></div>
            </button>
          ))}
        </div>
      </main>
    </>
  )
}

export function Cronograma({ goto }) {
  const { carregando, data, erro, recarregar } = useCarregar(listarFrentesCadastro)
  let corpo
  if (carregando && !data) corpo = <Carregando alto />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else if (!data.length) corpo = <EstadoVazio icone="cronograma" titulo="Esta obra ainda não tem frentes" texto="Importe seu cronograma ou cadastre o primeiro serviço." />
  else {
    corpo = (
      <div className="cartao">
        <div className="lista-cab">
          <TituloSecao conta={data.length}>Frentes da obra</TituloSecao>
          <span className="direita"><EmBreve oque="Importar cronograma" /></span>
        </div>
        {data.map((f) => (
          <button key={f.id} className="linha-lista" onClick={() => goto('frente', { id: f.id })}>
            <div>
              <div className="titulo">{f.servico}</div>
              <Meta itens={[
                f.empreiteiro?.nome,
                <span key="d" className="data-curta">{formatarDiaMes(f.inicio_previsto)} a {formatarDiaMes(f.termino_previsto)}</span>,
                `${f.folga_dias} dias de folga`,
                f.ambientes.join(', '),
              ]} />
            </div>
            <div className="lado">
              <div className="parado"><b>{f.pct}%</b><span>concluído</span></div>
              {f.valor_contratado !== null && <span className="rotulo num">{formatarDinheiro(f.valor_contratado)}</span>}
              <Tag>{f.situacao}</Tag>
            </div>
          </button>
        ))}
      </div>
    )
  }
  return (
    <>
      <Cabecalho abas={<button className="aba ativa">Frentes e cronograma</button>} />
      <main className="conteudo">{corpo}</main>
    </>
  )
}

export function Empreiteiros() {
  const { carregando, data, erro, recarregar } = useCarregar(listarEmpreiteirosEAmbientes)
  let corpo
  if (carregando && !data) corpo = <Carregando />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else {
    corpo = (
      <>
        <div className="cartao">
          <div className="lista-cab"><TituloSecao conta={data.empreiteiros.length}>Empreiteiros da obra</TituloSecao><span className="direita"><EmBreve oque="Novo empreiteiro" /></span></div>
          {!data.empreiteiros.length && <div className="linha-lista"><div className="titulo">Nenhum empreiteiro cadastrado nesta obra.</div></div>}
          {data.empreiteiros.map((e) => (
            <div key={e.id} className="linha-lista">
              <div><div className="titulo">{e.nome}</div><Meta itens={[e.especialidade, e.whatsapp ? 'WhatsApp cadastrado' : 'Sem WhatsApp']} /></div>
              <div className="lado"><Tag cor="neutra">{e.frentes} {e.frentes === 1 ? 'frente' : 'frentes'}</Tag></div>
            </div>
          ))}
        </div>
        <div className="cartao">
          <div className="lista-cab"><TituloSecao conta={data.ambientes.length}>Ambientes da obra</TituloSecao><span className="direita"><EmBreve oque="Novo ambiente" /></span></div>
          {!data.ambientes.length && <div className="linha-lista"><div className="titulo">Nenhum ambiente cadastrado nesta obra.</div></div>}
          {data.ambientes.map((a) => (
            <div key={a.id} className="linha-lista" style={{ minHeight: 52 }}>
              <div className="amb"><span className="rotulo num">{a.ordem}</span><span className="titulo">{a.nome}</span></div>
            </div>
          ))}
        </div>
      </>
    )
  }
  return (
    <>
      <Cabecalho abas={<button className="aba ativa">Empreiteiros e ambientes</button>} />
      <main className="conteudo">{corpo}</main>
    </>
  )
}

function Liberar({ pessoa, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const { data: obras } = useCarregar(listarMinhasObras)
  const [role, setRole] = useState('Mestre')
  const [marcadas, setMarcadas] = useState([])
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    setSalvando(true)
    const { erro } = await liberarPessoa(pessoa.id, role, marcadas)
    setSalvando(false)
    if (erro) return avisar(erro, 'erro')
    avisar(`${pessoa.nome} liberado como ${role}.`)
    aoSalvar()
  }
  return (
    <Folha titulo={`Liberar ${pessoa.nome}`} aoFechar={aoFechar}>
      <div className="form">
        <label className="campo"><span>Perfil <em>*</em></span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>{PERFIS.filter((p) => p !== 'Pendente').map((p) => <option key={p}>{p}</option>)}</select>
        </label>
        <div className="campo"><span>Obras <em>*</em></span>
          <div className="chips" style={{ marginTop: 0 }}>
            {(obras || []).map((o) => (
              <button key={o.id} className={`chip ${marcadas.includes(o.id) ? 'ativo ok' : ''}`} aria-pressed={marcadas.includes(o.id)}
                onClick={() => setMarcadas((m) => (m.includes(o.id) ? m.filter((x) => x !== o.id) : [...m, o.id]))}><span className="data-curta">{o.codigo}</span> {o.nome}</button>
            ))}
          </div>
        </div>
        <button className="botao largo" disabled={salvando || !marcadas.length} onClick={salvar}>{salvando ? 'Liberando…' : 'Liberar acesso'}</button>
      </div>
    </Folha>
  )
}

export function Equipe() {
  const { carregando, data, erro, recarregar } = useCarregar(listarEquipe)
  const [liberando, setLiberando] = useState(null)
  let corpo
  if (carregando && !data) corpo = <Carregando />
  else if (erro) corpo = <Erro mensagem={erro} aoTentar={recarregar} />
  else {
    corpo = (
      <>
        <div className="cartao">
          <div className="lista-cab alerta-cab"><TituloSecao conta={data.pendentes.length}>Aguardando liberação</TituloSecao></div>
          {!data.pendentes.length && <div className="linha-lista"><div className="titulo">Ninguém aguardando liberação.</div></div>}
          {data.pendentes.map((p) => (
            <div key={p.id} className="linha-lista">
              <div><div className="titulo">{p.nome}</div><Meta itens={[p.email]} /></div>
              <div className="lado"><button className="botao" onClick={() => setLiberando(p)}>Liberar</button></div>
            </div>
          ))}
        </div>
        <div className="cartao">
          <div className="lista-cab"><TituloSecao conta={data.equipe.length}>Equipe</TituloSecao></div>
          {data.equipe.map((p) => (
            <div key={p.id} className="linha-lista">
              <div><div className="titulo">{p.nome}</div><Meta itens={[p.email, `obras: ${p.obras.join(', ')}`]} /></div>
              <div className="lado"><span className={`tag ${corDe(p.role)}`}>{p.role}</span></div>
            </div>
          ))}
        </div>
      </>
    )
  }
  return (
    <>
      <Cabecalho abas={<button className="aba ativa">Equipe</button>} />
      <main className="conteudo">{corpo}</main>
      {liberando && <Liberar pessoa={liberando} aoFechar={() => setLiberando(null)} aoSalvar={() => { setLiberando(null); recarregar() }} />}
    </>
  )
}

// Reduz a imagem no navegador antes de guardar (máx. 600×240), mantendo a
// transparência. SVG passa direto: já é leve e não perde nitidez.
function prepararImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Não deu para ler o arquivo.'))
    leitor.onload = () => {
      if (arquivo.type === 'image/svg+xml') return resolve(leitor.result)
      const img = new Image()
      img.onerror = () => reject(new Error('Este arquivo não é uma imagem que o navegador abra.'))
      img.onload = () => {
        const escala = Math.min(1, 600 / img.width, 240 / img.height)
        const tela = document.createElement('canvas')
        tela.width = Math.round(img.width * escala)
        tela.height = Math.round(img.height * escala)
        tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height)
        resolve(tela.toDataURL('image/webp', 0.9))
      }
      img.src = leitor.result
    }
    leitor.readAsDataURL(arquivo)
  })
}

export function Empresa() {
  const { logo, setLogo } = useSessao()
  const avisar = useAviso()
  const [rascunho, setRascunho] = useState(undefined) // undefined = sem mudança; null = voltar ao padrão
  const [salvando, setSalvando] = useState(false)
  const mostrando = rascunho === undefined ? logo : rascunho
  const mudou = rascunho !== undefined && rascunho !== logo

  async function escolher(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (!arquivo.type.startsWith('image/')) return avisar('Escolha um arquivo de imagem (PNG, JPG, WebP ou SVG).', 'erro')
    try { setRascunho(await prepararImagem(arquivo)) } catch (erro) { avisar(erro.message, 'erro') }
  }
  async function salvar() {
    setSalvando(true)
    const { erro } = await salvarLogo(rascunho)
    setSalvando(false)
    if (erro) return avisar(erro, 'erro')
    setLogo(rascunho)
    setRascunho(undefined)
    avisar(rascunho ? 'Logo salvo. Ele já aparece no cabeçalho e no menu.' : 'Voltou para o logo da BMR.')
  }

  const src = mostrando || LOGO_PADRAO
  return (
    <>
      <Cabecalho abas={<button className="aba ativa">Empresa e logo</button>} />
      <main className="conteudo">
        <div className="cartao">
          <div className="lista-cab"><TituloSecao>Logo do app</TituloSecao></div>
          <div className="form">
            <p className="rotulo" style={{ margin: 0 }}>
              Aparece no menu lateral, na tela de entrada e no cabeçalho do celular. O fundo do cabeçalho é preto:
              use uma versão clara do logo, de preferência PNG ou SVG com fundo transparente.
            </p>
            <div className="previa-logo">
              <div className="previa-menu"><img src={src} alt="Prévia do logo no menu" /></div>
              <div className="previa-cab">
                {mostrando
                  ? <img className="logo-livre" src={src} alt="Prévia do logo no cabeçalho do celular" />
                  : <span className="logo-simbolo" style={{ display: 'block' }}><img src={LOGO_PADRAO} alt="Prévia do símbolo no cabeçalho do celular" /></span>}
                <span>Cabeçalho do celular</span>
              </div>
            </div>
            <div className="acoes">
              <label className="botao contorno">
                <Icon nome="importar" />Escolher imagem
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="so-leitor" onChange={escolher} />
              </label>
              {mostrando && <button className="botao contorno" onClick={() => setRascunho(null)}>Voltar ao logo da BMR</button>}
              <button className="botao" disabled={!mudou || salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar logo'}</button>
            </div>
            {mudou && <span className="rotulo">Prévia: o logo só muda no app depois de salvar.</span>}
          </div>
        </div>
      </main>
    </>
  )
}
