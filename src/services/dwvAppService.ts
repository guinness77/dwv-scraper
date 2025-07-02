import { supabase } from './supabase';
import { Property } from '../types/property';

export class DWVAppService {
  async scrapeDWVApp(): Promise<Property[]> {
    try {
      console.log('Iniciando scraping do DWV App...');
      
      const { data, error } = await supabase.functions.invoke('scrape-dwv-app');
      
      if (error) {
        console.error('Erro na função de scraping do DWV App:', error);
        throw error;
      }
      
      const properties = data?.properties || [];
      console.log(`DWV App scraping concluído: ${properties.length} propriedades encontradas`);
      
      return properties;
    } catch (error) {
      console.error('Erro no scraping do DWV App:', error);
      throw error;
    }
  }

  async saveNewDWVProperties(properties: Property[]): Promise<Property[]> {
    try {
      if (properties.length === 0) return [];

      // Check for existing properties to avoid duplicates
      const existingTitles = await this.getExistingTitles(properties.map(p => p.title));
      const newProperties = properties.filter(p => !existingTitles.includes(p.title));

      if (newProperties.length === 0) {
        console.log('Nenhuma propriedade nova do DWV App para salvar');
        return [];
      }

      const { data, error } = await supabase
        .from('properties')
        .insert(newProperties)
        .select();

      if (error) {
        console.error('Erro ao salvar propriedades do DWV App:', error);
        throw error;
      }

      console.log(`${newProperties.length} novas propriedades do DWV App salvas`);
      return data || [];
    } catch (error) {
      console.error('Erro ao salvar propriedades do DWV App:', error);
      throw error;
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
}

export const dwvAppService = new DWVAppService();