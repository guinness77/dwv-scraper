import { useState, useEffect } from 'react';
import { Property } from '../types/property';
import { propertyService } from '../services/supabase';

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await propertyService.getAllProperties();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const scrapeProperties = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      const scrapedProperties = await propertyService.scrapeProperties(url);
      
      if (scrapedProperties.length > 0) {
        const savedProperties = await propertyService.saveProperties(scrapedProperties);
        setProperties(prev => [...savedProperties, ...prev]);
        return savedProperties;
      }
      return [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scrape properties');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      await propertyService.deleteProperty(id);
      setProperties(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete property');
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return {
    properties,
    loading,
    error,
    fetchProperties,
    scrapeProperties,
    deleteProperty
  };
};