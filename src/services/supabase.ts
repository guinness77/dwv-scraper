import { createClient } from '@supabase/supabase-js';
import { Property } from '../types/property';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
console.log('DEBUG Supabase URL:', supabaseUrl);
console.log('DEBUG Supabase Anon Key:', supabaseKey);

export const supabase = createClient(supabaseUrl, supabaseKey);

export const propertyService = {
  async getAllProperties(): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('scraped_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
    
    return data || [];
  },

  async saveProperty(property: Omit<Property, 'id'>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .insert([property])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving property:', error);
      throw error;
    }
    
    return data;
  },

  async saveProperties(properties: Omit<Property, 'id'>[]): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .insert(properties)
      .select();
    
    if (error) {
      console.error('Error saving properties:', error);
      throw error;
    }
    
    return data || [];
  },

  async deleteProperty(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  },

  async scrapeProperties(url: string): Promise<Property[]> {
    const { data, error } = await supabase.functions.invoke('scrape-properties', {
      body: { url }
    });
    
    if (error) {
      console.error('Error scraping properties:', error);
      throw error;
    }
    
    return data?.properties || [];
  }
};