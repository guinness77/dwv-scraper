/**
 * Enhanced DWV Authentication Manager
 * Handles multiple authentication strategies and session management
 */

// In-memory session storage
const sessionStore: Map<string, { cookies: string; expires: Date; isValid: boolean }> = new Map();

export interface AuthResult {
  success: boolean;
  message: string;
  cookies?: string;
  headers?: Record<string, string>;
  redirectLocation?: string;
  method?: string;
  sessionId?: string;
}

export interface DWVCredentials {
  email: string;
  password: string;
}

/**
 * Enhanced authentication manager with multiple strategies
 */
export class DWVAuthManager {
  private credentials: DWVCredentials;
  private sessionKey: string;

  constructor(credentials: DWVCredentials) {
    this.credentials = credentials;
    this.sessionKey = `dwv_session_${credentials.email}`;
  }

  /**
   * Main authentication method with fallback strategies
   */
  async authenticate(): Promise<AuthResult> {
    console.log('🔐 Starting DWV authentication process...');

    // Strategy 1: Check existing valid session
    const existingSession = await this.getValidSession();
    if (existingSession) {
      console.log('✅ Using existing valid session');
      return {
        success: true,
        message: 'Using existing valid session',
        cookies: existingSession.cookies,
        method: 'existing_session',
        sessionId: this.sessionKey
      };
    }

    // Strategy 2: Form-based login
    console.log('🔄 Attempting form-based login...');
    const formResult = await this.attemptFormLogin();
    if (formResult.success) {
      await this.storeSession(formResult.cookies!);
      return { ...formResult, method: 'form_login' };
    }

    // Strategy 3: API-based login
    console.log('🔄 Attempting API-based login...');
    const apiResult = await this.attemptApiLogin();
    if (apiResult.success) {
      await this.storeSession(apiResult.cookies!);
      return { ...apiResult, method: 'api_login' };
    }

    // Strategy 4: Alternative endpoints
    console.log('🔄 Attempting alternative endpoints...');
    const altResult = await this.attemptAlternativeLogin();
    if (altResult.success) {
      await this.storeSession(altResult.cookies!);
      return { ...altResult, method: 'alternative_login' };
    }

    console.log('❌ All authentication strategies failed');
    return {
      success: false,
      message: 'All authentication strategies failed. Please check credentials and DWV App status.',
      method: 'all_failed'
    };
  }

  /**
   * Form-based login strategy
   */
  private async attemptFormLogin(): Promise<AuthResult> {
    try {
      // Step 1: Get login page
      const loginPageResponse = await fetch('https://app.dwvapp.com.br/login', {
        headers: this.getStandardHeaders(),
        redirect: 'follow'
      });

      if (!loginPageResponse.ok) {
        throw new Error(`Login page access failed: ${loginPageResponse.status}`);
      }

      const loginPageHtml = await loginPageResponse.text();
      const initialCookies = this.extractCookies(loginPageResponse);

      // Step 2: Extract form data
      const formData = this.extractFormData(loginPageHtml);
      console.log('📝 Form data extracted:', Object.keys(formData));

      // Step 3: Submit login form
      const loginData = new URLSearchParams();
      loginData.append('email', this.credentials.email);
      loginData.append('password', this.credentials.password);

      // Add extracted form fields
      Object.entries(formData).forEach(([key, value]) => {
        loginData.append(key, value);
      });

      const loginResponse = await fetch('https://app.dwvapp.com.br/login', {
        method: 'POST',
        headers: {
          ...this.getStandardHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://app.dwvapp.com.br',
          'Referer': 'https://app.dwvapp.com.br/login',
          'Cookie': initialCookies,
        },
        body: loginData.toString(),
        redirect: 'manual'
      });

      const newCookies = this.extractCookies(loginResponse);
      const location = loginResponse.headers.get('location') || '';

      // Check for successful redirect
      if (loginResponse.status === 302 && this.isSuccessfulRedirect(location)) {
        const finalCookies = newCookies || initialCookies;
        
        // Validate session
        const isValid = await this.validateSession(finalCookies);
        if (isValid) {
          return {
            success: true,
            message: 'Form login successful with redirect',
            cookies: finalCookies,
            redirectLocation: location
          };
        }
      }

      throw new Error(`Form login failed: Status ${loginResponse.status}, Location: ${location}`);

    } catch (error) {
      console.error('Form login error:', error);
      return {
        success: false,
        message: `Form login failed: ${error.message}`
      };
    }
  }

  /**
   * API-based login strategy
   */
  private async attemptApiLogin(): Promise<AuthResult> {
    const apiEndpoints = [
      'https://app.dwvapp.com.br/api/auth/login',
      'https://app.dwvapp.com.br/api/login',
      'https://app.dwvapp.com.br/auth/login',
      'https://app.dwvapp.com.br/api/v1/auth/login'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🔗 Trying API endpoint: ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            ...this.getStandardHeaders(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': 'https://app.dwvapp.com.br',
            'Referer': 'https://app.dwvapp.com.br/login',
          },
          body: JSON.stringify({
            email: this.credentials.email,
            password: this.credentials.password,
            remember: true
          })
        });

        if (response.ok) {
          const cookies = this.extractCookies(response);
          const responseData = await response.text();
          
          let jsonData = null;
          try {
            jsonData = JSON.parse(responseData);
          } catch (e) {
            // Response might not be JSON
          }

          if (cookies && await this.validateSession(cookies)) {
            return {
              success: true,
              message: `API login successful via ${endpoint}`,
              cookies
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
   * Alternative login methods
   */
  private async attemptAlternativeLogin(): Promise<AuthResult> {
    // Try different login paths
    const alternativePaths = [
      'https://app.dwvapp.com.br/signin',
      'https://app.dwvapp.com.br/auth',
      'https://app.dwvapp.com.br/user/login'
    ];

    for (const path of alternativePaths) {
      try {
        console.log(`🔗 Trying alternative path: ${path}`);
        
        const response = await fetch(path, {
          method: 'POST',
          headers: {
            ...this.getStandardHeaders(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            email: this.credentials.email,
            password: this.credentials.password
          }).toString(),
          redirect: 'manual'
        });

        if (response.status === 302) {
          const cookies = this.extractCookies(response);
          const location = response.headers.get('location') || '';
          
          if (cookies && this.isSuccessfulRedirect(location)) {
            const isValid = await this.validateSession(cookies);
            if (isValid) {
              return {
                success: true,
                message: `Alternative login successful via ${path}`,
                cookies,
                redirectLocation: location
              };
            }
          }
        }

      } catch (error) {
        console.error(`Alternative path ${path} failed:`, error);
      }
    }

    return {
      success: false,
      message: 'All alternative paths failed'
    };
  }

  /**
   * Validate if session is still active
   */
  async validateSession(cookies: string): Promise<boolean> {
    if (!cookies) return false;

    try {
      // Test protected endpoints
      const testEndpoints = [
        'https://app.dwvapp.com.br/dashboard',
        'https://app.dwvapp.com.br/api/user',
        'https://app.dwvapp.com.br/profile',
        'https://app.dwvapp.com.br/imoveis'
      ];

      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              ...this.getStandardHeaders(),
              'Cookie': cookies
            },
            redirect: 'manual'
          });

          // If we get a 200 or are redirected to a non-login page, session is valid
          if (response.ok || (response.status === 302 && !response.headers.get('location')?.includes('login'))) {
            console.log(`✅ Session validated via ${endpoint}`);
            return true;
          }
        } catch (error) {
          console.error(`Session validation failed for ${endpoint}:`, error);
        }
      }

      return false;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Extract form data from HTML
   */
  private extractFormData(html: string): Record<string, string> {
    const formData: Record<string, string> = {};

    // Extract CSRF tokens with multiple patterns
    const csrfPatterns = [
      /name="csrf_token"[^>]*value="([^"]+)"/i,
      /name="_token"[^>]*value="([^"]+)"/i,
      /name="csrf"[^>]*value="([^"]+)"/i,
      /meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i,
      /"csrf_token":"([^"]+)"/i,
      /_token['"]\s*:\s*['"]([^'"]+)['"]/i
    ];

    for (const pattern of csrfPatterns) {
      const match = html.match(pattern);
      if (match) {
        formData.csrf_token = match[1];
        formData._token = match[1];
        formData.csrf = match[1];
        console.log('🔑 CSRF token found');
        break;
      }
    }

    // Extract other hidden fields
    const hiddenFieldPattern = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]+)"/gi;
    let match;
    while ((match = hiddenFieldPattern.exec(html)) !== null) {
      const [, name, value] = match;
      if (!formData[name]) {
        formData[name] = value;
        console.log(`📝 Hidden field found: ${name}`);
      }
    }

    return formData;
  }

  /**
   * Extract cookies from response
   */
  private extractCookies(response: Response): string {
    const setCookieHeaders = response.headers.get('set-cookie');
    if (!setCookieHeaders) return '';

    // Parse and combine cookies
    const cookies = setCookieHeaders
      .split(',')
      .map(cookie => cookie.split(';')[0].trim())
      .filter(cookie => cookie.length > 0)
      .join('; ');

    return cookies;
  }

  /**
   * Check if redirect indicates successful login
   */
  private isSuccessfulRedirect(location: string): boolean {
    if (!location) return false;
    
    const successPatterns = [
      '/dashboard',
      '/home',
      '/imoveis',
      '/profile',
      '/app',
      '/'
    ];

    const failurePatterns = [
      '/login',
      '/signin',
      '/auth',
      'error',
      'fail'
    ];

    // Check for failure patterns first
    if (failurePatterns.some(pattern => location.toLowerCase().includes(pattern))) {
      return false;
    }

    // Check for success patterns
    return successPatterns.some(pattern => location.includes(pattern));
  }

  /**
   * Get standard headers for requests
   */
  private getStandardHeaders(): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Cache-Control': 'max-age=0'
    };
  }

  /**
   * Store session in memory
   */
  private async storeSession(cookies: string): Promise<void> {
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // 24 hour expiry

    sessionStore.set(this.sessionKey, {
      cookies,
      expires,
      isValid: true
    });

    console.log(`💾 Session stored for ${this.credentials.email}`);
  }

  /**
   * Get valid session from storage
   */
  private async getValidSession(): Promise<{ cookies: string } | null> {
    const session = sessionStore.get(this.sessionKey);
    
    if (!session) return null;
    
    // Check if expired
    if (session.expires < new Date()) {
      sessionStore.delete(this.sessionKey);
      return null;
    }

    // Validate session is still active
    const isValid = await this.validateSession(session.cookies);
    if (!isValid) {
      sessionStore.delete(this.sessionKey);
      return null;
    }

    return { cookies: session.cookies };
  }

  /**
   * Clear stored session
   */
  async clearSession(): Promise<void> {
    sessionStore.delete(this.sessionKey);
    console.log(`🗑️ Session cleared for ${this.credentials.email}`);
  }
}

/**
 * Create authentication manager instance
 */
export function createAuthManager(credentials: DWVCredentials): DWVAuthManager {
  return new DWVAuthManager(credentials);
}