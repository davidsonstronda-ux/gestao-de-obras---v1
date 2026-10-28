// Dados de mentira, com os MESMOS nomes de campo das tabelas do PRD-BACKEND.md.
// Duas obras, de propósito diferentes: a Casa Jardins tem 1 frente e nenhuma
// pendência. É assim que filtro esquecido aparece hoje, e não na obra real.
// Na Etapa 7 estes dados viram o seed do banco.
import { STATUS_PEDIDO } from './materiais.js'

export const mockObras = [
  {
    id: 'o1', nome: 'Residência Alto da Boa Vista', codigo: 'RABV',
    endereco: 'Rua das Acácias, 210 — Alto da Boa Vista', cliente_nome: 'Família Andrade',
    data_inicio: '2026-03-02', data_entrega: '2027-03-15', situacao: 'Em andamento',
  },
  {
    id: 'o2', nome: 'Casa Jardins', codigo: 'CJ',
    endereco: 'Alameda Lorena, 88 — Jardins', cliente_nome: 'Sr. Costa',
    data_inicio: '2026-09-01', data_entrega: '2027-06-30', situacao: 'Em andamento',
  },
]

export const mockProfiles = [
  { id: 'u1', nome: 'Davidson', email: 'davidson@exemplo.com', role: 'Engenheiro', ativo: true },
  { id: 'u2', nome: 'Seu Raimundo', email: 'raimundo@exemplo.com', role: 'Mestre', ativo: true },
  { id: 'u3', nome: 'Carla', email: 'carla@exemplo.com', role: 'Arquiteta', ativo: true },
  { id: 'u4', nome: 'Família Andrade', email: 'andrade@exemplo.com', role: 'Cliente', ativo: true },
  { id: 'u5', nome: 'Novo Usuário', email: 'novo@exemplo.com', role: 'Pendente', ativo: true },
]

export const mockMembros = [
  { id: 'm1', obra_id: 'o1', pessoa_id: 'u1' },
  { id: 'm2', obra_id: 'o2', pessoa_id: 'u1' },
  { id: 'm3', obra_id: 'o1', pessoa_id: 'u2' },
  { id: 'm4', obra_id: 'o1', pessoa_id: 'u3' },
  { id: 'm5', obra_id: 'o2', pessoa_id: 'u3' },
  { id: 'm6', obra_id: 'o1', pessoa_id: 'u4' },
]

export const mockAmbientes = [
  { id: 'a1', obra_id: 'o1', nome: 'Sala', ordem: 1 },
  { id: 'a2', obra_id: 'o1', nome: 'Cozinha', ordem: 2 },
  { id: 'a3', obra_id: 'o1', nome: 'Suíte master', ordem: 3 },
  { id: 'a4', obra_id: 'o1', nome: 'Banho social', ordem: 4 },
  { id: 'a5', obra_id: 'o1', nome: 'Área gourmet', ordem: 5 },
  { id: 'a6', obra_id: 'o1', nome: 'Fachada', ordem: 6 },
  { id: 'a7', obra_id: 'o2', nome: 'Sala', ordem: 1 },
  { id: 'a8', obra_id: 'o2', nome: 'Cozinha', ordem: 2 },
]

export const mockEmpreiteiros = [
  { id: 'e1', obra_id: 'o1', nome: 'Hidro Sul', especialidade: 'Hidráulica', whatsapp: '21900000001' },
  { id: 'e2', obra_id: 'o1', nome: 'ImperTec', especialidade: 'Impermeabilização', whatsapp: '21900000002' },
  { id: 'e3', obra_id: 'o1', nome: 'Gesso & Cia', especialidade: 'Forro de gesso', whatsapp: '21900000003' },
  { id: 'e4', obra_id: 'o1', nome: 'Elétrica Ramos', especialidade: 'Elétrica', whatsapp: '21900000004' },
  { id: 'e5', obra_id: 'o1', nome: 'Pedras Nobres', especialidade: 'Bancadas', whatsapp: '21900000005' },
  { id: 'e6', obra_id: 'o1', nome: 'Pinturas Lima', especialidade: 'Pintura e alvenaria', whatsapp: '21900000006' },
  { id: 'e7', obra_id: 'o1', nome: 'Marcenaria Oliveira', especialidade: 'Marcenaria', whatsapp: '21900000007' },
  { id: 'e8', obra_id: 'o1', nome: 'Vidraçaria Luz', especialidade: 'Esquadrias de vidro', whatsapp: '21900000008' },
  { id: 'e10', obra_id: 'o1', nome: 'Drywall Prime', especialidade: 'Drywall e forros', whatsapp: '21900000010' },
  { id: 'e9', obra_id: 'o2', nome: 'Fundações Base', especialidade: 'Fundação', whatsapp: '11900000009' },
]

export const mockFrentes = [
  { id: 'f1', obra_id: 'o1', empreiteiro_id: 'e2', servico: 'Impermeabilização áreas molhadas', inicio_previsto: '2026-10-01', termino_previsto: '2026-10-25', folga_dias: 4, situacao: 'Em andamento', concluida_em: null },
  { id: 'f2', obra_id: 'o1', empreiteiro_id: 'e3', servico: 'Forro de gesso', inicio_previsto: '2026-10-06', termino_previsto: '2026-10-31', folga_dias: 8, situacao: 'Em andamento', concluida_em: null },
  { id: 'f3', obra_id: 'o1', empreiteiro_id: 'e1', servico: 'Instalações hidráulicas', inicio_previsto: '2026-09-15', termino_previsto: '2026-10-24', folga_dias: 10, situacao: 'Em andamento', concluida_em: null },
  { id: 'f4', obra_id: 'o1', empreiteiro_id: 'e4', servico: 'Elétrica — passagem de fios', inicio_previsto: '2026-09-22', termino_previsto: '2026-10-30', folga_dias: 6, situacao: 'Em andamento', concluida_em: null },
  { id: 'f5', obra_id: 'o1', empreiteiro_id: 'e5', servico: 'Bancadas de mármore', inicio_previsto: '2026-10-13', termino_previsto: '2026-11-07', folga_dias: 8, situacao: 'Não iniciada', concluida_em: null },
  { id: 'f6', obra_id: 'o1', empreiteiro_id: 'e1', servico: 'Revestimento suíte master', inicio_previsto: '2026-09-29', termino_previsto: '2026-10-17', folga_dias: 20, situacao: 'Em andamento', concluida_em: null },
  { id: 'f7', obra_id: 'o1', empreiteiro_id: 'e6', servico: 'Alvenaria de vedação', inicio_previsto: '2026-08-01', termino_previsto: '2026-09-20', folga_dias: 5, situacao: 'Concluída', concluida_em: '2026-09-18' },
  { id: 'f8', obra_id: 'o1', empreiteiro_id: 'e7', servico: 'Marcenaria cozinha', inicio_previsto: '2026-11-10', termino_previsto: '2026-12-15', folga_dias: 15, situacao: 'Não iniciada', concluida_em: null },
  { id: 'f9', obra_id: 'o1', empreiteiro_id: 'e8', servico: 'Esquadrias de vidro', inicio_previsto: '2026-11-03', termino_previsto: '2026-11-28', folga_dias: 10, situacao: 'Não iniciada', concluida_em: null },
  { id: 'f10', obra_id: 'o1', empreiteiro_id: 'e6', servico: 'Pintura fachada', inicio_previsto: '2026-10-01', termino_previsto: '2026-10-30', folga_dias: 3, situacao: 'Em andamento', concluida_em: null },
  { id: 'f12', obra_id: 'o1', empreiteiro_id: 'e10', servico: 'Drywall e tabicas', inicio_previsto: '2026-09-08', termino_previsto: '2026-10-17', folga_dias: 6, situacao: 'Concluída', concluida_em: '2026-10-16' },
  { id: 'f11', obra_id: 'o2', empreiteiro_id: 'e9', servico: 'Fundação', inicio_previsto: '2026-10-01', termino_previsto: '2026-11-15', folga_dias: 10, situacao: 'Em andamento', concluida_em: null },
]

// Só o engenheiro lê esta tabela (separada de frentes por causa disso).
export const mockContratos = [
  { id: 'c1', obra_id: 'o1', frente_id: 'f1', valor_contratado: 38500 },
  { id: 'c2', obra_id: 'o1', frente_id: 'f2', valor_contratado: 30000 },
  { id: 'c3', obra_id: 'o1', frente_id: 'f3', valor_contratado: 62000 },
  { id: 'c4', obra_id: 'o1', frente_id: 'f4', valor_contratado: 33900 },
  { id: 'c5', obra_id: 'o1', frente_id: 'f5', valor_contratado: 54200 },
  { id: 'c6', obra_id: 'o1', frente_id: 'f6', valor_contratado: 18600 },
  { id: 'c7', obra_id: 'o1', frente_id: 'f7', valor_contratado: 41000 },
  { id: 'c8', obra_id: 'o1', frente_id: 'f8', valor_contratado: 47500 },
  { id: 'c9', obra_id: 'o1', frente_id: 'f9', valor_contratado: 39800 },
  { id: 'c10', obra_id: 'o1', frente_id: 'f10', valor_contratado: 27800 },
  // Drywall: 200 m² de placas × R$ 80 + 200 m² de juntas × R$ 40 + 50 m de tabica × R$ 120.
  { id: 'c12', obra_id: 'o1', frente_id: 'f12', valor_contratado: 30000 },
  { id: 'c11', obra_id: 'o2', frente_id: 'f11', valor_contratado: 96000 },
]

// Medições (só o engenheiro lê). Uma por empreiteiro e período; Rascunho ainda
// não conta no medido. Valor sugerido = contratado × ambientes concluídos no
// período ÷ ambientes da frente (lib/medicao.js).
export const mockMedicoes = [
  { id: 'md1', obra_id: 'o1', empreiteiro_id: 'e6', periodo_inicio: '2026-09-01', periodo_fim: '2026-09-30', situacao: 'Fechada', fechada_em: '2026-10-01T09:00:00', created_at: '2026-10-01T08:30:00' },
  { id: 'md2', obra_id: 'o1', empreiteiro_id: 'e1', periodo_inicio: '2026-09-15', periodo_fim: '2026-10-05', situacao: 'Fechada', fechada_em: '2026-10-06T10:00:00', created_at: '2026-10-06T09:40:00' },
  { id: 'md3', obra_id: 'o1', empreiteiro_id: 'e4', periodo_inicio: '2026-09-22', periodo_fim: '2026-10-10', situacao: 'Fechada', fechada_em: '2026-10-13T08:15:00', created_at: '2026-10-13T08:00:00' },
  { id: 'md4', obra_id: 'o1', empreiteiro_id: 'e1', periodo_inicio: '2026-10-06', periodo_fim: '2026-10-20', situacao: 'Rascunho', fechada_em: null, created_at: '2026-10-20T07:50:00' },
  // Drywall: duas medições fechadas (Sala, depois Cozinha); a Suíte, concluída em 16/10, está a medir.
  { id: 'md6', obra_id: 'o1', empreiteiro_id: 'e10', periodo_inicio: '2026-09-08', periodo_fim: '2026-09-30', situacao: 'Fechada', fechada_em: '2026-10-01T10:00:00', created_at: '2026-10-01T09:45:00' },
  { id: 'md7', obra_id: 'o1', empreiteiro_id: 'e10', periodo_inicio: '2026-10-01', periodo_fim: '2026-10-10', situacao: 'Fechada', fechada_em: '2026-10-13T09:00:00', created_at: '2026-10-13T08:40:00' },
  { id: 'md8', obra_id: 'o1', empreiteiro_id: 'e3', periodo_inicio: '2026-10-06', periodo_fim: '2026-10-20', situacao: 'Rascunho', fechada_em: null, created_at: '2026-10-20T08:10:00' },
  { id: 'md5', obra_id: 'o2', empreiteiro_id: 'e9', periodo_inicio: '2026-10-01', periodo_fim: '2026-10-15', situacao: 'Fechada', fechada_em: '2026-10-16T11:00:00', created_at: '2026-10-16T10:30:00' },
]

export const mockMedicaoItens = [
  { id: 'mi1', obra_id: 'o1', medicao_id: 'md1', frente_id: 'f7', valor_sugerido: 41000, valor: 41000, justificativa: null },
  { id: 'mi2', obra_id: 'o1', medicao_id: 'md1', frente_id: 'f10', valor_sugerido: 0, valor: 0, justificativa: null },
  { id: 'mi3', obra_id: 'o1', medicao_id: 'md2', frente_id: 'f3', valor_sugerido: 15500, valor: 15500, justificativa: null },
  { id: 'mi4', obra_id: 'o1', medicao_id: 'md2', frente_id: 'f6', valor_sugerido: 0, valor: 0, justificativa: null },
  { id: 'mi5', obra_id: 'o1', medicao_id: 'md3', frente_id: 'f4', valor_sugerido: 6780, valor: 8000, justificativa: 'Passagem de fios do pavimento inteiro já feita; combinado adiantar.' },
  { id: 'mi6', obra_id: 'o1', medicao_id: 'md4', frente_id: 'f3', valor_sugerido: 15500, valor: 15500, justificativa: null },
  { id: 'mi7', obra_id: 'o1', medicao_id: 'md4', frente_id: 'f6', valor_sugerido: 0, valor: 0, justificativa: null },
  { id: 'mi9', obra_id: 'o1', medicao_id: 'md6', frente_id: 'f12', valor_sugerido: 10000, valor: 10000, justificativa: null },
  { id: 'mi10', obra_id: 'o1', medicao_id: 'md7', frente_id: 'f12', valor_sugerido: 10000, valor: 10000, justificativa: null },
  { id: 'mi11', obra_id: 'o1', medicao_id: 'md8', frente_id: 'f2', valor_sugerido: 10000, valor: 10000, justificativa: null },
  { id: 'mi8', obra_id: 'o2', medicao_id: 'md5', frente_id: 'f11', valor_sugerido: 0, valor: 19200, justificativa: 'Mobilização do canteiro: 20% na assinatura, previsto no contrato.' },
]

// Em quais ambientes cada frente acontece, e quando foi concluída em cada um.
const fa = (id, frente, ambiente, concluido_em = null) => ({
  id, obra_id: frente === 'f11' ? 'o2' : 'o1', frente_id: frente, ambiente_id: ambiente,
  concluido_em, concluido_por: concluido_em ? 'u2' : null,
})
export const mockFrenteAmbientes = [
  fa('x1', 'f1', 'a4', '2026-10-09'), fa('x2', 'f1', 'a3'), fa('x3', 'f1', 'a5'), fa('x4', 'f1', 'a2'),
  fa('x5', 'f2', 'a1', '2026-10-13'), fa('x6', 'f2', 'a2'), fa('x7', 'f2', 'a3'),
  fa('x8', 'f3', 'a2', '2026-10-02'), fa('x9', 'f3', 'a4', '2026-10-10'), fa('x10', 'f3', 'a3'), fa('x11', 'f3', 'a5'),
  fa('x12', 'f4', 'a1', '2026-10-08'), fa('x13', 'f4', 'a2', '2026-10-15'), fa('x14', 'f4', 'a3'), fa('x15', 'f4', 'a4'), fa('x16', 'f4', 'a5'),
  fa('x17', 'f5', 'a2'), fa('x18', 'f5', 'a4'), fa('x19', 'f5', 'a3'), fa('x20', 'f5', 'a5'),
  fa('x21', 'f6', 'a3'),
  fa('x22', 'f7', 'a1', '2026-09-18'), fa('x23', 'f7', 'a2', '2026-09-18'), fa('x24', 'f7', 'a3', '2026-09-18'), fa('x25', 'f7', 'a4', '2026-09-18'), fa('x26', 'f7', 'a5', '2026-09-18'),
  fa('x27', 'f8', 'a2'), fa('x28', 'f8', 'a3'),
  fa('x29', 'f9', 'a1'), fa('x30', 'f9', 'a3'), fa('x31', 'f9', 'a6'),
  fa('x32', 'f10', 'a6'),
  fa('x35', 'f12', 'a1', '2026-09-26'), fa('x36', 'f12', 'a2', '2026-10-07'), fa('x37', 'f12', 'a3', '2026-10-16'),
  fa('x33', 'f11', 'a7'), fa('x34', 'f11', 'a8'),
]

// Diários: a obra 1 começou a usar o app em 05/10; 11/10 é domingo e 12/10 foi
// feriado (sem diário). A obra 2 começou em 13/10. Hoje (20/10) ainda não lançado.
const DIAS_O1 = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10',
  '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19']
const DIAS_O2 = ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19']

const OCORRENCIAS = {
  '2026-10-13': 'Equipe da ImperTec veio sem material. Foram embora às 10h.',
  '2026-10-14': 'Chuva desde a madrugada. Fachada parada.',
  '2026-10-16': 'Gesso & Cia dispensado: segue sem a altura do nicho do box (pendência de 15/10).',
  '2026-10-19': 'Manta asfáltica não chegou. Fornecedor prometeu para quarta.',
}

// Clima fora do padrão "Sol" da obra 1. A chuva bate com o motivo da fachada parada.
const CLIMA_O1 = {
  '2026-10-13': 'Nublado', '2026-10-14': 'Chuva', '2026-10-15': 'Chuva',
  '2026-10-16': 'Chuva', '2026-10-17': 'Chuva', '2026-10-19': 'Nublado',
}

// Pessoas por empreiteiro nos últimos dias da obra 1. Só aparece quem estava na
// obra: quem "não andou" por falta de gente ou aguardando projeto não veio.
const EQUIPES_O1 = {
  '2026-10-05': { e1: 4, e2: 3, e4: 3, e6: 4, e10: 3 },
  '2026-10-06': { e1: 4, e2: 3, e3: 3, e4: 3, e6: 4, e10: 3 },
  '2026-10-07': { e1: 4, e2: 3, e3: 3, e4: 3, e6: 3, e10: 3 },
  '2026-10-08': { e2: 3, e3: 3, e4: 3, e6: 4, e10: 2 },
  '2026-10-09': { e2: 2, e3: 3, e4: 2, e6: 4, e10: 2 },
  '2026-10-10': { e2: 3, e3: 2, e4: 2, e6: 3, e10: 2 },
  '2026-10-13': { e1: 4, e2: 3, e3: 3, e4: 2, e6: 3 },
  '2026-10-14': { e1: 4, e3: 3, e4: 2 },
  '2026-10-15': { e1: 3, e4: 2 },
  '2026-10-16': { e1: 3 },
  '2026-10-17': { e1: 2 },
  '2026-10-19': { e1: 4, e4: 3, e6: 4 },
}
const equipesDe = (data) => Object.entries(EQUIPES_O1[data] || {}).map(([empreiteiro_id, pessoas]) => ({ empreiteiro_id, pessoas }))

export const mockDiarios = [
  ...DIAS_O1.map((data) => ({
    id: `d1-${data}`, obra_id: 'o1', data, clima: CLIMA_O1[data] || 'Sol',
    equipes: equipesDe(data), ocorrencias: OCORRENCIAS[data] || '', autor_id: 'u2',
  })),
  ...DIAS_O2.map((data) => ({
    id: `d2-${data}`, obra_id: 'o2', data, clima: data === '2026-10-15' ? 'Nublado' : 'Sol',
    equipes: [{ empreiteiro_id: 'e9', pessoas: data === '2026-10-13' ? 4 : 6 }], ocorrencias: '', autor_id: 'u1',
  })),
]

// Quando cada frente NÃO andou, e por quê. Todo outro dia de diário a partir do
// início da frente ela andou — exceto a f5, que nunca começou (sem apontamento).
const PAROU = {
  f1: { motivo: 'Falta material', dias: ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19'] },
  f2: { motivo: 'Aguardando projeto', dias: ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19'] },
  f3: { motivo: 'Falta material', dias: ['2026-10-08', '2026-10-09'] },
  f4: { motivo: 'Falta gente', dias: ['2026-10-16', '2026-10-17'] },
  f6: { motivo: 'Aguardando outra frente', dias: ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19'] },
  f10: { motivo: 'Chuva', dias: ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'] },
  f11: { motivo: null, dias: [] },
}

export const mockApontamentos = mockFrentes
  .filter((f) => PAROU[f.id])
  .flatMap((f) => {
    const dias = f.obra_id === 'o1' ? DIAS_O1 : DIAS_O2
    return dias
      .filter((data) => data >= f.inicio_previsto)
      .map((data) => {
        const parou = PAROU[f.id].dias.includes(data)
        return {
          id: `ap-${f.id}-${data}`, obra_id: f.obra_id, diario_id: `d${f.obra_id.slice(1)}-${data}`, frente_id: f.id,
          situacao: parou ? 'Não andou' : 'Andou', motivo: parou ? PAROU[f.id].motivo : null, motivo_detalhe: null,
        }
      })
  })

// 12 fotos na obra 1: 8 liberadas ao cliente, 4 aguardando (2 delas de 19/10).
const foto = (id, data, frente, ambiente, liberada, obra = 'o1') => ({
  id, obra_id: obra, frente_id: frente, ambiente_id: ambiente, caminho: `fotos/${obra}/${id}.jpg`,
  tirada_em: data, autor_id: 'u2', visivel_cliente: liberada,
})
export const mockFotos = [
  foto('p1', '2026-10-06', 'f3', 'a2', true), foto('p2', '2026-10-08', 'f4', 'a1', true),
  foto('p3', '2026-10-09', 'f1', 'a4', true), foto('p4', '2026-10-10', 'f3', 'a4', true),
  foto('p5', '2026-10-13', 'f2', 'a1', true), foto('p6', '2026-10-14', 'f10', 'a6', false),
  foto('p7', '2026-10-15', 'f4', 'a2', true), foto('p8', '2026-10-16', 'f6', 'a3', true),
  foto('p9', '2026-10-17', 'f1', 'a3', false), foto('p10', '2026-10-17', 'f2', 'a3', true),
  foto('p11', '2026-10-19', 'f10', 'a6', false), foto('p12', '2026-10-19', 'f3', 'a3', false),
  foto('p13', '2026-10-16', 'f11', 'a7', true, 'o2'),
]

export const mockPendencias = [
  { id: 'pd1', obra_id: 'o1', frente_id: 'f2', pergunta: 'Altura do nicho do box da suíte master?', situacao: 'Aberta', aberta_por: 'u2', created_at: '2026-10-15T09:20:00', fechada_em: null },
  { id: 'pd2', obra_id: 'o1', frente_id: 'f4', pergunta: 'Ponto elétrico da ilha da cozinha muda de lugar?', situacao: 'Respondida', aberta_por: 'u1', created_at: '2026-10-09T14:05:00', fechada_em: null },
  { id: 'pd3', obra_id: 'o1', frente_id: 'f6', pergunta: 'Paginação do porcelanato da sala', situacao: 'Fechada', aberta_por: 'u1', created_at: '2026-09-25T10:00:00', fechada_em: '2026-09-29T16:00:00' },
]

export const mockComentarios = [
  { id: 'cm1', obra_id: 'o1', pendencia_id: 'pd1', frente_id: null, texto: 'Sem essa medida o gesso não fecha o forro do banho.', autor_id: 'u2', created_at: '2026-10-15T09:22:00' },
  { id: 'cm2', obra_id: 'o1', pendencia_id: 'pd2', frente_id: null, texto: 'Muda sim: 40 cm para a esquerda, conforme prancha E-03 rev. 2.', autor_id: 'u3', created_at: '2026-10-10T11:30:00' },
  { id: 'cm3', obra_id: 'o1', pendencia_id: 'pd3', frente_id: null, texto: 'Paginação a 45°, começando pela porta da varanda.', autor_id: 'u3', created_at: '2026-09-27T15:00:00' },
  { id: 'cm4', obra_id: 'o1', pendencia_id: null, frente_id: 'f1', texto: 'Liguei para a ImperTec: o pedido de manta foi feito atrasado. Cobrar nova data até segunda.', autor_id: 'u1', created_at: '2026-10-17T17:40:00' },
]

// ── Materiais (Kanban de pedidos) ──────────────────────────────────────────
// Catálogo da empresa: sem obra_id, vale para todas as obras.
export const mockMateriais = [
  { id: 'mt1', nome: 'Cimento CP-II', unidade: 'saco 50 kg', categoria: 'Grosso' },
  { id: 'mt2', nome: 'Areia média', unidade: 'm³', categoria: 'Grosso' },
  { id: 'mt3', nome: 'Brita 1', unidade: 'm³', categoria: 'Grosso' },
  { id: 'mt4', nome: 'Bloco cerâmico 14×19×29', unidade: 'milheiro', categoria: 'Grosso' },
  { id: 'mt5', nome: 'Manta asfáltica 4 mm', unidade: 'rolo', categoria: 'Grosso' },
  { id: 'mt6', nome: 'Argamassa AC-III', unidade: 'saco 20 kg', categoria: 'Acabamento' },
  { id: 'mt7', nome: 'Porcelanato 90×90 polido', unidade: 'm²', categoria: 'Acabamento' },
  { id: 'mt8', nome: 'Rejunte epóxi', unidade: 'kg', categoria: 'Acabamento' },
  { id: 'mt9', nome: 'Chapa de gesso acartonado ST', unidade: 'chapa', categoria: 'Acabamento' },
  { id: 'mt10', nome: 'Tinta acrílica fosca', unidade: 'lata 18 L', categoria: 'Acabamento' },
  { id: 'mt11', nome: 'Tubo PVC soldável 25 mm', unidade: 'barra 6 m', categoria: 'Instalações' },
  { id: 'mt12', nome: 'Cabo flexível 2,5 mm²', unidade: 'rolo 100 m', categoria: 'Instalações' },
]

// Obra 1: 10 pedidos nas 5 colunas (2 já entregues), 2 críticos, 1 ATRASADO (manta, previsão 16/10
// e ainda a caminho — é ela que parou a impermeabilização) e 1 recebido com problema.
// Obra 2: só 2, para trocar de obra e ver o quadro mudar inteiro.
const pedido = (id, obra_id, material_id, quantidade, frente_id, prioridade, status, extra = {}) => ({
  id, obra_id, material_id, quantidade, frente_id, prioridade, status,
  fornecedor: '', previsao_entrega: '', qtd_bate_nf: null, estado_ok: null, avarias: '', foto_nf: '',
  criado_por: obra_id === 'o1' ? 'u2' : 'u1', ...extra,
})
export const mockPedidos = [
  pedido('pm1', 'o1', 'mt5', 30, 'f1', 'Crítico', 'A caminho', { fornecedor: 'Casa da Impermeabilização', previsao_entrega: '2026-10-16' }),
  pedido('pm2', 'o1', 'mt9', 120, 'f2', 'Normal', 'Em cotação'),
  pedido('pm3', 'o1', 'mt11', 40, 'f3', 'Normal', 'No almoxarifado', { fornecedor: 'Hidráulica Central', previsao_entrega: '2026-10-15', qtd_bate_nf: true, estado_ok: true }),
  pedido('pm4', 'o1', 'mt12', 6, 'f4', 'Normal', 'A caminho', { fornecedor: 'Elétrica Total', previsao_entrega: '2026-10-23' }),
  pedido('pm5', 'o1', 'mt7', 85, 'f6', 'Crítico', 'Solicitar'),
  pedido('pm6', 'o1', 'mt10', 12, 'f10', 'Normal', 'Solicitar'),
  pedido('pm7', 'o1', 'mt6', 60, 'f6', 'Normal', 'No almoxarifado', { fornecedor: 'Depósito São Jorge', previsao_entrega: '2026-10-08', qtd_bate_nf: false, estado_ok: true, avarias: 'Vieram 56 sacos; a NF diz 60.' }),
  pedido('pm8', 'o1', 'mt8', 20, 'f6', 'Normal', 'Em cotação'),
  pedido('pm9', 'o1', 'mt1', 50, 'f10', 'Normal', 'Entregue', { fornecedor: 'Depósito São Jorge', previsao_entrega: '2026-10-02', qtd_bate_nf: true, estado_ok: true }),
  pedido('pm12', 'o1', 'mt4', 6, 'f7', 'Normal', 'Entregue', { fornecedor: 'Cerâmica Paraíso', previsao_entrega: '2026-08-11', qtd_bate_nf: true, estado_ok: true }),
  pedido('pm10', 'o2', 'mt1', 80, 'f11', 'Crítico', 'Em cotação'),
  pedido('pm11', 'o2', 'mt3', 6, 'f11', 'Normal', 'Solicitar'),
]

// Cada mudança de coluna. O autor é quem moveu (mestre na obra 1, engenheiro na 2).
const HIST = {
  pm1: ['2026-10-08', '2026-10-09', '2026-10-13'],
  pm2: ['2026-10-14', '2026-10-15'],
  pm3: ['2026-10-02', '2026-10-05', '2026-10-07', '2026-10-15'],
  pm4: ['2026-10-10', '2026-10-13', '2026-10-16'],
  pm5: ['2026-10-19'],
  pm6: ['2026-10-20'],
  pm7: ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-09'],
  pm8: ['2026-10-16', '2026-10-17'],
  pm9: ['2026-09-28', '2026-09-29', '2026-10-01', '2026-10-03', '2026-10-06'],
  pm12: ['2026-08-03', '2026-08-04', '2026-08-06', '2026-08-11', '2026-08-12'],
  pm10: ['2026-10-14', '2026-10-16'],
  pm11: ['2026-10-19'],
}
export const mockPedidoHistorico = mockPedidos.flatMap((p) => HIST[p.id].map((data, i) => ({
  id: `ph-${p.id}-${i}`, obra_id: p.obra_id, pedido_id: p.id, status: STATUS_PEDIDO[i], data, autor_id: p.criado_por,
})))

// ── Estoque (opcional) do módulo Materiais ─────────────────────────────────
// Obra 1: os 3 pedidos recebidos com checklist OK viraram entrada (tubo PVC,
// cimento, bloco); a argamassa veio com problema e não entrou sozinha.
// 2 insumos críticos (saldo ≤ mínimo): cimento e bloco.
// Obra 2: só a areia, com saldo inicial lançado à mão.
// O saldo de cada insumo é a soma dos movimentos dele (o teste confere).
export const mockInsumos = [
  { id: 'in1', obra_id: 'o1', material_id: 'mt1', saldo: 10, unidade: 'saco 50 kg', saldo_minimo: 15 },
  { id: 'in2', obra_id: 'o1', material_id: 'mt11', saldo: 12, unidade: 'barra 6 m', saldo_minimo: 10 },
  { id: 'in3', obra_id: 'o1', material_id: 'mt4', saldo: 1, unidade: 'milheiro', saldo_minimo: 1 },
  { id: 'in4', obra_id: 'o2', material_id: 'mt2', saldo: 5, unidade: 'm³', saldo_minimo: 4 },
]

const mov = (id, obra_id, insumo_id, tipo, quantidade, data, frente_id, origem, pedido_id = null) => ({
  id, obra_id, insumo_id, tipo, quantidade, data, frente_id, origem, pedido_id, autor_id: obra_id === 'o1' ? 'u2' : 'u1',
})
export const mockMovimentos = [
  mov('mv1', 'o1', 'in3', 'Entrada', 6, '2026-08-12', 'f7', 'Pedido', 'pm12'),
  mov('mv2', 'o1', 'in3', 'Saída', 3, '2026-08-14', 'f7', 'Manual'),
  mov('mv3', 'o1', 'in3', 'Saída', 2, '2026-08-25', 'f7', 'Manual'),
  mov('mv4', 'o1', 'in1', 'Entrada', 50, '2026-10-03', 'f10', 'Pedido', 'pm9'),
  mov('mv5', 'o1', 'in1', 'Saída', 20, '2026-10-06', 'f10', 'Manual'),
  mov('mv6', 'o1', 'in1', 'Saída', 15, '2026-10-13', 'f10', 'Manual'),
  mov('mv7', 'o1', 'in1', 'Saída', 5, '2026-10-17', 'f6', 'Manual'),
  mov('mv8', 'o1', 'in2', 'Entrada', 40, '2026-10-15', 'f3', 'Pedido', 'pm3'),
  mov('mv9', 'o1', 'in2', 'Saída', 18, '2026-10-16', 'f3', 'Manual'),
  mov('mv10', 'o1', 'in2', 'Saída', 10, '2026-10-19', 'f3', 'Manual'),
  mov('mv11', 'o2', 'in4', 'Entrada', 8, '2026-10-01', null, 'Manual'),
  mov('mv12', 'o2', 'in4', 'Saída', 3, '2026-10-14', 'f11', 'Manual'),
]

// ── Planejamento (Last Planner + EAP) ──────────────────────────────────────
// Obra 1: calendário seg–sáb com 3 feriados. Obra 2: sem calendário gravado
// (usa o padrão), nenhum feriado e só 2 atividades.
export const mockCalendarios = [
  { id: 'cal1', obra_id: 'o1', dias_semana: [1, 2, 3, 4, 5, 6] },
]

export const mockFeriados = [
  { id: 'fe1', obra_id: 'o1', data: '2026-11-02', nome: 'Finados' },
  { id: 'fe2', obra_id: 'o1', data: '2026-11-20', nome: 'Consciência Negra' },
  { id: 'fe3', obra_id: 'o1', data: '2026-12-25', nome: 'Natal' },
]

// EAP da obra 1, nas fases da obra: Demolição → Reboco → Hidráulica → Elétrica
// → Acabamento. 12 na árvore (3 grupos com subatividades) + 1 arquivada.
// Hoje = 20/10 (semana de 19 a 25/10):
// - 3 concluídas: demolição (29/08), reboco (19/10) e quadro de distribuição
//   (20/10). As duas últimas caem nesta semana: PPC = 2 de 8 = 25%.
// - 1 acumulada: o revestimento devia ter terminado em 17/10.
// - 2 impedidas por restrição (ver mockRestricoes): impermeabilização e fios.
// Status com o texto do banco: 'A fazer', 'Em andamento', 'Concluído'.
// Grupo (Hidráulica, Elétrica, Acabamento): datas e % saem das filhas.
const at = (id, obra_id, pai_id, ordem, titulo, inicio, fim, frente_id, progresso, status, { arquivada = false, concluida_em } = {}) => ({
  id, obra_id, pai_id, ordem, titulo, inicio, fim, frente_id, progresso, status, arquivada, criado_por: 'u1',
  concluida_em: status === 'Concluído' ? concluida_em || fim : null,
})
export const mockAtividades = [
  at('at1', 'o1', null, 1, 'Demolição e retirada de entulho', '2026-08-03', '2026-08-29', null, 100, 'Concluído'),
  at('at2', 'o1', null, 2, 'Reboco interno', '2026-09-01', '2026-10-20', null, 100, 'Concluído', { concluida_em: '2026-10-19' }),
  at('at3', 'o1', null, 3, 'Hidráulica', '2026-09-15', '2026-10-25', null, 0, 'A fazer'),
  at('at4', 'o1', 'at3', 1, 'Tubulação de água e esgoto', '2026-09-15', '2026-10-24', 'f3', 80, 'Em andamento'),
  at('at5', 'o1', 'at3', 2, 'Impermeabilização das áreas molhadas', '2026-10-01', '2026-10-25', 'f1', 30, 'Em andamento'),
  at('at6', 'o1', null, 4, 'Elétrica', '2026-09-22', '2026-10-30', null, 0, 'A fazer'),
  at('at7', 'o1', 'at6', 1, 'Passagem de fios', '2026-09-22', '2026-10-30', 'f4', 55, 'Em andamento'),
  at('at8', 'o1', 'at6', 2, 'Quadro de distribuição', '2026-10-19', '2026-10-20', 'f4', 100, 'Concluído'),
  at('at9', 'o1', null, 5, 'Acabamento', '2026-09-29', '2026-11-07', null, 0, 'A fazer'),
  at('at10', 'o1', 'at9', 1, 'Forro de gesso', '2026-10-06', '2026-10-31', 'f2', 40, 'Em andamento'),
  at('at11', 'o1', 'at9', 2, 'Revestimento da suíte master', '2026-09-29', '2026-10-17', 'f6', 70, 'Em andamento'),
  at('at12', 'o1', 'at9', 3, 'Bancadas de mármore', '2026-10-19', '2026-11-07', 'f5', 0, 'A fazer'),
  at('at13', 'o1', null, 9, 'Piso da área gourmet (saiu do escopo)', '2026-11-09', '2026-11-20', null, 0, 'A fazer', { arquivada: true }),
  // Histórico de agosto a outubro, para a Curva S e o PPC dos Relatórios nascerem
  // com semanas passadas. A estrutura do drywall atrasou e saiu depois do prazo.
  at('at30', 'o1', null, 7, 'Alvenaria de vedação', '2026-08-03', '2026-09-19', null, 0, 'A fazer'),
  at('at31', 'o1', 'at30', 1, 'Marcação e primeira fiada', '2026-08-03', '2026-08-08', 'f7', 100, 'Concluído', { concluida_em: '2026-08-07' }),
  at('at32', 'o1', 'at30', 2, 'Elevação das paredes', '2026-08-10', '2026-09-05', 'f7', 100, 'Concluído', { concluida_em: '2026-09-04' }),
  at('at33', 'o1', 'at30', 3, 'Vergas, contravergas e encunhamento', '2026-09-07', '2026-09-19', 'f7', 100, 'Concluído', { concluida_em: '2026-09-18' }),
  at('at34', 'o1', null, 8, 'Drywall e tabicas', '2026-09-08', '2026-10-16', null, 0, 'A fazer'),
  at('at35', 'o1', 'at34', 1, 'Estrutura metálica', '2026-09-08', '2026-09-19', 'f12', 100, 'Concluído', { concluida_em: '2026-09-23' }),
  at('at36', 'o1', 'at34', 2, 'Fechamento em placas', '2026-09-21', '2026-10-03', 'f12', 100, 'Concluído', { concluida_em: '2026-10-02' }),
  at('at37', 'o1', 'at34', 3, 'Juntas e tabicas', '2026-10-05', '2026-10-16', 'f12', 100, 'Concluído', { concluida_em: '2026-10-16' }),
  at('at20', 'o2', null, 1, 'Fundação', '2026-10-01', '2026-11-15', null, 0, 'A fazer'),
  at('at21', 'o2', 'at20', 1, 'Estacas e blocos', '2026-10-01', '2026-11-15', 'f11', 35, 'Em andamento'),
]

// Médio prazo (lookahead). Obra 1: 2 atividades impedidas por restrição aberta
// (a manta venceu em 17/10) e 1 restrição já resolvida. Prontas na janela de
// 4 semanas: 4 de 6. Obra 2: uma só.
const rs = (id, obra_id, atividade_id, tipo, descricao, prazo, responsavel, resolvida_em = null) => ({
  id, obra_id, atividade_id, tipo, descricao, prazo, responsavel, resolvida_em,
})
export const mockRestricoes = [
  rs('rs1', 'o1', 'at5', 'Material', 'Manta asfáltica em falta no fornecedor', '2026-10-17', 'Davidson'),
  rs('rs2', 'o1', 'at7', 'Mão de obra', 'Equipe reduzida: faltam 2 eletricistas', '2026-10-23', 'Elétrica Ramos'),
  rs('rs3', 'o1', 'at4', 'Material', 'Registros de pressão do banho social', '2026-10-24', 'Hidro Sul', '2026-10-19'),
  rs('rs20', 'o2', 'at21', 'Projeto', 'Laudo da sondagem complementar', '2026-10-30', 'Davidson'),
]

// Curto prazo. Subtarefas (checklist) de 3 atividades da obra 1 e 1 da obra 2.
// Na semana passada (12 a 18/10) a impermeabilização e o forro não foram
// realizados, com as mesmas causas do diário daquela semana.
const st = (id, obra_id, atividade_id, titulo, situacao = 'Pendente', causa = null) => ({
  id, obra_id, atividade_id, titulo, situacao, causa, causa_detalhe: null,
})
export const mockSubtarefas = [
  st('st1', 'o1', 'at5', 'Limpeza e regularização da base', 'Feita'),
  st('st2', 'o1', 'at5', 'Primer', 'Feita'),
  st('st3', 'o1', 'at5', 'Manta: primeira camada', 'Não realizado', 'Falta material'),
  st('st4', 'o1', 'at5', 'Teste de estanqueidade (72 h)'),
  st('st5', 'o1', 'at10', 'Medição e marcação do nível', 'Feita'),
  st('st6', 'o1', 'at10', 'Estrutura metálica da sala'),
  st('st7', 'o1', 'at10', 'Placas e tratamento de juntas'),
  st('st8', 'o1', 'at2', 'Chapisco', 'Feita'),
  st('st9', 'o1', 'at2', 'Reboco das paredes', 'Feita'),
  st('st20', 'o2', 'at21', 'Estacas do bloco B1', 'Feita'),
  st('st21', 'o2', 'at21', 'Estacas do bloco B2'),
]

export const mockNaoRealizados = [
  { id: 'nr1', obra_id: 'o1', atividade_id: 'at5', semana: '2026-10-12', causa: 'Falta material', causa_detalhe: null, autor_id: 'u2' },
  { id: 'nr2', obra_id: 'o1', atividade_id: 'at10', semana: '2026-10-12', causa: 'Aguardando projeto', causa_detalhe: null, autor_id: 'u2' },
]

// Qualidade — aba Vistoria. Nº por obra (#1, #2…). Na Casa Jardins, só um.
// As fotos de exemplo ficam em public/exemplo/; as tiradas no app são prévia local.
export const mockVistoriaRegistros = [
  {
    id: 'vr1', obra_id: 'o1', numero: 1, descricao: 'Mancha de infiltração na parede do box, junto ao registro do chuveiro.',
    local: 'Banho social', pavimento: 'Térreo', empreiteiro_id: 'e2', responsavel_id: 'u1', prazo: '2026-10-17',
    data_vistoria: '2026-10-13', vistoriado_por: 'u1', status: 'Pendente', foto: '/exemplo/problema.svg', foto_evidencia: '', resolvido_em: null,
    observacoes: '[13/10/2026 10:42] ImperTec avisada por WhatsApp; precisa abrir a parede para achar o ponto.',
  },
  {
    id: 'vr2', obra_id: 'o1', numero: 2, descricao: 'Fissura no forro de gesso da sala, na emenda das placas perto do cortineiro.',
    local: 'Sala', pavimento: 'Térreo', empreiteiro_id: 'e3', responsavel_id: 'u2', prazo: '2026-10-24',
    data_vistoria: '2026-10-15', vistoriado_por: 'u1', status: 'Em andamento', foto: '/exemplo/fissura.svg', foto_evidencia: '', resolvido_em: null,
    observacoes: '[19/10/2026 08:15] Gesso & Cia começou a refazer a emenda com fita telada.\n[15/10/2026 16:30] Fissura de uns 80 cm; não é estrutural.',
  },
  {
    id: 'vr3', obra_id: 'o1', numero: 3, descricao: 'Rejunte falhando no piso do box da suíte master.',
    local: 'Suíte master', pavimento: 'Superior', empreiteiro_id: 'e1', responsavel_id: 'u2', prazo: '2026-10-20',
    data_vistoria: '2026-10-16', vistoriado_por: 'u2', status: 'Pendente', foto: '', foto_evidencia: '', resolvido_em: null, observacoes: '',
  },
  {
    id: 'vr4', obra_id: 'o1', numero: 4, descricao: 'Respingo de tinta nas esquadrias da fachada principal.',
    local: 'Fachada', pavimento: '', empreiteiro_id: 'e6', responsavel_id: 'u2', prazo: '2026-10-30',
    data_vistoria: '2026-10-19', vistoriado_por: 'u2', status: 'Pendente', foto: '', foto_evidencia: '', resolvido_em: null, observacoes: '',
  },
  {
    id: 'vr5', obra_id: 'o1', numero: 5, descricao: 'Caixa de tomada da bancada fora de prumo e fora da altura do projeto.',
    local: 'Cozinha', pavimento: 'Térreo', empreiteiro_id: 'e4', responsavel_id: 'u1', prazo: '2026-10-23',
    data_vistoria: '2026-10-16', vistoriado_por: 'u1', status: 'Em andamento', foto: '', foto_evidencia: '', resolvido_em: null,
    observacoes: '[17/10/2026 09:05] Elétrica Ramos vai reposicionar antes da bancada chegar.',
  },
  {
    id: 'vr6', obra_id: 'o1', numero: 6, descricao: 'Ralo sem caimento: água empoçando no piso da área gourmet.',
    local: 'Área gourmet', pavimento: 'Térreo', empreiteiro_id: 'e2', responsavel_id: 'u1', prazo: '2026-10-16',
    data_vistoria: '2026-10-09', vistoriado_por: 'u1', status: 'Resolvido', foto: '/exemplo/problema.svg', foto_evidencia: '/exemplo/correcao.svg', resolvido_em: '2026-10-15',
    observacoes: '[15/10/2026 17:40] Resolvido: contrapiso refeito, teste com balde OK.\n[12/10/2026 11:20] Contrapiso vai ser refeito no trecho do ralo.',
  },
  {
    id: 'vr7', obra_id: 'o2', numero: 1, descricao: 'Armadura exposta na lateral do bloco B1 depois da desforma.',
    local: 'Bloco B1', pavimento: 'Fundação', empreiteiro_id: 'e9', responsavel_id: 'u1', prazo: '2026-10-27',
    data_vistoria: '2026-10-19', vistoriado_por: 'u1', status: 'Pendente', foto: '', foto_evidencia: '', resolvido_em: null, observacoes: '',
  },
]

// Qualidade — FVS. Os modelos são da empresa (sem obra_id), como o catálogo de
// materiais. Vistorias e NCs são da obra; a Casa Jardins tem uma vistoria e
// nenhuma NC.
const grupo = (nome, itens) => ({ nome, itens: itens.map(([id, titulo]) => ({ id, titulo })) })
const GRUPOS_IMPER = [
  grupo('Pré-execução', [['fi1', 'Superfície limpa, seca e sem partes soltas'], ['fi2', 'Cantos e arestas arredondados (meia-cana)'], ['fi3', 'Ralos e tubos chumbados antes da manta']]),
  grupo('Execução', [['fi4', 'Primer aplicado em toda a área'], ['fi5', 'Sobreposição das mantas de no mínimo 10 cm'], ['fi6', 'Subida no rodapé de 30 cm (box: 1,80 m)'], ['fi7', 'Reforço nos ralos e passagens de tubo']]),
  grupo('Proteção e acabamento', [['fi8', 'Teste de estanqueidade de 72 h sem vazamento'], ['fi9', 'Proteção mecânica executada']]),
]
const GRUPOS_CERAMICA = [
  grupo('Pré-execução', [['fi10', 'Base no prumo e no nível (até 3 mm em 2 m)'], ['fi11', 'Peças conferidas: lote, tonalidade e calibre'], ['fi12', 'Paginação aprovada']]),
  grupo('Execução', [['fi13', 'Dupla colagem em peças maiores que 30x30'], ['fi14', 'Juntas alinhadas e com espaçador'], ['fi15', 'Caimento para o ralo conferido'], ['fi16', 'Sem peças ocas (teste do cabo de martelo)']]),
]

export const mockFvsModelos = [
  { id: 'fm1', codigo: 'FVS-01', nome: 'Impermeabilização — Áreas Molhadas', categoria: 'Impermeabilização', versao: 2, grupos: GRUPOS_IMPER },
  { id: 'fm2', codigo: 'FVS-02', nome: 'Revestimento Cerâmico', categoria: 'Acabamento', versao: 1, grupos: GRUPOS_CERAMICA },
]

const copiaDe = (modelo) => ({ modelo_id: modelo.id, modelo_codigo: modelo.codigo, modelo_nome: modelo.nome, modelo_versao: modelo.versao, grupos: structuredClone(modelo.grupos) })
export const mockFvsVistorias = [
  {
    id: 'fv1', obra_id: 'o1', ...copiaDe(mockFvsModelos[0]), ambiente: 'Banheiro social · Térreo', status: 'Concluída',
    respostas: { fi1: 'OK', fi2: 'OK', fi3: 'OK', fi4: 'OK', fi5: 'NC', fi6: 'OK', fi7: 'OK', fi8: 'NC', fi9: 'N.A.' },
    criada_por: 'u1', criada_em: '2026-10-08', concluida_em: '2026-10-09',
  },
  {
    id: 'fv2', obra_id: 'o1', ...copiaDe(mockFvsModelos[1]), ambiente: 'Suíte master · Superior', status: 'Em andamento',
    respostas: { fi10: 'OK', fi11: 'OK', fi12: 'OK', fi13: 'OK', fi14: 'NC', fi16: 'NC' },
    criada_por: 'u2', criada_em: '2026-10-16', concluida_em: null,
  },
  {
    id: 'fv3', obra_id: 'o2', ...copiaDe(mockFvsModelos[0]), ambiente: 'Reservatório inferior', status: 'Em andamento',
    respostas: { fi1: 'OK', fi2: 'OK' }, criada_por: 'u1', criada_em: '2026-10-19', concluida_em: null,
  },
]

const passo = (status, texto, autor_id, em) => ({ status, texto, autor_id, em })
export const mockFvsNcs = [
  {
    id: 'nc1', obra_id: 'o1', numero: 1, vistoria_id: 'fv1', item_id: 'fi5', titulo: 'Sobreposição das mantas de no mínimo 10 cm',
    descricao: 'Sobreposição de 5 cm na emenda junto ao box.', solucao: 'Refazer a emenda com faixa de reforço de 20 cm.',
    severidade: 'Média', empreiteiro_id: 'e2', fotos: ['/exemplo/problema.svg'], status: 'Fechada', aberta_em: '2026-10-08', fechada_em: '2026-10-10',
    historico: [
      passo('Aberta', 'Aberta por Davidson', 'u1', '2026-10-08T14:18:00'),
      passo('Encaminhada', 'Encaminhada à ImperTec por Davidson', 'u1', '2026-10-08T14:25:00'),
      passo('Corrigida', 'Marcada como corrigida por Seu Raimundo', 'u2', '2026-10-09T16:00:00'),
      passo('Fechada', 'Aprovada e fechada por Davidson', 'u1', '2026-10-10T09:10:00'),
    ],
  },
  {
    id: 'nc2', obra_id: 'o1', numero: 2, vistoria_id: 'fv1', item_id: 'fi8', titulo: 'Teste de estanqueidade de 72 h sem vazamento',
    descricao: 'Mancha de umidade no teto do lavabo, embaixo, depois de 48 h de teste.', solucao: 'Localizar o ponto no ralo, refazer o reforço e repetir o teste.',
    severidade: 'Alta', empreiteiro_id: 'e2', fotos: [], status: 'Corrigida', aberta_em: '2026-10-09', fechada_em: null,
    historico: [
      passo('Aberta', 'Aberta por Davidson', 'u1', '2026-10-09T11:02:00'),
      passo('Encaminhada', 'Encaminhada à ImperTec por Davidson', 'u1', '2026-10-09T11:05:00'),
      passo('Corrigida', 'Marcada como corrigida por Seu Raimundo', 'u2', '2026-10-17T15:30:00'),
    ],
  },
  {
    id: 'nc3', obra_id: 'o1', numero: 3, vistoria_id: 'fv2', item_id: 'fi14', titulo: 'Juntas alinhadas e com espaçador',
    descricao: 'Juntas desalinhadas na parede do box.', solucao: 'Remover e reassentar 6 peças.',
    severidade: 'Baixa', empreiteiro_id: 'e1', fotos: [], status: 'Encaminhada', aberta_em: '2026-10-16', fechada_em: null,
    historico: [
      passo('Aberta', 'Aberta por Seu Raimundo', 'u2', '2026-10-16T10:40:00'),
      passo('Encaminhada', 'Encaminhada à Hidro Sul por Seu Raimundo', 'u2', '2026-10-16T10:45:00'),
    ],
  },
  {
    id: 'nc4', obra_id: 'o1', numero: 4, vistoria_id: 'fv2', item_id: 'fi16', titulo: 'Sem peças ocas (teste do cabo de martelo)',
    descricao: 'Três peças ocas no piso, perto do ralo.', solucao: 'Trocar as peças com dupla colagem.',
    severidade: 'Alta', empreiteiro_id: 'e1', fotos: [], status: 'Aberta', aberta_em: '2026-10-19', fechada_em: null,
    historico: [passo('Aberta', 'Aberta por Seu Raimundo', 'u2', '2026-10-19T08:30:00')],
  },
]

// Qualidade — Gemba Walk. Cobre os 7 desperdícios na Residência; a Casa
// Jardins tem uma observação só.
const gemba = (id, obra_id, local, desperdicios, descricao, causa_raiz, acao, prazo, responsavel_id, status, extra = {}) => ({
  id, obra_id, local, desperdicios, descricao, causa_raiz, acao, prazo, responsavel_id, status, foto: '', criada_em: '2026-10-15', criada_por: 'u1', ...extra,
})
export const mockGembaObservacoes = [
  gemba('g1', 'o1', 'Banho social', ['Retrabalho', 'Processo desnecessário'], 'Parede rasgada duas vezes para passar tubulação no mesmo trecho.',
    'Hidráulica e elétrica rasgaram sem compatibilizar o projeto.', 'Reunião de compatibilização antes de qualquer rasgo.', '2026-10-22', 'u1', 'Pendente', { foto: '/exemplo/problema.svg' }),
  gemba('g2', 'o1', 'Cozinha', ['Espera'], 'Equipe do gesso parada 2 h esperando o andaime ser liberado.',
    'Andaime sem programação de uso entre as equipes.', 'Quadro de reserva do andaime na entrada do canteiro.', '2026-10-18', 'u2', 'Em andamento'),
  gemba('g3', 'o1', 'Fachada', ['Transporte', 'Movimentação'], 'Argamassa subindo de carrinho pela escada porque o guincho parou.',
    'Guincho em manutenção sem equipamento reserva.', 'Alugar guincho reserva até o conserto.', '2026-10-24', 'u1', 'Pendente'),
  gemba('g4', 'o1', 'Garagem', ['Estoque'], 'Porcelanato da área gourmet parado há 5 semanas ocupando a garagem.',
    'Compra antecipada, sem olhar o planejamento.', 'Comprar acabamento pelo lookahead de 3 semanas.', null, 'u1', 'Resolvido', { criada_em: '2026-10-01' }),
  gemba('g5', 'o1', 'Área gourmet', ['Superprodução'], 'Sobra de argamassa preparada no fim do dia, jogada fora.',
    'Preparo sem medida, "de olho".', 'Padiola marcada e preparo por demanda.', '2026-10-20', 'u2', 'Pendente'),
  gemba('g6', 'o1', 'Suíte master', ['Movimentação', 'Espera'], 'Pedreiro desce dois andares para buscar ferramenta várias vezes ao dia.',
    'Sem kit de ferramentas por pavimento.', 'Caixa de ferramentas fixa em cada pavimento.', '2026-10-30', 'u2', 'Em andamento', { foto: '/exemplo/fissura.svg' }),
  gemba('g7', 'o1', 'Sala', ['Retrabalho'], 'Pintura retocada depois da instalação do forro.',
    'Sequência de serviços invertida.', 'Forro antes da pintura final no planejamento.', null, 'u1', 'Pendente'),
  gemba('g8', 'o2', 'Bloco B2', ['Espera'], 'Concreto chegou 3 h atrasado; equipe parada.',
    'Pedido feito no próprio dia da concretagem.', 'Programar o concreto com 48 h de antecedência.', '2026-10-23', 'u1', 'Pendente', { criada_em: '2026-10-19' }),
]
