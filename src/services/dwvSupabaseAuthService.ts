import { supabase } from './supabase';

interface AuthResult {
  success: boolean;
  message: string;
  session?: {
    cookies: string;
    sessionId: string;
    expires: string;
  };
  debugInfo?: any;
  propertiesData?: PropertyData;
}

interface PropertyData {
  success: boolean;
  properties: any[];
  total_found: number;
  message: string;
  source: string;
  auth_method: string;
}

export class DWVSupabaseAuthService {
  private sessionData: AuthResult['session'] | null = null;

  /**
   * Authenticate with DWV using Supabase edge function
   */
  async authenticate(email: string, password: string, autoFetchProperties: boolean = false): Promise<AuthResult> {
    try {
      console.log('🔐 Authenticating via Supabase edge function...');
      
      // Call the test-dwv-auth edge function
      const { data, error } = await supabase.functions.invoke('test-dwv-auth', {
        body: { email, password }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        return {
          success: false,
          message: `Authentication failed: ${error.message}`
        };
      }

      console.log('📦 Edge function response:', data);

      // Store session data if authentication was successful
      if (data.success && data.sessionId) {
        this.sessionData = {
          cookies: data.cookies || '',
          sessionId: data.sessionId,
          expires: data.sessionExpires
        };
        
        // Store in localStorage for persistence
        localStorage.setItem('dwv_session', JSON.stringify(this.sessionData));
        
        // Auto-fetch properties if requested
        if (autoFetchProperties) {
          console.log('🏠 Auto-fetching properties after successful login...');
          const propertiesData = await this.fetchProperties();
          return {
            ...data,
            success: data.success,
            message: data.message,
            session: this.sessionData,
            debugInfo: data.debugInfo,
            propertiesData: propertiesData
          };
        }
      }

      return {
        success: data.success,
        message: data.message,
        session: this.sessionData || undefined,
        debugInfo: data.debugInfo
      };
    } catch (error) {
      console.error('💥 Authentication error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch properties data using the authenticated session
   */
  async fetchProperties(): Promise<PropertyData> {
    try {
      console.log('🏠 Fetching properties via Supabase edge function...');
      
      // Call the scrape-dwv-app edge function
      const { data, error } = await supabase.functions.invoke('scrape-dwv-app');

      if (error) {
        console.error('❌ Edge function error:', error);
        return {
          success: false,
          properties: [],
          total_found: 0,
          message: `Failed to fetch properties: ${error.message}`,
          source: 'error',
          auth_method: 'unknown'
        };
      }

      console.log('📦 Properties response:', data);

      return {
        success: data.success,
        properties: data.properties || [],
        total_found: data.total_found || 0,
        message: data.message || '',
        source: data.source || 'unknown',
        auth_method: data.auth_method || 'unknown'
      };
    } catch (error) {
      console.error('💥 Fetch properties error:', error);
      return {
        success: false,
        properties: [],
        total_found: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        source: 'error',
        auth_method: 'unknown'
      };
    }
  }

  /**
   * Check if we have a valid session
   */
  isAuthenticated(): boolean {
    // Check localStorage for session
    const storedSession = localStorage.getItem('dwv_session');
    if (storedSession) {
      try {
        this.sessionData = JSON.parse(storedSession);
        // Check if session is expired
        if (this.sessionData?.expires) {
          const expiryDate = new Date(this.sessionData.expires);
          if (expiryDate > new Date()) {
            return true;
          }
        }
      } catch (e) {
        console.error('Failed to parse stored session:', e);
      }
    }
    return false;
  }

  /**
   * Clear the session
   */
  logout(): void {
    this.sessionData = null;
    localStorage.removeItem('dwv_session');
  }

  /**
   * Get current session data
   */
  getSession(): AuthResult['session'] | null {
    return this.sessionData;
  }
}

export const dwvSupabaseAuthService = new DWVSupabaseAuthService();