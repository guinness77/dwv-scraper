import React, { useState, useMemo } from 'react';
import { Building2, Database, Loader2, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { PropertyForm } from './components/PropertyForm';
import { PropertyCard } from './components/PropertyCard';
import { PropertyStats } from './components/PropertyStats';
import { PropertyFilters } from './components/PropertyFilters';
import { AutoSearchPanel } from './components/AutoSearchPanel';
import { DWVAppPanel } from './components/DWVAppPanel';
import { DWVAuthTest } from './components/DWVAuthTest';
import { useProperties } from './hooks/useProperties';

function App() {
  const { properties, loading, error, scrapeProperties, deleteProperty } = useProperties();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('scraped_at');
  const [filterBy, setFilterBy] = useState('all');
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'scraping' | 'success' | 'error'>('idle');
  const [scrapingMessage, setScrapingMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'dwv' | 'auto' | 'manual' | 'test'>('test');

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(property => property.status === filterBy);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          const priceA = parseFloat(a.price.replace(/[^\d.]/g, '')) || 0;
          const priceB = parseFloat(b.price.replace(/[^\d.]/g, '')) || 0;
          return priceB - priceA;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'location':
          return a.location.localeCompare(b.location);
        case 'scraped_at':
        default:
          return new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime();
      }
    });

    return filtered;
  }, [properties, searchTerm, sortBy, filterBy]);

  const handleScrape = async (url: string) => {
    try {
      setScrapingStatus('scraping');
      setScrapingMessage('Extraindo imóveis do site...');
      
      const scrapedProperties = await scrapeProperties(url);
      
      if (scrapedProperties.length > 0) {
        setScrapingStatus('success');
        setScrapingMessage(`${scrapedProperties.length} imóveis extraídos com sucesso!`);
      } else {
        setScrapingStatus('error');
        setScrapingMessage('Nenhum imóvel encontrado nesta página. Tente uma URL diferente.');
      }
      
      setTimeout(() => {
        setScrapingStatus('idle');
        setScrapingMessage('');
      }, 5000);
    } catch (err) {
      setScrapingStatus('error');
      setScrapingMessage(err instanceof Error ? err.message : 'Falha ao extrair imóveis');
      setTimeout(() => {
        setScrapingStatus('idle');
        setScrapingMessage('');
      }, 5000);
    }
  };

  if (loading && properties.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando imóveis...</p>
        </div>
      </div>
    );
  }

  if (error && properties.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-600">Erro: {error}</p>
          <p className="text-gray-600 mt-2">Verifique se o Supabase está configurado corretamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Extrator de Imóveis</h1>
                <p className="text-sm text-gray-500">Curitiba - Construtoras & Incorporadoras</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              <Database className="w-4 h-4 mr-1" />
              <span>{properties.length} imóveis armazenados</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Message */}
        {scrapingStatus !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg flex items-center shadow-lg ${
            scrapingStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            scrapingStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {scrapingStatus === 'scraping' && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
            {scrapingStatus === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
            {scrapingStatus === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
            {scrapingMessage}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('test')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'test'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  Teste de Autenticação
                </div>
              </button>
              <button
                onClick={() => setActiveTab('dwv')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dwv'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                DWV App (Autenticado)
              </button>
              <button
                onClick={() => setActiveTab('auto')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'auto'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Busca Automática Curitiba
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manual'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Extração Manual
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'test' && <DWVAuthTest />}
        {activeTab === 'dwv' && <DWVAppPanel />}
        {activeTab === 'auto' && <AutoSearchPanel />}
        {activeTab === 'manual' && (
          <PropertyForm 
            onScrape={handleScrape} 
            isLoading={scrapingStatus === 'scraping'} 
          />
        )}

        {/* Statistics */}
        {properties.length > 0 && (
          <PropertyStats properties={properties} />
        )}

        {/* Filters */}
        {properties.length > 0 && (
          <PropertyFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterBy={filterBy}
            onFilterChange={setFilterBy}
          />
        )}

        {/* Properties Grid */}
        {filteredAndSortedProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onDelete={deleteProperty}
              />
            ))}
          </div>
        ) : properties.length > 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum imóvel corresponde aos filtros</h3>
            <p className="text-gray-500">Tente ajustar os critérios de busca ou filtro.</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum imóvel ainda</h3>
            <p className="text-gray-500">Use o DWV App ou busca automática para encontrar novos imóveis em Curitiba.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;