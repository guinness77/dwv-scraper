/**
 * Enhanced DWV Property Scraper
 * Handles property extraction with multiple strategies
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

export interface ScrapingResult {
  success: boolean;
  properties: Property[];
  total_found: number;
  message?: string;
  error?: string;
  source?: string;
}

/**
 * Enhanced property scraper with multiple extraction strategies
 */
export class DWVPropertyScraper {
  private cookies: string;
  private baseUrl: string = 'https://app.dwvapp.com.br';

  constructor(cookies: string) {
    this.cookies = cookies;
  }

  /**
   * Main scraping method with multiple strategies
   */
  async scrapeProperties(): Promise<ScrapingResult> {
    console.log('🏠 Starting property scraping...');
    
    const allProperties: Property[] = [];
    let totalFound = 0;

    try {
      // Strategy 1: API endpoints
      console.log('📡 Trying API endpoints...');
      const apiResult = await this.scrapeFromAPI();
      if (apiResult.properties.length > 0) {
        allProperties.push(...apiResult.properties);
        totalFound += apiResult.total_found;
        console.log(`✅ API scraping found ${apiResult.properties.length} properties`);
      }

      // Strategy 2: HTML pages (if API didn't work or found few results)
      if (allProperties.length < 5) {
        console.log('🌐 Trying HTML pages...');
        const htmlResult = await this.scrapeFromHTML();
        if (htmlResult.properties.length > 0) {
          allProperties.push(...htmlResult.properties);
          totalFound += htmlResult.total_found;
          console.log(`✅ HTML scraping found ${htmlResult.properties.length} properties`);
        }
      }

      // Strategy 3: Search pages
      if (allProperties.length < 10) {
        console.log('🔍 Trying search pages...');
        const searchResult = await this.scrapeFromSearch();
        if (searchResult.properties.length > 0) {
          allProperties.push(...searchResult.properties);
          totalFound += searchResult.total_found;
          console.log(`✅ Search scraping found ${searchResult.properties.length} properties`);
        }
      }

      // Remove duplicates
      const uniqueProperties = this.removeDuplicates(allProperties);
      
      return {
        success: true,
        properties: uniqueProperties,
        total_found: uniqueProperties.length,
        message: `Found ${uniqueProperties.length} unique properties from ${totalFound} total results`,
        source: 'DWV App (Multiple Strategies)'
      };

    } catch (error) {
      console.error('❌ Scraping failed:', error);
      return {
        success: false,
        properties: [],
        total_found: 0,
        error: error.message,
        source: 'DWV App (Error)'
      };
    }
  }

  /**
   * Scrape from API endpoints
   */
  private async scrapeFromAPI(): Promise<ScrapingResult> {
    const properties: Property[] = [];
    
    const apiEndpoints = [
      '/api/imoveis',
      '/api/properties',
      '/api/empreendimentos',
      '/api/lancamentos',
      '/api/v1/imoveis',
      '/api/v1/properties',
      '/api/listings',
      '/api/search/properties'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        console.log(`🔗 Trying API: ${url}`);

        const response = await fetch(url, {
          headers: {
            'Cookie': this.cookies,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `${this.baseUrl}/imoveis`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const extractedProperties = this.parseAPIResponse(data, url);
          
          if (extractedProperties.length > 0) {
            properties.push(...extractedProperties);
            console.log(`📊 API ${endpoint} returned ${extractedProperties.length} properties`);
          }
        }

        // Add delay between requests
        await this.delay(1000);

      } catch (error) {
        console.error(`API ${endpoint} failed:`, error);
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
   * Scrape from HTML pages
   */
  private async scrapeFromHTML(): Promise<ScrapingResult> {
    const properties: Property[] = [];
    
    const htmlPages = [
      '/imoveis',
      '/imoveis?tipo=apartamento',
      '/imoveis?tipo=casa',
      '/imoveis?cidade=curitiba',
      '/lancamentos',
      '/empreendimentos',
      '/imoveis?status=disponivel',
      '/imoveis?categoria=venda',
      '/dashboard/imoveis'
    ];

    for (const page of htmlPages) {
      try {
        const url = `${this.baseUrl}${page}`;
        console.log(`🌐 Scraping HTML: ${url}`);

        const response = await fetch(url, {
          headers: {
            'Cookie': this.cookies,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `${this.baseUrl}/dashboard`
          }
        });

        if (response.ok) {
          const html = await response.text();
          
          // Check if we're still logged in
          if (this.isLoggedIn(html)) {
            const extractedProperties = this.parseHTMLResponse(html, url);
            
            if (extractedProperties.length > 0) {
              properties.push(...extractedProperties);
              console.log(`🏠 HTML ${page} returned ${extractedProperties.length} properties`);
            }
          } else {
            console.log(`⚠️ Session expired on ${page}`);
            break;
          }
        }

        // Add delay between requests
        await this.delay(2000);

      } catch (error) {
        console.error(`HTML ${page} failed:`, error);
      }
    }

    return {
      success: properties.length > 0,
      properties,
      total_found: properties.length,
      source: 'HTML'
    };
  }

  /**
   * Scrape from search pages
   */
  private async scrapeFromSearch(): Promise<ScrapingResult> {
    const properties: Property[] = [];
    
    const searchQueries = [
      'curitiba',
      'apartamento',
      'casa',
      'lançamento',
      'disponível'
    ];

    for (const query of searchQueries) {
      try {
        const url = `${this.baseUrl}/buscar?q=${encodeURIComponent(query)}`;
        console.log(`🔍 Searching: ${url}`);

        const response = await fetch(url, {
          headers: {
            'Cookie': this.cookies,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `${this.baseUrl}/imoveis`
          }
        });

        if (response.ok) {
          const html = await response.text();
          const extractedProperties = this.parseHTMLResponse(html, url);
          
          if (extractedProperties.length > 0) {
            properties.push(...extractedProperties);
            console.log(`🔍 Search "${query}" returned ${extractedProperties.length} properties`);
          }
        }

        // Add delay between requests
        await this.delay(2000);

      } catch (error) {
        console.error(`Search "${query}" failed:`, error);
      }
    }

    return {
      success: properties.length > 0,
      properties,
      total_found: properties.length,
      source: 'Search'
    };
  }

  /**
   * Parse API response to extract properties
   */
  private parseAPIResponse(data: any, sourceUrl: string): Property[] {
    const properties: Property[] = [];
    const currentTime = new Date().toISOString();

    try {
      // Handle different API response formats
      let items: any[] = [];
      
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
      // Strategy 1: Extract from JSON data in script tags
      const jsonProperties = this.extractJSONFromHTML(html, sourceUrl, currentTime);
      properties.push(...jsonProperties);

      // Strategy 2: Extract from HTML elements
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
   * Extract properties from JSON data in HTML
   */
  private extractJSONFromHTML(html: string, sourceUrl: string, currentTime: string): Property[] {
    const properties: Property[] = [];

    try {
      // Look for JSON data in script tags
      const jsonPatterns = [
        /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi,
        /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/gi,
        /<script[^>]*>[\s\S]*?window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/gi,
        /<script[^>]*>[\s\S]*?window\.APP_DATA\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/gi
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
      // Property card patterns
      const cardPatterns = [
        /<div[^>]*class="[^"]*(?:property-card|imovel-card|card-imovel|listing-item|property-item)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
        /<article[^>]*class="[^"]*(?:property|imovel|listing)[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
        /<li[^>]*class="[^"]*(?:property|imovel|listing)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi
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
   * Convert API item to Property object
   */
  private convertAPIItemToProperty(item: any, sourceUrl: string, currentTime: string): Property | null {
    try {
      if (!item) return null;

      const property: Property = {
        title: this.extractValue(item, ['title', 'nome', 'name', 'titulo']) || 'Imóvel DWV',
        price: this.formatPrice(this.extractValue(item, ['price', 'preco', 'valor', 'valores.venda'])) || 'Preço sob consulta',
        location: this.extractValue(item, ['location', 'endereco', 'address', 'bairro', 'cidade']) || 'Localização não informada',
        listing_url: this.makeAbsoluteUrl(this.extractValue(item, ['url', 'link', 'href']) || sourceUrl, sourceUrl),
        scraped_at: currentTime,
        status: 'active'
      };

      // Optional fields
      property.image_url = this.extractValue(item, ['image_url', 'imagem', 'foto', 'thumbnail', 'images.0']);
      property.description = this.extractValue(item, ['description', 'descricao', 'sobre']);
      property.bedrooms = this.extractNumber(item, ['bedrooms', 'quartos', 'dormitorios']);
      property.bathrooms = this.extractNumber(item, ['bathrooms', 'banheiros']);
      property.square_feet = this.extractNumber(item, ['square_feet', 'area', 'metragem']);
      property.property_type = this.extractValue(item, ['property_type', 'tipo', 'category']);
      property.agent_name = this.extractValue(item, ['agent_name', 'corretor', 'agent.name']);
      property.agent_phone = this.extractValue(item, ['agent_phone', 'telefone', 'agent.phone']);

      if (Array.isArray(item.features)) property.features = item.features;
      if (Array.isArray(item.caracteristicas)) property.features = item.caracteristicas;

      return property;

    } catch (error) {
      console.error('Error converting API item:', error);
      return null;
    }
  }

  /**
   * Extract property from HTML card
   */
  private extractPropertyFromCard(cardHtml: string, sourceUrl: string, currentTime: string): Property | null {
    try {
      // Extract title
      const titleMatch = cardHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
                        cardHtml.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                        cardHtml.match(/<a[^>]*title="([^"]+)"/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Imóvel DWV';

      // Extract price
      const priceMatch = cardHtml.match(/R\$\s*[\d.,]+(?:\s*mil)?/i);
      const price = priceMatch ? priceMatch[0] : 'Preço sob consulta';

      // Extract location
      const locationMatch = cardHtml.match(/<div[^>]*class="[^"]*(?:location|endereco|address)[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                           cardHtml.match(/<span[^>]*class="[^"]*(?:location|endereco|address)[^"]*"[^>]*>([^<]+)<\/span>/i);
      const location = locationMatch ? locationMatch[1].trim() : 'Localização não informada';

      // Skip if no basic info
      if (price === 'Preço sob consulta' && location === 'Localização não informada') {
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
      const bedroomMatch = cardHtml.match(/(\d+)\s*(?:quarto|dormitório|dorm|qto)/i);
      const bathroomMatch = cardHtml.match(/(\d+)\s*(?:banheiro|wc|lavabo)/i);
      const sqftMatch = cardHtml.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|metros?)/i);

      if (bedroomMatch) property.bedrooms = parseInt(bedroomMatch[1]);
      if (bathroomMatch) property.bathrooms = parseInt(bathroomMatch[1]);
      if (sqftMatch) property.square_feet = Math.round(parseFloat(sqftMatch[1].replace(',', '.')) * 10.764);

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
    // Check for indicators that we're still logged in
    const loggedInIndicators = [
      'dashboard',
      'logout',
      'sair',
      'perfil',
      'minha conta',
      'bem-vindo'
    ];

    const loggedOutIndicators = [
      'login',
      'entrar',
      'fazer login',
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
 * Create scraper instance
 */
export function createScraper(cookies: string): DWVPropertyScraper {
  return new DWVPropertyScraper(cookies);
}