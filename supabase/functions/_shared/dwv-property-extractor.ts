/**
 * Enhanced DWV Property Extractor
 * Specialized for app.dwvapp.com.br structure
 */

export interface Property {
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

export interface ExtractionResult {
  success: boolean;
  properties: Property[];
  total_found: number;
  message?: string;
  error?: string;
  source?: string;
}

export class DWVPropertyExtractor {
  private cookies: string;
  private baseUrl = 'https://app.dwvapp.com.br';
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  constructor(cookies: string) {
    this.cookies = cookies;
  }

  /**
   * Main extraction method
   */
  async extractProperties(): Promise<ExtractionResult> {
    console.log('🏠 Starting property extraction...');
    
    const allProperties: Property[] = [];
    let totalAttempts = 0;

    try {
      // Strategy 1: API Endpoints
      console.log('📡 Trying API endpoints...');
      const apiResult = await this.extractFromAPI();
      if (apiResult.properties.length > 0) {
        allProperties.push(...apiResult.properties);
        console.log(`✅ API extraction: ${apiResult.properties.length} properties`);
      }
      totalAttempts++;

      // Strategy 2: Main Properties Page
      if (allProperties.length < 10) {
        console.log('🌐 Trying main properties page...');
        const pageResult = await this.extractFromPropertiesPage();
        if (pageResult.properties.length > 0) {
          allProperties.push(...pageResult.properties);
          console.log(`✅ Page extraction: ${pageResult.properties.length} properties`);
        }
        totalAttempts++;
      }

      // Strategy 3: Dashboard/User Area
      if (allProperties.length < 5) {
        console.log('📊 Trying dashboard area...');
        const dashboardResult = await this.extractFromDashboard();
        if (dashboardResult.properties.length > 0) {
          allProperties.push(...dashboardResult.properties);
          console.log(`✅ Dashboard extraction: ${dashboardResult.properties.length} properties`);
        }
        totalAttempts++;
      }

      // Remove duplicates
      const uniqueProperties = this.removeDuplicates(allProperties);
      
      return {
        success: uniqueProperties.length > 0,
        properties: uniqueProperties,
        total_found: uniqueProperties.length,
        message: `Extracted ${uniqueProperties.length} unique properties from ${totalAttempts} sources`,
        source: 'DWV App Enhanced'
      };

    } catch (error) {
      console.error('❌ Property extraction failed:', error);
      return {
        success: false,
        properties: [],
        total_found: 0,
        error: error.message,
        source: 'DWV App Enhanced (Error)'
      };
    }
  }

  /**
   * Extract from API endpoints
   */
  private async extractFromAPI(): Promise<ExtractionResult> {
    const properties: Property[] = [];
    
    const apiEndpoints = [
      '/api/imoveis',
      '/api/properties',
      '/api/empreendimentos',
      '/api/lancamentos',
      '/api/v1/imoveis',
      '/api/search/properties'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        console.log(`🔗 Trying: ${url}`);

        const response = await fetch(url, {
          headers: {
            'Cookie': this.cookies,
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': this.userAgent,
            'Referer': `${this.baseUrl}/imoveis`,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            const data = await response.json();
            const extractedProperties = this.parseAPIResponse(data, url);
            
            if (extractedProperties.length > 0) {
              properties.push(...extractedProperties);
              console.log(`📊 ${endpoint}: ${extractedProperties.length} properties`);
            }
          }
        } else {
          console.log(`⚠️ ${endpoint}: ${response.status} ${response.statusText}`);
        }

        // Delay between requests
        await this.delay(1000);

      } catch (error) {
        console.error(`❌ API ${endpoint} failed:`, error);
      }
    }

    return {
      success: properties.length > 0,
      properties,
      total_found: properties.length,
      source: 'API'
    };
  }

  /**
   * Extract from main properties page
   */
  private async extractFromPropertiesPage(): Promise<ExtractionResult> {
    const properties: Property[] = [];
    
    const propertyPages = [
      '/imoveis',
      '/imoveis?status=disponivel',
      '/imoveis?tipo=apartamento',
      '/imoveis?tipo=casa',
      '/empreendimentos',
      '/lancamentos'
    ];

    for (const page of propertyPages) {
      try {
        const url = `${this.baseUrl}${page}`;
        console.log(`🌐 Scraping: ${url}`);

        const response = await fetch(url, {
          headers: {
            'Cookie': this.cookies,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': this.userAgent,
            'Referer': `${this.baseUrl}/dashboard`
          }
        });

        if (response.ok) {
          const html = await response.text();
          
          // Check if still logged in
          if (this.isLoggedIn(html)) {
            const extractedProperties = this.parseHTMLResponse(html, url);
            
            if (extractedProperties.length > 0) {
              properties.push(...extractedProperties);
              console.log(`🏠 ${page}: ${extractedProperties.length} properties`);
            }
          } else {
            console.log(`⚠️ Session expired on ${page}`);
            break;
          }
        }

        // Delay between requests
        await this.delay(2000);

      } catch (error) {
        console.error(`❌ Page ${page} failed:`, error);
      }
    }

    return {
      success: properties.length > 0,
      properties,
      total_found: properties.length,
      source: 'HTML Pages'
    };
  }

  /**
   * Extract from dashboard area
   */
  private async extractFromDashboard(): Promise<ExtractionResult> {
    const properties: Property[] = [];
    
    try {
      const url = `${this.baseUrl}/dashboard`;
      console.log(`📊 Checking dashboard: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Cookie': this.cookies,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': this.userAgent
        }
      });

      if (response.ok) {
        const html = await response.text();
        
        if (this.isLoggedIn(html)) {
          // Look for property data in dashboard
          const dashboardProperties = this.parseHTMLResponse(html, url);
          properties.push(...dashboardProperties);
          
          // Look for links to property sections
          const propertyLinks = this.extractPropertyLinks(html);
          
          for (const link of propertyLinks.slice(0, 3)) { // Limit to 3 additional pages
            try {
              const linkUrl = this.makeAbsoluteUrl(link, this.baseUrl);
              const linkResponse = await fetch(linkUrl, {
                headers: {
                  'Cookie': this.cookies,
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'User-Agent': this.userAgent,
                  'Referer': url
                }
              });
              
              if (linkResponse.ok) {
                const linkHtml = await linkResponse.text();
                const linkProperties = this.parseHTMLResponse(linkHtml, linkUrl);
                properties.push(...linkProperties);
              }
              
              await this.delay(1500);
              
            } catch (error) {
              console.error(`❌ Dashboard link ${link} failed:`, error);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Dashboard extraction failed:', error);
    }

    return {
      success: properties.length > 0,
      properties,
      total_found: properties.length,
      source: 'Dashboard'
    };
  }

  /**
   * Parse API response to extract properties
   */
  private parseAPIResponse(data: any, sourceUrl: string): Property[] {
    const properties: Property[] = [];
    const currentTime = new Date().toISOString();

    try {
      let items: any[] = [];
      
      // Handle different response structures
      if (Array.isArray(data)) {
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data.imoveis && Array.isArray(data.imoveis)) {
        items = data.imoveis;
      } else if (data.properties && Array.isArray(data.properties)) {
        items = data.properties;
      } else if (data.results && Array.isArray(data.results)) {
        items = data.results;
      }

      for (const item of items) {
        const property = this.convertAPIItemToProperty(item, sourceUrl, currentTime);
        if (property) {
          properties.push(property);
        }
      }

    } catch (error) {
      console.error('Error parsing API response:', error);
    }

    return properties;
  }

  /**
   * Parse HTML response to extract properties
   */
  private parseHTMLResponse(html: string, sourceUrl: string): Property[] {
    const properties: Property[] = [];
    const currentTime = new Date().toISOString();

    try {
      // Strategy 1: JSON data in script tags
      const jsonProperties = this.extractJSONFromHTML(html, sourceUrl, currentTime);
      properties.push(...jsonProperties);

      // Strategy 2: HTML elements
      if (properties.length === 0) {
        const htmlProperties = this.extractFromHTMLElements(html, sourceUrl, currentTime);
        properties.push(...htmlProperties);
      }

    } catch (error) {
      console.error('Error parsing HTML response:', error);
    }

    return properties;
  }

  /**
   * Convert API item to Property object
   */
  private convertAPIItemToProperty(item: any, sourceUrl: string, currentTime: string): Property | null {
    try {
      if (!item) return null;

      const property: Property = {
        title: this.extractValue(item, ['titulo', 'nome', 'title', 'name']) || 'Imóvel DWV',
        price: this.formatPrice(this.extractValue(item, ['preco', 'valor', 'price'])) || 'Preço sob consulta',
        location: this.extractValue(item, ['endereco', 'localizacao', 'location', 'address', 'bairro']) || 'Localização não informada',
        listing_url: this.makeAbsoluteUrl(this.extractValue(item, ['url', 'link', 'href']) || sourceUrl, sourceUrl),
        scraped_at: currentTime,
        status: 'active'
      };

      // Extract optional fields
      property.image_url = this.extractValue(item, ['imagem', 'foto', 'image', 'thumbnail', 'fotos.0.url']);
      property.description = this.extractValue(item, ['descricao', 'description', 'sobre']);
      property.bedrooms = this.extractNumber(item, ['quartos', 'dormitorios', 'bedrooms']);
      property.bathrooms = this.extractNumber(item, ['banheiros', 'bathrooms']);
      property.square_feet = this.extractNumber(item, ['area', 'metragem', 'square_feet']);
      property.property_type = this.extractValue(item, ['tipo', 'category', 'property_type']);
      property.agent_name = this.extractValue(item, ['corretor.nome', 'agent.name', 'vendedor']);
      property.agent_phone = this.extractValue(item, ['corretor.telefone', 'agent.phone', 'telefone']);

      // Extract features
      const features = this.extractValue(item, ['caracteristicas', 'features', 'amenities']);
      if (Array.isArray(features)) {
        property.features = features;
      } else if (typeof features === 'string') {
        property.features = features.split(',').map(f => f.trim());
      }

      return property;

    } catch (error) {
      console.error('Error converting API item:', error);
      return null;
    }
  }

  /**
   * Extract properties from JSON data in HTML
   */
  private extractJSONFromHTML(html: string, sourceUrl: string, currentTime: string): Property[] {
    const properties: Property[] = [];

    try {
      const jsonPatterns = [
        /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi,
        /<script[^>]*>[\s\S]*?window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/gi,
        /<script[^>]*>[\s\S]*?window\.APP_DATA\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/gi,
        /<script[^>]*>[\s\S]*?var\s+properties\s*=\s*(\[[\s\S]*?\]);[\s\S]*?<\/script>/gi
      ];

      for (const pattern of jsonPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          try {
            const jsonData = JSON.parse(match[1]);
            const extractedProperties = this.parseAPIResponse(jsonData, sourceUrl);
            properties.push(...extractedProperties);
          } catch (e) {
            // Invalid JSON, continue
          }
        }
      }

    } catch (error) {
      console.error('Error extracting JSON from HTML:', error);
    }

    return properties;
  }

  /**
   * Extract properties from HTML elements
   */
  private extractFromHTMLElements(html: string, sourceUrl: string, currentTime: string): Property[] {
    const properties: Property[] = [];

    try {
      // DWV-specific selectors
      const cardPatterns = [
        /<div[^>]*class="[^"]*(?:imovel-card|property-card|card-imovel|listing-card)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        /<article[^>]*class="[^"]*(?:imovel|property|listing)[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
        /<li[^>]*class="[^"]*(?:imovel|property|listing)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
        /<div[^>]*data-property[^>]*>([\s\S]*?)<\/div>/gi
      ];

      for (const pattern of cardPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const cardHtml = match[1];
          const property = this.extractPropertyFromCard(cardHtml, sourceUrl, currentTime);
          if (property) {
            properties.push(property);
          }
        }
      }

    } catch (error) {
      console.error('Error extracting from HTML elements:', error);
    }

    return properties;
  }

  /**
   * Extract property from HTML card
   */
  private extractPropertyFromCard(cardHtml: string, sourceUrl: string, currentTime: string): Property | null {
    try {
      // Extract title
      const titleMatch = cardHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
                        cardHtml.match(/<div[^>]*class="[^"]*titulo[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                        cardHtml.match(/<span[^>]*class="[^"]*titulo[^"]*"[^>]*>([^<]+)<\/span>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Imóvel DWV';

      // Extract price
      const priceMatch = cardHtml.match(/R\$\s*[\d.,]+(?:\s*mil)?/i) ||
                        cardHtml.match(/<div[^>]*class="[^"]*preco[^"]*"[^>]*>([^<]+)<\/div>/i);
      const price = priceMatch ? priceMatch[0].replace(/<[^>]*>/g, '').trim() : 'Preço sob consulta';

      // Extract location
      const locationMatch = cardHtml.match(/<div[^>]*class="[^"]*(?:endereco|localizacao|location)[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                           cardHtml.match(/<span[^>]*class="[^"]*(?:endereco|localizacao|location)[^"]*"[^>]*>([^<]+)<\/span>/i);
      const location = locationMatch ? locationMatch[1].replace(/<[^>]*>/g, '').trim() : 'Localização não informada';

      // Skip if no meaningful data
      if (title === 'Imóvel DWV' && price === 'Preço sob consulta' && location === 'Localização não informada') {
        return null;
      }

      const property: Property = {
        title,
        price,
        location,
        listing_url: sourceUrl,
        scraped_at: currentTime,
        status: 'active'
      };

      // Extract additional details
      const bedroomMatch = cardHtml.match(/(\d+)\s*(?:quartos?|dormitórios?|dorms?)/i);
      const bathroomMatch = cardHtml.match(/(\d+)\s*(?:banheiros?|wcs?)/i);
      const areaMatch = cardHtml.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|metros?)/i);

      if (bedroomMatch) property.bedrooms = parseInt(bedroomMatch[1]);
      if (bathroomMatch) property.bathrooms = parseInt(bathroomMatch[1]);
      if (areaMatch) property.square_feet = Math.round(parseFloat(areaMatch[1].replace(',', '.')) * 10.764);

      // Extract image
      const imageMatch = cardHtml.match(/<img[^>]*src="([^"]+)"/i);
      if (imageMatch) {
        property.image_url = this.makeAbsoluteUrl(imageMatch[1], sourceUrl);
      }

      return property;

    } catch (error) {
      console.error('Error extracting property from card:', error);
      return null;
    }
  }

  /**
   * Extract property links from HTML
   */
  private extractPropertyLinks(html: string): string[] {
    const links: string[] = [];
    
    const linkPatterns = [
      /<a[^>]*href="([^"]*imoveis[^"]*)"[^>]*>/gi,
      /<a[^>]*href="([^"]*properties[^"]*)"[^>]*>/gi,
      /<a[^>]*href="([^"]*empreendimentos[^"]*)"[^>]*>/gi
    ];

    for (const pattern of linkPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const link = match[1];
        if (!links.includes(link)) {
          links.push(link);
        }
      }
    }

    return links;
  }

  /**
   * Helper methods
   */
  private extractValue(obj: any, paths: string[]): string | undefined {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path);
      if (value !== undefined && value !== null) {
        return typeof value === 'string' ? value : String(value);
      }
    }
    return undefined;
  }

  private extractNumber(obj: any, paths: string[]): number | undefined {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path);
      if (value !== undefined && value !== null) {
        const num = typeof value === 'number' ? value : parseInt(String(value));
        if (!isNaN(num)) return num;
      }
    }
    return undefined;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private formatPrice(price: any): string {
    if (!price) return 'Preço sob consulta';
    if (typeof price === 'string') return price;
    if (typeof price === 'number') return `R$ ${price.toLocaleString('pt-BR')}`;
    return String(price);
  }

  private makeAbsoluteUrl(url: string, baseUrl: string): string {
    if (!url) return baseUrl;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.origin}${url}`;
    }
    return new URL(url, baseUrl).toString();
  }

  private isLoggedIn(html: string): boolean {
    const loggedInIndicators = [
      'dashboard',
      'logout',
      'sair',
      'perfil',
      'minha conta',
      'bem-vindo',
      'imoveis'
    ];

    const loggedOutIndicators = [
      'fazer login',
      'entrar',
      'login',
      'password',
      'senha'
    ];

    const htmlLower = html.toLowerCase();
    
    // If we see login indicators, we're probably logged out
    if (loggedOutIndicators.some(indicator => htmlLower.includes(indicator))) {
      return false;
    }

    // If we see logged-in indicators, we're probably logged in
    return loggedInIndicators.some(indicator => htmlLower.includes(indicator));
  }

  private removeDuplicates(properties: Property[]): Property[] {
    const seen = new Set<string>();
    return properties.filter(property => {
      const key = `${property.title.toLowerCase()}-${property.location.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create property extractor instance
 */
export function createPropertyExtractor(cookies: string): DWVPropertyExtractor {
  return new DWVPropertyExtractor(cookies);
}