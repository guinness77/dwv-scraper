# Documentação Técnica - DWV Scraper

## 1. Visão Geral Técnica

O DWV Scraper é uma aplicação web desenvolvida com React, TypeScript e Supabase para extrair e gerenciar dados de imóveis do DWV App e outros sites imobiliários. A aplicação utiliza uma arquitetura moderna baseada em componentes React para o frontend e Edge Functions do Supabase para o backend, permitindo a execução de código serverless para operações de scraping.

## 2. Stack Tecnológico

### 2.1 Frontend

- **React**: Biblioteca JavaScript para construção de interfaces de usuário
- **TypeScript**: Superset tipado de JavaScript
- **Vite**: Ferramenta de build rápida para desenvolvimento web
- **TailwindCSS**: Framework CSS utilitário
- **Lucide React**: Biblioteca de ícones
- **React Hooks**: API para gerenciamento de estado e efeitos colaterais

### 2.2 Backend

- **Supabase**: Plataforma de backend como serviço (BaaS)
- **Edge Functions**: Funções serverless do Supabase
- **PostgreSQL**: Banco de dados relacional do Supabase
- **Deno**: Runtime JavaScript/TypeScript para Edge Functions

### 2.3 Ferramentas de Desenvolvimento

- **ESLint**: Ferramenta de linting para JavaScript/TypeScript
- **Prettier**: Formatador de código
- **Git**: Sistema de controle de versão
- **npm/yarn**: Gerenciadores de pacotes

## 3. Estrutura do Projeto

```
dwv-scraper/
├── docs/                # Documentação
│   ├── architecture.md  # Arquitetura do sistema
│   ├── product_requirement_docs.md # Requisitos do produto
│   └── technical.md     # Documentação técnica
├── src/                 # Código-fonte
│   ├── components/      # Componentes React
│   │   ├── AutoSearchPanel.tsx    # Painel de busca automática
│   │   ├── DWVAppPanel.tsx        # Painel do DWV App
│   │   ├── DWVAuthTest.tsx        # Teste de autenticação
│   │   ├── PropertyCard.tsx       # Card de imóvel
│   │   ├── PropertyFilters.tsx    # Filtros de imóveis
│   │   ├── PropertyForm.tsx       # Formulário de imóveis
│   │   └── PropertyStats.tsx      # Estatísticas de imóveis
│   ├── hooks/           # React Hooks
│   │   └── useProperties.ts       # Hook para gerenciamento de imóveis
│   ├── services/        # Serviços de API e lógica de negócio
│   │   ├── dwvAppService.ts       # Serviço para o DWV App
│   │   ├── dwvAuthService.ts      # Serviço de autenticação
│   │   ├── propertySearchService.ts # Serviço de busca de imóveis
│   │   └── supabase.ts            # Cliente Supabase
│   ├── types/           # Definições de tipos TypeScript
│   │   └── property.ts            # Tipos para imóveis
│   ├── App.tsx          # Componente principal
│   ├── index.css        # Estilos globais
│   └── main.tsx         # Ponto de entrada
├── supabase/            # Configuração do Supabase
│   ├── functions/       # Edge Functions
│   │   ├── _shared/     # Código compartilhado entre funções
│   │   │   └── cors.ts  # Configuração de CORS
│   │   ├── scrape-dwv-app/        # Função para extrair do DWV App
│   │   │   └── index.ts
│   │   ├── scrape-properties/     # Função para extrair de URLs
│   │   │   └── index.ts
│   │   └── test-dwv-auth/         # Função para testar autenticação
│   │       └── index.ts
│   └── migrations/      # Migrações SQL
│       └── 20250702141500_dusty_hall.sql
├── .env                 # Variáveis de ambiente (não versionado)
├── .gitignore           # Arquivos ignorados pelo Git
├── index.html           # HTML principal
├── package.json         # Dependências e scripts
├── postcss.config.js    # Configuração do PostCSS
├── README.md            # Documentação principal
├── tailwind.config.js   # Configuração do TailwindCSS
├── tsconfig.json        # Configuração do TypeScript
└── vite.config.ts       # Configuração do Vite
```

## 4. Componentes Principais

### 4.1 Frontend

#### 4.1.1 App.tsx

Componente principal que gerencia o estado global da aplicação e renderiza os componentes de acordo com a aba selecionada.

```typescript
// Principais estados
const [activeTab, setActiveTab] = useState<'dwv' | 'auto' | 'manual' | 'test'>('test');
const [searchTerm, setSearchTerm] = useState('');
const [sortBy, setSortBy] = useState('scraped_at');
const [filterBy, setFilterBy] = useState('all');
```

#### 4.1.2 DWVAuthTest.tsx

Componente para testar a autenticação com o DWV App.

```typescript
// Principais funcionalidades
const handleTestAuth = async () => {
  // Testa a autenticação com o DWV App
  const result = await dwvAuthService.testAuthentication();
  // Exibe o resultado
};
```

#### 4.1.3 DWVAppPanel.tsx

Componente para extrair dados de imóveis do DWV App.

```typescript
// Principais funcionalidades
const handleDWVExtraction = async () => {
  // Extrai e salva propriedades do DWV App
  const result = await dwvAppService.scrapeAndSaveDWVProperties();
  // Exibe o resultado
};
```

#### 4.1.4 AutoSearchPanel.tsx

Componente para configurar e executar buscas automáticas em sites imobiliários.

#### 4.1.5 PropertyForm.tsx

Componente para inserir URLs e extrair dados de imóveis manualmente.

#### 4.1.6 PropertyCard.tsx

Componente para exibir informações de um imóvel.

#### 4.1.7 PropertyFilters.tsx

Componente para filtrar e ordenar imóveis.

#### 4.1.8 PropertyStats.tsx

Componente para exibir estatísticas sobre os imóveis extraídos.

### 4.2 Serviços

#### 4.2.1 dwvAuthService.ts

Serviço para testar a autenticação com o DWV App.

```typescript
// Principais funcionalidades
async testAuthentication(): Promise<AuthTestResult> {
  // Invoca a Edge Function test-dwv-auth
  const { data, error } = await supabase.functions.invoke('test-dwv-auth');
  // Processa e retorna o resultado
}
```

#### 4.2.2 dwvAppService.ts

Serviço para extrair e gerenciar dados de imóveis do DWV App.

```typescript
// Principais funcionalidades
async scrapeDWVApp(): Promise<ScrapingResult> {
  // Invoca a Edge Function scrape-dwv-app
  const { data, error } = await supabase.functions.invoke('scrape-dwv-app');
  // Processa e retorna o resultado
}

async saveNewDWVProperties(properties: Property[]): Promise<ScrapingResult> {
  // Verifica propriedades existentes
  const existingTitles = await this.getExistingTitles(properties.map(p => p.title));
  // Salva apenas novas propriedades
  const newProperties = properties.filter(p => !existingTitles.includes(p.title));
  // Insere no banco de dados
  const { data, error } = await supabase.from('properties').insert(newProperties).select();
  // Processa e retorna o resultado
}

async scrapeAndSaveDWVProperties(): Promise<ScrapingResult> {
  // Extrai propriedades
  const scrapingResult = await this.scrapeDWVApp();
  // Salva novas propriedades
  const savingResult = await this.saveNewDWVProperties(scrapingResult.properties);
  // Retorna resultado combinado
}
```

#### 4.2.3 propertySearchService.ts

Serviço para buscar e extrair dados de imóveis de outros sites.

```typescript
// Principais funcionalidades
async searchCuritibaProperties(filters: SearchFilters = { city: 'curitiba' }) {
  // Gera URLs de busca
  const searchUrls = this.generateSearchUrls(filters);
  // Extrai propriedades de cada URL
  for (const url of searchUrls) {
    const properties = await this.scrapeUrl(url);
    // Filtra e salva propriedades
  }
}

private async scrapeUrl(url: string): Promise<Property[]> {
  // Invoca a Edge Function scrape-properties
  const { data, error } = await supabase.functions.invoke('scrape-properties', {
    body: { url }
  });
  // Processa e retorna o resultado
}
```

#### 4.2.4 supabase.ts

Cliente Supabase para interação com o banco de dados e Edge Functions.

```typescript
// Configuração do cliente Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 4.3 Hooks

#### 4.3.1 useProperties.ts

Hook para gerenciamento de imóveis.

```typescript
// Principais funcionalidades
export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega propriedades do banco de dados
  const loadProperties = async () => {
    try {
      const { data, error } = await supabase.from('properties').select('*');
      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Extrai propriedades de uma URL
  const scrapeProperties = async (url: string): Promise<Property[]> => {
    // Implementação
  };

  // Delete uma propriedade
  const deleteProperty = async (id: string): Promise<void> => {
    // Implementação
  };

  // Carrega propriedades ao montar o componente
  useEffect(() => {
    loadProperties();
  }, []);

  return { properties, loading, error, scrapeProperties, deleteProperty };
}
```

### 4.4 Edge Functions

#### 4.4.1 scrape-dwv-app/index.ts

Edge Function para extrair dados de imóveis do DWV App.

```typescript
// Principais funcionalidades
async function scrapeDWVApp(): Promise<Property[]> {
  // Autentica no DWV App
  const loginResponse = await loginToDWV();
  
  // Extrai propriedades via API
  const apiProperties = await fetchPropertiesFromAPI(endpoint, cookies);
  
  // Se API falhar, extrai via HTML
  if (properties.length === 0) {
    const pageProperties = await scrapePropertiesPage(url, cookies);
  }
  
  return properties;
}
```

#### 4.4.2 scrape-properties/index.ts

Edge Function para extrair dados de imóveis de URLs específicas.

```typescript
// Principais funcionalidades
async function scrapeWithJinaReader(url: string): Promise<Property[]> {
  // Usa o serviço Jina Reader para extrair conteúdo
  const response = await fetch(jinaUrl, { headers });
  const content = await response.json();
  return parsePropertiesFromMarkdown(content, url);
}

async function scrapeWithTraditionalMethod(url: string): Promise<Property[]> {
  // Extrai conteúdo HTML diretamente
  const response = await fetch(url, { headers });
  const html = await response.text();
  return scrapeBrazilianProperties(html, url);
}
```

#### 4.4.3 test-dwv-auth/index.ts

Edge Function para testar a autenticação com o DWV App.

```typescript
// Principais funcionalidades
async function testDWVAuthentication(): Promise<{
  success: boolean;
  message: string;
  cookies?: string;
  headers?: Record<string, string>;
  redirectLocation?: string;
}> {
  // Acessa página de login
  const loginPageResponse = await fetch('https://app.dwvapp.com.br/login', { headers });
  
  // Extrai CSRF token
  const csrfToken = extractCsrfToken(loginPageHtml);
  
  // Tenta login com formulário
  const loginResponse = await fetch('https://app.dwvapp.com.br/login', {
    method: 'POST',
    headers,
    body: loginData
  });
  
  // Se falhar, tenta login via API
  if (!loginSuccess) {
    const apiLoginResponse = await fetch('https://app.dwvapp.com.br/api/auth/login', {
      method: 'POST',
      headers,
      body: JSON.stringify(credentials)
    });
  }
  
  return { success, message, cookies, headers, redirectLocation };
}
```

## 5. Banco de Dados

### 5.1 Esquema

O banco de dados PostgreSQL do Supabase é utilizado para armazenar os dados extraídos dos sites imobiliários. A estrutura principal é baseada na tabela `properties`.

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  price TEXT NOT NULL,
  location TEXT NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_feet INTEGER,
  description TEXT,
  image_url TEXT,
  property_type TEXT,
  listing_url TEXT NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  features TEXT[],
  agent_name TEXT,
  agent_phone TEXT,
  status TEXT DEFAULT 'active'
);

-- Índices para melhorar performance de busca
CREATE INDEX idx_properties_title ON properties(title);
CREATE INDEX idx_properties_location ON properties(location);
CREATE INDEX idx_properties_scraped_at ON properties(scraped_at);
CREATE INDEX idx_properties_status ON properties(status);
```

### 5.2 Operações Principais

#### 5.2.1 Inserção de Imóveis

```typescript
const { data, error } = await supabase
  .from('properties')
  .insert(newProperties)
  .select();
```

#### 5.2.2 Consulta de Imóveis

```typescript
const { data, error } = await supabase
  .from('properties')
  .select('*')
  .order('scraped_at', { ascending: false });
```

#### 5.2.3 Verificação de Imóveis Existentes

```typescript
const { data, error } = await supabase
  .from('properties')
  .select('title')
  .in('title', titles);
```

#### 5.2.4 Exclusão de Imóveis

```typescript
const { error } = await supabase
  .from('properties')
  .delete()
  .eq('id', id);
```

## 6. Estratégias de Scraping

### 6.1 Autenticação no DWV App

A autenticação no DWV App é realizada através de múltiplas estratégias:

1. **Form Login**: Submissão do formulário de login tradicional
   ```typescript
   const loginResponse = await fetch('https://app.dwvapp.com.br/login', {
     method: 'POST',
     headers: { /* headers */ },
     body: loginData.toString(),
     redirect: 'manual'
   });
   ```

2. **API Login**: Tentativa de login via endpoints de API
   ```typescript
   const apiLoginResponse = await fetch('https://app.dwvapp.com.br/api/auth/login', {
     method: 'POST',
     headers: { /* headers */ },
     body: JSON.stringify({ email, password })
   });
   ```

3. **Token Management**: Extração e gerenciamento de CSRF tokens
   ```typescript
   const csrfMatch = loginPageHtml.match(/name="csrf_token"[^>]*value="([^"]+)"/i);
   const csrfToken = csrfMatch ? csrfMatch[1] : null;
   ```

### 6.2 Extração de Dados

A extração de dados é realizada através de várias técnicas:

1. **API First**: Tentativa de extrair dados via APIs
   ```typescript
   const apiEndpoints = [
     'https://app.dwvapp.com.br/api/imoveis',
     'https://app.dwvapp.com.br/api/empreendimentos',
     // ...
   ];
   
   for (const endpoint of apiEndpoints) {
     const apiProperties = await fetchPropertiesFromAPI(endpoint, cookies);
     // ...
   }
   ```

2. **HTML Parsing**: Extração de dados do HTML quando APIs não estão disponíveis
   ```typescript
   const propertyCardRegex = /<div[^>]*class="[^"]*(?:property-card|imovel-card)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
   let match;
   
   while ((match = propertyCardRegex.exec(html)) !== null) {
     const cardHtml = match[0];
     // Extrai dados do card
   }
   ```

3. **JSON Extraction**: Extração de dados de objetos JSON embutidos nas páginas
   ```typescript
   const scriptDataMatch = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);
   
   if (scriptDataMatch) {
     const jsonData = JSON.parse(scriptDataMatch[1]);
     // Extrai dados do JSON
   }
   ```

4. **Fallback Strategy**: Utilização de estratégias alternativas quando a principal falha
   ```typescript
   try {
     properties = await scrapeWithJinaReader(url);
   } catch (jinaError) {
     properties = await scrapeWithTraditionalMethod(url);
   }
   ```

### 6.3 Prevenção de Detecção

Para evitar detecção como bot, o sistema utiliza:

1. **User Agent Realista**: Utilização de User Agent de navegador moderno
   ```typescript
   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
   ```

2. **Delays**: Implementação de delays entre requisições
   ```typescript
   await delay(2000); // 2 segundos
   ```

3. **Headers Apropriados**: Utilização de headers comuns em navegadores
   ```typescript
   'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
   'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
   'Referer': 'https://app.dwvapp.com.br/'
   ```

## 7. Configuração e Implantação

### 7.1 Variáveis de Ambiente

O arquivo `.env` deve conter as seguintes variáveis:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

### 7.2 Implantação das Edge Functions

```bash
# Login no Supabase CLI
supabase login

# Link com o projeto Supabase
supabase link --project-ref seu-project-ref

# Implantação das Edge Functions
supabase functions deploy scrape-dwv-app
supabase functions deploy scrape-properties
supabase functions deploy test-dwv-auth
```

### 7.3 Implantação do Frontend

```bash
# Build do frontend
npm run build
# ou
yarn build

# Implantação (exemplo com Netlify)
netlify deploy --prod
```

## 8. Considerações de Segurança

### 8.1 Armazenamento de Credenciais

As credenciais do DWV App são armazenadas diretamente no código das Edge Functions, que são executadas em ambiente seguro do Supabase.

```typescript
const DWV_CREDENTIALS = {
  email: 'fer.scarduelli@gmail.com',
  password: 'dwv@junttus'
};
```

Para maior segurança, essas credenciais poderiam ser armazenadas como variáveis de ambiente ou em um serviço de gerenciamento de segredos.

### 8.2 CORS

As Edge Functions implementam cabeçalhos CORS para permitir requisições apenas da origem esperada.

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### 8.3 Rate Limiting

O sistema implementa delays entre requisições para evitar bloqueios por rate limiting.

```typescript
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Uso
await delay(2000); // 2 segundos
```

## 9. Limitações e Melhorias Futuras

### 9.1 Limitações Atuais

1. **Dependência de Estrutura**: O scraper depende da estrutura atual do DWV App
2. **Detecção de Anti-Bot**: Não há tratamento avançado para medidas anti-bot
3. **Concorrência**: Não há implementação de scraping concorrente
4. **Autenticação**: Credenciais armazenadas diretamente no código

### 9.2 Melhorias Futuras

1. **Proxy Rotation**: Implementação de rotação de proxies para evitar bloqueios
2. **Headless Browser**: Utilização de navegadores headless para sites mais complexos
3. **Machine Learning**: Implementação de ML para extração de dados mais precisa
4. **Monitoramento**: Sistema de monitoramento e alertas para falhas no scraping
5. **Secret Management**: Armazenamento seguro de credenciais em serviço de gerenciamento de segredos
