// Login de mentira até a Etapa 7: escolhe um usuário de exemplo e entra direto.
// Com o Supabase, vira email + senha (signInWithPassword) e o cadastro.
import { useState } from 'react'
import { listarPerfisDeTeste } from '../lib/dados.js'
import { useSessao } from '../lib/SessaoContext.jsx'
import { Logo, Tag, useCarregar } from '../components/index.jsx'

export default function Login() {
  const { abrirSessao } = useSessao()
  const { data: perfis } = useCarregar(listarPerfisDeTeste)
  const [entrando, setEntrando] = useState(null)
  const [erro, setErro] = useState(null)

  async function entrar(id) {
    setEntrando(id)
    const e = await abrirSessao(id)
    if (e) { setErro(e); setEntrando(null) }
  }

  return (
    <div className="tela-login">
      <div className="caixa-login">
        <div className="marca"><Logo /><span className="nome-app">Gestão de Obras</span></div>
        <div className="cartao">
          <div className="lista-cab">
            <span className="rotulo">Entrar como…</span>
            <span className="direita"><span className="selo-demo">Dados de exemplo</span></span>
          </div>
          {(perfis || []).map((p) => (
            <button key={p.id} className="perfil-teste" disabled={Boolean(entrando)} onClick={() => entrar(p.id)}>
              <b className="av">{p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</b>
              <span style={{ flex: 1 }}>
                <span className="titulo">{p.nome}</span>
                <span className="rotulo" style={{ display: 'block', marginTop: 2, textTransform: 'none' }}>{p.email}</span>
              </span>
              {entrando === p.id ? <span className="rotulo">Entrando…</span> : <Tag cor={p.role === 'Pendente' ? 'ambar' : 'neutra'}>{p.role}</Tag>}
            </button>
          ))}
          {erro && <div className="form"><div className="erro-campo" role="alert">{erro}</div></div>}
          <div className="form" style={{ paddingTop: 10 }}>
            <span className="rotulo">Login com email e senha entra na etapa do Supabase.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
