import { supabase } from './supabase';

interface AuthTestResult {
  success: boolean;
  message: string;
  cookies?: string;
  headers?: Record<string, string>;
  redirectLocation?: string;
}

export class DWVAuthService {
  async testAuthentication(): Promise<AuthTestResult> {
    try {
      console.log('Testando autenticação no DWV App...');
      
      const { data, error } = await supabase.functions.invoke('test-dwv-auth');
      
      if (error) {
        console.error('Erro na função de teste de autenticação:', error);
        throw error;
      }
      
      return data as AuthTestResult;
    } catch (error) {
      console.error('Erro no teste de autenticação:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido no teste de autenticação'
      };
    }
  }
}

export const dwvAuthService = new DWVAuthService(); 