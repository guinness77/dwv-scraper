# Documento de Requisitos do Produto - DWV Scraper

## 1. Visão Geral do Produto

### 1.1 Propósito

O DWV Scraper é uma ferramenta projetada para extrair e gerenciar dados de imóveis do DWV App (app.dwvapp.com.br) e outros sites imobiliários. O objetivo principal é fornecer aos agentes SDR (Sales Development Representatives) acesso fácil e centralizado a informações atualizadas sobre propriedades disponíveis para venda ou aluguel, permitindo oferecer essas propriedades aos clientes de forma eficiente.

### 1.2 Escopo

O sistema deve ser capaz de:
- Autenticar-se automaticamente no DWV App
- Extrair dados detalhados de imóveis do DWV App
- Extrair dados de imóveis de outros sites imobiliários
- Armazenar os dados extraídos em um banco de dados
- Fornecer uma interface para visualização e gerenciamento dos dados
- Permitir busca e filtragem de imóveis
- Automatizar o processo de extração de dados

### 1.3 Definições e Acrônimos

- **DWV App**: Plataforma online que conecta incorporadoras e corretores de imóveis
- **Scraping**: Processo de extração automatizada de dados de websites
- **SDR**: Sales Development Representative (Representante de Desenvolvimento de Vendas)
- **Edge Function**: Função serverless executada próxima ao usuário
- **Supabase**: Plataforma de backend como serviço (BaaS)

## 2. Requisitos Funcionais

### 2.1 Autenticação

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01 | O sistema deve autenticar-se automaticamente no DWV App usando credenciais configuradas | Alta |
| RF-02 | O sistema deve gerenciar cookies e tokens de sessão | Alta |
| RF-03 | O sistema deve detectar falhas de autenticação e tentar métodos alternativos | Média |
| RF-04 | O sistema deve permitir testar a autenticação separadamente | Média |

### 2.2 Extração de Dados do DWV App

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-05 | O sistema deve extrair dados de imóveis do DWV App após autenticação | Alta |
| RF-06 | O sistema deve extrair informações detalhadas de cada imóvel (título, preço, localização, etc.) | Alta |
| RF-07 | O sistema deve tentar múltiplos endpoints de API para obter dados | Média |
| RF-08 | O sistema deve extrair dados de páginas HTML quando APIs não estão disponíveis | Média |
| RF-09 | O sistema deve extrair dados de objetos JSON embutidos nas páginas | Média |

### 2.3 Extração de Dados de Outros Sites

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-10 | O sistema deve permitir a extração de dados de URLs específicas | Média |
| RF-11 | O sistema deve suportar múltiplos sites imobiliários | Baixa |
| RF-12 | O sistema deve usar técnicas adaptativas para extrair dados de diferentes estruturas de sites | Baixa |

### 2.4 Armazenamento de Dados

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-13 | O sistema deve armazenar os dados extraídos em um banco de dados Supabase | Alta |
| RF-14 | O sistema deve evitar duplicatas verificando imóveis existentes antes de salvar | Alta |
| RF-15 | O sistema deve registrar a data e hora da extração de cada imóvel | Média |
| RF-16 | O sistema deve permitir atualizar informações de imóveis existentes | Baixa |

### 2.5 Interface de Usuário

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-17 | O sistema deve fornecer uma interface para visualização dos imóveis extraídos | Alta |
| RF-18 | O sistema deve permitir filtrar imóveis por critérios como preço, localização e tipo | Alta |
| RF-19 | O sistema deve permitir buscar imóveis por texto | Média |
| RF-20 | O sistema deve permitir ordenar imóveis por diferentes critérios | Média |
| RF-21 | O sistema deve exibir estatísticas sobre os imóveis extraídos | Baixa |

### 2.6 Automação

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-22 | O sistema deve permitir configurar buscas automáticas periódicas | Média |
| RF-23 | O sistema deve notificar sobre novos imóveis encontrados | Baixa |

## 3. Requisitos Não-Funcionais

### 3.1 Desempenho

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF-01 | O sistema deve extrair dados de pelo menos 50 imóveis por minuto | Média |
| RNF-02 | O sistema deve responder a interações do usuário em menos de 2 segundos | Alta |
| RNF-03 | O sistema deve suportar pelo menos 1000 imóveis no banco de dados sem degradação de desempenho | Média |

### 3.2 Segurança

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF-04 | O sistema deve armazenar credenciais de forma segura | Alta |
| RNF-05 | O sistema deve usar HTTPS para todas as comunicações | Alta |
| RNF-06 | O sistema deve implementar autenticação para acesso ao aplicativo | Média |

### 3.3 Usabilidade

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF-07 | A interface deve ser responsiva e funcionar em dispositivos móveis e desktop | Alta |
| RNF-08 | O sistema deve fornecer feedback claro sobre o progresso das operações de extração | Alta |
| RNF-09 | O sistema deve exibir mensagens de erro claras e acionáveis | Média |

### 3.4 Confiabilidade

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF-10 | O sistema deve implementar mecanismos de retry para falhas temporárias | Alta |
| RNF-11 | O sistema deve registrar logs detalhados para diagnóstico de problemas | Média |
| RNF-12 | O sistema deve ser capaz de se recuperar de falhas sem intervenção manual | Média |

### 3.5 Manutenibilidade

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF-13 | O código deve seguir boas práticas e padrões de codificação | Alta |
| RNF-14 | O sistema deve ser modular para facilitar atualizações e extensões | Alta |
| RNF-15 | O sistema deve ser adaptável a mudanças na estrutura dos sites alvo | Alta |

## 4. Restrições

- O sistema deve ser desenvolvido usando React e TypeScript para o frontend
- O sistema deve usar Supabase para backend e armazenamento de dados
- O sistema deve ser compatível com navegadores modernos (Chrome, Firefox, Safari, Edge)
- O sistema deve respeitar os termos de serviço dos sites alvo
- O sistema deve implementar delays entre requisições para evitar bloqueios

## 5. Casos de Uso

### 5.1 Teste de Autenticação

**Ator Principal**: Usuário (SDR)

**Fluxo Principal**:
1. Usuário acessa a aba "Teste de Autenticação"
2. Usuário clica no botão "Testar Autenticação DWV"
3. Sistema tenta autenticar-se no DWV App
4. Sistema exibe o resultado da autenticação

**Fluxos Alternativos**:
- Se a autenticação falhar, o sistema exibe uma mensagem de erro com detalhes

### 5.2 Extração de Imóveis do DWV App

**Ator Principal**: Usuário (SDR)

**Fluxo Principal**:
1. Usuário acessa a aba "DWV App (Autenticado)"
2. Usuário clica no botão "Extrair Imóveis do DWV App"
3. Sistema autentica-se no DWV App
4. Sistema extrai dados de imóveis
5. Sistema salva os novos imóveis no banco de dados
6. Sistema exibe os resultados da extração

**Fluxos Alternativos**:
- Se a autenticação falhar, o sistema exibe uma mensagem de erro
- Se nenhum imóvel for encontrado, o sistema exibe uma mensagem informativa

### 5.3 Busca Automática

**Ator Principal**: Usuário (SDR)

**Fluxo Principal**:
1. Usuário acessa a aba "Busca Automática Curitiba"
2. Usuário configura os parâmetros de busca
3. Usuário clica no botão "Iniciar Busca Automática"
4. Sistema extrai dados de imóveis dos sites configurados
5. Sistema salva os novos imóveis no banco de dados
6. Sistema exibe os resultados da busca

**Fluxos Alternativos**:
- Se a extração falhar, o sistema exibe uma mensagem de erro
- Se nenhum imóvel for encontrado, o sistema exibe uma mensagem informativa

### 5.4 Extração Manual

**Ator Principal**: Usuário (SDR)

**Fluxo Principal**:
1. Usuário acessa a aba "Extração Manual"
2. Usuário insere a URL do site imobiliário
3. Usuário clica no botão "Extrair Imóveis"
4. Sistema extrai dados de imóveis da URL
5. Sistema salva os novos imóveis no banco de dados
6. Sistema exibe os resultados da extração

**Fluxos Alternativos**:
- Se a extração falhar, o sistema exibe uma mensagem de erro
- Se nenhum imóvel for encontrado, o sistema exibe uma mensagem informativa

### 5.5 Visualização e Filtragem de Imóveis

**Ator Principal**: Usuário (SDR)

**Fluxo Principal**:
1. Usuário visualiza a lista de imóveis
2. Usuário utiliza os filtros para refinar a lista
3. Usuário visualiza os imóveis filtrados
4. Usuário clica em um imóvel para ver detalhes

**Fluxos Alternativos**:
- Se nenhum imóvel corresponder aos filtros, o sistema exibe uma mensagem informativa

## 6. Requisitos de Dados

### 6.1 Modelo de Dados

#### 6.1.1 Entidade: Property (Imóvel)

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único do imóvel |
| title | String | Título ou nome do imóvel |
| price | String | Preço do imóvel |
| location | String | Localização do imóvel |
| bedrooms | Integer | Número de quartos |
| bathrooms | Integer | Número de banheiros |
| square_feet | Integer | Área em metros quadrados |
| description | String | Descrição detalhada do imóvel |
| image_url | String | URL da imagem principal do imóvel |
| property_type | String | Tipo de imóvel (apartamento, casa, etc.) |
| listing_url | String | URL original do anúncio |
| scraped_at | Timestamp | Data e hora da extração |
| features | Array<String> | Características do imóvel |
| agent_name | String | Nome do corretor/agente |
| agent_phone | String | Telefone do corretor/agente |
| status | String | Status do imóvel (ativo, pendente, vendido) |

## 7. Interfaces Externas

### 7.1 Interfaces de Usuário

- Interface web responsiva desenvolvida com React e TailwindCSS
- Suporte a navegadores modernos (Chrome, Firefox, Safari, Edge)

### 7.2 Interfaces de Software

- API do Supabase para armazenamento e recuperação de dados
- Edge Functions do Supabase para execução de código serverless
- APIs do DWV App (quando disponíveis)
- Páginas HTML do DWV App e outros sites imobiliários

### 7.3 Interfaces de Comunicação

- HTTPS para todas as comunicações
- WebSockets para atualizações em tempo real (futuro)

## 8. Requisitos de Qualidade

### 8.1 Testabilidade

- O sistema deve permitir testar a autenticação separadamente
- O sistema deve fornecer logs detalhados para diagnóstico de problemas

### 8.2 Escalabilidade

- O sistema deve suportar o crescimento do número de imóveis sem degradação de desempenho
- O sistema deve ser capaz de extrair dados de múltiplos sites simultaneamente

### 8.3 Disponibilidade

- O sistema deve estar disponível 24/7, com exceção de manutenções programadas
- O sistema deve se recuperar automaticamente de falhas temporárias

## 9. Apêndices

### 9.1 Glossário

- **DWV App**: Plataforma online que conecta incorporadoras e corretores de imóveis
- **Scraping**: Processo de extração automatizada de dados de websites
- **SDR**: Sales Development Representative (Representante de Desenvolvimento de Vendas)
- **Edge Function**: Função serverless executada próxima ao usuário
- **Supabase**: Plataforma de backend como serviço (BaaS)
- **API**: Application Programming Interface (Interface de Programação de Aplicações)
- **HTML**: HyperText Markup Language (Linguagem de Marcação de Hipertexto)
- **JSON**: JavaScript Object Notation (Notação de Objeto JavaScript)
- **UUID**: Universally Unique Identifier (Identificador Único Universal)
- **HTTPS**: HyperText Transfer Protocol Secure (Protocolo de Transferência de Hipertexto Seguro)
- **WebSocket**: Protocolo de comunicação bidirecional em tempo real

### 9.2 Referências

- Documentação do Supabase: https://supabase.com/docs
- Documentação do React: https://reactjs.org/docs
- Documentação do TypeScript: https://www.typescriptlang.org/docs
- Documentação do TailwindCSS: https://tailwindcss.com/docs
