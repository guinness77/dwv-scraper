 // Direct HTTP calls to Supabase Edge Functions
 const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
 const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
 const functionsBaseUrl = `${supabaseUrl}/functions/v1`;

import { supabase } from './supabase';
import { Property } from '../types/property';

export interface ScrapingResult {
  success: boolean;
  properties: Property[];
  total_found: number;
  message?: string;
  error?: string;
}

export class DWVAppService {
  async scrapeDWVApp(): Promise<ScrapingResult> {
    try {
      console.log('Iniciando scraping do DWV App...');
      console.log('DEBUG functionsBaseUrl (app):', functionsBaseUrl);
      const response = await fetch(`${functionsBaseUrl}/scrape-dwv-app`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Edge Function request failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const properties = data.properties || [];
      console.log(`DWV App scraping concluído: ${properties.length} propriedades encontradas`);
      return {
        success: true,
        properties,
        total_found: properties.length,
        message: `${properties.length} propriedades encontradas no DWV App`
      };
    } catch (error) {
      console.error('Erro no scraping do DWV App:', error);
      return {
        success: false,
        properties: [],
        total_found: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido no scraping'
      };
    }
  }

  async saveNewDWVProperties(properties: Property[]): Promise<ScrapingResult> {
    try {
      if (properties.length === 0) {
        return {
          success: true,
          properties: [],
          total_found: 0,
          message: 'Nenhuma propriedade para salvar'
        };
      }

      // Check for existing properties to avoid duplicates
      const existingTitles = await this.getExistingTitles(properties.map(p => p.title));
      const newProperties = properties.filter(p => !existingTitles.includes(p.title));

      if (newProperties.length === 0) {
        console.log('Nenhuma propriedade nova do DWV App para salvar');
        return {
          success: true,
          properties: [],
          total_found: 0,
          message: 'Nenhuma propriedade nova para salvar (todas já existem no banco)'
        };
      }

      const { data, error } = await supabase
        .from('properties')
        .insert(newProperties)
        .select();

      if (error) {
        console.error('Erro ao salvar propriedades do DWV App:', error);
        return {
          success: false,
          properties: [],
          total_found: 0,
          error: error.message || 'Erro ao salvar propriedades no banco de dados'
        };
      }

      console.log(`${newProperties.length} novas propriedades do DWV App salvas`);
      return {
        success: true,
        properties: data || [],
        total_found: data?.length || 0,
        message: `${newProperties.length} novas propriedades salvas com sucesso`
      };
    } catch (error) {
      console.error('Erro ao salvar propriedades do DWV App:', error);
      return {
        success: false,
        properties: [],
        total_found: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao salvar propriedades'
      };
    }
  }

  async scrapeAndSaveDWVProperties(): Promise<ScrapingResult> {
    try {
      // Step 1: Scrape properties
      const scrapingResult = await this.scrapeDWVApp();
      
      if (!scrapingResult.success || scrapingResult.properties.length === 0) {
        return scrapingResult;
      }
      
      // Step 2: Save new properties
      const savingResult = await this.saveNewDWVProperties(scrapingResult.properties);
      
      // Return combined result
      return {
        success: savingResult.success,
        properties: scrapingResult.properties,
        total_found: scrapingResult.total_found,
        message: `${scrapingResult.total_found} propriedades encontradas, ${savingResult.total_found} novas salvas no banco`
      };
    } catch (error) {
      console.error('Erro no processo de scraping e salvamento:', error);
      return {
        success: false,
        properties: [],
        total_found: 0,
        error: error instanceof Error ? error.message : 'Erro no processo de scraping e salvamento'
      };
    }
  }

  private async getExistingTitles(titles: string[]): Promise<string[]> {
    try {
      if (!titles || titles.length === 0) return [];
      
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
}

export const dwvAppService = new DWVAppService();