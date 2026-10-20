import { SessaoProvider, useSessao } from './lib/SessaoContext.jsx'
import { AvisoProvider, Carregando } from './components/index.jsx'
import Login from './pages/Login.jsx'
import Aguardando from './pages/Aguardando.jsx'
import AppEngenheiro from './pages/AppEngenheiro.jsx'
import AppMestre from './pages/AppMestre.jsx'
import AppArquiteta from './pages/AppArquiteta.jsx'
import AppCliente from './pages/AppCliente.jsx'

const CASCAS = { Engenheiro: AppEngenheiro, Mestre: AppMestre, Arquiteta: AppArquiteta, Cliente: AppCliente }

function Roteador() {
  const { perfil, obras, obraId, carregando } = useSessao()
  if (carregando) return <main className="conteudo" style={{ margin: '0 auto' }}><Carregando alto /></main>
  if (!perfil) return <Login />
  const CascaDoPerfil = CASCAS[perfil.role]
  // Pendente, ou sem nenhuma obra (exceto o engenheiro, que pode criar a primeira).
  if (!CascaDoPerfil || (!obras.length && perfil.role !== 'Engenheiro')) return <Aguardando />
  // key={obraId}: trocar de obra remonta TODAS as telas, sem sobrar dado da anterior.
  return <CascaDoPerfil key={`${perfil.id}:${obraId}`} />
}

export default function App() {
  return (
    <AvisoProvider>
      <SessaoProvider>
        <Roteador />
      </SessaoProvider>
    </AvisoProvider>
  )
}
