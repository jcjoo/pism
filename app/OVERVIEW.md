# SalesPro — Visão Geral do Código

Aplicativo mobile para vendedores externos gerenciarem clientes, produtos, vendas e recebimentos. Construído com **React Native + Expo**, backend **Supabase (PostgreSQL)** e estilo via **NativeWind (Tailwind)**.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | React Native (Expo SDK 55) |
| Linguagem | TypeScript |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| Estilo | NativeWind v4 (classes Tailwind em RN) |
| Navegação | React Navigation — Stack + Bottom Tabs |
| Cache offline | AsyncStorage |
| Geocodificação | Nominatim / OpenStreetMap |
| Ícones | `@expo/vector-icons` (Feather) |
| Build Android | Gradle (release APK via EAS / local) |

---

## Estrutura de Pastas

```
app/
├── App.tsx                  # Ponto de entrada — envolve Navigation com providers
├── index.ts                 # Registro do root component (Expo)
├── global.css               # Tokens Tailwind globais (NativeWind)
├── tailwind.config.js       # Config Tailwind: cores, fontes, classes utilitárias custom
├── app.json                 # Configuração Expo (nome, ícones, permissões)
└── src/
    ├── types/
    │   └── database.types.ts
    ├── services/
    │   ├── supabase.ts
    │   ├── storage.service.ts
    │   ├── sync.service.ts
    │   ├── clients.service.ts
    │   ├── products.service.ts
    │   ├── sales.service.ts
    │   ├── recebimentos.service.ts
    │   ├── relatorios.service.ts
    │   ├── endereco.service.ts
    │   └── geocoding.service.ts
    ├── hooks/
    │   └── useAuth.ts
    ├── context/
    │   └── SyncContext.tsx
    ├── navigation/
    │   ├── index.tsx
    │   ├── header.tsx
    │   └── menu.tsx
    ├── components/
    │   ├── index.ts
    │   ├── Button/
    │   ├── Input/
    │   ├── Select/
    │   ├── QuantitySelector/
    │   ├── Accordion/
    │   ├── BottomTabBar/
    │   ├── DateTime/
    │   ├── Toast/
    │   ├── ConfirmDialog/
    │   └── FormScrollView.tsx
    ├── theme/
    │   ├── color.ts
    │   ├── typography.ts
    │   └── index.ts
    └── screens/
        ├── index.ts
        ├── Auth/
        ├── Home/
        ├── NewSale/
        ├── Sales/
        ├── Recebimentos/
        ├── Clients/
        ├── Products/
        ├── Relatorios/
        ├── Regioes/
        └── Conta/
```

---

## `src/types/`

### `database.types.ts`
Tipos TypeScript gerados automaticamente pelo Supabase CLI a partir do schema do banco. Exporta os tipos genéricos `Tables<T>`, `TablesInsert<T>` e `TablesUpdate<T>` usados em toda a camada de serviços. As tabelas mapeadas são: `clients`, `products`, `sales`, `sale_items`, `sale_installments`, `estado`, `municipio`.

---

## `src/services/`

Toda comunicação com o Supabase e persistência local vive aqui. Nenhuma tela acessa o Supabase diretamente.

### `supabase.ts`
Inicializa e exporta o cliente Supabase (`createClient`). É o único lugar onde as credenciais (`supabaseUrl`, `anonKey`) são usadas.

### `storage.service.ts`
Wrapper sobre `AsyncStorage`. Gerencia dois tipos de dados:
- **Cache de listas** — clientes, produtos, vendas pendentes. Usado como fallback offline.
- **Fila de sincronização** (`SYNC_QUEUE`) — operações feitas offline (ex: marcar recebimento) que aguardam conexão para serem enviadas ao Supabase.

Exporta `storageService` com `getItem`, `setItem`, `enqueue`, `dequeue` e `getQueue`.

As chaves de cache estão no objeto `STORAGE_KEYS`.

### `sync.service.ts`
Drena a fila de sincronização (`flushQueue`) quando a conexão é restabelecida. Suporta os tipos de operação `mark_received` e `mark_installments_received`. Após sincronizar, chama `refreshCaches` para atualizar os dados em memória.

### `clients.service.ts`
CRUD de clientes. Métodos: `getAll`, `getById`, `create`, `updated`, `delete`, `archive`, `unarchive`, `hasSales`. `getAll` persiste o resultado em cache e usa AsyncStorage como fallback se offline.

### `products.service.ts`
CRUD de produtos. Mesmo padrão de cache offline do `clientsService`. Métodos: `getAll`, `getById`, `create`, `update`, `delete`, `archive`, `hasSales`.

### `sales.service.ts`
Criação e consulta de vendas. `create` insere a venda, os itens e, se parcelada, gera automaticamente os registros em `sale_installments` (uma linha por parcela com data de vencimento mensal). `getSales` aceita filtros por cliente, produto e período. `delete` remove a venda.

### `recebimentos.service.ts`
Lida com vendas pendentes de recebimento. `getPending` retorna todas as vendas onde ou `received_at` é null (à vista) ou há parcelas sem `received_at`. `markReceived` e `markInstallmentsReceived` tentam gravar no Supabase; se offline, enfileiram a operação para sincronização posterior. Inclui `updateReceived` e `removeReceived` para edição retroativa.

Exporta as interfaces `PendingSale` e `SaleInstallment`, usadas pelas telas de Recebimentos e Home.

### `relatorios.service.ts`
Consultas analíticas somente-leitura. Métodos:
- `getProdutosMaisVendidos(period)` — ranking de produtos por quantidade e receita, filtrável por período (7d / 30d / 90d / all).
- `getClientesMaisCompradores(period)` — ranking de clientes por valor total gasto.
- `getFaturamentoMensal(months)` — soma de vendas dos últimos N meses, agrupadas por mês.
- `getVendasEmAberto()` — lista de vendas não recebidas com status de vencimento.

### `endereco.service.ts`
Consulta das tabelas `estado` e `municipio`. Métodos: `getAllEstado`, `getAllMunicipios`, `getMunicipiosByUF`, `getMunicipioById`, `createMunicipio`, `deleteMunicipio`. Usado nas telas de cadastro de cliente e de Regiões.

### `geocoding.service.ts`
Integração com **Nominatim (OpenStreetMap)** para geolocalização de endereços. Métodos:
- `byAddress(address, city, uf)` — coordenadas precisas pelo endereço completo.
- `byCity(city, uf)` — coordenadas aproximadas pelo centro da cidade (fallback).
- `suggestions(text, city, uf)` — lista de sugestões de autocompletar para o campo de endereço.

As coordenadas são salvas no cadastro do cliente e usadas pelo algoritmo de rota de recebimentos.

---

## `src/hooks/`

### `useAuth.ts`
Hook que expõe `session`, `user`, `userId` e `loading`. Assina `onAuthStateChange` do Supabase para reagir em tempo real a login/logout. Usado em toda a navegação para decidir qual fluxo exibir.

---

## `src/context/`

### `SyncContext.tsx`
Contexto global de sincronização. Expõe:
- `status` — `'idle' | 'syncing' | 'synced' | 'error'`
- `pendingCount` — número de operações na fila offline
- `lastSyncAt` — timestamp da última sincronização bem-sucedida
- `autoSync` / `setAutoSync` — liga/desliga sync automático a cada 3 minutos
- `sync()` — dispara `syncService.flushQueue()` manualmente

O `SyncProvider` envolve o app e é exibido no Menu para o usuário acompanhar o estado.

---

## `src/navigation/`

### `index.tsx`
Define toda a árvore de navegação:

```
NavigationContainer
└── Stack.Navigator (sem header)
    ├── Auth          (quando sem sessão)
    └── App → AppTabs (quando autenticado)
        ├── Inicio       (Home)        ← tab
        ├── NovaVenda    (NewSale)     ← tab
        ├── Vendas       (Sales)       ← tab
        └── Rota         (Recebimentos)← tab
    ├── Menu           (modal, slide from right)
    ├── Clients        ← stack (acesso pelo Menu, back volta ao Menu)
    ├── Products       ← stack
    ├── Regioes        ← stack
    ├── Relatorios     ← stack
    └── Conta          ← stack
```

As 5 telas extras ficam no Stack (não nas Tabs) para que o botão de voltar retorne ao Menu.

### `header.tsx`
Header customizado compartilhado por todas as telas. Exibe o título e um botão de hambúrguer que navega para a tela Menu.

### `menu.tsx`
Tela de menu lateral (apresentada como modal). Exibe:
- Avatar com iniciais e nome do usuário (clique navega para Conta)
- Atalhos para Clientes, Produtos, Regiões, Relatórios
- Painel de sincronização offline com status, contagem de pendências e toggle de auto-sync
- Botão de logout

---

## `src/components/`

Componentes reutilizáveis compartilhados entre telas. Todos são exportados via `index.ts`.

| Componente | Descrição |
|-----------|-----------|
| `Button` | Botão com variantes: `primary`, `primary-dark`, `primary-light`, `secondary`, `danger`. Aceita `icon` e `disabled`. |
| `Input` | Campo de texto com label flutuante, suporte a `secureTextEntry` com toggle show/hide de senha. |
| `Select` | Campo de seleção (não editável) que dispara `onPress` para abrir um modal. |
| `QuantitySelector` | Seletor numérico com botões +/−. Aceita `displayText` para exibir texto em vez de número (ex: modo de pagamento). |
| `Accordion` | Seção expansível com header clicável. |
| `BottomTabBar` | Tab bar customizada (não usada diretamente — a tab bar vem do React Navigation). |
| `DateTime` | Wrapper de `DateTimePicker` com formatação BR. |
| `Toast` | Sistema de notificações temporárias (success / error / warning / info). Expõe `useToast()`. |
| `ConfirmDialog` | Diálogo de confirmação com texto e ação destrutiva opcional. Expõe `useConfirm()` que retorna `Promise<boolean>`. |
| `FormScrollView` | `ScrollView` com `KeyboardAvoidingView` integrado, adequado para formulários. |

---

## `src/theme/`

### `color.ts`
Paleta de cores do app. As cores seguem uma hierarquia roxo/violeta:
- `primary` → `#3C096C` (roxo escuro)
- `secondary` → `#C4D680` (verde-lima)
- `danger` → `#DF1515`

### `typography.ts`
Estilos de texto base (tamanhos, pesos, famílias).

### `index.ts`
Re-exporta cores e tipografia.

---

## `src/screens/`

### `index.ts`
Re-exporta todas as telas para facilitar o import na navegação.

---

### `Auth/`

**`index.tsx`** — Tela de login/cadastro. Alterna entre dois modos com um toggle. Campos de e-mail e senha com show/hide. Chama `supabase.auth.signInWithPassword` ou `signUp`. Erros são exibidos via Toast.

---

### `Home/`

Dashboard principal. Carrega vendas pendentes via `recebimentosService.getPending()` ao receber foco (`useFocusEffect`).

| Arquivo | Conteúdo |
|---------|----------|
| `types.ts` | `DueStatus` (overdue / today / future) e interface `CalendarPayment` |
| `helpers.ts` | `buildPaymentMap` (transforma lista de vendas em mapa `dateKey → pagamentos`), `getCalendarDays`, formatadores de data, constantes de cor e label por status |
| `PaymentDots.tsx` | Bolinhas coloridas exibidas em cada dia do calendário que tem pagamentos (máx. 3 + contador) |
| `Calendar.tsx` | Card do calendário completo: navegação de mês, grid de dias, legenda de cores |
| `PaymentDayView.tsx` | Lista de pagamentos do dia selecionado e seção "Próximos vencimentos" |
| `index.tsx` | Orquestra: carrega dados, gerencia mês/dia selecionado, compõe `Calendar` + `PaymentDayView` dentro de um `ScrollView` |

---

### `NewSale/`

Formulário de registro de nova venda. Fluxo: selecionar cliente → selecionar produto → definir quantidade/preço → adicionar ao carrinho → configurar vencimento/pagamento → registrar.

| Arquivo | Conteúdo |
|---------|----------|
| `SelectorModal.tsx` | Modal de seleção de cliente ou produto (FlatList filtrada) |
| `CartView.tsx` | Exibe os itens no carrinho, total, campos de vencimento/pagamento/observação e botão de registro |
| `index.tsx` | Estado do formulário, lógica de `handleAddToCart` e `handleRegisterSale` (chama `salesService.create`), composição dos sub-componentes |

---

### `Sales/`

Consulta e gestão de vendas existentes. Funciona em 4 etapas (`step`): filter → list → details → edit.

| Arquivo | Conteúdo |
|---------|----------|
| `types.ts` | `Step`, `StatusFilter`, `DueStatus`, `STATUS_CONFIG` (label e cor por status) |
| `helpers.ts` | `renderPrice`, `formatDate`, `calcTotal`, `getDaysUntilDue`, `getDueStatus` |
| `SelectorModal.tsx` | Modal de filtro por cliente ou produto |
| `ReceiptModal.tsx` | Modal para marcar/editar recebimento (data + valor) |
| `SaleFilterStep.tsx` | Filtros de período, cliente, produto e status |
| `SaleListStep.tsx` | Cards de sumário (total / recebido / a receber) + lista de vendas com badge de status |
| `SaleDetailsStep.tsx` | Detalhes da venda selecionada: itens, valores, status de recebimento com ações |
| `SaleEditStep.tsx` | Formulário de edição do carrinho, vencimento, pagamento e observação |
| `index.tsx` | Estado global das 4 etapas + handlers de busca, edição, recebimento e deleção |

---

### `Recebimentos/`

A tela mais complexa do app. Duas abas: **Recebimento Manual** (lista filtrável) e **Rota de Recebimento** (modo swipe com roteamento otimizado).

| Arquivo | Conteúdo |
|---------|----------|
| `types.ts` | `DueStatus`, `ManualFilter`, `RouteStop`, `SwipeCardHandle` |
| `helpers.ts` | Todas as funções puras: `saleTotal`, `renderPrice`, `formatDate`, `isInstallment`, `pendingInstallments`, `effectiveDueDate`, `pendingTotal`, `getDays`, `getStatus`, `STATUS`, `openDrivingNav`, `haversineKm`, `buildRoute` (algoritmo do vizinho mais próximo) |
| `InstallmentModal.tsx` | Modal para selecionar quais parcelas de uma venda parcelada serão marcadas como recebidas |
| `CompletionView.tsx` | Tela de conclusão da rota: resumo de recebimentos realizados e paradas puladas |
| `SwipeCard.tsx` | Cartão arrastável com `PanResponder` + `Animated`. Arrastar direita = recebido, esquerda = pular. Exibe dados do cliente, valor, itens, vencimento e observação |
| `RecebimentoManual.tsx` | Lista de vendas pendentes com busca textual, filtros de status e cidade, card de cada venda, modal à vista e modal de parcelas |
| `RouteSwipeView.tsx` | Orquestra o fluxo de swipe: empilha os cartões na ordem da rota, gerencia estado de recebidos/pulados, exibe barra de progresso e botões de ação |
| `RotaRecebimento.tsx` | Tela de configuração da rota: horas disponíveis, minutos por parada, data alvo. Chama `buildRoute` e transiciona para `RouteSwipeView` |
| `index.tsx` | Seletor de abas (Manual / Rota) — apenas 40 linhas |

**Algoritmo de rota** (`buildRoute` em `helpers.ts`):
1. Calcula o número máximo de paradas com base nas horas e minutos por parada.
2. Ordena por prioridade: atrasados → hoje → esta semana → futuros.
3. Seleciona as N paradas de maior prioridade.
4. Aplica o algoritmo do **vizinho mais próximo** usando distância Haversine para minimizar o percurso.

---

### `Clients/`

**`index.tsx`** — Lista de clientes com busca textual e toggle arquivados. Cada card mostra nome, cidade e ações. Navegação para cadastro e detalhes.

**`CadastroClient/`** — Formulário de criação/edição de cliente.

| Arquivo | Conteúdo |
|---------|----------|
| `types.ts` | `ClientData` (tipo parcial do cliente + campos de UI), `GeoStatus`, `GEO_CFG` (config visual do badge de geo) |
| `GeoBadge.tsx` | Badge que exibe o status da geocodificação: carregando / endereço encontrado / coordenada da cidade / não encontrado |
| `AddressInput.tsx` | Campo de endereço com dropdown de autocompletar via Nominatim (debounce 500ms) |
| `LocationModal.tsx` | Modal de seleção de estado (UF) ou cidade com busca |
| `index.tsx` | Formulário completo: nome, e-mail, telefone, CPF (não editável após cadastro), estado/cidade, endereço. Dispara geocodificação com debounce de 900ms ao alterar endereço ou cidade |

**`DetailsClient/index.tsx`** — Exibe os dados do cliente selecionado com opções de editar, arquivar e ver histórico de vendas.

---

### `Products/`

**`index.tsx`** — Lista de produtos com busca e toggle arquivados.

**`CadastroProduct/index.tsx`** — Formulário simples: nome, descrição e preço sugerido.

**`DetailsProduct/index.tsx`** — Detalhe do produto com opções de editar e arquivar.

---

### `Relatorios/`

Quatro relatórios analíticos, cada um numa sub-tela com botão de voltar para o índice.

| Arquivo | Conteúdo |
|---------|----------|
| `helpers.ts` | Formatadores (`R$`, `fmtDate`), constantes de período, cores do ranking, config de status |
| `ui.tsx` | Componentes visuais compartilhados: `PageHeader`, `PeriodChips`, `EmptyState`, `RankBadge`, `TopCard`, `PropBar`, `Loading` |
| `ProdutoMaisVendido.tsx` | Ranking de produtos com toggle Unidades / Valor (R$) e barras de proporção |
| `ClienteMaisCompra.tsx` | Ranking de clientes por valor total gasto com barras de proporção |
| `FaturamentoMensal.tsx` | Gráfico de barras horizontal dos últimos 6 meses com totais |
| `VendasEmAberto.tsx` | Lista de vendas pendentes agrupadas por status de vencimento (atrasado / hoje / semana / futuro) |
| `index.tsx` | Índice com cards para cada relatório; gerencia qual sub-tela exibir |

---

### `Regioes/`

Gerencia as cidades (municípios) onde o vendedor atua. Os clientes são vinculados a um município.

| Arquivo | Conteúdo |
|---------|----------|
| `AddCidadeModal.tsx` | Modal em 2 etapas: selecionar estado (com busca) → digitar nome da cidade. Cria o registro via `enderecoService.createMunicipio` |
| `index.tsx` | Lista de cidades agrupadas por estado. Permite excluir cidade (bloqueia se houver clientes vinculados). Botão "Nova Cidade" abre o modal |

---

### `Conta/`

**`index.tsx`** — Tela de perfil do usuário. Exibe avatar com iniciais, nome e e-mail. Permite editar o nome de exibição (atualiza `user_metadata` no Supabase Auth). Botão de logout.

---

## Fluxo de Dados

```
Supabase (PostgreSQL)
       ↕
   services/          ← única camada que toca o banco
       ↕
 AsyncStorage         ← cache offline + fila de sync
       ↕
  SyncContext         ← estado global de sincronização
       ↕
   screens/           ← consomem services via hooks/callbacks
       ↕
  components/         ← UI pura, sem acesso a serviços
```

## Convenções de Estilo (NativeWind)

Classes utilitárias custom definidas em `global.css`:

| Classe | Uso |
|--------|-----|
| `screen` | Container raiz de tela (`flex-1 bg-light`) |
| `page-header` | Cabeçalho com botão voltar e título |
| `page-title` | Título grande da página |
| `section-title` | Título de seção em caps |
| `entity-card` | Card de item (cliente, produto, cidade) |
| `icon-avatar-sm` | Círculo com ícone dentro do card |
| `modal-overlay-center` | Overlay escuro para modais centralizados |
| `modal-panel-center` | Painel branco do modal centralizado |
| `modal-overlay-bottom` | Overlay para bottom sheets |
| `modal-sheet-bottom` | Painel do bottom sheet |
| `label-upper` | Label de campo em uppercase |
| `amount-input` | Input de valor monetário grande |
| `filter-chip` / `filter-chip-active` | Pills de filtro |
| `empty-text` | Texto de estado vazio |
| `modal-item` | Item clicável dentro de modal |
| `form-card` | Card de formulário com fundo claro |
