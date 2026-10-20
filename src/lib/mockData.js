// Dados de mentira, com os MESMOS nomes de campo das tabelas do PRD-BACKEND.md.
// Duas obras, de propósito diferentes: a Casa Jardins tem 1 frente e nenhuma
// pendência. É assim que filtro esquecido aparece hoje, e não na obra real.
// Na Etapa 7 estes dados viram o seed do banco.

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
  { id: 'f11', obra_id: 'o2', empreiteiro_id: 'e9', servico: 'Fundação', inicio_previsto: '2026-10-01', termino_previsto: '2026-11-15', folga_dias: 10, situacao: 'Em andamento', concluida_em: null },
]

// Só o engenheiro lê esta tabela (separada de frentes por causa disso).
export const mockContratos = [
  { id: 'c1', obra_id: 'o1', frente_id: 'f1', valor_contratado: 38500 },
  { id: 'c2', obra_id: 'o1', frente_id: 'f2', valor_contratado: 21300 },
  { id: 'c3', obra_id: 'o1', frente_id: 'f3', valor_contratado: 62000 },
  { id: 'c4', obra_id: 'o1', frente_id: 'f4', valor_contratado: 33900 },
  { id: 'c5', obra_id: 'o1', frente_id: 'f5', valor_contratado: 54200 },
  { id: 'c6', obra_id: 'o1', frente_id: 'f6', valor_contratado: 18600 },
  { id: 'c7', obra_id: 'o1', frente_id: 'f7', valor_contratado: 41000 },
  { id: 'c8', obra_id: 'o1', frente_id: 'f8', valor_contratado: 47500 },
  { id: 'c9', obra_id: 'o1', frente_id: 'f9', valor_contratado: 39800 },
  { id: 'c10', obra_id: 'o1', frente_id: 'f10', valor_contratado: 27800 },
  { id: 'c11', obra_id: 'o2', frente_id: 'f11', valor_contratado: 96000 },
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
  '2026-10-19': 'Manta asfáltica não chegou. Fornecedor prometeu para quarta.',
}

export const mockDiarios = [
  ...DIAS_O1.map((data) => ({
    id: `d1-${data}`, obra_id: 'o1', data, clima: ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'].includes(data) ? 'Chuva' : 'Sol',
    equipes: [], ocorrencias: OCORRENCIAS[data] || '', autor_id: 'u2',
  })),
  ...DIAS_O2.map((data) => ({
    id: `d2-${data}`, obra_id: 'o2', data, clima: 'Sol', equipes: [], ocorrencias: '', autor_id: 'u1',
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
