/**
 * Direct DWV Website Authentication Service
 * Handles authentication directly with app.dwvapp.com.br
 */

export interface DWVAuthResult {
  success: boolean;
  message: string;
  cookies?: string;
  redirectLocation?: string;
  userData?: any;
}

export interface DWVCredentials {
  email: string;
  password: string;
}

export class DWVDirectAuthService {
  private baseUrl = 'https://app.dwvapp.com.br';
  private credentials: DWVCredentials;

  constructor() {
    this.credentials = { email: '', password: '' };
  }

  /**
   * Main authentication method
   */
  async authenticate(email: string, password: string): Promise<DWVAuthResult> {
    console.log('🔐 Starting DWV direct authentication...');
    this.credentials = { email, password };

    try {
      // Try form-based login first
      const formResult = await this.attemptFormLogin();
      if (formResult.success) {
        console.log('✅ Form login successful');
        return formResult;
      }

      // Try API-based login
      const apiResult = await this.attemptApiLogin();
      if (apiResult.success) {
        console.log('✅ API login successful');
        return apiResult;
      }

      return {
        success: false,
        message: 'All authentication methods failed. Please check your credentials.'
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown authentication error'
      };
    }
  }

  /**
   * Form-based login
   */
  private async attemptFormLogin(): Promise<DWVAuthResult> {
    try {
      console.log('📝 Attempting form-based login...');
      
      // Step 1: Get login page to extract CSRF token
      const loginPageResponse = await fetch(`${this.baseUrl}/login`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include'
      });

      if (!loginPageResponse.ok) {
        throw new Error(`Failed to access login page: ${loginPageResponse.status}`);
      }

      const loginPageHtml = await loginPageResponse.text();
      const csrfToken = this.extractCsrfToken(loginPageHtml);
      console.log('🔑 CSRF token extracted:', !!csrfToken);

      // Step 2: Submit login form
      const formData = new FormData();
      formData.append('email', this.credentials.email);
      formData.append('password', this.credentials.password);
      if (csrfToken) {
        formData.append('_token', csrfToken);
        formData.append('csrf_token', csrfToken);
      }

      const loginResponse = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Origin': this.baseUrl,
          'Referer': `${this.baseUrl}/login`,
        },
        body: formData,
        credentials: 'include',
        redirect: 'manual'
      });

      console.log('📬 Login response status:', loginResponse.status);
      console.log('📍 Redirect location:', loginResponse.headers.get('location'));

      // Check for successful redirect
      if (loginResponse.status === 302 || loginResponse.status === 303) {
        const location = loginResponse.headers.get('location') || '';
        if (!location.includes('login') && !location.includes('error')) {
          return {
            success: true,
            message: 'Login successful',
            redirectLocation: location
          };
        }
      }

      // Check if we got a 200 with success indication
      if (loginResponse.ok) {
        const responseText = await loginResponse.text();
        if (!responseText.includes('error') && !responseText.includes('invalid')) {
          return {
            success: true,
            message: 'Login successful'
          };
        }
      }

      throw new Error('Form login failed');
    } catch (error) {
      console.error('Form login error:', error);
      return {
        success: false,
        message: `Form login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * API-based login
   */
  private async attemptApiLogin(): Promise<DWVAuthResult> {
    const apiEndpoints = [
      '/api/auth/login',
      '/api/login',
      '/auth/login',
      '/api/v1/auth/login'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🔗 Trying API endpoint: ${this.baseUrl}${endpoint}`);

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': this.baseUrl,
            'Referer': `${this.baseUrl}/login`
          },
          body: JSON.stringify({
            email: this.credentials.email,
            password: this.credentials.password,
            remember: true
          }),
          credentials: 'include'
        });

        console.log(`📬 API response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('📦 API response data:', data);
          
          if (data.success || data.token || data.user) {
            return {
              success: true,
              message: `API login successful via ${endpoint}`,
              userData: data.user || data
            };
          }
        }
      } catch (error) {
        console.error(`API endpoint ${endpoint} failed:`, error);
      }
    }

    return {
      success: false,
      message: 'All API endpoints failed'
    };
  }

  /**
   * Extract CSRF token from HTML
   */
  private extractCsrfToken(html: string): string | null {
    const patterns = [
      /name="csrf_token"[^>]*value="([^"]+)"/i,
      /name="_token"[^>]*value="([^"]+)"/i,
      /name="csrf"[^>]*value="([^"]+)"/i,
      /meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i,
      /"csrf_token":"([^"]+)"/i,
      /_token['"]\s*:\s*['"]([^'"]+)['"]/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get standard headers
   */
  private getHeaders(): HeadersInit {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  /**
   * Test if we're authenticated by checking a protected endpoint
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const testEndpoints = ['/dashboard', '/imoveis', '/profile', '/api/user'];
      
      for (const endpoint of testEndpoints) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'GET',
          headers: this.getHeaders(),
          credentials: 'include',
          redirect: 'manual'
        });

        console.log(`🧪 Testing ${endpoint}: ${response.status}`);

        if (response.ok || (response.status === 302 && !response.headers.get('location')?.includes('login'))) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Authentication test error:', error);
      return false;
    }
  }
}

export const dwvDirectAuthService = new DWVDirectAuthService();