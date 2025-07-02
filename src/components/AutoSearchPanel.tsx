import React, { useState } from 'react';
import { Search, Clock, Building, MapPin, Play, Pause, Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { propertySearchService } from '../services/propertySearchService';

export const AutoSearchPanel: React.FC = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [autoSearchActive, setAutoSearchActive] = useState(false);
  const [searchInterval, setSearchInterval] = useState(60);
  const [lastSearchResults, setLastSearchResults] = useState<number>(0);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle');
  const [searchMessage, setSearchMessage] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    onlyNew: true,
    onlyFromDevelopers: true,
    minPrice: 0,
    maxPrice: 0,
    bedrooms: 0
  });

  const handleManualSearch = async () => {
    setIsSearching(true);
    setSearchStatus('searching');
    setSearchMessage('Buscando imóveis em Curitiba...');
    
    try {
      const properties = await propertySearchService.searchCuritibaProperties({
        city: 'curitiba',
        ...searchFilters
      });
      
      setLastSearchResults(properties.length);
      setSearchStatus('success');
      setSearchMessage(`${properties.length} imóveis encontrados e salvos no banco de dados!`);
      
      setTimeout(() => {
        setSearchStatus('idle');
        setSearchMessage('');
      }, 5000);
    } catch (error) {
      console.error('Erro na busca:', error);
      setSearchStatus('error');
      setSearchMessage('Erro ao buscar imóveis. Tente novamente.');
      
      setTimeout(() => {
        setSearchStatus('idle');
        setSearchMessage('');
      }, 5000);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleAutoSearch = async () => {
    if (!autoSearchActive) {
      setAutoSearchActive(true);
      try {
        const result = await propertySearchService.startAutomaticSearch(searchInterval);
        setLastSearchResults(result.initialResults);
        setSearchMessage(`Busca automática iniciada. ${result.initialResults} imóveis encontrados na primeira execução.`);
      } catch (error) {
        console.error('Erro ao iniciar busca automática:', error);
        setAutoSearchActive(false);
        setSearchMessage('Erro ao iniciar busca automática.');
      }
    } else {
      setAutoSearchActive(false);
      setSearchMessage('Busca automática pausada.');
    }
    
    setTimeout(() => setSearchMessage(''), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
      <div className="flex items-center mb-6">
        <Building className="w-6 h-6 text-emerald-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Busca Automática - Curitiba</h2>
      </div>

      {/* Status Message */}
      {searchStatus !== 'idle' && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${
          searchStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          searchStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {searchStatus === 'searching' && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {searchStatus === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
          {searchStatus === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
          {searchMessage}
        </div>
      )}

      {/* Search Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Filtros de Busca
          </h3>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={searchFilters.onlyNew}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, onlyNew: e.target.checked }))}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Apenas imóveis novos</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={searchFilters.onlyFromDevelopers}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, onlyFromDevelopers: e.target.checked }))}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Apenas construtoras/incorporadoras</span>
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Preço (R$)</h3>
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Preço mínimo"
              value={searchFilters.minPrice || ''}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, minPrice: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Preço máximo"
              value={searchFilters.maxPrice || ''}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Configurações</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Quartos mínimos</label>
            <select
              value={searchFilters.bedrooms}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value={0}>Qualquer</option>
              <option value={1}>1+</option>
              <option value={2}>2+</option>
              <option value={3}>3+</option>
              <option value={4}>4+</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Intervalo busca automática (min)</label>
            <select
              value={searchInterval}
              onChange={(e) => setSearchInterval(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={360}>6 horas</option>
              <option value={720}>12 horas</option>
              <option value={1440}>24 horas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          onClick={handleManualSearch}
          disabled={isSearching}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 px-6 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 disabled:from-emerald-400 disabled:to-emerald-500 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Buscar Agora
            </>
          )}
        </button>

        <button
          onClick={toggleAutoSearch}
          disabled={isSearching}
          className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl ${
            autoSearchActive
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          {autoSearchActive ? (
            <>
              <Pause className="w-5 h-5 mr-2" />
              Parar Busca Automática
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Iniciar Busca Automática
            </>
          )}
        </button>
      </div>

      {/* Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-600">{lastSearchResults}</div>
            <div className="text-sm text-gray-600">Últimos resultados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {autoSearchActive ? 'ATIVA' : 'INATIVA'}
            </div>
            <div className="text-sm text-gray-600">Busca automática</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{searchInterval}min</div>
            <div className="text-sm text-gray-600">Intervalo configurado</div>
          </div>
        </div>
      </div>

      {/* Target Sites */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
          <MapPin className="w-4 h-4 mr-2" />
          Sites Monitorados para Curitiba
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {[
            'DWV App', 'Viva Real', 'ZAP Imóveis', 'OLX Imóveis',
            'Imovelweb', 'Chaves na Mão', 'Loft', 'QuintoAndar'
          ].map((site) => (
            <div key={site} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-center">
              {site}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Nota:</strong> A busca utiliza Jina AI Reader para melhor extração de conteúdo e contorna limitações de JavaScript e anti-bot dos sites.
          </p>
        </div>
      </div>
    </div>
  );
};