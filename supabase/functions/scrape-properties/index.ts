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

const JINA_API_KEY = 'jina_8495813bb96f4df9be8560c70edb1762YPN5v4CTHktm5qyjyEWrx4h_scs6';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL é obrigatória' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Extraindo propriedades de: ${url}`);

    // Try Jina AI Reader first for better content extraction
    let properties: Property[] = [];
    
    try {
      properties = await scrapeWithJinaReader(url);
      console.log(`Jina Reader encontrou ${properties.length} propriedades`);
    } catch (jinaError) {
      console.log('Jina Reader falhou, tentando método tradicional:', jinaError);
      // Fallback to traditional scraping
      properties = await scrapeWithTraditionalMethod(url);
      console.log(`Método tradicional encontrou ${properties.length} propriedades`);
    }

    return new Response(
      JSON.stringify({ 
        properties, 
        success: true, 
        total_found: properties.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao extrair propriedades:', error);
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

async function scrapeWithJinaReader(url: string): Promise<Property[]> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  
  const response = await fetch(jinaUrl, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`,
      'X-Return-Format': 'markdown',
      'X-With-Generated-Alt': 'true',
      'X-Remove-Selector': 'nav,header,footer,.advertisement,.ads,.cookie-banner',
      'X-Target-Selector': '.property,.listing,.imovel,.card-property,.property-card',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Jina Reader error response:', errorText);
    throw new Error(`Jina Reader falhou: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.data || result.content || result;
  
  console.log('Conteúdo extraído pelo Jina Reader (primeiros 1000 chars):', 
    typeof content === 'string' ? content.substring(0, 1000) : JSON.stringify(content).substring(0, 1000));
  
  return parsePropertiesFromMarkdown(typeof content === 'string' ? content : JSON.stringify(content), url);
}

async function scrapeWithTraditionalMethod(url: string): Promise<Property[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao acessar a URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return scrapeBrazilianProperties(html, url);
}

function parsePropertiesFromMarkdown(markdown: string, baseUrl: string): Property[] {
  const properties: Property[] = [];
  const currentTime = new Date().toISOString();
  
  // Enhanced parsing for Brazilian real estate content
  // Split content into potential property sections
  const sections = markdown.split(/\n\s*\n/);
  
  // Look for sections that contain price information (strong indicator of property listings)
  const propertySections = sections.filter(section => {
    const hasPrice = /R\$\s*[\d.,]+(?:\s*(?:mil|milhão|milhões))?/i.test(section);
    const hasLocation = /(?:curitiba|bairro|rua|avenida|av\.|alameda)/i.test(section);
    const hasPropertyKeywords = /(?:apartamento|casa|cobertura|sobrado|imóvel|propriedade)/i.test(section);
    
    return hasPrice && (hasLocation || hasPropertyKeywords);
  });
  
  console.log(`Encontradas ${propertySections.length} seções com potenciais propriedades`);
  
  for (const section of propertySections) {
    const property = extractPropertyFromSection(section, baseUrl, currentTime);
    if (property) {
      properties.push(property);
      if (properties.length >= 20) break; // Limit to prevent too many results
    }
  }
  
  // If no structured properties found, try to extract from the whole content
  if (properties.length === 0) {
    console.log('Nenhuma propriedade estruturada encontrada, tentando extração geral...');
    const property = extractPropertyFromSection(markdown, baseUrl, currentTime);
    if (property) {
      properties.push(property);
    }
  }
  
  return properties;
}

function extractPropertyFromSection(section: string, baseUrl: string, currentTime: string): Property | null {
  try {
    // Brazilian price patterns - more comprehensive
    const pricePatterns = [
      /R\$\s*[\d.,]+(?:\s*(?:mil|milhão|milhões))?/i,
      /(?:preço|valor|por):\s*R\$\s*[\d.,]+/i,
      /[\d.,]+\s*(?:mil|milhão|milhões)?\s*reais/i
    ];
    
    let priceMatch = null;
    for (const pattern of pricePatterns) {
      priceMatch = section.match(pattern);
      if (priceMatch) break;
    }
    
    if (!priceMatch) return null;
    
    const price = priceMatch[0];
    
    // Extract title with multiple strategies
    const titlePatterns = [
      /^#\s*(.+?)(?:\n|$)/m,
      /^\*\*(.+?)\*\*/m,
      /(?:título|nome|imóvel):\s*(.+?)(?:\n|$)/im,
      /^(.+?)(?:\n.*R\$)/m,
      /^(.{10,100})(?:\n|$)/m
    ];
    
    let title = 'Propriedade';
    for (const pattern of titlePatterns) {
      const match = section.match(pattern);
      if (match && match[1].trim().length > 5) {
        title = match[1].trim();
        break;
      }
    }
    
    // Extract location with enhanced Brazilian patterns
    const locationPatterns = [
      /(?:Rua|Av\.|Avenida|Alameda|Travessa|Praça|Estrada|Rod\.|Rodovia)\s+[^,\n]+(?:,\s*[^,\n]+)*/i,
      /(?:Bairro|Região|Localização|Endereço):\s*([^,\n]+)/i,
      /(?:Curitiba|Londrina|Maringá|Ponta Grossa|Cascavel|Foz do Iguaçu|Guarapuava|Colombo|São José dos Pinhais|Pinhais|Araucária|Fazenda Rio Grande)[^,\n]*/i,
      /(?:Centro|Batel|Água Verde|Bigorrilho|Champagnat|Cabral|Cristo Rei|Jardim Botânico|Alto da Rua XV|Centro Cívico|Rebouças|Juvevê|Santa Felicidade|Portão|Cajuru|Tingui)[^,\n]*/i
    ];
    
    let location = 'Localização não informada';
    for (const pattern of locationPatterns) {
      const match = section.match(pattern);
      if (match) {
        location = match[0].trim();
        break;
      }
    }
    
    const property: Property = {
      title,
      price,
      location,
      listing_url: baseUrl,
      scraped_at: currentTime,
      status: 'active',
    };
    
    // Extract additional details with enhanced patterns
    const bedroomPatterns = [
      /(\d+)\s*(?:quarto|dormitório|dorm|qto|bedroom)/i,
      /(?:quarto|dormitório|dorm|qto|bedroom):\s*(\d+)/i
    ];
    
    const bathroomPatterns = [
      /(\d+)\s*(?:banheiro|wc|lavabo|bathroom)/i,
      /(?:banheiro|wc|lavabo|bathroom):\s*(\d+)/i
    ];
    
    const sqftPatterns = [
      /(\d+(?:[.,]\d+)?)\s*(?:m²|metros?|metro)/i,
      /(?:área|tamanho|metragem):\s*(\d+(?:[.,]\d+)?)\s*(?:m²|metros?)/i
    ];
    
    const garagePatterns = [
      /(\d+)\s*(?:vaga|garagem|garage)/i,
      /(?:vaga|garagem|garage):\s*(\d+)/i
    ];
    
    // Apply patterns
    for (const pattern of bedroomPatterns) {
      const match = section.match(pattern);
      if (match) {
        property.bedrooms = parseInt(match[1]);
        break;
      }
    }
    
    for (const pattern of bathroomPatterns) {
      const match = section.match(pattern);
      if (match) {
        property.bathrooms = parseInt(match[1]);
        break;
      }
    }
    
    for (const pattern of sqftPatterns) {
      const match = section.match(pattern);
      if (match) {
        const sqm = parseFloat(match[1].replace(',', '.'));
        property.square_feet = Math.round(sqm * 10.764); // Convert m² to sq ft
        break;
      }
    }
    
    // Extract property type with more options
    const typeMatch = section.match(/(?:casa|apartamento|cobertura|sobrado|chácara|sítio|terreno|loft|studio|kitnet|flat|duplex|triplex)/i);
    if (typeMatch) property.property_type = typeMatch[0];
    
    // Extract features with comprehensive list
    const features: string[] = [];
    
    for (const pattern of garagePatterns) {
      const match = section.match(pattern);
      if (match) {
        const count = parseInt(match[1]);
        features.push(`${count} vaga${count > 1 ? 's' : ''} de garagem`);
        break;
      }
    }
    
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
      { pattern: /jardim/i, name: 'Jardim' },
      { pattern: /quintal/i, name: 'Quintal' },
      { pattern: /ar\s*condicionado/i, name: 'Ar condicionado' },
      { pattern: /mobiliado/i, name: 'Mobiliado' },
      { pattern: /semi\s*mobiliado/i, name: 'Semi-mobiliado' },
      { pattern: /salão\s*de\s*festas/i, name: 'Salão de festas' },
      { pattern: /quadra\s*(?:de\s*)?(?:tênis|esporte)/i, name: 'Quadra esportiva' },
      { pattern: /sauna/i, name: 'Sauna' },
      { pattern: /spa/i, name: 'SPA' },
      { pattern: /coworking/i, name: 'Coworking' },
      { pattern: /pet\s*place/i, name: 'Pet place' },
      { pattern: /bicicletário/i, name: 'Bicicletário' },
    ];
    
    featurePatterns.forEach(({ pattern, name }) => {
      if (pattern.test(section)) {
        features.push(name);
      }
    });
    
    if (features.length > 0) property.features = features;
    
    // Extract description (longer text blocks)
    const descriptionPatterns = [
      /(?:Descrição|Detalhes|Sobre\s*o\s*imóvel):\s*(.+?)(?:\n\n|\n$|$)/is,
      /(?:Características|Diferenciais):\s*(.+?)(?:\n\n|\n$|$)/is
    ];
    
    for (const pattern of descriptionPatterns) {
      const match = section.match(pattern);
      if (match) {
        property.description = match[1].trim();
        break;
      }
    }
    
    // If no specific description found, use a clean portion of the section
    if (!property.description) {
      const cleanSection = section
        .replace(/^#*\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/R\$[\d.,\s]+/g, '')
        .trim();
      
      if (cleanSection.length > 50 && cleanSection.length < 500) {
        property.description = cleanSection.substring(0, 300) + (cleanSection.length > 300 ? '...' : '');
      }
    }
    
    // Extract agent information
    const agentPatterns = [
      /(?:corretor|agente|vendedor|contato|responsável):\s*([^,\n]+)/i,
      /(?:CRECI|creci):\s*([^,\n]+)/i
    ];
    
    const phonePatterns = [
      /(?:\(\d{2}\)\s*)?(?:\d{4,5}[-\s]?\d{4})/g,
      /(?:telefone|fone|cel|celular|whatsapp):\s*((?:\(\d{2}\)\s*)?\d{4,5}[-\s]?\d{4})/i
    ];
    
    for (const pattern of agentPatterns) {
      const match = section.match(pattern);
      if (match) {
        property.agent_name = match[1].trim();
        break;
      }
    }
    
    for (const pattern of phonePatterns) {
      const match = section.match(pattern);
      if (match) {
        property.agent_phone = match[1] || match[0];
        break;
      }
    }
    
    console.log(`Propriedade extraída: ${property.title} - ${property.price} - ${property.location}`);
    return property;
    
  } catch (error) {
    console.error('Erro ao extrair propriedade da seção:', error);
    return null;
  }
}

async function scrapeBrazilianProperties(html: string, baseUrl: string): Promise<Property[]> {
  const properties: Property[] = [];
  const currentTime = new Date().toISOString();

  // Brazilian real estate specific patterns
  const priceRegex = /R\$\s*[\d.,]+(?:\s*mil)?/gi;
  const addressRegex = /(?:Rua|Av\.|Avenida|Alameda|Travessa|Praça|Estrada|Rod\.|Rodovia)\s+[^,\n]+(?:,\s*[^,\n]+)*(?:,\s*[A-Z]{2})?/gi;
  
  // Common Brazilian property listing selectors and patterns
  const listingPatterns = [
    // Generic property cards
    /<div[^>]*class="[^"]*(?:card|item|property|imovel|listing)[^"]*"[^>]*>(.*?)<\/div>/gs,
    // Article tags for properties
    /<article[^>]*class="[^"]*(?:property|imovel|listing)[^"]*"[^>]*>(.*?)<\/article>/gs,
    // Section tags
    /<section[^>]*class="[^"]*(?:property|imovel|listing)[^"]*"[^>]*>(.*?)<\/section>/gs,
    // Li tags for property lists
    /<li[^>]*class="[^"]*(?:property|imovel|listing)[^"]*"[^>]*>(.*?)<\/li>/gs,
  ];

  // Try to find structured property listings
  let foundProperties = 0;
  for (const pattern of listingPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const listingHtml = match[1];
      const property = extractBrazilianPropertyFromListing(listingHtml, baseUrl, currentTime);
      if (property && foundProperties < 20) { // Limit to 20 properties
        properties.push(property);
        foundProperties++;
      }
    }
  }

  // If no structured listings found, try to extract from page content
  if (properties.length === 0) {
    const prices = html.match(priceRegex) || [];
    const addresses = html.match(addressRegex) || [];
    
    if (prices.length > 0 || addresses.length > 0) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : 'Propriedade';
      
      const property: Property = {
        title: pageTitle,
        price: prices[0] || 'Preço não informado',
        location: addresses[0] || 'Localização não informada',
        listing_url: baseUrl,
        scraped_at: currentTime,
        status: 'active',
      };

      // Extract additional details with Brazilian patterns
      const bedroomMatch = html.match(/(\d+)\s*(?:quarto|dormitório|dorm|qto)/i);
      const bathroomMatch = html.match(/(\d+)\s*(?:banheiro|wc|lavabo)/i);
      const sqftMatch = html.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|metros?|metro)/i);
      const garageMatch = html.match(/(\d+)\s*(?:vaga|garagem)/i);

      if (bedroomMatch) property.bedrooms = parseInt(bedroomMatch[1]);
      if (bathroomMatch) property.bathrooms = parseInt(bathroomMatch[1]);
      if (sqftMatch) property.square_feet = Math.round(parseFloat(sqftMatch[1].replace(',', '.')) * 10.764); // Convert m² to sq ft

      // Extract description from meta tags
      const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
      if (descriptionMatch) {
        property.description = descriptionMatch[1];
      }

      // Extract images
      const imageMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*(?:alt="[^"]*(?:imovel|propriedade|casa|apartamento)[^"]*"|class="[^"]*(?:property|imovel)[^"]*")/i);
      if (imageMatch) {
        property.image_url = makeAbsoluteUrl(imageMatch[1], baseUrl);
      }

      // Extract features
      const features: string[] = [];
      if (garageMatch) features.push(`${garageMatch[1]} vaga${parseInt(garageMatch[1]) > 1 ? 's' : ''} de garagem`);
      
      const featurePatterns = [
        /piscina/i,
        /churrasqueira/i,
        /área\s*de\s*lazer/i,
        /academia/i,
        /playground/i,
        /portaria\s*24h/i,
        /elevador/i,
        /varanda/i,
        /sacada/i,
        /jardim/i,
        /quintal/i,
      ];

      featurePatterns.forEach(pattern => {
        const match = html.match(pattern);
        if (match) features.push(match[0]);
      });

      if (features.length > 0) property.features = features;

      properties.push(property);
    }
  }

  return properties;
}

function extractBrazilianPropertyFromListing(listingHtml: string, baseUrl: string, currentTime: string): Property | null {
  try {
    // Extract title with Brazilian patterns
    const titleMatch = listingHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
                      listingHtml.match(/<a[^>]*title="([^"]+)"/i) ||
                      listingHtml.match(/<a[^>]*>([^<]+)<\/a>/i) ||
                      listingHtml.match(/title="([^"]+)"/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Propriedade';

    // Extract price with Brazilian currency
    const priceMatch = listingHtml.match(/R\$\s*[\d.,]+(?:\s*mil)?/i);
    const price = priceMatch ? priceMatch[0] : 'Preço não informado';

    // Extract location/address with Brazilian patterns
    const addressMatch = listingHtml.match(/(?:Rua|Av\.|Avenida|Alameda|Travessa|Praça|Estrada|Rod\.|Rodovia)\s+[^,\n<]+/i) ||
                         listingHtml.match(/[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç\s]+(?:,\s*[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç\s]*)*(?:,\s*[A-Z]{2})?/);
    const location = addressMatch ? addressMatch[0].trim() : 'Localização não informada';

    // Skip if we don't have basic information
    if (price === 'Preço não informado' && location === 'Localização não informada') {
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

    // Extract additional details with Brazilian patterns
    const bedroomMatch = listingHtml.match(/(\d+)\s*(?:quarto|dormitório|dorm|qto)/i);
    const bathroomMatch = listingHtml.match(/(\d+)\s*(?:banheiro|wc|lavabo)/i);
    const sqftMatch = listingHtml.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|metros?)/i);
    const garageMatch = listingHtml.match(/(\d+)\s*(?:vaga|garagem)/i);

    if (bedroomMatch) property.bedrooms = parseInt(bedroomMatch[1]);
    if (bathroomMatch) property.bathrooms = parseInt(bathroomMatch[1]);
    if (sqftMatch) property.square_feet = Math.round(parseFloat(sqftMatch[1].replace(',', '.')) * 10.764); // Convert m² to sq ft

    // Extract property type
    const typeMatch = listingHtml.match(/(?:casa|apartamento|cobertura|sobrado|chácara|sítio|terreno|loft|studio)/i);
    if (typeMatch) property.property_type = typeMatch[0];

    // Extract image
    const imageMatch = listingHtml.match(/<img[^>]*src="([^"]+)"/i);
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
      if (pattern.test(listingHtml)) {
        features.push(name);
      }
    });

    if (features.length > 0) property.features = features;

    // Extract agent information
    const agentNameMatch = listingHtml.match(/(?:corretor|agente|vendedor):\s*([^<\n]+)/i);
    const agentPhoneMatch = listingHtml.match(/(?:\(\d{2}\)\s*)?(?:\d{4,5}[-\s]?\d{4})/);

    if (agentNameMatch) property.agent_name = agentNameMatch[1].trim();
    if (agentPhoneMatch) property.agent_phone = agentPhoneMatch[0];

    return property;
  } catch (error) {
    console.error('Erro ao extrair propriedade:', error);
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
    return url;
  }
}