import React, { useState } from 'react';
import { Building2, Key, Download, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import { dwvAppService } from '../services/dwvAppService';

export const DWVAppPanel: React.FC = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [extractionMessage, setExtractionMessage] = useState('');
  const [lastExtractionResults, setLastExtractionResults] = useState<number>(0);

  const handleDWVExtraction = async () => {
    setIsExtracting(true);
    setExtractionStatus('extracting');
    setExtractionMessage('Fazendo login no DWV App e extraindo imóveis...');

    try {
      // Extract properties from DWV App
      const properties = await dwvAppService.scrapeDWVApp();
      
      if (properties.length > 0) {
        // Save new properties to database
        const savedProperties = await dwvAppService.saveNewDWVProperties(properties);
        
        setLastExtractionResults(savedProperties.length);
        setExtractionStatus('success');
        setExtractionMessage(
          `${properties.length} imóveis extraídos do DWV App. ${savedProperties.length} novos imóveis salvos no banco de dados!`
        );
      } else {
        setExtractionStatus('error');
        setExtractionMessage('Nenhum imóvel encontrado no DWV App. Verifique as credenciais ou tente novamente.');
      }

      setTimeout(() => {
        setExtractionStatus('idle');
        setExtractionMessage('');
      }, 8000);
    } catch (error) {
      console.error('Erro na extração do DWV App:', error);
      setExtractionStatus('error');
      setExtractionMessage(
        error instanceof Error 
          ? `Erro: ${error.message}` 
          : 'Erro ao extrair imóveis do DWV App. Tente novamente.'
      );

      setTimeout(() => {
        setExtractionStatus('idle');
        setExtractionMessage('');
      }, 8000);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
      <div className="flex items-center mb-6">
        <Building2 className="w-6 h-6 text-blue-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">DWV App - Extração Autenticada</h2>
      </div>

      {/* Status Message */}
      {extractionStatus !== 'idle' && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${
          extractionStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          extractionStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {extractionStatus === 'extracting' && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {extractionStatus === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
          {extractionStatus === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
          {extractionMessage}
        </div>
      )}

      {/* Authentication Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Shield className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="font-semibold text-blue-900">Acesso Autenticado</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Email:</span>
            <span className="text-blue-700 ml-2">fer.scarduelli@gmail.com</span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Plataforma:</span>
            <span className="text-blue-700 ml-2">app.dwvapp.com.br</span>
          </div>
        </div>
        <p className="text-blue-700 text-sm mt-2">
          Este extrator faz login automaticamente na plataforma DWV App e acessa dados exclusivos de imóveis.
        </p>
      </div>

      {/* Extraction Button */}
      <div className="mb-6">
        <button
          onClick={handleDWVExtraction}
          disabled={isExtracting}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Extraindo do DWV App...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Extrair Imóveis do DWV App
            </>
          )}
        </button>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
            <Key className="w-4 h-4 mr-2" />
            Vantagens do Acesso Autenticado
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Acesso a imóveis exclusivos</li>
            <li>• Dados completos e atualizados</li>
            <li>• Informações de contato dos corretores</li>
            <li>• Preços e condições especiais</li>
          </ul>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Tipos de Imóveis</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Apartamentos em Curitiba</li>
            <li>• Casas e sobrados</li>
            <li>• Lançamentos e pré-lançamentos</li>
            <li>• Imóveis de construtoras</li>
          </ul>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{lastExtractionResults}</div>
            <div className="text-sm text-gray-600">Últimos resultados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">ATIVO</div>
            <div className="text-sm text-gray-600">Status da conta</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">DWV App</div>
            <div className="text-sm text-gray-600">Fonte exclusiva</div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          🔒 As credenciais são armazenadas de forma segura e usadas apenas para extração de dados.
          Nenhuma informação pessoal é compartilhada ou armazenada permanentemente.
        </p>
      </div>
    </div>
  );
};