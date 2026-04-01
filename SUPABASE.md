# Configuração do Ambiente Supabase

Este projeto utiliza o Supabase para o backend. Para replicar o ambiente, siga os passos abaixo.

## Requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado.
- Docker rodando (caso queira rodar localmente).

## Configuração Local

Se você deseja rodar o Supabase localmente para desenvolvimento:

1. Inicie o Supabase:
   ```bash
   supabase start
   ```

2. As migrações em `supabase/migrations` serão aplicadas automaticamente.

3. O arquivo `app/.env` deve ser configurado com as URLs e chaves fornecidas pelo comando `supabase start`.

## Configuração em Produção (Supabase Cloud)

Se você estiver configurando um novo projeto no Supabase Cloud:

1. Crie um novo projeto no [painel do Supabase](https://app.supabase.com/).
2. Vincule seu projeto local ao projeto remoto:
   ```bash
   supabase link --project-ref seu-project-id
   ```
3. Aplique as migrações ao projeto remoto:
   ```bash
   supabase db push
   ```
4. Obtenha a `URL` e a `anon key` do painel do Supabase (Project Settings > API) e coloque-as no seu arquivo `.env` na pasta `app/`.

## Estrutura do Banco de Dados

O banco de dados consiste nas seguintes tabelas principais:

- `clients`: Cadastro de clientes.
- `products`: Catálogo de produtos e estoque.
- `sales`: Registro de vendas.
- `sale_items`: Itens vinculados a cada venda.

Todas as tabelas possuem **Row Level Security (RLS)** habilitado, garantindo que cada usuário autenticado só consiga visualizar e gerenciar seus próprios dados.
