# Gestão de Obras

Acompanhamento de frentes de serviço que responde toda manhã "a data de entrega está de pé?", para um engenheiro com várias obras, mestre, arquiteta e cliente.
React + Vite, Supabase (a partir da Etapa 7), Vercel. Perfis: Engenheiro, Mestre, Arquiteta, Cliente (e Pendente, sem acesso); uma casca por perfil em `src/pages/App<Perfil>.jsx`.
Fonte das decisões: `PLANO-DO-PROJETO.md`, `PRD-FRONTEND.md`, `PRD-BACKEND.md`. Mudou de ideia? Muda lá primeiro.

## Este app é MULTI-OBRA (vale para todo módulo, agora e depois)

- **Toda tabela de lançamento tem `obra_id` obrigatório** apontando para `obras`. Módulo novo nasce com a coluna, na primeira migration.
- **Todo módulo novo filtra por `obra_id`.** No front, quem filtra é `src/lib/dados.js`: ele guarda a obra atual (`definirContexto`) e cada função começa por `exigirObra()`. **As telas não passam `obra_id`** — assim nenhuma consegue esquecer o filtro. Sem obra escolhida, a função devolve erro, nunca "tudo".
- **Nenhuma tela mistura duas obras**, a não ser uma tela que seja explicitamente um comparativo entre obras — e essa é uma consulta agregada própria em `dados.js` (uma linha por obra), nunca um laço chamando o banco por obra.
- **Trocar de obra remonta a casca inteira** (`key={perfil.id:obraId}` em `src/App.jsx`). Estado guardado fora do React (ref, variável de módulo, localStorage) leva o `obra_id` na chave.
- A obra escolhida fica em `localStorage` na chave `gestao-obras:obra:<id da pessoa>`.
- Seletor: obra `Concluída` sai; `Parada` continua (`obraNoSeletor` em `src/lib/permissoes.js`).
- O mock tem **duas obras diferentes de propósito** (a Casa Jardins tem 1 frente e nenhuma pendência). Não apague a segunda: é ela que denuncia filtro esquecido. No banco (Etapa 7), RLS por obra com a função `minhas_obras()` em toda tabela; `using (true)` é proibido.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura: cálculo, recorte, decisão, formatação. Sem React, sem banco, sem `window`. Import com `.js` explícito (roda no Node). É a única camada com teste.
- **Não → `src/screens/*.jsx`.** Estado de interface, layout. A tela **pede a decisão à lib**.
- `src/lib/dados.js` — **única porta dos dados.** Nenhuma tela lê `mockData.js` nem chama o Supabase direto. Hoje lê o mock em memória; na Etapa 7 o miolo vira Supabase com `USAR_MOCK = false` em `src/lib/config.js` e nenhuma tela muda.
- `src/lib/atraso.js` — **a regra central** (dias perdidos, folga que sobra, data limite, situação). Mudou a regra no plano → muda aqui e no teste `tests/atraso.mjs`.
- `src/lib/permissoes.js` — quem vê o quê e o menu de cada perfil. Tela pergunta `pode(role, acao)`; nunca compara `role` na mão.

Consequências: `if` de negócio dentro de tela vai para `lib`, mesmo com três linhas. Constante compartilhada (status, motivos, perfis, situações) tem um dono só, e o texto é **idêntico** ao CHECK do banco (`Estourou a folga`, `Não andou`, `Em andamento`…). Não quebre arquivo por tamanho; quebre quando ele tiver dois motivos para mudar.

## Régua de verificação

```bash
npm run check
```

Build + lint + testes. **Fecha em zero** — não há linha de base. Aviso novo é seu e é de agora; conserte no mesmo lote. No Windows, rode `npm.cmd` se o PowerShell bloquear `npm.ps1`.

Nada disso prova que a tela funciona. Verde com a tela em branco é rotina: abra o app e clique, nas **duas** obras.

**Todo bug corrigido em `src/lib/` nasce com teste junto**, no mesmo lote.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, `src/lib/permissoes.js`, políticas RLS, migrations ou valores de contrato/medição → rodar a revisão de código (`/code-review` no Claude Code, `/review` no Codex) antes de subir. Nesses arquivos o erro não aparece na tela: filtro de obra esquecido ou RLS frouxa vaza dado sem sintoma.

## Deploy

Ainda não está no ar (Etapa 9). O padrão: a pessoa diz "sobe pro GitHub", o agente roda `git add`, `git commit`, `git push`, e a Vercel publica sozinha. A pessoa não digita comando.

## Armadilhas desta base

- **Tabela nova nasce fechada para o app.** Toda tabela precisa de `grant` escrito na migration, só para `authenticated`. "permission denied for table (42501)" é GRANT faltando, não RLS. Nunca `grant all`, nunca `to anon`.
- **Dinheiro fica em tabela separada (`contratos`).** RLS é por linha, não por coluna: se o valor ficar em `frentes`, o mestre e a arquiteta leem. Não "simplifique" juntando as duas.
- **O cliente não lê `frentes`, `empreiteiros` nem `diarios`.** O painel dele é uma consulta própria (ambiente + %, data prometida, fotos liberadas sem frente nem autor).
- **"Hoje" do mock é fixo em 20/10/2026** (`src/lib/config.js`), para os números do PRD baterem. Com banco, é o dia real. Não use `new Date()` direto nas telas; use `hoje()`.
- **Datas são texto `aaaa-mm-dd` no fuso local** (`src/lib/datas.js`). Nunca `toISOString().split('T')[0]`: vira UTC e pula um dia depois das 21h.
- **Dia útil de obra é segunda a sábado.** Dia sem diário nenhum não conta como dia perdido.
- **SheetJS (`xlsx`) vem do CDN oficial, não do npm.** O `package.json` aponta para `https://cdn.sheetjs.com/xlsx-0.20.3/...`; o `xlsx` do npm parou na 0.18.5, com falhas de segurança conhecidas. Nunca rode `npm i xlsx` "para atualizar". É a única biblioteca além do Supabase (decisão de 21/10) e entra por `import()` sob demanda, só quando alguém baixa ou importa planilha.
- **Planilha: ITEM é texto, data é número de série.** Na leitura, o ITEM vem do valor formatado da célula (`cell.w`), nunca do número (1.10 viraria 1.1). Data de Excel vira `aaaa-mm-dd` pela conta do número de série, sem `Date` com fuso.
- **O logo é dado, não código.** Vem de `obterLogo()` em `dados.js` (no mock, `localStorage` `gestao-obras:config:logo`; na Etapa 7, tabela `config` + Storage). Não troque o `<img>` por um caminho fixo. Sem logo próprio, usa `public/logo-bmr.webp`; o recorte só do símbolo (`.logo-simbolo`) vale apenas para esse arquivo.

## Higiene de código (vale para toda mudança)

Cada função morta é uma mentira que o próximo leitor precisa desmascarar.

- **Ao remover um recurso, cace a cadeia inteira no mesmo lote:** a função em `lib/dados.js` → a exposição no contexto → os chamadores nas telas → a query. Função exposta que nenhuma tela chama é lixo.
- **Zero avisos novos de lint.** Aviso antigo que você encontrar, limpe se já estiver tocando no arquivo.
- **Código comentado não é backup, o git é.** Comentário explica *por quê*. Bloco comentado sem explicação, apague.
- **Antes de apagar, prove que está morto:** grep pelo símbolo no projeto inteiro, e verifique quem chama o *wrapper*, não só a função. Depois confira órfãos: quem só era chamado pelo que você removeu morre no mesmo commit.
- **Estado que nunca muda ou nunca é lido é lixo** — `useState` sem setter, prop que ninguém consome, flag que ninguém liga.
- **Limpeza NUNCA toca no banco nem em arquivo de dado.** Tabela ou coluna órfã continua existindo até decisão de quem é dono. Na dúvida, pergunte.
