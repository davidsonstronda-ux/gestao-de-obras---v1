// Estado global pequeno: quem está logado e em qual obra está.
// A obra escolhida fica guardada no navegador, com o id da pessoa na chave,
// para o app voltar nela ao reabrir (e uma pessoa não herdar a obra da outra).
import { createContext, useContext, useEffect, useState } from 'react'
import { definirContexto, entrarComo, listarMinhasObras, obterLogo } from './dados.js'

const Sessao = createContext(null)
const CHAVE_PERFIL = 'gestao-obras:perfil'
const chaveObra = (perfilId) => `gestao-obras:obra:${perfilId}`

function ler(chave) {
  try { return localStorage.getItem(chave) } catch (_) { return null }
}
function gravar(chave, valor) {
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, valor)
  } catch (_) { /* navegador sem armazenamento: só não lembra */ }
}

export function SessaoProvider({ children }) {
  const [perfil, setPerfil] = useState(null)
  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState(null)
  const [carregando, setCarregando] = useState(true)
  // Logo da empresa (null = o da BMR). Carrega antes do login: aparece na tela de entrada.
  const [logo, setLogo] = useState(null)
  useEffect(() => { obterLogo().then(({ data }) => setLogo(data)) }, [])

  async function abrirSessao(perfilId) {
    setCarregando(true)
    const { data: p, erro } = await entrarComo(perfilId)
    if (erro) { setPerfil(null); setCarregando(false); return erro }
    gravar(CHAVE_PERFIL, p.id)
    const { data: lista } = await listarMinhasObras()
    const guardada = ler(chaveObra(p.id))
    const escolhida = lista.find((o) => o.id === guardada) || lista[0] || null
    definirContexto({ perfil: p, obraId: escolhida?.id ?? null })
    setPerfil(p)
    setObras(lista)
    setObraId(escolhida?.id ?? null)
    setCarregando(false)
    return null
  }

  useEffect(() => {
    const guardado = ler(CHAVE_PERFIL)
    if (guardado) abrirSessao(guardado)
    else setCarregando(false)
  }, [])

  function trocarObra(id) {
    definirContexto({ obraId: id })
    gravar(chaveObra(perfil.id), id)
    setObraId(id)
  }

  // Depois de criar/editar obra: relê a lista e mantém a atual se ela ainda vale.
  async function recarregarObras(preferirId) {
    const { data: lista } = await listarMinhasObras()
    setObras(lista)
    const alvo = lista.find((o) => o.id === (preferirId || obraId)) || lista[0] || null
    if (alvo?.id !== obraId) trocarObra(alvo?.id ?? null)
  }

  function sair() {
    gravar(CHAVE_PERFIL, null)
    definirContexto({ perfil: null, obraId: null })
    setPerfil(null)
    setObras([])
    setObraId(null)
  }

  const obra = obras.find((o) => o.id === obraId) || null
  return (
    <Sessao.Provider value={{ perfil, obras, obra, obraId, carregando, logo, setLogo, abrirSessao, trocarObra, recarregarObras, sair }}>
      {children}
    </Sessao.Provider>
  )
}

export function useSessao() {
  return useContext(Sessao)
}
