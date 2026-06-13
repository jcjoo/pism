# TODO — Relatório SalesPro

## Informações a preencher no .tex

- [ ] `\orientador{}` — substituir `[Nome do Professor]` pelo nome real
- [ ] `\instituicao{}` — substituir `[Nome da Instituição]` e `[Nome do Curso]` pelos dados reais
- [ ] `\data{}` — confirmar semestre/ano (ex: `2025, 1º Semestre`)
- [ ] Referências bibliográficas — preencher `abntex2-modelo-references.bib` com as fontes usadas (React Native docs, Expo docs, Supabase docs, artigo sobre Haversine, TSP nearest-neighbor)

## Screenshots a inserir

Cada figura usa `\fbox{\rule{0pt}{Xcm}\rule{0.Ytextwidth}{0pt}}` como placeholder.
Para inserir a imagem real, substitua pelo comando:
```latex
\includegraphics[width=0.8\textwidth]{figuras/nome.png}
```

| Label | Descrição da screenshot | Capítulo |
|-------|------------------------|----------|
| `fig:visao-geral` | Fluxograma geral da solução (pode ser feito no Figma/draw.io) | Cap. 1 |
| `fig:login` | Tela de login com campos e-mail/senha | Cap. 4 |
| `fig:home` | Dashboard com calendário e painel de totais | Cap. 4 |
| `fig:nova-venda` | Tela de nova venda com carrinho preenchido | Cap. 4 |
| `fig:vendas` | Tela de consulta com filtros aplicados | Cap. 4 |
| `fig:recebimentos` | Calendário de recebimentos com dia selecionado | Cap. 4 |
| `fig:clientes` | Lista de clientes + formulário de cadastro | Cap. 4 |
| `fig:produtos` | Listagem de produtos com estoque | Cap. 4 |
| `fig:rota-mapa` | Tela de rotas — visão mapa com polilinha | Cap. 5 |
| `fig:rota-lista` | Tela de rotas — visão lista com distâncias | Cap. 5 |
| `fig:build` | App rodando em dispositivo/emulador | Cap. 8 |
| `fig:er` | Diagrama ER (exportar do Supabase ou usar dbdiagram.io) | Apêndice A |
| `fig:supabase-panel` | Painel Supabase com tabelas e políticas RLS | Anexo A |

## Para implementar (módulo de rotas)

- [ ] Adicionar campos `latitude` e `longitude` na tabela `clients` no Supabase
- [ ] Atualizar formulário de cadastro de cliente para capturar coordenadas (geocoding via CEP ou seleção no mapa)
- [ ] Criar `rotas.service.ts` com funções `haversine`, `nearestNeighbor` e sincronização AsyncStorage
- [ ] Criar screen `Rota/index.tsx` com mapa (react-native-maps) e lista alternável
- [ ] Adicionar entrada "Rota" no menu lateral da navegação
- [ ] Implementar hook `useOfflineSync` para detectar conectividade e gerenciar cache

## Para a apresentação (orientações do professor)

- [ ] Demonstrar fluxo completo: login → criar cliente com CEP → criar produto → registrar venda parcelada → ver no calendário → registrar recebimento de parcela
- [ ] Mostrar módulo de rotas: selecionar clientes do dia → ver rota otimizada no mapa → marcar cliente como visitado
- [ ] Demonstrar modo offline: desativar rede → abrir rotas → mostrar dados do cache → reconectar → mostrar sync
- [ ] Mostrar API em funcionamento: abrir painel Supabase e demonstrar dados inseridos em tempo real
- [ ] Explicar arquitetura: screens → services → Supabase (RLS), destacar isolamento por `user_id`
- [ ] Mostrar decisões de UI/UX: cores semânticas de status, bottom tab bar, componentes reutilizáveis
- [ ] Executar testes: `npm test` e mostrar output do Jest
- [ ] Mostrar build: `expo start` com Expo Go no dispositivo
