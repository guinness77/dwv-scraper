
 // Direct HTTP calls to Supabase Edge Functions for authentication
 const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
 const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
 const functionsBaseUrl = `${supabaseUrl}/functions/v1`;

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
+        console.log('DEBUG functionsBaseUrl (auth):', functionsBaseUrl);
      const response = await fetch(`${functionsBaseUrl}/test-dwv-auth`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Edge Function request failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
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