import { useSessao } from '../lib/SessaoContext.jsx'
import { Cabecalho, Casca, EstadoVazio, useRota } from '../components/index.jsx'
import Frentes from '../screens/frentes.jsx'
import Frente from '../screens/frente.jsx'
import Diario from '../screens/diario.jsx'
import Pendencias, { Pendencia } from '../screens/pendencias.jsx'
import Fotos from '../screens/fotos.jsx'
import Materiais from '../screens/materiais.jsx'
import Planejamento from '../screens/planejamento.jsx'
import Medicao from '../screens/medicao.jsx'
import Obras from '../screens/obras.jsx'
import { Cronograma, Empreiteiros, Empresa, Equipe, Mais } from '../screens/cadastros.jsx'

// Telas que funcionam sem obra escolhida (para criar a primeira).
const SEM_OBRA = ['obras', 'equipe', 'empresa', 'mais']

export default function AppEngenheiro() {
  const { obraId } = useSessao()
  const { tela, params, goto } = useRota('Engenheiro')
  let corpo
  if (!obraId && !SEM_OBRA.includes(tela)) {
    corpo = (
      <><Cabecalho /><main className="conteudo">
        <EstadoVazio icone="obras" titulo="Nenhuma obra cadastrada" texto="Crie a primeira obra para começar." acao="Criar a primeira obra" aoAgir={() => goto('obras')} />
      </main></>
    )
  } else {
    switch (tela) {
      case 'frente': corpo = <Frente goto={goto} params={params} />; break
      case 'diario': corpo = <Diario goto={goto} />; break
      case 'pendencias': corpo = <Pendencias goto={goto} params={params} />; break
      case 'pendencia': corpo = <Pendencia goto={goto} params={params} />; break
      case 'fotos': corpo = <Fotos />; break
      case 'materiais': corpo = <Materiais />; break
      case 'planejamento': corpo = <Planejamento />; break
      case 'medicao': corpo = <Medicao goto={goto} />; break
      case 'mais': corpo = <Mais goto={goto} />; break
      case 'obras': corpo = <Obras />; break
      case 'cronograma': corpo = <Cronograma goto={goto} />; break
      case 'empreiteiros': corpo = <Empreiteiros />; break
      case 'equipe': corpo = <Equipe />; break
      case 'empresa': corpo = <Empresa />; break
      default: corpo = <Frentes goto={goto} />
    }
  }
  return <Casca role="Engenheiro" tela={tela} goto={goto}>{corpo}</Casca>
}
