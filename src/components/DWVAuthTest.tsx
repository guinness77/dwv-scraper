import React, { useState } from 'react';
import { Key, Shield, Loader2, CheckCircle, AlertCircle, Clock, User, Settings } from 'lucide-react';
import { dwvAuthService } from '../services/dwvAuthService';

interface AuthTestResult {
  success: boolean;
  message: string;
  method?: string;
  cookies?: string;
  redirectLocation?: string;
  sessionId?: string;
  timestamp?: string;
  headers?: string[];
}

export const DWVAuthTest: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<AuthTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<AuthTestResult[]>([]);

  const handleTestAuth = async () => {
    setIsTesting(true);
    setTestStatus('testing');
    setTestMessage('Testando autenticação no DWV App...');

    try {
      const result = await dwvAuthService.testAuthentication();
      
      setTestResult(result);
      setTestHistory(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 tests
      
      if (result.success) {
        setTestStatus('success');
        setTestMessage(`Autenticação bem-sucedida usando método: ${result.method || 'desconhecido'}`);
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

  const getMethodBadgeColor = (method?: string) => {
    switch (method) {
      case 'existing_session': return 'bg-green-100 text-green-800';
      case 'form_login': return 'bg-blue-100 text-blue-800';
      case 'api_login': return 'bg-purple-100 text-purple-800';
      case 'alternative_login': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodIcon = (method?: string) => {
    switch (method) {
      case 'existing_session': return <Clock className="w-4 h-4" />;
      case 'form_login': return <User className="w-4 h-4" />;
      case 'api_login': return <Settings className="w-4 h-4" />;
      case 'alternative_login': return <Key className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
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
          <h3 className="font-semibold text-green-900">Sistema de Autenticação Avançado</h3>
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
        <div className="mt-3 p-3 bg-green-100 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Estratégias de Autenticação:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1 text-green-600" />
              <span>Sessão Existente</span>
            </div>
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1 text-green-600" />
              <span>Login por Formulário</span>
            </div>
            <div className="flex items-center">
              <Settings className="w-3 h-3 mr-1 text-green-600" />
              <span>Login por API</span>
            </div>
            <div className="flex items-center">
              <Key className="w-3 h-3 mr-1 text-green-600" />
              <span>Métodos Alternativos</span>
            </div>
          </div>
        </div>
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

      {/* Current Test Result */}
      {testResult && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Resultado do Teste Atual
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {testResult.success ? 'Sucesso' : 'Falha'}
              </span>
            </div>
            {testResult.method && (
              <div>
                <span className="font-medium text-gray-700">Método:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs flex items-center w-fit ${getMethodBadgeColor(testResult.method)}`}>
                  {getMethodIcon(testResult.method)}
                  <span className="ml-1">{testResult.method}</span>
                </span>
              </div>
            )}
            {testResult.cookies && (
              <div>
                <span className="font-medium text-gray-700">Sessão:</span>
                <span className="text-green-700 ml-2">Ativa</span>
              </div>
            )}
            {testResult.redirectLocation && (
              <div>
                <span className="font-medium text-gray-700">Redirecionamento:</span>
                <span className="text-blue-700 ml-2">{testResult.redirectLocation}</span>
              </div>
            )}
          </div>
          <div className="mt-3 p-3 bg-white rounded border">
            <span className="font-medium text-gray-700">Mensagem:</span>
            <p className="text-gray-600 mt-1">{testResult.message}</p>
          </div>
        </div>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Histórico de Testes</h4>
          <div className="space-y-2">
            {testHistory.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                <div className="flex items-center">
                  {test.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                  )}
                  <span className={test.success ? 'text-green-700' : 'text-red-700'}>
                    {test.success ? 'Sucesso' : 'Falha'}
                  </span>
                  {test.method && (
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getMethodBadgeColor(test.method)}`}>
                      {test.method}
                    </span>
                  )}
                </div>
                <span className="text-gray-500 text-xs">
                  {test.timestamp ? new Date(test.timestamp).toLocaleTimeString() : 'Agora'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <h4 className="font-semibold text-gray-800 mb-2">Como Funciona</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• <strong>Sessão Existente:</strong> Verifica se há uma sessão válida armazenada</p>
          <p>• <strong>Login por Formulário:</strong> Simula login através do formulário web</p>
          <p>• <strong>Login por API:</strong> Tenta autenticação via endpoints de API</p>
          <p>• <strong>Métodos Alternativos:</strong> Usa caminhos alternativos de login</p>
        </div>
      </div>
    </div>
  );
};