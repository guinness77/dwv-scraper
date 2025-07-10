/**
 * Enhanced DWV Authentication System
 * Based on detailed site analysis of app.dwvapp.com.br
 */

export interface DWVCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  cookies?: string;
  sessionId?: string;
  method?: string;
  redirectLocation?: string;
  headers?: Record<string, string>;
}

export class EnhancedDWVAuth {
  private credentials: DWVCredentials;
  private baseUrl = 'https://app.dwvapp.com.br';
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  constructor(credentials: DWVCredentials) {
    this.credentials = credentials;
  }

  /**
   * Main authentication method with enhanced error handling
   */
  async authenticate(): Promise<AuthResult> {
    console.log('🔐 Starting enhanced DWV authentication...');
    
    try {
      // Step 1: Check if site is accessible
      await this.checkSiteAccessibility();
      
      // Step 2: Get login page and extract form data
      const loginPageData = await this.getLoginPageData();
      
      // Step 3: Attempt authentication
      const authResult = await this.performAuthentication(loginPageData);
      
      // Step 4: Validate session
      if (authResult.success && authResult.cookies) {
        const isValid = await this.validateSession(authResult.cookies);
        if (!isValid) {
          throw new Error('Authentication succeeded but session validation failed');
        }
      }
      
      return authResult;
      
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      return {
        success: false,
        message: `Authentication failed: ${error.message}`,
        method: 'enhanced_auth'
      };
    }
  }

  /**
   * Check if the DWV site is accessible
   */
  private async checkSiteAccessibility(): Promise<void> {
    console.log('🌐 Checking site accessibility...');
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.userAgent
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Site not accessible: ${response.status} ${response.statusText}`);
      }
      
      console.log('✅ Site is accessible');
    } catch (error) {
      throw new Error(`Cannot access DWV site: ${error.message}`);
    }
  }

  /**
   * Get login page and extract necessary form data
   */
  private async getLoginPageData(): Promise<{
    html: string;
    csrfToken: string;
    cookies: string;
    formAction: string;
  }> {
    console.log('📄 Getting login page data...');
    
    const response = await fetch(`${this.baseUrl}/login`, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get login page: ${response.status}`);
    }

    const html = await response.text();
    const cookies = this.extractCookies(response);
    
    // Extract CSRF token with multiple patterns
    const csrfToken = this.extractCSRFToken(html);
    if (!csrfToken) {
      console.warn('⚠️ No CSRF token found, proceeding without it');
    }
    
    // Extract form action
    const formAction = this.extractFormAction(html);
    
    console.log(`✅ Login page data extracted - CSRF: ${csrfToken ? 'Found' : 'Not found'}`);
    
    return {
      html,
      csrfToken: csrfToken || '',
      cookies,
      formAction
    };
  }

  /**
   * Perform the actual authentication
   */
  private async performAuthentication(loginData: {
    csrfToken: string;
    cookies: string;
    formAction: string;
  }): Promise<AuthResult> {
    console.log('🔑 Performing authentication...');
    
    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('email', this.credentials.email);
    formData.append('password', this.credentials.password);
    
    if (loginData.csrfToken) {
      formData.append('_token', loginData.csrfToken);
    }
    
    // Add common Laravel form fields
    formData.append('remember', '1');
    
    const loginUrl = loginData.formAction || `${this.baseUrl}/login`;
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': this.baseUrl,
        'Referer': `${this.baseUrl}/login`,
        'Cookie': loginData.cookies,
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
      },
      body: formData.toString(),
      redirect: 'manual'
    });

    const newCookies = this.extractCookies(response) || loginData.cookies;
    const location = response.headers.get('location') || '';
    
    console.log(`📊 Auth response: Status ${response.status}, Location: ${location}`);
    
    // Check for successful authentication
    if (response.status === 302) {
      if (this.isSuccessfulRedirect(location)) {
        return {
          success: true,
          message: 'Authentication successful with redirect',
          cookies: newCookies,
          redirectLocation: location,
          method: 'form_login'
        };
      } else if (location.includes('login')) {
        // Redirected back to login - likely failed
        const responseText = await response.text();
        const errorMessage = this.extractErrorMessage(responseText);
        throw new Error(errorMessage || 'Login failed - redirected back to login page');
      }
    }
    
    // Check response content for success indicators
    if (response.status === 200) {
      const responseText = await response.text();
      
      if (this.containsSuccessIndicators(responseText)) {
        return {
          success: true,
          message: 'Authentication successful (200 response)',
          cookies: newCookies,
          method: 'form_login'
        };
      } else if (this.containsErrorIndicators(responseText)) {
        const errorMessage = this.extractErrorMessage(responseText);
        throw new Error(errorMessage || 'Login failed - error indicators found');
      }
    }
    
    throw new Error(`Unexpected response: ${response.status} ${response.statusText}`);
  }

  /**
   * Validate that the session is working
   */
  private async validateSession(cookies: string): Promise<boolean> {
    console.log('✅ Validating session...');
    
    const testEndpoints = [
      '/dashboard',
      '/imoveis',
      '/api/user',
      '/profile'
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cookie': cookies,
            'Referer': `${this.baseUrl}/dashboard`
          },
          redirect: 'manual'
        });

        // If we get 200 or redirect to non-login page, session is valid
        if (response.ok) {
          console.log(`✅ Session validated via ${endpoint}`);
          return true;
        }
        
        if (response.status === 302) {
          const location = response.headers.get('location') || '';
          if (!location.includes('login')) {
            console.log(`✅ Session validated via redirect from ${endpoint}`);
            return true;
          }
        }
        
      } catch (error) {
        console.error(`Session validation failed for ${endpoint}:`, error);
      }
    }

    console.log('❌ Session validation failed');
    return false;
  }

  /**
   * Extract cookies from response headers
   */
  private extractCookies(response: Response): string {
    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) return '';

    // Parse multiple cookies
    const cookies = setCookieHeader
      .split(',')
      .map(cookie => {
        // Get just the name=value part (before first semicolon)
        const cookiePart = cookie.split(';')[0].trim();
        return cookiePart;
      })
      .filter(cookie => cookie.length > 0)
      .join('; ');

    return cookies;
  }

  /**
   * Extract CSRF token from HTML
   */
  private extractCSRFToken(html: string): string | null {
    const patterns = [
      /name="_token"\s+value="([^"]+)"/i,
      /name="csrf_token"\s+value="([^"]+)"/i,
      /name="csrf"\s+value="([^"]+)"/i,
      /<meta\s+name="csrf-token"\s+content="([^"]+)"/i,
      /"_token"\s*:\s*"([^"]+)"/i,
      /window\.Laravel\s*=\s*{[^}]*"csrfToken"\s*:\s*"([^"]+)"/i
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
   * Extract form action URL
   */
  private extractFormAction(html: string): string {
    const actionMatch = html.match(/<form[^>]*action="([^"]+)"[^>]*>/i);
    if (actionMatch) {
      const action = actionMatch[1];
      if (action.startsWith('/')) {
        return `${this.baseUrl}${action}`;
      }
      if (action.startsWith('http')) {
        return action;
      }
    }
    return `${this.baseUrl}/login`;
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
      '/painel',
      '/app',
      '/'
    ];

    const failurePatterns = [
      '/login',
      '/signin',
      '/auth',
      'error',
      'erro'
    ];

    const locationLower = location.toLowerCase();
    
    // Check for failure patterns first
    if (failurePatterns.some(pattern => locationLower.includes(pattern))) {
      return false;
    }

    // Check for success patterns
    return successPatterns.some(pattern => locationLower.includes(pattern));
  }

  /**
   * Check if response contains success indicators
   */
  private containsSuccessIndicators(html: string): boolean {
    const successIndicators = [
      'dashboard',
      'logout',
      'sair',
      'bem-vindo',
      'welcome',
      'perfil',
      'profile',
      'minha conta',
      'my account'
    ];

    const htmlLower = html.toLowerCase();
    return successIndicators.some(indicator => htmlLower.includes(indicator));
  }

  /**
   * Check if response contains error indicators
   */
  private containsErrorIndicators(html: string): boolean {
    const errorIndicators = [
      'credenciais inválidas',
      'invalid credentials',
      'senha incorreta',
      'incorrect password',
      'email não encontrado',
      'email not found',
      'login failed',
      'falha no login',
      'erro de autenticação',
      'authentication error'
    ];

    const htmlLower = html.toLowerCase();
    return errorIndicators.some(indicator => htmlLower.includes(indicator));
  }

  /**
   * Extract error message from response
   */
  private extractErrorMessage(html: string): string | null {
    const errorPatterns = [
      /<div[^>]*class="[^"]*alert[^"]*error[^"]*"[^>]*>([^<]+)</i,
      /<div[^>]*class="[^"]*error[^"]*"[^>]*>([^<]+)</i,
      /<span[^>]*class="[^"]*error[^"]*"[^>]*>([^<]+)</i,
      /<p[^>]*class="[^"]*error[^"]*"[^>]*>([^<]+)</i
    ];

    for (const pattern of errorPatterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }
}

/**
 * Create enhanced authentication manager
 */
export function createEnhancedAuth(credentials: DWVCredentials): EnhancedDWVAuth {
  return new EnhancedDWVAuth(credentials);
}