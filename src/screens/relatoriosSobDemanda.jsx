// Os Relatórios (BI da obra) só são baixados quando o engenheiro abre a tela,
// como a Qualidade: os gráficos não pesam na abertura do app.
import { lazy, Suspense } from 'react'
import { Cabecalho, Carregando } from '../components/index.jsx'

const Relatorios = lazy(() => import('./relatorios.jsx'))

export default function RelatoriosSobDemanda() {
  return (
    <Suspense fallback={<><Cabecalho /><main className="conteudo"><Carregando alto /></main></>}>
      <Relatorios />
    </Suspense>
  )
}
