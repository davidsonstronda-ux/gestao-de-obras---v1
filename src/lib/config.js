import { paraIso } from './datas.js'

// Chave única que decide de onde vêm os dados. Na Etapa 7 vira false e a
// camada de dados (dados.js) passa a falar com o Supabase; nenhuma tela muda.
export const USAR_MOCK = true

// No mock, "hoje" fica parado em 20/10/2026 para os números de exemplo do PRD
// baterem (2 frentes estouradas, decidir até 22/10...). Com banco, é o dia real.
const HOJE_DEMO = '2026-10-20'
export function hoje() {
  return USAR_MOCK ? HOJE_DEMO : paraIso(new Date())
}
