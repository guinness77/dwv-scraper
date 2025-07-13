/**
 * Advanced Data Extractor for DWV App
 * Handles JSON and HTML data extraction with error recovery
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
  debugInfo?: any;
}

export class DWVDataExtractor {
  private session: string;
  private baseUrl = 'https://app.dwvapp.com.br';
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private retryCount = 3;
  private retryDelay = 2000;

  constructor(sessionCookies: string) {
    this.session = sessionCookies;
  }

  /**
   * Main data extraction method with multiple strategies
   */
  async extractAllData(): Promise<ExtractionResult> {
    console.log('🔍 Starting comprehensive data extraction...');
    
    const allProperties: Property[] = [];
    const extractionSources: string[] = [];
    let totalAttempts = 0;

    try {
      // Strategy 1: API Endpoints
      console.log('📡 Extracting from API endpoints...');
      const apiResult = await this.extractFromAPIs();
      if (apiResult.properties.length > 0) {
        allProperties.push(...apiResult.properties);
        extractionSources.push('API');
        console.log(`✅ API extraction: ${apiResult.properties.length} properties`);
      }
      totalAttempts++;

      // Strategy 2: Main Property Pages
      console.log('🌐 Extracting from property pages...');
      const pageResult = await this.extractFromPages();
      if (pageResult.properties.length > 0) {
        allProperties.push(...pageResult.properties);
        extractionSources.push('Pages');
        console.log(`✅ Page extraction: ${pageResult.properties.length} properties`);
      }
      totalAttempts++;

      // Strategy 3: Dashboard and User Areas
      console.log('📊 Extracting from dashboard areas...');
      const dashboardResult = await this.extractFromDashboard();
      if (dashboardResult.properties.length > 0) {
        allProperties.push(...dashboardResult.properties);
        extractionSources.push('Dashboard');
        console.log(`✅ Dashboard extraction: ${dashboardResult.properties.length} properties`);
      }
      totalAttempts++;

      // Strategy 4: Search and Filter Pages
      console.log('🔍 Extracting from search pages...');
      const searchResult = await this.extractFromSearch();
      if (searchResult.properties.length > 0) {
        allProperties.push(...searchResult.properties);
        extractionSources.push('Search');
        console.log(`✅ Search extraction: ${searchResult.properties.length} properties`);
      }
      totalAttempts++;

      // Remove duplicates and clean data
      const uniqueProperties = this.removeDuplicates(allProperties);
      const cleanedProperties = this.cleanPropertyData(uniqueProperties);
      
      return {
        success: cleanedProperties.length > 0,
        properties: cleanedProperties,
        total_found: cleanedProperties.length,
        message: `Extracted ${cleanedProperties.length} unique properties from ${extractionSources.join(', ')}`,
        source: extractionSources.join(', '),
        debugInfo: {
          totalAttempts,
          sourcesUsed: extractionSources,
          duplicatesRemoved: allProperties.length - uniqueProperties.length
        }
      };

    } catch (error) {
      console.error('❌ Data extraction failed:', error);
      return {
        success: false,
        properties: [],
        total_found: 0,
        error: error.message,
        source: 'Error',
        debugInfo: { totalAttempts, error: error.message }
      };
    }
  }

  /**
   * Extract data from API endpoints
   */
  private async extractFromAPIs(): Promise<ExtractionResult> {
    const properties: Property[] = [];
    
    const apiEndpoints = [
      '/api/imoveis',
      '/api/properties',
      '/api/empreendimentos',
      '/api/lancamentos',
      '/api/v1/imoveis',
      '/api/v1/properties',
      '/api/search/properties',
      '/api/dashboard/imoveis',
      '/api/user/imoveis'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const result = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
          headers: {
            'Cookie': this.session,
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': this.userAgent,
            'Referer': `${this.baseUrl}/dashboard`,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (result.success && result.data) {
          const extractedProperties = this.parseAPIResponse(result.data, `${this.baseUrl}${endpoint}`);
          if (extractedProperties.length > 0) {
            properties.push(...extractedProperties);
            console.log(`📊 ${endpoint}: ${extractedProperties.length} properties`);
          }
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
   * Extract data from HTML pages
   */
  private async extractFromPages(): Promise<ExtractionResult> {
    const properties: Property[] = [];
    
    const pages = [
      '/imoveis',
      '/imoveis?status=disponivel',
      '/imoveis?tipo=apartamento',
      '/imoveis?tipo=casa',
      '/empreendimentos',
      '/lancamentos',
      '/imoveis?categoria=venda',
      '/imoveis?categoria=aluguel'
    ];

    for (const page of pages) {
      try {
        const result = await this.fetchWithRetry(`${this.baseUrl}${page}`, {
          headers: {
            'Cookie': this.session,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': this.userAgent,
            'Referer': `${this.baseUrl}/dashboard`
          }
        });

        if (result.success && result.data) {
          const extractedProperties = this.parseHTMLResponse(result.data, `${this.baseUrl}${page}`);
          if (extractedProperties.length > 0) {
            properties.push(...extractedProperties);
            console.log(`🏠 ${page}: ${extractedProperties.length} properties`);
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
      source: 'Pages'
    };
  }

  /**
   * Extract data from dashboard areas
   */
  private async extractFromDashboard(): Promise<ExtractionResult> {
    const properties: Property[] = [];
    
    const dashboardPages = [
      '/dashboard',
      '/dashboard/imoveis',
      '/dashboard/empreendimentos',
      '/painel',
      '/painel/imoveis'
    ];

    for (const page of dashboardPages) {
      try {
        const result = await this.fetchWithRetry(`${this.baseUrl}${page}`, {
          headers: {
            'Cookie': this.session,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': this.userAgent
          }
        });

        if (result.success && result.data) {
          const extractedProperties = this.parseHTMLResponse(result.data, `${this.baseUrl}${page}`);
          properties.push(...extractedProperties);
        }

        await this.delay(1500);

      } catch (error) {
        console.error(`❌ Dashboard ${page} failed:`, error);
      }
    }

    return {
      success: properties.length > 0,
      properties,
      total_found: properties.length,
      source: 'Dashboard'
    };
  }

  /**
   * Extract data from search pages
   */
  private async extractFromSearch(): Promise<ExtractionResult> {
    const properties: Property[] = [];
    
    const searchQueries = [
      'curitiba',
      'apartamento',
      'casa',
      'disponivel',
      'venda'
    ];

    for (const query of searchQueries) {
      try {
        const searchUrl = `${this.baseUrl}/buscar?q=${encodeURIComponent(query)}`;
        const result = await this.fetchWithRetry(searchUrl, {
          headers: {
            'Cookie': this.session,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': this.userAgent,
            'Referer': `${this.baseUrl}/imoveis`
          }
        });

        if (result.success && result.data) {
          const extractedProperties = this.parseHTMLResponse(result.data, searchUrl);
          properties.push(...extractedProperties);
        }

        await this.delay(2000);

      } catch (error) {
        console.error(`❌ Search "${query}" failed:`, error);
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
   * Fetch with retry mechanism
   */
  private async fetchWithRetry(url: string, options: RequestInit): Promise<{success: boolean, data?: any, error?: string}> {
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        console.log(`🔗 Fetching: ${url} (attempt ${attempt})`);
        
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            const data = await response.json();
            return { success: true, data };
          } else {
            const data = await response.text();
            return { success: true, data };
          }
        } else {
          console.log(`⚠️ ${url}: ${response.status} ${response.statusText}`);
          if (attempt === this.retryCount) {
            return { success: false, error: `${response.status} ${response.statusText}` };
          }
        }

      } catch (error) {
        console.error(`❌ Fetch attempt ${attempt} failed:`, error);
        if (attempt === this.retryCount) {
          return { success: false, error: error.message };
        }
      }

      // Wait before retry
      if (attempt < this.retryCount) {
        await this.delay(this.retryDelay * attempt);
      }
    }

    return { success: false, error: 'Max retries exceeded' };
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
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items;
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
        /<script[^>]*>[\s\S]*?var\s+properties\s*=\s*(\[[\s\S]*?\]);[\s\S]*?<\/script>/gi,
        /<script[^>]*>[\s\S]*?var\s+imoveis\s*=\s*(\[[\s\S]*?\]);[\s\S]*?<\/script>/gi
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
        /<div[^>]*data-property[^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*data-imovel[^>]*>([\s\S]*?)<\/div>/gi
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
                        cardHtml.match(/<span[^>]*class="[^"]*titulo[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                        cardHtml.match(/<a[^>]*title="([^"]+)"/i);
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

  private removeDuplicates(properties: Property[]): Property[] {
    const seen = new Set<string>();
    return properties.filter(property => {
      const key = `${property.title.toLowerCase()}-${property.location.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private cleanPropertyData(properties: Property[]): Property[] {
    return properties.map(property => ({
      ...property,
      title: property.title.trim(),
      price: property.price.trim(),
      location: property.location.trim(),
      description: property.description?.trim() || undefined
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create data extractor instance
 */
export function createDataExtractor(sessionCookies: string): DWVDataExtractor {
  return new DWVDataExtractor(sessionCookies);
}