// A Qualidade (Vistoria, FVS, Gemba, relatório) só é baixada quando alguém abre
// a tela: assim ela não pesa na abertura do app, que é o Diário e as Frentes.
import { lazy, Suspense } from 'react'
import { Cabecalho, Carregando } from '../components/index.jsx'

const Qualidade = lazy(() => import('./qualidade.jsx'))

export default function QualidadeSobDemanda() {
  return (
    <Suspense fallback={<><Cabecalho /><main className="conteudo"><Carregando alto /></main></>}>
      <Qualidade />
    </Suspense>
  )
}
