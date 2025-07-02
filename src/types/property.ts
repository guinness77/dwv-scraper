export interface Property {
  id?: string;
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
  status?: 'active' | 'pending' | 'sold';
}

export interface ScrapingResult {
  success: boolean;
  properties: Property[];
  error?: string;
  total_found: number;
}