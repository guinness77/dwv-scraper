// @deno-types="https://deno.land/x/servest@v1.3.1/types/react/index.d.ts"
import { corsHeaders } from '../_shared/cors.ts';
import { getToken, setToken, validateSession, logAuthEvent, clearToken } from '../_shared/token-manager.ts';

// NOTE: TypeScript may show errors for Deno namespace in the editor,
// but this code will work correctly in the Supabase Edge Functions runtime.
// These errors can be safely ignored as they're related to TypeScript configuration
// and won't affect the actual execution of the code.

interface Property {
  title: string;
  price: string;
  location: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  description?: string;
  image_url?: string;
  property_type?: string;
  listing_url: string;
  scraped_at: string;
  features?: string[];
  agent_name?: string;
  agent_phone?: string;
  status?: string;
}

// Get credentials from environment variables
const DWV_CREDENTIALS = {
  email: Deno.env.get('DWV_EMAIL') || 'fer.scarduelli@gmail.com', // Fallback for development
  password: Deno.env.get('DWV_PASSWORD') || 'dwv@junttus' // Fallback for development
};

// Token expiry in seconds (default: 24 hours)
const TOKEN_EXPIRY = parseInt(Deno.env.get('AUTH_TOKEN_EXPIRY') || '86400');

// Auth token key
const AUTH_TOKEN_KEY = 'dwv_auth_token';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Iniciando scraping do DWV App com autenticação...');
    
    const properties = await scrapeDWVApp();
    
    return new Response(
      JSON.stringify({ 
        properties, 
        success: true, 
        total_found: properties.length,
        source: 'DWV App (Authenticated)'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao extrair propriedades do DWV App:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        success: false, 
        properties: [],
        total_found: 0 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function scrapeDWVApp(): Promise<Property[]> {
  const properties: Property[] = [];
  
  try {
    // Step 1: Login to DWV App or use existing session
    console.log('Iniciando autenticação no DWV App...');
    
    // Check for existing valid token
    const existingToken = await getToken(AUTH_TOKEN_KEY);
    let cookies = '';
    
    if (existingToken) {
      console.log('Token existente encontrado, validando sessão...');
      const isValid = await validateSession(existingToken);
      
      if (isValid) {
        logAuthEvent({
          type: 'success',
          method: 'token'
        });
        
        console.log('Usando sessão existente válida');
        cookies = existingToken;
      } else {
        console.log('Token existente inválido, tentando novo login...');
        logAuthEvent({
          type: 'failure',
          method: 'token',
          error: 'Token inválido ou expirado'
        });
        
        const loginResponse = await loginToDWV();
        if (!loginResponse.success) {
          throw new Error('Falha no login: ' + loginResponse.error);
        }
        cookies = loginResponse.cookies || '';
      }
    } else {
      console.log('Nenhum token existente, fazendo login...');
      const loginResponse = await loginToDWV();
      
      if (!loginResponse.success) {
        throw new Error('Falha no login: ' + loginResponse.error);
      }
      
      cookies = loginResponse.cookies || '';
    }
    
    console.log('Autenticação realizada com sucesso');
    
    // Step 2: Try multiple API endpoints to fetch properties
    console.log('Buscando imóveis via API...');
    
    // Try API endpoints first (more reliable)
    const apiEndpoints = [
      'https://app.dwvapp.com.br/api/imoveis',
      'https://app.dwvapp.com.br/api/empreendimentos',
      'https://app.dwvapp.com.br/api/lancamentos',
      'https://app.dwvapp.com.br/api/properties',
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Tentando endpoint API: ${endpoint}`);
        const apiProperties = await fetchPropertiesFromAPI(endpoint, cookies);
        if (apiProperties.length > 0) {
          console.log(`Encontrados ${apiProperties.length} imóveis via API: ${endpoint}`);
          properties.push(...apiProperties);
        }
        await delay(1000);
      } catch (error) {
        console.error(`Erro ao acessar API ${endpoint}:`, error);
      }
    }
    
    // If API endpoints didn't work, try scraping HTML pages
    if (properties.length === 0) {
      console.log('Nenhum imóvel encontrado via API, tentando páginas HTML...');
      
    const listingPages = [
      'https://app.dwvapp.com.br/imoveis',
      'https://app.dwvapp.com.br/imoveis?tipo=apartamento',
      'https://app.dwvapp.com.br/imoveis?tipo=casa',
      'https://app.dwvapp.com.br/imoveis?cidade=curitiba',
      'https://app.dwvapp.com.br/lancamentos',
      'https://app.dwvapp.com.br/imoveis?status=disponivel'
    ];
    
    for (const url of listingPages) {
      try {
          console.log(`Extraindo de página HTML: ${url}`);
        const pageProperties = await scrapePropertiesPage(url, cookies);
        properties.push(...pageProperties);
        
        // Delay between requests
        await delay(2000);
      } catch (error) {
        console.error(`Erro ao extrair ${url}:`, error);
        }
      }
    }
    
    console.log(`Total de propriedades extraídas: ${properties.length}`);
    return properties;
    
  } catch (error) {
    console.error('Erro no scraping do DWV App:', error);
    throw error;
  }
}

async function loginToDWV(): Promise<{ success: boolean; cookies?: string; error?: string }> {
  try {
    // First, get the login page to extract any CSRF tokens or form data
    console.log('Acessando página de login...');
    logAuthEvent({
      type: 'attempt',
      method: 'form'
    });
    
    const loginPageResponse = await fetch('https://app.dwvapp.com.br/login', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      }
    });
    
    if (!loginPageResponse.ok) {
      logAuthEvent({
        type: 'failure',
        method: 'form',
        error: `Falha ao acessar página de login: ${loginPageResponse.status}`,
        responseCode: loginPageResponse.status
      });
      
      throw new Error(`Falha ao acessar página de login: ${loginPageResponse.status}`);
    }
    
    const loginPageHtml = await loginPageResponse.text();
    
    // Extract CSRF token if present - improved regex patterns
    const csrfMatch = loginPageHtml.match(/name="csrf_token"[^>]*value="([^"]+)"/i) ||
                     loginPageHtml.match(/name="_token"[^>]*value="([^"]+)"/i) ||
                     loginPageHtml.match(/"csrf_token":"([^"]+)"/i) ||
                     loginPageHtml.match(/name="csrf"[^>]*value="([^"]+)"/i) ||
                     loginPageHtml.match(/meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
    
    const csrfToken = csrfMatch ? csrfMatch[1] : null;
    console.log('CSRF Token encontrado:', csrfToken || 'Nenhum');
    
    // Get cookies from login page
    const setCookieHeaders = loginPageResponse.headers.get('set-cookie') || '';
    console.log('Cookies recebidos da página de login:', setCookieHeaders ? 'Sim' : 'Não');
    
    // Check if login form exists
    const hasLoginForm = loginPageHtml.includes('form') &&
                        (loginPageHtml.includes('login') || loginPageHtml.includes('signin')) &&
                        (loginPageHtml.includes('password') || loginPageHtml.includes('senha'));
    
    console.log('Formulário de login encontrado:', hasLoginForm ? 'Sim' : 'Não');
    
    // Prepare login data
    const loginData = new URLSearchParams();
    loginData.append('email', DWV_CREDENTIALS.email);
    loginData.append('password', DWV_CREDENTIALS.password);
    
    // Add all possible CSRF token field names
    if (csrfToken) {
      loginData.append('csrf_token', csrfToken);
      loginData.append('_token', csrfToken);
      loginData.append('csrf', csrfToken);
    }
    
    // Attempt login with form
    console.log('Tentando login com formulário...');
    const loginResponse = await fetch('https://app.dwvapp.com.br/login', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://app.dwvapp.com.br',
        'Referer': 'https://app.dwvapp.com.br/login',
        'Cookie': setCookieHeaders,
      },
      body: loginData.toString(),
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    // Check if login was successful
    const responseHeaders = loginResponse.headers;
    const newCookies = responseHeaders.get('set-cookie') || '';
    const location = responseHeaders.get('location') || '';
    
    console.log('Status da resposta de login:', loginResponse.status);
    console.log('Location header:', location);
    console.log('Novos cookies recebidos:', newCookies ? 'Sim' : 'Não');
    
    // Collect all response headers for debugging
    const headersObj: Record<string, string> = {};
    responseHeaders.forEach((value, key) => {
      headersObj[key] = value;
    });
    
    // Successful login usually redirects to dashboard or home
    if (loginResponse.status === 302 && (location.includes('dashboard') || location.includes('home') || location === '/')) {
      const cookies = newCookies || setCookieHeaders;
      
      // Store the token for future use
      await setToken(AUTH_TOKEN_KEY, cookies, TOKEN_EXPIRY);
      
      logAuthEvent({
        type: 'success',
        method: 'form',
        responseCode: loginResponse.status
      });
      
      return {
        success: true,
        cookies
      };
    }
    
    // Try API login if form login fails
    console.log('Login com formulário falhou, tentando API...');
    logAuthEvent({
      type: 'attempt',
      method: 'api'
    });
    
    // Try multiple API endpoints for login
    const apiEndpoints = [
      'https://app.dwvapp.com.br/api/auth/login',
      'https://app.dwvapp.com.br/api/login',
      'https://app.dwvapp.com.br/auth/login'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Tentando login via API: ${endpoint}`);
        
        const apiLoginResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': 'https://app.dwvapp.com.br',
            'Referer': 'https://app.dwvapp.com.br/login',
            'Cookie': setCookieHeaders,
          },
          body: JSON.stringify({
            email: DWV_CREDENTIALS.email,
            password: DWV_CREDENTIALS.password,
            ...(csrfToken && { _token: csrfToken, csrf_token: csrfToken })
          })
        });
        
        const apiCookies = apiLoginResponse.headers.get('set-cookie') || '';
        
        // Try to parse response as JSON
        let apiResponseData: any = null;
        const apiResponseText = await apiLoginResponse.text();
        
        try {
          apiResponseData = JSON.parse(apiResponseText);
        } catch (e) {
          console.log('Resposta da API não é JSON válido:', apiResponseText.substring(0, 500));
        }
        
        if (apiLoginResponse.ok) {
          const cookies = apiCookies || setCookieHeaders;
          
          // Store the token for future use
          await setToken(AUTH_TOKEN_KEY, cookies, TOKEN_EXPIRY);
          
          logAuthEvent({
            type: 'success',
            method: 'api',
            responseCode: apiLoginResponse.status
          });
          
          return {
            success: true,
            cookies
          };
        }
        
        console.log(`Login via API ${endpoint} falhou:`, apiLoginResponse.status);
        logAuthEvent({
          type: 'failure',
          method: 'api',
          error: `Login via API ${endpoint} falhou: ${apiLoginResponse.status}`,
          responseCode: apiLoginResponse.status
        });
      } catch (error) {
        console.error(`Erro ao tentar login via ${endpoint}:`, error);
        logAuthEvent({
          type: 'failure',
          method: 'api',
          error: `Erro ao tentar login via ${endpoint}: ${error.message}`
        });
      }
    }
    
    // If we get here, all login attempts failed
    return {
      success: false,
      error: `Login falhou. Form status: ${loginResponse.status}, Location: ${location}`
    };
    
  } catch (error) {
    logAuthEvent({
      type: 'failure',
      method: 'form',
      error: error.message
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function fetchPropertiesFromAPI(apiUrl: string, cookies: string): Promise<Property[]> {
  const properties: Property[] = [];
  const currentTime = new Date().toISOString();
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cookie': cookies,
        'Referer': 'https://app.dwvapp.com.br/',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Falha ao acessar API ${apiUrl}: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Resposta da API ${apiUrl}:`, typeof data, Array.isArray(data) ? `Array com ${data.length} itens` : 'Objeto');
    
    // Handle different API response formats
    let items: Array<any> = [];
    
    if (Array.isArray(data)) {
      items = data;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (data.results && Array.isArray(data.results)) {
      items = data.results;
    } else if (data.properties && Array.isArray(data.properties)) {
      items = data.properties;
    } else if (data.imoveis && Array.isArray(data.imoveis)) {
      items = data.imoveis;
    } else if (data.empreendimentos && Array.isArray(data.empreendimentos)) {
      items = data.empreendimentos;
    } else {
      console.log('Formato de resposta API desconhecido:', JSON.stringify(data).substring(0, 200));
      return [];
    }
    
    for (const item of items) {
      const property = convertJSONToProperty(item, apiUrl, currentTime);
      if (property) {
        properties.push(property);
      }
    }
    
    return properties;
  } catch (error) {
    console.error(`Erro ao acessar API ${apiUrl}:`, error);
    return [];
  }
}

async function scrapePropertiesPage(url: string, cookies: string): Promise<Property[]> {
  const properties: Property[] = [];
  const currentTime = new Date().toISOString();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cookie': cookies,
        'Referer': 'https://app.dwvapp.com.br/',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Falha ao acessar ${url}: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Check if we're still logged in
    if (html.includes('login') && html.includes('password')) {
      // Clear the invalid token
      await clearToken(AUTH_TOKEN_KEY);
      
      logAuthEvent({
        type: 'failure',
        method: 'session',
        error: 'Sessão expirada - redirecionado para login'
      });
      
      throw new Error('Sessão expirada - redirecionado para login');
    }
    
    // Extract properties using DWV App specific patterns
    const extractedProperties = extractDWVProperties(html, url, currentTime);
    properties.push(...extractedProperties);
    
    // Check if there's a single property detail page
    if (properties.length === 0 && (url.includes('/imovel/') || url.includes('/property/'))) {
      const singleProperty = extractSingleDWVProperty(html, url, currentTime);
      if (singleProperty) {
        properties.push(singleProperty);
      }
    }
    
    return properties;
  } catch (error) {
    console.error(`Erro ao extrair ${url}:`, error);
    return [];
  }
}

function extractDWVProperties(html: string, baseUrl: string, currentTime: string): Property[] {
  const properties: Property[] = [];
  
  try {
    // Look for property cards or listings in the HTML
    const propertyCardRegex = /<div[^>]*class="[^"]*(?:property-card|imovel-card|card-imovel|listing-item)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let match;
    
    while ((match = propertyCardRegex.exec(html)) !== null) {
      const cardHtml = match[0];
      
      // Extract property details from the card
      const titleMatch = cardHtml.match(/<h[2-4][^>]*>(.*?)<\/h[2-4]>/i) || 
                        cardHtml.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/div>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Imóvel DWV';
      
      const priceMatch = cardHtml.match(/R\$\s*[\d.,]+/i) || 
                        cardHtml.match(/<div[^>]*class="[^"]*price[^"]*"[^>]*>(.*?)<\/div>/i);
      const price = priceMatch ? priceMatch[0].replace(/<[^>]*>/g, '').trim() : 'Preço sob consulta';
      
      const locationMatch = cardHtml.match(/<div[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/div>/i) ||
                          cardHtml.match(/<span[^>]*class="[^"]*address[^"]*"[^>]*>(.*?)<\/span>/i);
      const location = locationMatch ? locationMatch[1].replace(/<[^>]*>/g, '').trim() : 'Localização não informada';
      
      // Extract link to property detail page
      const linkMatch = cardHtml.match(/href="([^"]*\/imovel\/[^"]*|[^"]*\/property\/[^"]*)"/i);
      const detailUrl = linkMatch ? makeAbsoluteUrl(linkMatch[1], baseUrl) : baseUrl;
      
      // Extract image URL
      const imageMatch = cardHtml.match(/src="([^"]*\.(?:jpg|jpeg|png|webp))"/i);
      const imageUrl = imageMatch ? makeAbsoluteUrl(imageMatch[1], baseUrl) : undefined;
      
      // Extract bedrooms and bathrooms
      const bedroomsMatch = cardHtml.match(/(\d+)\s*(?:quartos?|dormitórios?|dorms?|suítes?)/i);
      const bathroomsMatch = cardHtml.match(/(\d+)\s*(?:banheiros?|lavabos?)/i);
      
      const property: Property = {
        title,
        price,
        location,
        listing_url: detailUrl,
        scraped_at: currentTime,
        status: 'active',
        image_url: imageUrl,
        bedrooms: bedroomsMatch ? parseInt(bedroomsMatch[1]) : undefined,
        bathrooms: bathroomsMatch ? parseInt(bathroomsMatch[1]) : undefined
      };
      
        properties.push(property);
  }
  
    // If no property cards found, try to extract from JSON data in script tags
  if (properties.length === 0) {
      const scriptDataMatch = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i) ||
                            html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
      
      if (scriptDataMatch) {
        try {
          const jsonData = JSON.parse(scriptDataMatch[1]);
          console.log('Encontrados dados JSON no script:', Object.keys(jsonData));
          
          // Extract properties from JSON data (structure depends on the site)
          const items = jsonData.props?.pageProps?.properties || 
                      jsonData.props?.pageProps?.imoveis ||
                      jsonData.props?.pageProps?.empreendimentos ||
                      jsonData.props?.pageProps?.data?.properties ||
                      jsonData.props?.pageProps?.data?.imoveis ||
                      jsonData.props?.pageProps?.data?.empreendimentos ||
                      jsonData.data?.properties ||
                      jsonData.data?.imoveis ||
                      jsonData.data?.empreendimentos;
          
          if (items && Array.isArray(items)) {
            console.log(`Encontrados ${items.length} imóveis nos dados JSON`);
            
            for (const item of items) {
            const property = convertJSONToProperty(item, baseUrl, currentTime);
            if (property) {
              properties.push(property);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao processar dados JSON:', error);
      }
    }
  }
  
  return properties;
  } catch (error) {
    console.error('Erro ao extrair propriedades:', error);
    return [];
  }
}

function extractSingleDWVProperty(html: string, url: string, currentTime: string): Property | null {
  try {
    // Extract title
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || 
                      html.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/div>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Imóvel DWV';
    
    // Extract price
    const priceMatch = html.match(/R\$\s*[\d.,]+/i) || 
                      html.match(/<div[^>]*class="[^"]*price[^"]*"[^>]*>(.*?)<\/div>/i);
    const price = priceMatch ? priceMatch[0].replace(/<[^>]*>/g, '').trim() : 'Preço sob consulta';
    
    // Extract location
    const locationMatch = html.match(/<div[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/div>/i) ||
                        html.match(/<span[^>]*class="[^"]*address[^"]*"[^>]*>(.*?)<\/span>/i) ||
                        html.match(/<div[^>]*class="[^"]*address[^"]*"[^>]*>(.*?)<\/div>/i);
    const location = locationMatch ? locationMatch[1].replace(/<[^>]*>/g, '').trim() : 'Localização não informada';
    
    // Extract image URL
    const imageMatch = html.match(/<img[^>]*class="[^"]*(?:property-image|imovel-image)[^"]*"[^>]*src="([^"]*)"[^>]*>/i) ||
                      html.match(/<div[^>]*class="[^"]*(?:property-image|imovel-image)[^"]*"[^>]*style="[^"]*background-image:\s*url\(['"]([^'"]*)['"]\)[^"]*"[^>]*>/i);
    const imageUrl = imageMatch ? makeAbsoluteUrl(imageMatch[1], url) : undefined;
    
    // Extract description
    const descriptionMatch = html.match(/<div[^>]*class="[^"]*(?:description|descricao)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const description = descriptionMatch ? descriptionMatch[1].replace(/<[^>]*>/g, '').trim() : undefined;
    
    // Extract bedrooms and bathrooms
    const bedroomsMatch = html.match(/(\d+)\s*(?:quartos?|dormitórios?|dorms?|suítes?)/i);
    const bathroomsMatch = html.match(/(\d+)\s*(?:banheiros?|lavabos?)/i);
    
    // Extract square feet
    const squareFeetMatch = html.match(/(\d+)\s*(?:m²|m2)/i);
    
    // Extract features
    const featuresMatch = html.match(/<ul[^>]*class="[^"]*(?:features|caracteristicas)[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
    let features: string[] | undefined;
    
    if (featuresMatch) {
      const featureItems = featuresMatch[1].match(/<li[^>]*>(.*?)<\/li>/gi);
      if (featureItems) {
        features = featureItems.map(item => item.replace(/<[^>]*>/g, '').trim());
      }
    }
    
    // Extract agent info
    const agentNameMatch = html.match(/<div[^>]*class="[^"]*(?:agent-name|corretor-nome)[^"]*"[^>]*>(.*?)<\/div>/i);
    const agentPhoneMatch = html.match(/<div[^>]*class="[^"]*(?:agent-phone|corretor-telefone)[^"]*"[^>]*>(.*?)<\/div>/i);
    
    const property: Property = {
      title,
      price,
      location,
      listing_url: url,
      scraped_at: currentTime,
      status: 'active',
      image_url: imageUrl,
      description,
      bedrooms: bedroomsMatch ? parseInt(bedroomsMatch[1]) : undefined,
      bathrooms: bathroomsMatch ? parseInt(bathroomsMatch[1]) : undefined,
      square_feet: squareFeetMatch ? parseInt(squareFeetMatch[1]) : undefined,
      features,
      agent_name: agentNameMatch ? agentNameMatch[1].replace(/<[^>]*>/g, '').trim() : undefined,
      agent_phone: agentPhoneMatch ? agentPhoneMatch[1].replace(/<[^>]*>/g, '').trim() : undefined
    };
    
    return property;
  } catch (error) {
    console.error('Erro ao extrair propriedade única:', error);
    return null;
  }
}

function convertJSONToProperty(item: any, baseUrl: string, currentTime: string): Property | null {
  try {
    if (!item) return null;
    
    // Extract property information from JSON data
    // Field names vary depending on the API
    const title = item.title || item.nome || item.name || item.titulo || 'Imóvel DWV';
    
    const price = item.price || item.preco || item.valor || 
                (item.valores && item.valores.venda ? item.valores.venda : null) ||
                'Preço sob consulta';
    
    const location = item.location || item.endereco || item.address || 
                   (item.address ? `${item.address.street || ''}, ${item.address.neighborhood || ''}, ${item.address.city || ''}` : null) ||
                   item.bairro || 
                   'Localização não informada';
    
    const detailUrl = item.url || item.link || baseUrl;
    
    const property: Property = {
      title: typeof title === 'string' ? title : JSON.stringify(title),
      price: typeof price === 'string' ? price : `R$ ${price}`,
      location: typeof location === 'string' ? location : JSON.stringify(location),
      listing_url: makeAbsoluteUrl(typeof detailUrl === 'string' ? detailUrl : baseUrl, baseUrl),
      scraped_at: currentTime,
      status: 'active',
      image_url: item.image_url || item.imagem || item.foto || item.thumbnail || item.images?.[0] || undefined,
      description: item.description || item.descricao || item.sobre || undefined,
      bedrooms: item.bedrooms || item.quartos || item.dormitorios || undefined,
      bathrooms: item.bathrooms || item.banheiros || undefined,
      square_feet: item.square_feet || item.area || item.metragem || undefined,
      property_type: item.property_type || item.tipo || item.category || undefined,
      features: Array.isArray(item.features) ? item.features : 
               Array.isArray(item.caracteristicas) ? item.caracteristicas : undefined,
      agent_name: item.agent_name || item.corretor || item.agent?.name || undefined,
      agent_phone: item.agent_phone || item.telefone || item.agent?.phone || undefined
    };
    
    return property;
  } catch (error) {
    console.error('Erro ao converter JSON para propriedade:', error);
    return null;
  }
}

function makeAbsoluteUrl(url: string, baseUrl: string): string {
  if (!url) return baseUrl;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    const baseUrlObj = new URL(baseUrl);
    return `${baseUrlObj.origin}${url}`;
  }
  return new URL(url, baseUrl).toString();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}