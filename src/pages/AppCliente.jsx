import { Casca } from '../components/index.jsx'
import Painel from '../screens/painel.jsx'

// Cliente: uma tela só, o painel da obra dele.
export default function AppCliente() {
  return <Casca role="Cliente" tela="painel" goto={() => {}}><Painel /></Casca>
}
