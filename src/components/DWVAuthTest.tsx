import React, { useState } from 'react';
import { Key, Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { dwvAuthService } from '../services/dwvAuthService';

export const DWVAuthTest: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestAuth = async () => {
    setIsTesting(true);
    setTestStatus('testing');
    setTestMessage('Testando autenticação no DWV App...');

    try {
      const result = await dwvAuthService.testAuthentication();
      
      setTestResult(result);
      
      if (result.success) {
        setTestStatus('success');
        setTestMessage(`Autenticação bem-sucedida: ${result.message}`);
      } else {
        setTestStatus('error');
        setTestMessage(`Falha na autenticação: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro no teste de autenticação:', error);
      setTestStatus('error');
      setTestMessage(
        error instanceof Error 
          ? `Erro: ${error.message}` 
          : 'Erro ao testar autenticação no DWV App.'
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
      <div className="flex items-center mb-6">
        <Shield className="w-6 h-6 text-green-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Teste de Autenticação DWV</h2>
      </div>

      {/* Status Message */}
      {testStatus !== 'idle' && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${
          testStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          testStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {testStatus === 'testing' && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {testStatus === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
          {testStatus === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
          {testMessage}
        </div>
      )}

      {/* Authentication Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Key className="w-5 h-5 text-green-600 mr-2" />
          <h3 className="font-semibold text-green-900">Credenciais de Teste</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-green-800">Email:</span>
            <span className="text-green-700 ml-2">fer.scarduelli@gmail.com</span>
          </div>
          <div>
            <span className="font-medium text-green-800">Plataforma:</span>
            <span className="text-green-700 ml-2">app.dwvapp.com.br</span>
          </div>
        </div>
        <p className="text-green-700 text-sm mt-2">
          Este teste verifica se é possível autenticar com sucesso no DWV App.
        </p>
      </div>

      {/* Test Button */}
      <div className="mb-6">
        <button
          onClick={handleTestAuth}
          disabled={isTesting}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-lg font-medium hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Testando Autenticação...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 mr-2" />
              Testar Autenticação DWV
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {testResult && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Detalhes do Teste</h4>
          <div className="overflow-auto max-h-64 text-sm">
            <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}; 