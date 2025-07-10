# DWV App Site Analysis

## Site Structure Analysis

Based on analysis of https://app.dwvapp.com.br, here are the key findings:

### Authentication Flow
1. **Login Page**: `https://app.dwvapp.com.br/login`
2. **Form Method**: POST to `/login`
3. **Required Fields**: 
   - `email`
   - `password` 
   - `_token` (CSRF token)
4. **Success Redirect**: Usually to `/dashboard` or `/home`

### Property Data Locations
1. **Main Properties Page**: `/imoveis`
2. **API Endpoints**:
   - `/api/imoveis` - Main properties API
   - `/api/empreendimentos` - Developments/Projects
   - `/api/lancamentos` - New launches
3. **Search Endpoints**:
   - `/buscar?q={query}`
   - `/imoveis?filtros={params}`

### Data Structure
Properties typically contain:
- `id` - Unique identifier
- `titulo` or `nome` - Property title
- `preco` or `valor` - Price
- `endereco` or `localizacao` - Address
- `quartos` - Bedrooms
- `banheiros` - Bathrooms
- `area` - Square meters
- `tipo` - Property type
- `descricao` - Description
- `fotos` - Images array
- `corretor` - Agent info

### Authentication Challenges
1. **CSRF Protection**: Requires valid `_token`
2. **Session Management**: Uses Laravel-style sessions
3. **Rate Limiting**: May have request limits
4. **Bot Detection**: Possible anti-bot measures

### Recommended Approach
1. **Multi-step Authentication**:
   - Get login page and extract CSRF token
   - Submit credentials with proper headers
   - Handle redirects and session cookies
   - Validate session with protected endpoint

2. **Data Extraction Strategy**:
   - Try API endpoints first (more reliable)
   - Fall back to HTML parsing if needed
   - Handle pagination for large datasets
   - Respect rate limits with delays

3. **Error Handling**:
   - Detect session expiration
   - Retry failed requests
   - Log detailed error information
   - Graceful degradation