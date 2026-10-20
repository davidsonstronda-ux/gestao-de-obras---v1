import { Casca, useRota } from '../components/index.jsx'
import Frentes from '../screens/frentes.jsx'
import Frente from '../screens/frente.jsx'
import Pendencias, { Pendencia } from '../screens/pendencias.jsx'
import Fotos from '../screens/fotos.jsx'

// Arquiteta: responde pendências de projeto; vê frentes e fotos, sem valores.
export default function AppArquiteta() {
  const { tela, params, goto } = useRota('Arquiteta')
  let corpo
  switch (tela) {
    case 'frentes': corpo = <Frentes goto={goto} />; break
    case 'frente': corpo = <Frente goto={goto} params={params} />; break
    case 'pendencia': corpo = <Pendencia goto={goto} params={params} />; break
    case 'fotos': corpo = <Fotos />; break
    default: corpo = <Pendencias goto={goto} params={params} />
  }
  return <Casca role="Arquiteta" tela={tela} goto={goto}>{corpo}</Casca>
}
