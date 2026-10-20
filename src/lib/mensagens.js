// Textos prontos que mais de uma tela usa (um dono só).
import { formatarDiaMes } from './datas.js'

// Mensagem do botão "Cobrar" (PRD-FRONTEND, Frentes em risco).
export function textoCobranca({ empreiteiro, servico, obra, diasSemAndar, dataLimite }) {
  const prazo = dataLimite ? ` Precisamos retomar até ${formatarDiaMes(dataLimite)}.` : ''
  return `Olá, ${empreiteiro}. A frente ${servico} da obra ${obra} está há ${diasSemAndar} ${diasSemAndar === 1 ? 'dia' : 'dias'} sem andar.${prazo} Consegue me confirmar?`
}

export function linkWhatsApp(numero, texto) {
  return `https://wa.me/55${String(numero).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
}

// "−2 dias" / "até 22/10": a etiqueta de prazo da lista.
export function rotuloPrazo(calculo) {
  if (calculo.folgaRestante < 0) {
    const n = -calculo.folgaRestante
    return `−${n} ${n === 1 ? 'dia' : 'dias'}`
  }
  return `até ${formatarDiaMes(calculo.dataLimite)}`
}
