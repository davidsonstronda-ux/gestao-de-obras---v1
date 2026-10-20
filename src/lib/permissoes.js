// Quem vê o quê. Fonte: PLANO-DO-PROJETO.md "Matriz de permissões" + decisões
// de 20/10. No banco isto vira RLS (Etapa 7); aqui decide menu e botões.
// Um lugar só: telas perguntam `pode(role, acao)`, nunca comparam role na mão.

export const PERFIS = ['Engenheiro', 'Mestre', 'Arquiteta', 'Cliente', 'Pendente']

export const SITUACOES_OBRA = ['Em andamento', 'Parada', 'Concluída']

const MATRIZ = {
  verValores:          ['Engenheiro'],
  verEmpreiteiro:      ['Engenheiro', 'Mestre', 'Arquiteta'],
  verFrentes:          ['Engenheiro', 'Mestre', 'Arquiteta'],
  verDiario:           ['Engenheiro', 'Mestre', 'Arquiteta'],
  lancarDiario:        ['Engenheiro', 'Mestre'],
  cobrar:              ['Engenheiro'],
  abrirPendencia:      ['Engenheiro', 'Mestre', 'Arquiteta'],
  comentar:            ['Engenheiro', 'Mestre', 'Arquiteta'],
  fecharPendencia:     ['Engenheiro'],
  liberarFoto:         ['Engenheiro'],
  apagar:              ['Engenheiro'],
  cadastrar:           ['Engenheiro'],
  gerenciarUsuarios:   ['Engenheiro'],
  verPainelCliente:    ['Cliente'],
}

export function pode(role, acao) {
  return (MATRIZ[acao] || []).includes(role)
}

// Menu de cada perfil, na ordem. `inicio` é a tela que abre.
// Celular: no máximo 5 itens na barra inferior.
export const MENUS = {
  Engenheiro: { inicio: 'frentes', itens: ['frentes', 'diario', 'pendencias', 'fotos', 'mais'] },
  Mestre:     { inicio: 'diario', itens: ['diario', 'frentes', 'pendencias', 'fotos'] },
  Arquiteta:  { inicio: 'pendencias', itens: ['pendencias', 'frentes', 'fotos'] },
  Cliente:    { inicio: 'painel', itens: ['painel'] },
}

// Obras que aparecem no seletor: Concluída sai; Parada continua (decisão de 20/10).
export function obraNoSeletor(obra) {
  return obra.situacao !== 'Concluída'
}
