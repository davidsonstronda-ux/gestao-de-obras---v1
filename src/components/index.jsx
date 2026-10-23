// Peças reutilizáveis da interface. Nada aqui decide regra de negócio:
// quem decide é src/lib/ (atraso.js, permissoes.js); aqui só se mostra.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSessao } from '../lib/SessaoContext.jsx'
import { formatarData } from '../lib/datas.js'
import { MENUS, itensDaBarra, pode } from '../lib/permissoes.js'
import { folgaConsumida } from '../lib/atraso.js'

// ── Ícones (SVG inline; nada de emoji) ──────────────────────────────────────
const P = {
  frentes: <><path d="M3 21h18" /><path d="M5 21V10l7-5 7 5v11" /><path d="M9 21v-6h6v6" /></>,
  diario: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 3v18" /></>,
  pendencias: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M12 7v4M12 14h.01" /></>,
  fotos: <><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="4" /></>,
  mais: <path d="M4 6h16M4 12h16M4 18h16" />,
  painel: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  obras: <><path d="M2 20h20" /><path d="M4 20V8h6v12" /><path d="M10 20V4h10v16" /><path d="M14 8h2M14 12h2M14 16h2" /></>,
  cronograma: <><rect x="3" y="4" width="18" height="17" rx="1" /><path d="M3 9h18M8 2v4M16 2v4M7 13h5M7 17h9" /></>,
  empreiteiros: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>,
  equipe: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  whats: <path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z" />,
  voltar: <path d="M15 18l-6-6 6-6" />,
  avancar: <path d="M9 18l6-6-6-6" />,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="M5 12l5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  mais_sinal: <path d="M12 5v14M5 12h14" />,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  nublado: <path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z" />,
  chuva: <><path d="M7 15a4 4 0 0 1-.5-8A6 6 0 0 1 18 6a4.5 4.5 0 0 1 0 9z" /><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" /></>,
  olho: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  sair: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  alerta: <><path d="M12 3l10 18H2z" /><path d="M12 10v4M12 17h.01" /></>,
  enviar: <><path d="M12 15V3M7 8l5-5 5 5" /><path d="M4 21h16" /></>,
  importar: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 21h16" /></>,
  materiais: <><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  empresa: <><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></>,
  metodo: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  equipamento: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />,
  projeto: <><path d="M3 21l3.5-1 12-12-2.5-2.5-12 12z" /><path d="M14 6.5l2.5 2.5" /></>,
  seguranca: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  logistica: <><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  medicao: <><path d="M3 17l5-5 4 4 8-8" /><path d="M15 8h5v5" /><path d="M3 21h18" /></>,
  planejamento: <><rect x="9" y="2" width="6" height="5" rx="1" /><rect x="2" y="17" width="6" height="5" rx="1" /><rect x="16" y="17" width="6" height="5" rx="1" /><path d="M12 7v5M5 17v-5h14v5" /></>,
}
export function Icon({ nome, tamanho }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={tamanho ? { width: tamanho, height: tamanho } : undefined}>
      {P[nome]}
    </svg>
  )
}

// ── Cor de cada situação (texto idêntico ao do banco/PRD) ───────────────────
const COR = {
  'Estourou a folga': 'vermelho', 'Atenção': 'ambar', 'No prazo': 'verde',
  'Aberta': 'ambar', 'Respondida': 'destaque', 'Fechada': 'neutra',
  'Em andamento': 'verde', 'Parada': 'ambar', 'Concluída': 'neutra', 'Não iniciada': 'neutra',
  'Andou': 'verde', 'Não andou': 'vermelho', 'Pendência': 'ambar', 'Comentário': 'neutra',
  'Rascunho': 'ambar',
}
export const corDe = (texto) => COR[texto] || 'neutra'
export function Tag({ children, cor }) {
  return <span className={`tag ${cor || corDe(children)}`}>{children}</span>
}

// ── Logo da empresa no cabeçalho, no menu e no login ────────────────────────
// Sem logo próprio (Cadastros › Empresa e logo), usa o da BMR: inteiro no menu e
// no login; no cabeçalho do celular, só o símbolo (o círculo), recortado.
// Logo próprio aparece sempre inteiro, reduzido para caber — o recorte só serve
// para o desenho da BMR.
export const LOGO_PADRAO = '/logo-bmr.webp'
export function Logo({ simbolo }) {
  const { logo } = useSessao()
  if (logo) return <img className={simbolo ? 'logo-livre' : 'logo-inteiro'} src={logo} alt="Logo da empresa" />
  if (simbolo) return <span className="logo-simbolo"><img src={LOGO_PADRAO} alt="BMR Construtora" /></span>
  return <img className="logo-inteiro" src={LOGO_PADRAO} alt="BMR Construtora" />
}

// ── Linha de detalhes (quem, motivo, data…) separada por espaço, não por "·" ──
export function Meta({ itens }) {
  const visiveis = itens.filter(Boolean)
  if (!visiveis.length) return null
  return <div className="meta">{visiveis.map((t, i) => <span key={i}>{t}</span>)}</div>
}

// Título de seção com a contagem ao lado: "Frentes em risco  7".
export function TituloSecao({ children, conta }) {
  return <span className="rotulo">{children}{conta !== undefined && <span className="conta">{conta}</span>}</span>
}

// ── Régua de folga: quanto da folga a frente já comeu ───────────────────────
export function Regua({ folgaDias, diasPerdidos, risco, legenda, grande }) {
  const pct = Math.round(folgaConsumida(folgaDias, diasPerdidos) * 100)
  return (
    <div className={`regua ${corDe(risco)} ${grande ? 'grande' : ''}`}>
      <div className="trilho" role="img" aria-label={`Folga: ${diasPerdidos} de ${folgaDias} dias usados`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      {legenda && <span className="legenda">{legenda}</span>}
    </div>
  )
}

// ── Aviso rápido (toast) ────────────────────────────────────────────────────
const AvisoCtx = createContext(() => {})
export function AvisoProvider({ children }) {
  const [aviso, setAviso] = useState(null)
  const t = useRef(null)
  const avisar = useCallback((texto, tipo = 'ok') => {
    setAviso({ texto, tipo })
    clearTimeout(t.current)
    t.current = setTimeout(() => setAviso(null), 3200)
  }, [])
  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      {aviso && <div className={`aviso ${aviso.tipo === 'erro' ? 'erro' : ''}`} role="status">{aviso.texto}</div>}
    </AvisoCtx.Provider>
  )
}
export const useAviso = () => useContext(AvisoCtx)

// ── Busca com os três estados (carregando, vazio, erro) ─────────────────────
// `buscar` é uma função da camada de dados; `deps` decide quando buscar de novo.
export function useCarregar(buscar, deps = []) {
  const [estado, setEstado] = useState({ carregando: true, data: null, erro: null })
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    let vivo = true
    setEstado((e) => ({ ...e, carregando: true, erro: null }))
    buscar().then(({ data, erro }) => { if (vivo) setEstado({ carregando: false, data, erro }) })
    return () => { vivo = false }
  }, [...deps, versao])
  return { ...estado, recarregar: () => setVersao((v) => v + 1) }
}

export function Carregando({ alto }) {
  return (
    <div className="carregando" aria-label="Carregando">
      <div className="bloco" /><div className={`bloco ${alto ? 'alto' : ''}`} />
    </div>
  )
}

export function EstadoVazio({ icone = 'pendencias', titulo, texto, acao, aoAgir }) {
  return (
    <div className="cartao vazio">
      <div className="ico"><Icon nome={icone} /></div>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {acao && <button className="botao" onClick={aoAgir}><Icon nome="mais_sinal" />{acao}</button>}
    </div>
  )
}

export function Erro({ mensagem, aoTentar }) {
  return (
    <div className="cartao vazio erro" role="alert">
      <div className="ico"><Icon nome="alerta" /></div>
      <h2>Não deu para carregar</h2>
      <p>{mensagem}</p>
      {aoTentar && <button className="botao contorno" onClick={aoTentar}>Tentar de novo</button>}
    </div>
  )
}

// ── Folha (janela que sobe de baixo no celular, centralizada no computador) ──
export function Folha({ titulo, aoFechar, children }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aoFechar])
  // Desenhada no <body>: dentro do cabeçalho fixo ela ficava atrás da barra
  // inferior e herdava o texto claro do cabeçalho.
  return createPortal(
    <div className="fundo-folha" onClick={aoFechar}>
      <div className="folha" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="folha-cab">
          <h2>{titulo}</h2>
          <button className="icone-botao" onClick={aoFechar} aria-label="Fechar"><Icon nome="x" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ── Seletor de obra ─────────────────────────────────────────────────────────
function SeletorObra({ aoFechar }) {
  const { obras, obraId, trocarObra } = useSessao()
  return (
    <Folha titulo="Trocar de obra" aoFechar={aoFechar}>
      {obras.map((o) => (
        <button key={o.id} className={`obra-opcao ${o.id === obraId ? 'atual' : ''}`}
          onClick={() => { if (o.id !== obraId) trocarObra(o.id); aoFechar() }}>
          <span className="obra-codigo">{o.codigo}</span>
          <span style={{ flex: 1 }}>
            <span className="titulo">{o.nome}</span>
            <Meta itens={[o.cliente_nome, <>entrega <span className="data-curta">{formatarData(o.data_entrega)}</span></>]} />
          </span>
          {o.situacao === 'Parada' ? <Tag>Parada</Tag> : o.id === obraId ? <Tag cor="destaque">Atual</Tag> : null}
        </button>
      ))}
    </Folha>
  )
}

// ── Cabeçalho escuro (com obra, troca e perfil) ─────────────────────────────
// Cada tela monta o seu: com abas, ou com "voltar" + título no lugar da obra.
export function Cabecalho({ abas, voltar, titulo, sub }) {
  const { obra, obras, perfil, sair } = useSessao()
  const [trocando, setTrocando] = useState(false)
  const [menuPerfil, setMenuPerfil] = useState(false)
  const iniciais = perfil.nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <header className="cab">
      {voltar ? (
        <>
          <button className="voltar" onClick={voltar.ir}><Icon nome="voltar" />{voltar.rotulo}</button>
          <div className="det-titulo">{titulo}</div>
          <div className="det-sub">{sub}</div>
        </>
      ) : (
        <>
          <div className="cab-linha">
            <Logo simbolo />
            <div style={{ minWidth: 0 }}>
              <div className="obra-nome">{obra ? obra.nome : 'Nenhuma obra'}</div>
              <div className="obra-meta">
                {obra ? (
                  <>
                    <span className="obra-codigo">{obra.codigo}</span>
                    {obra.situacao === 'Parada' && <span className="obra-parada">Parada</span>}
                    <span className="so-largo">{obra.cliente_nome}</span>
                    <span>entrega <span className="data-curta">{formatarData(obra.data_entrega)}</span></span>
                  </>
                ) : <span>Crie a primeira obra em Cadastros</span>}
              </div>
            </div>
            {obras.length > 1 && (
              <button className="trocar" onClick={() => setTrocando(true)}>
                <Icon nome="obras" />Trocar<span className="rotulo-longo">obra</span>
              </button>
            )}
            <button className="quem" style={obras.length > 1 ? undefined : { marginLeft: 'auto' }} onClick={() => setMenuPerfil(true)} aria-label="Meu perfil">
              <span>{perfil.nome}, {perfil.role.toLowerCase()}</span><b>{iniciais}</b>
            </button>
          </div>
          {abas ? <div className="abas">{abas}</div> : <div style={{ height: 12 }} />}
        </>
      )}
      {trocando && <SeletorObra aoFechar={() => setTrocando(false)} />}
      {menuPerfil && (
        <Folha titulo="Meu perfil" aoFechar={() => setMenuPerfil(false)}>
          <div className="form">
            <div><div className="rotulo">Nome</div><div style={{ fontSize: 18, fontWeight: 600 }}>{perfil.nome}</div></div>
            <div><div className="rotulo">Perfil</div><div style={{ fontSize: 18, fontWeight: 600 }}>{perfil.role}</div></div>
            <div><div className="rotulo">Email</div><div>{perfil.email}</div></div>
            <button className="botao contorno largo" onClick={sair}><Icon nome="sair" />Sair</button>
          </div>
        </Folha>
      )}
    </header>
  )
}

// ── Casca: menu lateral (computador) + barra inferior (celular) ─────────────
export const ROTULOS = {
  frentes: 'Frentes', diario: 'Diário', pendencias: 'Pendências', fotos: 'Fotos', materiais: 'Materiais', planejamento: 'Planejamento', medicao: 'Medição', mais: 'Mais', painel: 'Painel',
  obras: 'Obras', cronograma: 'Frentes e cronograma', empreiteiros: 'Empreiteiros e ambientes', equipe: 'Equipe', empresa: 'Empresa e logo',
}
export const CADASTROS = ['obras', 'cronograma', 'empreiteiros', 'equipe', 'empresa']
// Tela de detalhe acende o item de menu de onde veio.
const PAI = { frente: 'frentes', pendencia: 'pendencias', obras: 'mais', cronograma: 'mais', empreiteiros: 'mais', equipe: 'mais', empresa: 'mais' }

export function Casca({ role, tela, goto, children }) {
  const itens = MENUS[role].itens
  const barra = itensDaBarra(role)
  const ativo = PAI[tela] || tela
  // No celular, o que mora dentro de "Mais" acende o "Mais".
  const ativoBarra = barra.includes(ativo) ? ativo : itens.includes('mais') ? 'mais' : ativo
  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca"><Logo /><span className="nome-app">Gestão de Obras</span></div>
        <nav aria-label="Menu principal">
          {itens.filter((id) => id !== 'mais').map((id) => (
            <button key={id} className={`item-menu ${ativo === id ? 'ativo' : ''}`} aria-current={ativo === id ? 'page' : undefined} onClick={() => goto(id)}>
              <Icon nome={id} />{ROTULOS[id]}
            </button>
          ))}
          {itens.includes('mais') && pode(role, 'cadastrar') && (
            <>
              <div className="secao-menu">Cadastros</div>
              {CADASTROS.map((c) => (
                <button key={c} className={`item-menu ${tela === c ? 'ativo' : ''}`} aria-current={tela === c ? 'page' : undefined} onClick={() => goto(c)}>
                  <Icon nome={c} />{ROTULOS[c]}
                </button>
              ))}
            </>
          )}
        </nav>
        <div className="rod">Dados de exemplo. O que você lançar volta ao original quando recarregar a página.</div>
      </aside>
      <div className="principal">{children}</div>
      {barra.length > 1 && (
        <nav className="barra-inferior">
          {barra.map((id) => (
            <button key={id} className={ativoBarra === id ? 'ativo' : ''} aria-current={ativoBarra === id ? 'page' : undefined} onClick={() => goto(id)}>
              <Icon nome={id} />{ROTULOS[id]}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

// Roteamento por estado (sem URL). A tela principal fica guardada na sessão do
// navegador para sobreviver à troca de obra (que remonta tudo) e ao recarregar.
const CHAVE_TELA = 'gestao-obras:tela'
export function useRota(role) {
  const { inicio, itens } = MENUS[role]
  const permitidas = new Set([...itens, ...(itens.includes('mais') && pode(role, 'cadastrar') ? CADASTROS : [])])
  const [rota, setRota] = useState(() => {
    let salva = null
    try { salva = sessionStorage.getItem(`${CHAVE_TELA}:${role}`) } catch (_) { /* sem armazenamento */ }
    return { tela: salva && permitidas.has(salva) ? salva : inicio, params: {} }
  })
  const goto = (tela, params = {}) => {
    setRota({ tela, params })
    if (permitidas.has(tela)) {
      try { sessionStorage.setItem(`${CHAVE_TELA}:${role}`, tela) } catch (_) { /* sem armazenamento */ }
    }
    window.scrollTo(0, 0)
  }
  return { ...rota, goto }
}
