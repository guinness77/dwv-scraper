import React, { useState } from 'react';
import { Globe, Search, Loader2, AlertCircle } from 'lucide-react';

interface PropertyFormProps {
  onScrape: (url: string) => Promise<void>;
  isLoading: boolean;
}

export const PropertyForm: React.FC<PropertyFormProps> = ({ onScrape, isLoading }) => {
  const [url, setUrl] = useState('https://site.dwvapp.com.br');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!url.trim()) {
      setError('Por favor, insira uma URL válida');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Por favor, insira uma URL válida (inclua http:// ou https://)');
      return;
    }
    
    await onScrape(url.trim());
  };

  const popularSites = [
    { name: 'DWV App', url: 'https://site.dwvapp.com.br' },
    { name: 'Viva Real', url: 'https://www.vivareal.com.br' },
    { name: 'ZAP Imóveis', url: 'https://www.zapimoveis.com.br' },
    { name: 'OLX Imóveis', url: 'https://www.olx.com.br/imoveis' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
      <div className="flex items-center mb-6">
        <Globe className="w-6 h-6 text-blue-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Extrair Imóveis do Site</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            URL do Site de Imóveis
          </label>
          <div className="relative">
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://site.dwvapp.com.br"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isLoading}
            />
            <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
          </div>
          {error && (
            <div className="mt-2 flex items-center text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Extraindo Imóveis...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Extrair Imóveis
            </>
          )}
        </button>
      </form>
      
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Sites Populares de Imóveis:</h3>
        <div className="grid grid-cols-2 gap-2">
          {popularSites.map((site) => (
            <button
              key={site.name}
              onClick={() => setUrl(site.url)}
              className="text-left p-3 rounded-lg hover:bg-blue-50 transition-colors text-sm text-blue-600 hover:text-blue-700 border border-blue-100 hover:border-blue-200"
              disabled={isLoading}
            >
              <div className="font-medium">{site.name}</div>
              <div className="text-xs text-gray-500 truncate">{site.url}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};