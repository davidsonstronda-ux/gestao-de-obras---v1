// Peças de interface que as abas da Qualidade e o relatório usam igual: as
// cores de cada situação e as etiquetas dos desperdícios. Só aparência; regra
// nenhuma (essas moram em lib/qualidade.js, lib/fvs.js e lib/gemba.js).
import { DESPERDICIOS } from '../lib/gemba.js'
import { Icon } from '../components/index.jsx'

export const COR_STATUS = { Pendente: 'vermelho', 'Em andamento': 'ambar', Resolvido: 'verde' }
export const COR_SEVERIDADE = { Alta: 'vermelho', Média: 'ambar', Baixa: 'neutra' }
export const COR_NC = { Aberta: 'vermelho', Encaminhada: 'ambar', Corrigida: 'destaque', Fechada: 'verde' }
export const COR_VISTORIA = { 'Em andamento': 'ambar', 'Concluída': 'verde' }
export const pct = (n) => (n === null ? '—' : `${n}%`)

// Cada desperdício tem a sua cor (classe dsp-0 … dsp-6, na ordem oficial).
export const classeDe = (tipo) => `dsp dsp-${DESPERDICIOS.indexOf(tipo)}`
export function Etiquetas({ tipos }) {
  return <div className="etiquetas-dsp">{tipos.map((t) => <span key={t} className={classeDe(t)}>{t}</span>)}</div>
}

// Botão que abre a câmera do celular (no computador, escolhe o arquivo). A foto
// fica só no aparelho, como prévia local. Com `multiplas`, devolve uma lista.
export function TirarFoto({ rotulo, trocar = 'Trocar a foto', valor, aoMudar, multiplas }) {
  return (
    <label className="botao contorno largo">
      <Icon nome="fotos" />{valor ? trocar : rotulo}
      <input type="file" accept="image/*" capture="environment" multiple={multiplas} className="so-leitor"
        onChange={(e) => {
          const urls = [...(e.target.files || [])].map((f) => URL.createObjectURL(f))
          if (urls.length) aoMudar(multiplas ? urls : urls[0])
          e.target.value = ''
        }} />
    </label>
  )
}

// Foto do registro, ou o quadro cinza com a câmera quando não tem.
export function FotoRegistro({ src, alt }) {
  return src
    ? <img className="foto-registro" src={src} alt={alt} />
    : <div className="foto-registro sem-foto" role="img" aria-label="Sem foto"><Icon nome="fotos" /></div>
}
