
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
        // Log environment variables to verify they're loaded correctly
        console.log('DEBUG Environment Variables:');
        console.log('DEBUG VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
        console.log('DEBUG VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Defined (not showing full key)' : 'Undefined');
        
        // Log request details
        console.log('DEBUG functionsBaseUrl (auth):', functionsBaseUrl);
        console.log('DEBUG auth endpoint:', `${functionsBaseUrl}/test-dwv-auth`);
        console.log('DEBUG auth headers:', { Authorization: `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' });
        
        // Attempt the fetch with more detailed error handling
        try {
          const response = await fetch(`${functionsBaseUrl}/test-dwv-auth`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('DEBUG fetch response received:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            ok: response.ok
          });
          
          if (!response.ok) {
            throw new Error(`Edge Function request failed: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('DEBUG response data:', data);
          return data as AuthTestResult;
        } catch (fetchError: unknown) {
          // Properly type the error for TypeScript
          const error = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
          
          console.error('DEBUG fetch error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          throw error; // Re-throw to be caught by the outer try/catch
        }
    } catch (error) {
      console.error('Erro no teste de autenticação:', error);
      
      // More detailed error information
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('DEBUG network error details:', {
          message: 'This is likely a network connectivity issue, CORS problem, or the Edge Function is not accessible',
          originalError: error
        });
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido no teste de autenticação'
      };
    }
  }
}

export const dwvAuthService = new DWVAuthService(); 