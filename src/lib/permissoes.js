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
  verMateriais:        ['Engenheiro', 'Mestre', 'Arquiteta'],
  pedirMaterial:       ['Engenheiro', 'Mestre'],
  verPlanejamento:     ['Engenheiro', 'Arquiteta'],
  planejar:            ['Engenheiro'],
  verCurtoPrazo:       ['Engenheiro', 'Mestre', 'Arquiteta'],
  moverCurtoPrazo:     ['Engenheiro', 'Mestre'],
}

export function pode(role, acao) {
  return (MATRIZ[acao] || []).includes(role)
}

// Abas do Planejamento que cada perfil abre: o mestre só a semana (Curto prazo).
export function abasDoPlanejamento(role) {
  if (pode(role, 'verPlanejamento')) return ['eap', 'longo', 'medio', 'curto']
  return pode(role, 'verCurtoPrazo') ? ['curto'] : []
}

// Menu de cada perfil, na ordem. `inicio` é a tela que abre.
// Celular: no máximo 5 itens na barra inferior; o que estiver em `noMais` some
// da barra e aparece dentro de "Mais" (no computador, fica no menu lateral).
export const MENUS = {
  Engenheiro: { inicio: 'frentes', itens: ['frentes', 'diario', 'pendencias', 'fotos', 'materiais', 'planejamento', 'mais'], noMais: ['materiais', 'planejamento'] },
  Mestre:     { inicio: 'diario', itens: ['diario', 'frentes', 'pendencias', 'fotos', 'materiais', 'planejamento', 'mais'], noMais: ['materiais', 'planejamento'] },
  Arquiteta:  { inicio: 'pendencias', itens: ['pendencias', 'frentes', 'fotos', 'materiais', 'planejamento'] },
  Cliente:    { inicio: 'painel', itens: ['painel'] },
}

// O que vai na barra inferior do celular (sem o que mora dentro de "Mais").
export function itensDaBarra(role) {
  const { itens, noMais = [] } = MENUS[role]
  return itens.filter((id) => !noMais.includes(id))
}

// Obras que aparecem no seletor: Concluída sai; Parada continua (decisão de 20/10).
export function obraNoSeletor(obra) {
  return obra.situacao !== 'Concluída'
}
