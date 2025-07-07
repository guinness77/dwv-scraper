 // Direct HTTP calls to Supabase Edge Functions
 const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
 const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
 const functionsBaseUrl = `${supabaseUrl}/functions/v1`;

import { supabase } from './supabase';
import { Property } from '../types/property';

interface SearchFilters {
  city: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  onlyNew?: boolean;
  onlyFromDevelopers?: boolean;
}

export class PropertySearchService {
  private readonly curitibaKeywords = [
    'curitiba', 'pr', 'paraná', 'cwb',
    'batel', 'água verde', 'centro', 'bigorrilho',
    'champagnat', 'cabral', 'cristo rei', 'jardim botânico',
    'alto da rua xv', 'centro cívico', 'rebouças', 'juvevê',
    'santa felicidade', 'portão', 'cajuru', 'tingui'
  ];

  private readonly developerKeywords = [
    'construtora', 'incorporadora', 'lançamento',
    'na planta', 'pré-lançamento', 'obra nova',
    'entrega', 'incorporação', 'empreendimento',
    'apartamento novo', 'casa nova', 'pronto para morar',
    'financiamento direto', 'minha casa minha vida'
  ];

  async searchCuritibaProperties(filters: SearchFilters = { city: 'curitiba' }) {
    const searchUrls = this.generateSearchUrls(filters);
    const allProperties: Property[] = [];

    console.log(`Iniciando busca em ${searchUrls.length} sites...`);

    for (const url of searchUrls) {
      try {
        console.log(`Buscando em: ${url}`);
        const properties = await this.scrapeUrl(url);
        const curitibaProperties = this.filterCuritibaProperties(properties);
        const filteredProperties = this.applyFilters(curitibaProperties, filters);
        
        allProperties.push(...filteredProperties);
        console.log(`Encontrados ${filteredProperties.length} imóveis em ${url}`);
        
        // Delay entre requisições para evitar bloqueios
        await this.delay(3000);
      } catch (error) {
        console.error(`Erro ao buscar ${url}:`, error);
      }
    }

    // Remove duplicatas baseado na URL do anúncio
    const uniqueProperties = this.removeDuplicates(allProperties);
    console.log(`Total de imóveis únicos encontrados: ${uniqueProperties.length}`);
    
    // Salva no banco de dados
    if (uniqueProperties.length > 0) {
      await this.saveNewProperties(uniqueProperties);
    }

    return uniqueProperties;
  }

  private generateSearchUrls(filters: SearchFilters): string[] {
    const baseUrls = [
      // DWV App - Site principal para Curitiba
      'https://site.dwvapp.com.br',
      'https://site.dwvapp.com.br/curitiba',
      
      // Viva Real - Curitiba
      'https://www.vivareal.com.br/venda/parana/curitiba/',
      'https://www.vivareal.com.br/venda/parana/curitiba/apartamento/',
      'https://www.vivareal.com.br/venda/parana/curitiba/casa/',
      
      // ZAP Imóveis - Curitiba
      'https://www.zapimoveis.com.br/venda/imoveis/pr+curitiba/',
      'https://www.zapimoveis.com.br/venda/apartamentos/pr+curitiba/',
      'https://www.zapimoveis.com.br/venda/casas/pr+curitiba/',
      
      // OLX Imóveis
      'https://www.olx.com.br/imoveis/venda/estado-pr/curitiba',
      'https://www.olx.com.br/imoveis/venda/apartamentos/estado-pr/curitiba',
      
      // Imovelweb
      'https://www.imovelweb.com.br/imoveis-venda-curitiba-parana.html',
      'https://www.imovelweb.com.br/apartamentos-venda-curitiba-parana.html',
      
      // Chaves na Mão
      'https://www.chavesnamao.com.br/venda-curitiba-pr',
      'https://www.chavesnamao.com.br/apartamentos-venda-curitiba-pr',
    ];

    // Adiciona URLs específicas para construtoras e lançamentos
    if (filters.onlyFromDevelopers) {
      baseUrls.push(
        'https://www.vivareal.com.br/venda/parana/curitiba/?tipos=lancamento',
        'https://www.zapimoveis.com.br/lancamentos/curitiba-pr/',
        'https://www.imovelweb.com.br/lancamentos-curitiba-parana.html',
        'https://www.chavesnamao.com.br/lancamentos-curitiba-pr',
      );
    }

    return baseUrls;
  }

  private async scrapeUrl(url: string): Promise<Property[]> {
    try {
      const response = await fetch(`${functionsBaseUrl}/scrape-properties`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      if (!response.ok) {
        throw new Error(`Edge Function request failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data.properties || [];
    } catch (error) {
      console.error('Erro no scraping:', error);
      return [];
    }
  }

  private filterCuritibaProperties(properties: Property[]): Property[] {
    return properties.filter(property => {
      const text = `${property.title} ${property.location} ${property.description || ''}`.toLowerCase();
      return this.curitibaKeywords.some(keyword => text.includes(keyword));
    });
  }

  private applyFilters(properties: Property[], filters: SearchFilters): Property[] {
    let filtered = properties;

    // Filtro para apenas imóveis de construtoras/incorporadoras
    if (filters.onlyFromDevelopers) {
      filtered = filtered.filter(property => {
        const text = `${property.title} ${property.description || ''}`.toLowerCase();
        return this.developerKeywords.some(keyword => text.includes(keyword));
      });
    }

    // Filtro para apenas imóveis novos
    if (filters.onlyNew) {
      filtered = filtered.filter(property => {
        const text = `${property.title} ${property.description || ''}`.toLowerCase();
        const newKeywords = ['novo', 'nova', 'lançamento', 'na planta', 'pré-lançamento', 'entrega'];
        return newKeywords.some(keyword => text.includes(keyword));
      });
    }

    // Filtro por número de quartos
    if (filters.bedrooms && filters.bedrooms > 0) {
      filtered = filtered.filter(property => 
        property.bedrooms && property.bedrooms >= filters.bedrooms!
      );
    }

    // Filtro por preço (básico - pode ser melhorado)
    if (filters.minPrice || filters.maxPrice) {
      filtered = filtered.filter(property => {
        const priceText = property.price.replace(/[^\d]/g, '');
        const price = parseInt(priceText);
        
        if (isNaN(price)) return true; // Mantém se não conseguir extrair o preço
        
        if (filters.minPrice && price < filters.minPrice) return false;
        if (filters.maxPrice && price > filters.maxPrice) return false;
        
        return true;
      });
    }

    return filtered;
  }

  private removeDuplicates(properties: Property[]): Property[] {
    const seen = new Set<string>();
    return properties.filter(property => {
      // Usa uma combinação de título e localização para detectar duplicatas
      const key = `${property.title.toLowerCase()}-${property.location.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async saveNewProperties(properties: Property[]): Promise<void> {
    try {
      // Verifica quais propriedades já existem no banco
      const existingTitles = await this.getExistingTitles(properties.map(p => p.title));
      const newProperties = properties.filter(p => !existingTitles.includes(p.title));

      if (newProperties.length > 0) {
        const { error } = await supabase
          .from('properties')
          .insert(newProperties);
        
        if (error) {
          console.error('Erro ao salvar propriedades:', error);
          throw error;
        }
        
        console.log(`${newProperties.length} novos imóveis salvos no banco de dados`);
      } else {
        console.log('Nenhum imóvel novo encontrado para salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar propriedades:', error);
    }
  }

  private async getExistingTitles(titles: string[]): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('title')
        .in('title', titles);
      
      if (error) throw error;
      return data?.map(item => item.title) || [];
    } catch (error) {
      console.error('Erro ao verificar títulos existentes:', error);
      return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Método para busca automática periódica
  async startAutomaticSearch(intervalMinutes: number = 60) {
    console.log(`Iniciando busca automática a cada ${intervalMinutes} minutos`);
    
    const search = async () => {
      try {
        console.log('Executando busca automática...');
        const properties = await this.searchCuritibaProperties({
          city: 'curitiba',
          onlyNew: true,
          onlyFromDevelopers: true
        });
        
        console.log(`Busca automática concluída: ${properties.length} novos imóveis encontrados`);
        return properties.length;
      } catch (error) {
        console.error('Erro na busca automática:', error);
        return 0;
      }
    };

    // Executa imediatamente
    const initialResults = await search();
    
    // Agenda execuções periódicas
    const intervalId = setInterval(search, intervalMinutes * 60 * 1000);
    
    return {
      initialResults,
      stop: () => clearInterval(intervalId)
    };
  }
}

export const propertySearchService = new PropertySearchService();