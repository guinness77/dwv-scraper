# DWV Scraper

Um aplicativo para extrair e gerenciar imóveis do DWV App e outros sites imobiliários.

## Visão Geral

O DWV Scraper é uma ferramenta que permite extrair dados de imóveis do DWV App (app.dwvapp.com.br) e outros sites imobiliários. O aplicativo faz login automaticamente na plataforma DWV, extrai informações detalhadas sobre os imóveis disponíveis e armazena esses dados em um banco de dados Supabase para fácil acesso e gerenciamento.

## Funcionalidades

- **Autenticação Automática**: Login automático no DWV App usando credenciais configuradas
- **Extração de Dados**: Coleta de informações detalhadas sobre imóveis
- **Armazenamento em Banco de Dados**: Persistência dos dados no Supabase
- **Interface de Usuário**: Visualização e gerenciamento dos imóveis extraídos
- **Busca Automática**: Configuração de buscas automáticas em sites imobiliários
- **Extração Manual**: Possibilidade de extrair dados de URLs específicas
- **Sistema de Autenticação Avançado**: Gerenciamento seguro de tokens e sessões para acesso ao DWV App

## Requisitos

- Node.js 16+ 
- NPM ou Yarn
- Conta no Supabase
- Credenciais de acesso ao DWV App

## Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/dwv-scraper.git
cd dwv-scraper
```

### 2. Instale as dependências

```bash
npm install
# ou
yarn install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
DWV_EMAIL=seu_email_dwv
DWV_PASSWORD=sua_senha_dwv
AUTH_TOKEN_EXPIRY=86400  # 24 horas em segundos
```

### 4. Configure o banco de dados Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute a migração SQL disponível em `supabase/migrations/20250702141500_dusty_hall.sql`
3. Configure as Edge Functions no Supabase CLI:

```bash
supabase login
supabase link --project-ref seu-project-ref
supabase functions deploy scrape-dwv-app
supabase functions deploy scrape-properties
supabase functions deploy test-dwv-auth
```

## Execução

### Desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

### Produção

```bash
npm run build
npm run preview
# ou
yarn build
yarn preview
```

## Implantação no Netlify

### 1. Preparação para Implantação

1. Certifique-se de que seu código está pronto para produção
2. Verifique se todas as dependências estão atualizadas
3. Execute os testes localmente para garantir que tudo funciona corretamente

### 2. Configuração do Netlify

1. Crie uma conta no [Netlify](https://netlify.com) (se ainda não tiver)
2. Conecte seu repositório GitHub ao Netlify
3. Configure as seguintes opções de build:
   - **Comando de build:** `npm run build`
   - **Diretório de publicação:** `dist`
   - **Versão do Node:** `20` (ou superior)

### 3. Configuração de Variáveis de Ambiente no Netlify

1. No dashboard do Netlify, vá para **Site settings** > **Environment variables**
2. Adicione as seguintes variáveis:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
   DWV_EMAIL=seu_email_dwv
   DWV_PASSWORD=sua_senha_dwv
   AUTH_TOKEN_EXPIRY=86400
   ```
3. Clique em **Save** para salvar as variáveis

### 4. Implantação das Funções Supabase

1. Instale a CLI do Supabase:
   ```bash
   npm install -g supabase
   ```

2. Faça login na sua conta Supabase:
   ```bash
   supabase login
   ```

3. Vincule seu projeto Supabase:
   ```bash
   supabase link --project-ref seu-project-ref
   ```

4. Implante as funções Edge:
   ```bash
   supabase functions deploy test-dwv-auth
   supabase functions deploy scrape-dwv-app
   supabase functions deploy scrape-properties
   ```

5. Configure as permissões de CORS para permitir solicitações do seu domínio Netlify:
   - No dashboard do Supabase, vá para **Settings** > **API**
   - Em **CORS (Cross-Origin Resource Sharing)**, adicione seu domínio Netlify (ex: `https://seu-site.netlify.app`)

### 5. Implantação Automática

1. Commit e push das alterações para o GitHub:
   ```bash
   git add .
   git commit -m "Pronto para implantação no Netlify"
   git push origin main
   ```

2. O Netlify detectará automaticamente as alterações e iniciará o processo de build e deploy

### 6. Verificação da Implantação

1. Acesse o URL fornecido pelo Netlify
2. Teste a funcionalidade de autenticação do DWV
3. Verifique se a extração de imóveis está funcionando corretamente

## Uso

### Teste de Autenticação

1. Acesse a aba "Teste de Autenticação"
2. Clique no botão "Testar Autenticação DWV"
3. Verifique se a autenticação foi bem-sucedida

### Extração de Imóveis do DWV App

1. Acesse a aba "DWV App (Autenticado)"
2. Clique no botão "Extrair Imóveis do DWV App"
3. Aguarde a conclusão do processo
4. Os imóveis extraídos serão exibidos na lista abaixo

### Busca Automática

1. Acesse a aba "Busca Automática Curitiba"
2. Configure os parâmetros de busca
3. Clique no botão "Iniciar Busca Automática"
4. Os imóveis encontrados serão exibidos na lista abaixo

### Extração Manual

1. Acesse a aba "Extração Manual"
2. Insira a URL do site imobiliário que deseja extrair
3. Clique no botão "Extrair Imóveis"
4. Os imóveis extraídos serão exibidos na lista abaixo

## Estrutura do Projeto

```
dwv-scraper/
├── docs/                # Documentação
├── src/                 # Código-fonte
│   ├── components/      # Componentes React
│   ├── hooks/           # React Hooks
│   ├── services/        # Serviços de API e lógica de negócio
│   └── types/           # Definições de tipos TypeScript
├── supabase/            # Configuração do Supabase
│   ├── functions/       # Edge Functions do Supabase
│   └── migrations/      # Migrações SQL
```

## Solução de Problemas

### Erro de Autenticação

Se o teste de autenticação falhar:

1. Verifique se as credenciais estão corretas
2. Verifique se o DWV App está online
3. Verifique os logs da função `test-dwv-auth`
4. Confirme se o token de autenticação não expirou (padrão: 24 horas)
5. Verifique se o formato das cookies de sessão está correto

### Erro na Extração de Imóveis

Se a extração de imóveis falhar:

1. Execute o teste de autenticação para verificar se as credenciais estão funcionando
2. Verifique os logs da função `scrape-dwv-app`
3. Verifique se a estrutura do site DWV App não mudou

### Problemas de Implantação no Netlify

1. **Build Falha:**
   - Verifique se a versão do Node.js está correta (20+)
   - Confirme se todas as dependências estão instaladas
   - Verifique erros de TypeScript ou ESLint

2. **Variáveis de Ambiente Não Funcionam:**
   - Certifique-se de que as variáveis começam com `VITE_` para serem expostas ao frontend
   - Reimplante após adicionar novas variáveis
   - Verifique se os nomes das variáveis correspondem exatamente aos usados no código

3. **Problemas de Conexão com Supabase:**
   - Verifique a URL e chave do Supabase
   - Confirme as configurações de CORS no Supabase
   - Certifique-se de que as funções Edge foram implantadas corretamente
   - Verifique se as permissões de acesso às funções estão configuradas corretamente

4. **Funções Edge Não Respondem:**
   - Verifique os logs das funções no dashboard do Supabase
   - Confirme se as variáveis de ambiente estão configuradas no Supabase
   - Teste as funções localmente antes de implantar

## Sistema de Autenticação

### Melhorias Implementadas

O sistema de autenticação do DWV Scraper foi significativamente aprimorado com as seguintes melhorias:

1. **Gerenciamento de Tokens:**
   - Implementação de armazenamento seguro de tokens
   - Verificação automática de validade e expiração
   - Renovação automática de tokens expirados

2. **Múltiplos Métodos de Autenticação:**
   - Autenticação via formulário tradicional
   - Autenticação via API REST
   - Fallback automático entre métodos

3. **Validação de Sessão:**
   - Verificação da validade da sessão antes de operações
   - Detecção de sessões expiradas ou inválidas
   - Reautenticação automática quando necessário

4. **Monitoramento e Logging:**
   - Registro detalhado de eventos de autenticação
   - Monitoramento de tentativas de login
   - Detecção de falhas e erros

5. **Segurança Aprimorada:**
   - Suporte a CSRF tokens
   - Armazenamento seguro de credenciais
   - Configuração de tempo de expiração personalizável

### Arquitetura do Sistema de Autenticação

O sistema utiliza um gerenciador de tokens (`token-manager.ts`) que centraliza todas as operações relacionadas à autenticação, proporcionando uma interface consistente para o restante da aplicação.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes.

## Recursos Adicionais

- [Guia Detalhado de Implantação no Netlify](NETLIFY_DEPLOYMENT_GUIDE.md)
- [Documentação Técnica](docs/technical.md)
- [Arquitetura do Projeto](docs/architecture.md)
