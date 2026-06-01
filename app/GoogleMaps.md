# Configurando a API Key do Google Maps

## 1. Criar ou acessar um projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Faça login com sua conta Google
3. No topo da página, clique em **"Selecionar projeto"** → **"Novo projeto"**
4. Dê um nome (ex: `pism-app`) e clique em **Criar**

---

## 2. Ativar a API do Maps para Android

1. No menu lateral, vá em **APIs e serviços → Biblioteca**
2. Pesquise por `Maps SDK for Android`
3. Clique no resultado e depois em **Ativar**

---

## 3. Gerar a chave

1. Vá em **APIs e serviços → Credenciais**
2. Clique em **+ Criar credenciais → Chave de API**
3. A chave será gerada. Copie-a.

### Restringir a chave (recomendado)

Clique em **Editar chave** após criar:

- **Restrições de aplicativo** → selecione **Apps Android**
- Clique em **+ Adicionar** e preencha:
  - **Nome do pacote**: `com.jcjoo.app`
  - **Impressão digital SHA-1**: obtenha com o comando abaixo

```bash
cd android
./gradlew signingReport
```

Procure pelo bloco `Variant: debug` e copie o valor de `SHA1`.

- **Restrições de API** → selecione **Restringir chave** → marque `Maps SDK for Android`
- Clique em **Salvar**

---

## 4. Adicionar a chave ao projeto

Crie o arquivo `android/local.properties` (já está no `.gitignore`, não vai para o git):

```properties
sdk.dir=/home/SEU_USUARIO/Android/Sdk
GOOGLE_MAPS_API_KEY=AIzaSy...SUA_CHAVE_AQUI
```

> Se o arquivo já existir com `sdk.dir`, apenas adicione a linha `GOOGLE_MAPS_API_KEY`.

---

## 5. Rebuildar o app

A chave é injetada em tempo de build, então é necessário recompilar:

```bash
npx expo run:android
```

---

## Plano gratuito

O Google Maps oferece **$200 de crédito mensal gratuito**, o que equivale a aproximadamente **100.000 carregamentos de mapa por mês**. Para um app pessoal de uso interno, o custo será zero.

Não é necessário adicionar cartão de crédito para usar dentro do limite gratuito — mas o Google pode solicitar para ativar o faturamento. Nesse caso, configure um **alerta de orçamento em $0** em **Faturamento → Orçamentos e alertas** para garantir que não seja cobrado nada.
