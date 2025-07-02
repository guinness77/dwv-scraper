import { corsHeaders } from '../_shared/cors.ts';

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

const DWV_CREDENTIALS = {
  email: 'fer.scarduelli@gmail.com',
  password: 'dwv@junttus'
};

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
    // Step 1: Login to DWV App
    console.log('Fazendo login no DWV App...');
    const loginResponse = await loginToDWV();
    
    if (!loginResponse.success) {
      throw new Error('Falha no login: ' + loginResponse.error);
    }
    
    const cookies = loginResponse.cookies;
    console.log('Login realizado com sucesso');
    
    // Step 2: Navigate to properties listings
    console.log('Acessando listagem de imóveis...');
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
        console.log(`Extraindo de: ${url}`);
        const pageProperties = await scrapePropertiesPage(url, cookies);
        properties.push(...pageProperties);
        
        // Delay between requests
        await delay(2000);
        
        if (properties.length >= 50) break; // Limit to prevent too many results
      } catch (error) {
        console.error(`Erro ao extrair ${url}:`, error);
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
    const loginPageResponse = await fetch('https://app.dwvapp.com.br/login', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      }
    });
    
    if (!loginPageResponse.ok) {
      throw new Error(`Falha ao acessar página de login: ${loginPageResponse.status}`);
    }
    
    const loginPageHtml = await loginPageResponse.text();
    
    // Extract CSRF token if present
    const csrfMatch = loginPageHtml.match(/name="csrf_token"[^>]*value="([^"]+)"/i) ||
                     loginPageHtml.match(/name="_token"[^>]*value="([^"]+)"/i) ||
                     loginPageHtml.match(/"csrf_token":"([^"]+)"/i);
    
    const csrfToken = csrfMatch ? csrfMatch[1] : null;
    
    // Get cookies from login page
    const setCookieHeaders = loginPageResponse.headers.get('set-cookie') || '';
    
    // Prepare login data
    const loginData = new URLSearchParams();
    loginData.append('email', DWV_CREDENTIALS.email);
    loginData.append('password', DWV_CREDENTIALS.password);
    if (csrfToken) {
      loginData.append('csrf_token', csrfToken);
      loginData.append('_token', csrfToken);
    }
    
    // Attempt login
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
    
    // Successful login usually redirects to dashboard or home
    if (loginResponse.status === 302 && (location.includes('dashboard') || location.includes('home') || location === '/')) {
      return {
        success: true,
        cookies: newCookies || setCookieHeaders
      };
    }
    
    // Try alternative login endpoints
    const altLoginResponse = await fetch('https://app.dwvapp.com.br/auth/login', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Content-Type': 'application/json',
        'Origin': 'https://app.dwvapp.com.br',
        'Referer': 'https://app.dwvapp.com.br/login',
        'Cookie': setCookieHeaders,
      },
      body: JSON.stringify({
        email: DWV_CREDENTIALS.email,
        password: DWV_CREDENTIALS.password
      })
    });
    
    if (altLoginResponse.ok) {
      const altCookies = altLoginResponse.headers.get('set-cookie') || '';
      return {
        success: true,
        cookies: altCookies || setCookieHeaders
      };
    }
    
    return {
      success: false,
      error: `Login falhou. Status: ${loginResponse.status}, Location: ${location}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
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
      throw new Error('Sessão expirada - redirecionado para login');
    }
    
    // Extract properties using DWV App specific patterns
    const extractedProperties = extractDWVProperties(html, url, currentTime);
    properties.push(...extractedProperties);
    
    // Try to find and follow pagination or "load more" links
    const nextPageMatch = html.match(/href="([^"]*(?:page|pagina)[^"]*\d+[^"]*)"/i);
    if (nextPageMatch && properties.length < 30) {
      const nextPageUrl = makeAbsoluteUrl(nextPageMatch[1], url);
      console.log(`Seguindo para próxima página: ${nextPageUrl}`);
      
      await delay(1000);
      const nextPageProperties = await scrapePropertiesPage(nextPageUrl, cookies);
      properties.push(...nextPageProperties);
    }
    
  } catch (error) {
    console.error(`Erro ao extrair propriedades de ${url}:`, error);
  }
  
  return properties;
}

function extractDWVProperties(html: string, baseUrl: string, currentTime: string): Property[] {
  const properties: Property[] = [];
  
  // DWV App specific selectors and patterns
  const propertyPatterns = [
    // Property cards
    /<div[^>]*class="[^"]*(?:property|imovel|card|listing|item)[^"]*"[^>]*>(.*?)<\/div>/gs,
    // Property rows in tables
    /<tr[^>]*class="[^"]*(?:property|imovel)[^"]*"[^>]*>(.*?)<\/tr>/gs,
    // Article elements
    /<article[^>]*>(.*?)<\/article>/gs,
    // Property sections
    /<section[^>]*class="[^"]*(?:property|imovel)[^"]*"[^>]*>(.*?)<\/section>/gs,
  ];
  
  for (const pattern of propertyPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const propertyHtml = match[1];
      const property = extractSingleDWVProperty(propertyHtml, baseUrl, currentTime);
      if (property) {
        properties.push(property);
        if (properties.length >= 20) break;
      }
    }
    if (properties.length >= 20) break;
  }
  
  // If no structured properties found, try to extract from JSON data
  if (properties.length === 0) {
    const jsonMatches = html.matchAll(/(?:properties|imoveis|listings):\s*(\[.*?\])/gs);
    for (const match of jsonMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        if (Array.isArray(jsonData)) {
          for (const item of jsonData) {
            const property = convertJSONToProperty(item, baseUrl, currentTime);
            if (property) {
              properties.push(property);
              if (properties.length >= 20) break;
            }
          }
        }
      } catch (error) {
        console.error('Erro ao parsear JSON:', error);
      }
    }
  }
  
  return properties;
}

function extractSingleDWVProperty(html: string, baseUrl: string, currentTime: string): Property | null {
  try {
    // Extract title
    const titleMatch = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
                      html.match(/title="([^"]+)"/i) ||
                      html.match(/<a[^>]*>([^<]+)<\/a>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Propriedade DWV';
    
    // Extract price with Brazilian patterns
    const priceMatch = html.match(/R\$\s*[\d.,]+(?:\s*(?:mil|milhão|milhões))?/i) ||
                      html.match(/(?:preço|valor):\s*R\$\s*[\d.,]+/i);
    const price = priceMatch ? priceMatch[0] : 'Consulte';
    
    // Extract location
    const locationMatch = html.match(/(?:Rua|Av\.|Avenida|Alameda|Travessa|Praça)\s+[^,\n<]+/i) ||
                         html.match(/(?:Bairro|Região):\s*([^,\n<]+)/i) ||
                         html.match(/(?:Curitiba|Centro|Batel|Água Verde)[^,\n<]*/i);
    const location = locationMatch ? locationMatch[0].trim() : 'Curitiba, PR';
    
    // Skip if no meaningful data
    if (title === 'Propriedade DWV' && price === 'Consulte') {
      return null;
    }
    
    const property: Property = {
      title,
      price,
      location,
      listing_url: baseUrl,
      scraped_at: currentTime,
      status: 'active',
    };
    
    // Extract additional details
    const bedroomMatch = html.match(/(\d+)\s*(?:quarto|dormitório|dorm|qto)/i);
    const bathroomMatch = html.match(/(\d+)\s*(?:banheiro|wc|lavabo)/i);
    const sqftMatch = html.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|metros?)/i);
    const garageMatch = html.match(/(\d+)\s*(?:vaga|garagem)/i);
    
    if (bedroomMatch) property.bedrooms = parseInt(bedroomMatch[1]);
    if (bathroomMatch) property.bathrooms = parseInt(bathroomMatch[1]);
    if (sqftMatch) property.square_feet = Math.round(parseFloat(sqftMatch[1].replace(',', '.')) * 10.764);
    
    // Extract property type
    const typeMatch = html.match(/(?:casa|apartamento|cobertura|sobrado|chácara|sítio|terreno|loft|studio)/i);
    if (typeMatch) property.property_type = typeMatch[0];
    
    // Extract image
    const imageMatch = html.match(/<img[^>]*src="([^"]+)"/i);
    if (imageMatch) {
      property.image_url = makeAbsoluteUrl(imageMatch[1], baseUrl);
    }
    
    // Extract features
    const features: string[] = [];
    if (garageMatch) features.push(`${garageMatch[1]} vaga${parseInt(garageMatch[1]) > 1 ? 's' : ''} de garagem`);
    
    const featurePatterns = [
      { pattern: /piscina/i, name: 'Piscina' },
      { pattern: /churrasqueira/i, name: 'Churrasqueira' },
      { pattern: /área\s*de\s*lazer/i, name: 'Área de lazer' },
      { pattern: /academia/i, name: 'Academia' },
      { pattern: /playground/i, name: 'Playground' },
      { pattern: /portaria\s*24h/i, name: 'Portaria 24h' },
      { pattern: /elevador/i, name: 'Elevador' },
      { pattern: /varanda/i, name: 'Varanda' },
      { pattern: /sacada/i, name: 'Sacada' },
    ];
    
    featurePatterns.forEach(({ pattern, name }) => {
      if (pattern.test(html)) {
        features.push(name);
      }
    });
    
    if (features.length > 0) property.features = features;
    
    // Extract agent information
    const agentMatch = html.match(/(?:corretor|agente|vendedor):\s*([^<\n]+)/i);
    const phoneMatch = html.match(/(?:\(\d{2}\)\s*)?(?:\d{4,5}[-\s]?\d{4})/);
    
    if (agentMatch) property.agent_name = agentMatch[1].trim();
    if (phoneMatch) property.agent_phone = phoneMatch[0];
    
    return property;
    
  } catch (error) {
    console.error('Erro ao extrair propriedade:', error);
    return null;
  }
}

function convertJSONToProperty(item: any, baseUrl: string, currentTime: string): Property | null {
  try {
    if (!item || typeof item !== 'object') return null;
    
    const property: Property = {
      title: item.title || item.nome || item.titulo || 'Propriedade DWV',
      price: item.price || item.preco || item.valor || 'Consulte',
      location: item.location || item.endereco || item.bairro || 'Curitiba, PR',
      listing_url: item.url || item.link || baseUrl,
      scraped_at: currentTime,
      status: 'active',
    };
    
    if (item.bedrooms || item.quartos) property.bedrooms = parseInt(item.bedrooms || item.quartos);
    if (item.bathrooms || item.banheiros) property.bathrooms = parseInt(item.bathrooms || item.banheiros);
    if (item.area || item.metragem) property.square_feet = Math.round(parseFloat(item.area || item.metragem) * 10.764);
    if (item.type || item.tipo) property.property_type = item.type || item.tipo;
    if (item.image || item.foto) property.image_url = makeAbsoluteUrl(item.image || item.foto, baseUrl);
    if (item.description || item.descricao) property.description = item.description || item.descricao;
    if (item.features || item.caracteristicas) property.features = Array.isArray(item.features || item.caracteristicas) ? item.features || item.caracteristicas : [];
    if (item.agent || item.corretor) property.agent_name = item.agent || item.corretor;
    if (item.phone || item.telefone) property.agent_phone = item.phone || item.telefone;
    
    return property;
  } catch (error) {
    console.error('Erro ao converter JSON para propriedade:', error);
    return null;
  }
}

function makeAbsoluteUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) {
    return url;
  }
  
  try {
    const base = new URL(baseUrl);
    return new URL(url, base).toString();
  } catch {
    return url.startsWith('/') ? `https://app.dwvapp.com.br${url}` : url;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}