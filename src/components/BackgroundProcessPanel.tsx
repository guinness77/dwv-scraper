import React, { useState } from 'react';
import { Bot, Play, Pause, RefreshCw, CheckCircle, AlertCircle, Loader2, Settings, Clock } from 'lucide-react';

interface ProcessStatus {
  isRunning: boolean;
  lastRun: Date | null;
  propertiesExtracted: number;
  propertiesSaved: number;
  success: boolean;
  message: string;
  error?: string;
}

export const BackgroundProcessPanel: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [processMessage, setProcessMessage] = useState('');
  const [lastResult, setLastResult] = useState<ProcessStatus | null>(null);
  const [autoRun, setAutoRun] = useState(false);
  const [interval, setInterval] = useState(60); // minutes

  const handleRunProcess = async () => {
    setIsProcessing(true);
    setProcessStatus('running');
    setProcessMessage('Iniciando processo automatizado...');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/dwv-background-process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Process failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      setLastResult({
        isRunning: false,
        lastRun: new Date(),
        propertiesExtracted: result.data?.propertiesExtracted || 0,
        propertiesSaved: result.data?.propertiesSaved || 0,
        success: result.success,
        message: result.message,
        error: result.error
      });

      if (result.success) {
        setProcessStatus('success');
        setProcessMessage(`Processo concluído: ${result.data?.propertiesSaved || 0} propriedades salvas`);
      } else {
        setProcessStatus('error');
        setProcessMessage(`Processo falhou: ${result.error || result.message}`);
      }

    } catch (error) {
      console.error('Erro no processo:', error);
      setProcessStatus('error');
      setProcessMessage(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      setLastResult({
        isRunning: false,
        lastRun: new Date(),
        propertiesExtracted: 0,
        propertiesSaved: 0,
        success: false,
        message: 'Processo falhou',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsProcessing(false);
      
      // Clear status after 8 seconds
      setTimeout(() => {
        setProcessStatus('idle');
        setProcessMessage('');
      }, 8000);
    }
  };

  const toggleAutoRun = () => {
    setAutoRun(!autoRun);
    if (!autoRun) {
      // Start auto-run
      setProcessMessage(`Execução automática ativada (${interval} min)`);
    } else {
      // Stop auto-run
      setProcessMessage('Execução automática desativada');
    }
    
    setTimeout(() => setProcessMessage(''), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
      <div className="flex items-center mb-6">
        <Bot className="w-6 h-6 text-purple-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Processo Automatizado</h2>
      </div>

      {/* Status Message */}
      {processStatus !== 'idle' && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${
          processStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          processStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {processStatus === 'running' && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {processStatus === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
          {processStatus === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
          {processMessage}
        </div>
      )}

      {/* Process Description */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Settings className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="font-semibold text-purple-900">Processo Completo Automatizado</h3>
        </div>
        <div className="text-sm text-purple-700 space-y-2">
          <p><strong>1. Autenticação:</strong> Login automático no DWV App com múltiplas estratégias</p>
          <p><strong>2. Extração:</strong> Coleta dados de APIs, páginas HTML e dashboard</p>
          <p><strong>3. Processamento:</strong> Remove duplicatas e limpa os dados</p>
          <p><strong>4. Armazenamento:</strong> Salva apenas propriedades novas no banco</p>
          <p><strong>5. Monitoramento:</strong> Logs detalhados e tratamento de erros</p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <button
            onClick={handleRunProcess}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 disabled:from-purple-400 disabled:to-purple-500 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Executar Processo
              </>
            )}
          </button>
        </div>

        <div>
          <button
            onClick={toggleAutoRun}
            disabled={isProcessing}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl ${
              autoRun
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
            }`}
          >
            {autoRun ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Parar Auto-Execução
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Ativar Auto-Execução
              </>
            )}
          </button>
        </div>
      </div>

      {/* Auto-run Configuration */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-700 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Configuração de Auto-Execução
          </h4>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            autoRun ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {autoRun ? 'ATIVA' : 'INATIVA'}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Intervalo (minutos)</label>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={360}>6 horas</option>
              <option value={720}>12 horas</option>
              <option value={1440}>24 horas</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Próxima Execução</label>
            <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700">
              {autoRun ? `Em ${interval} minutos` : 'Não agendada'}
            </div>
          </div>
        </div>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-3">Último Resultado</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${lastResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {lastResult.success ? 'SUCESSO' : 'FALHA'}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{lastResult.propertiesExtracted}</div>
              <div className="text-sm text-gray-600">Extraídas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">{lastResult.propertiesSaved}</div>
              <div className="text-sm text-gray-600">Salvas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {lastResult.lastRun ? new Date(lastResult.lastRun).toLocaleTimeString() : '--:--'}
              </div>
              <div className="text-sm text-gray-600">Última Execução</div>
            </div>
          </div>
          
          {lastResult.error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Erro:</strong> {lastResult.error}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Features */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h4 className="font-semibold text-gray-700 mb-3">Recursos Avançados</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span>Autenticação com navegador simulado</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span>Múltiplas estratégias de extração</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span>Processamento em lotes</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span>Detecção automática de duplicatas</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span>Retry automático em falhas</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span>Logs detalhados para debugging</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};