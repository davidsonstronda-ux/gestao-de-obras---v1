import { Casca, useRota } from '../components/index.jsx'
import Frentes from '../screens/frentes.jsx'
import Frente from '../screens/frente.jsx'
import Diario from '../screens/diario.jsx'
import Pendencias, { Pendencia } from '../screens/pendencias.jsx'
import Fotos from '../screens/fotos.jsx'
import Materiais from '../screens/materiais.jsx'
import Planejamento from '../screens/planejamento.jsx'
import { Mais } from '../screens/cadastros.jsx'

// Mestre: lança diário, fotos e conclusões. Não vê nenhum valor.
export default function AppMestre() {
  const { tela, params, goto } = useRota('Mestre')
  let corpo
  switch (tela) {
    case 'frentes': corpo = <Frentes goto={goto} />; break
    case 'frente': corpo = <Frente goto={goto} params={params} />; break
    case 'pendencias': corpo = <Pendencias goto={goto} params={params} />; break
    case 'pendencia': corpo = <Pendencia goto={goto} params={params} />; break
    case 'fotos': corpo = <Fotos />; break
    case 'materiais': corpo = <Materiais />; break
    case 'planejamento': corpo = <Planejamento />; break
    case 'mais': corpo = <Mais goto={goto} />; break
    default: corpo = <Diario goto={goto} />
  }
  return <Casca role="Mestre" tela={tela} goto={goto}>{corpo}</Casca>
}
