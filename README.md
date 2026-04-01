# 🚀 SalesPro

SalesPro é um aplicativo de gerenciamento de vendas e estoque construído com **React Native** e **Expo**, utilizando **Supabase** como backend. O objetivo do projeto é facilitar o registro de clientes, produtos e o controle de vendas em tempo real.

---

## ✨ Funcionalidades

- **Gerenciamento de Clientes:** Cadastro completo com endereço, telefone e e-mail.
- **Catálogo de Produtos:** Controle de estoque, descrição e preços.
- **Registro de Vendas:**
  - Seleção de múltiplos itens por venda.
  - Cálculo automático de totais.
  - Diferenciação entre pagamento à vista ou parcelado.
  - Data de vencimento customizável.
- **Consulta de Vendas:**
  - Filtros avançados por cliente, mercadoria, data da venda e data de vencimento.
  - Visualização detalhada de cada transação.
  - Opção para edição ou exclusão de registros.
- **Autenticação:** Sistema seguro integrado com Supabase Auth.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Backend/Banco de Dados:** [Supabase](https://supabase.com/)
- **Gerenciador de Pacotes:** [Bun](https://bun.sh/)
- **Navegação:** [React Navigation](https://reactnavigation.org/)
- **Ícones:** [Feather (Expo Vector Icons)](https://icons.expo.fyi/Feather)

---

## ⚙️ Configuração do Ambiente

### 1. Requisitos Prévios

- [Bun](https://bun.sh/) instalado.
- [Expo Go](https://expo.dev/go) instalado no seu dispositivo móvel ou um emulador configurado.
- Conta no [Supabase](https://supabase.com/).

### 2. Configuração do Supabase

No painel do Supabase, crie um novo projeto e execute os scripts SQL necessários para criar as tabelas (`clients`, `products`, `sales`, `sale_items`). 

*Dica: Você pode encontrar os tipos das tabelas em `app/src/types/database.types.ts`.*

Crie um arquivo `.env` na pasta `app` com suas credenciais:

```env
EXPO_PUBLIC_SUPABASE_URL=sua_url_aqui
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### 3. Instalação

```bash
cd app
bun install
```

---

## 🚀 Executando o Projeto

### Modo de Desenvolvimento

```bash
bun start -c
```

### Emulação/Execução Nativa

#### Android
```bash
bun run android
```

#### iOS
```bash
bun run ios
```

---

## 📂 Estrutura do Projeto

- `app/src/components`: Componentes reutilizáveis (Input, Button, etc).
- `app/src/services`: Integração com serviços externos (Supabase).
- `app/src/screens`: Telas principais do aplicativo.
- `app/src/theme`: Definições de cores e tipografia.
- `app/src/hooks`: Hooks customizados (ex: useAuth).
- `app/src/types`: Definições de tipos TypeScript.

---

Desenvolvido com ❤️ por [jcjoo](https://github.com/jcjoo)

