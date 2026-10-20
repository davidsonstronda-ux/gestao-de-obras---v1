import { useSessao } from '../lib/SessaoContext.jsx'
import { Icon, Logo } from '../components/index.jsx'

// Conta sem perfil, ou sem nenhuma obra vinculada: não vê dado nenhum.
export default function Aguardando() {
  const { perfil, sair } = useSessao()
  return (
    <div className="tela-login">
      <div className="caixa-login">
        <div className="marca"><Logo /><span className="nome-app">Gestão de Obras</span></div>
        <div className="cartao vazio">
          <div className="ico"><Icon nome="equipe" /></div>
          <h2>Conta aguardando liberação do engenheiro</h2>
          <p>Olá, {perfil.nome}. Assim que ele liberar, você entra direto na sua obra.</p>
          <button className="botao contorno" onClick={sair}><Icon nome="sair" />Sair</button>
        </div>
      </div>
    </div>
  )
}
