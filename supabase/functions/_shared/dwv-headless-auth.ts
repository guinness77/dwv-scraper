/**
 * Headless Browser Authentication for DWV App
 * Uses browser automation techniques within Deno Edge Functions
 */

export interface DWVCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  cookies: string;
  sessionId: string;
  expires: Date;
  isValid: boolean;
}

export interface AuthResult {
  success: boolean;
  message: string;
  session?: AuthSession;
  error?: string;
  debugInfo?: any;
}

export class HeadlessDWVAuth {
  private credentials: DWVCredentials;
  private baseUrl = 'https://app.dwvapp.com.br';
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private sessionStore: Map<string, AuthSession> = new Map();

  constructor(credentials: DWVCredentials) {
    this.credentials = credentials;
  }

  /**
   * Main authentication method with browser simulation
   */
  async authenticate(): Promise<AuthResult> {
    console.log('🤖 Starting headless browser authentication...');
    
    try {
      // Check for existing valid session
      const existingSession = this.getValidSession();
      if (existingSession) {
        console.log('✅ Using existing valid session');
        return {
          success: true,
          message: 'Using cached session',
          session: existingSession
        };
      }

      // Step 1: Initialize browser session
      const browserSession = await this.initializeBrowserSession();
      
      // Step 2: Navigate to login page
      const loginPageData = await this.navigateToLogin(browserSession);
      
      // Step 3: Perform authentication
      const authResult = await this.performBrowserLogin(browserSession, loginPageData);
      
      // Step 4: Validate and store session
      if (authResult.success && authResult.session) {
        this.storeSession(authResult.session);
        console.log('✅ Authentication successful, session stored');
      }
      
      return authResult;
      
    } catch (error) {
      console.error('❌ Headless authentication failed:', error);
      return {
        success: false,
        message: `Authentication failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Initialize browser session with proper headers and state
   */
  private async initializeBrowserSession(): Promise<BrowserSession> {
    console.log('🌐 Initializing browser session...');
    
    const session: BrowserSession = {
      cookies: new Map(),
      headers: new Map([
        ['User-Agent', this.userAgent],
        ['Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'],
        ['Accept-Language', 'pt-BR,pt;q=0.9,en;q=0.8'],
        ['Accept-Encoding', 'gzip, deflate, br'],
        ['Connection', 'keep-alive'],
        ['Upgrade-Insecure-Requests', '1'],
        ['Sec-Fetch-Dest', 'document'],
        ['Sec-Fetch-Mode', 'navigate'],
        ['Sec-Fetch-Site', 'none'],
        ['Cache-Control', 'max-age=0']
      ]),
      sessionId: this.generateSessionId(),
      lastActivity: new Date()
    };

    // Simulate browser initialization by visiting the main page first
    await this.simulatePageVisit(session, this.baseUrl);
    
    console.log('✅ Browser session initialized');
    return session;
  }

  /**
   * Navigate to login page and extract necessary data
   */
  private async navigateToLogin(session: BrowserSession): Promise<LoginPageData> {
    console.log('📄 Navigating to login page...');
    
    const loginUrl = `${this.baseUrl}/login`;
    
    // Update headers for login page navigation
    session.headers.set('Referer', this.baseUrl);
    session.headers.set('Sec-Fetch-Site', 'same-origin');
    
    const response = await fetch(loginUrl, {
      method: 'GET',
      headers: Object.fromEntries(session.headers),
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Failed to access login page: ${response.status} ${response.statusText}`);
    }

    // Update session cookies
    this.updateSessionCookies(session, response);
    
    const html = await response.text();
    
    // Extract login form data
    const formData = this.extractLoginFormData(html);
    
    console.log('✅ Login page loaded, form data extracted');
    
    return {
      html,
      formData,
      url: loginUrl
    };
  }

  /**
   * Perform browser-like login with form submission
   */
  private async performBrowserLogin(
    session: BrowserSession, 
    loginData: LoginPageData
  ): Promise<AuthResult> {
    console.log('🔑 Performing browser login...');
    
    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('email', this.credentials.email);
    formData.append('password', this.credentials.password);
    
    // Add extracted form fields (CSRF tokens, etc.)
    Object.entries(loginData.formData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Add common form fields
    formData.append('remember', '1');
    
    // Update headers for form submission
    session.headers.set('Content-Type', 'application/x-www-form-urlencoded');
    session.headers.set('Origin', this.baseUrl);
    session.headers.set('Referer', loginData.url);
    session.headers.set('Sec-Fetch-Dest', 'document');
    session.headers.set('Sec-Fetch-Mode', 'navigate');
    session.headers.set('Sec-Fetch-Site', 'same-origin');
    
    // Add current cookies to request
    const cookieHeader = this.buildCookieHeader(session);
    if (cookieHeader) {
      session.headers.set('Cookie', cookieHeader);
    }
    
    const response = await fetch(loginData.url, {
      method: 'POST',
      headers: Object.fromEntries(session.headers),
      body: formData.toString(),
      redirect: 'manual'
    });

    // Update session cookies
    this.updateSessionCookies(session, response);
    
    const location = response.headers.get('location') || '';
    
    console.log(`📊 Login response: Status ${response.status}, Location: ${location}`);
    
    // Analyze response
    if (response.status === 302) {
      if (this.isSuccessfulRedirect(location)) {
        // Follow redirect to complete login
        const finalSession = await this.followRedirect(session, location);
        
        // Validate session
        const isValid = await this.validateSession(finalSession);
        
        if (isValid) {
          const authSession: AuthSession = {
            cookies: this.buildCookieHeader(finalSession),
            sessionId: finalSession.sessionId,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isValid: true
          };
          
          return {
            success: true,
            message: 'Browser login successful',
            session: authSession
          };
        } else {
          throw new Error('Login appeared successful but session validation failed');
        }
      } else {
        throw new Error(`Login failed - redirected to: ${location}`);
      }
    } else if (response.status === 200) {
      // Check response content
      const responseText = await response.text();
      
      if (this.containsSuccessIndicators(responseText)) {
        const authSession: AuthSession = {
          cookies: this.buildCookieHeader(session),
          sessionId: session.sessionId,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isValid: true
        };
        
        return {
          success: true,
          message: 'Browser login successful (200 response)',
          session: authSession
        };
      } else {
        const errorMessage = this.extractErrorMessage(responseText);
        throw new Error(errorMessage || 'Login failed - no success indicators found');
      }
    } else {
      throw new Error(`Unexpected login response: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Follow redirect after successful login
   */
  private async followRedirect(session: BrowserSession, location: string): Promise<BrowserSession> {
    console.log(`🔄 Following redirect to: ${location}`);
    
    const redirectUrl = location.startsWith('/') ? `${this.baseUrl}${location}` : location;
    
    // Update headers for redirect
    session.headers.set('Referer', `${this.baseUrl}/login`);
    session.headers.delete('Content-Type');
    
    const cookieHeader = this.buildCookieHeader(session);
    if (cookieHeader) {
      session.headers.set('Cookie', cookieHeader);
    }
    
    const response = await fetch(redirectUrl, {
      method: 'GET',
      headers: Object.fromEntries(session.headers),
      redirect: 'follow'
    });
    
    // Update session cookies
    this.updateSessionCookies(session, response);
    
    return session;
  }

  /**
   * Validate session by testing protected endpoints
   */
  private async validateSession(session: BrowserSession): Promise<boolean> {
    console.log('✅ Validating session...');
    
    const testEndpoints = [
      '/dashboard',
      '/imoveis',
      '/api/user',
      '/profile'
    ];

    for (const endpoint of testEndpoints) {
      try {
        const testUrl = `${this.baseUrl}${endpoint}`;
        const cookieHeader = this.buildCookieHeader(session);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cookie': cookieHeader || '',
            'Referer': `${this.baseUrl}/dashboard`
          },
          redirect: 'manual'
        });

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
   * Helper methods
   */
  private simulatePageVisit(session: BrowserSession, url: string): Promise<void> {
    // Simulate browser behavior by adding a small delay
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  private updateSessionCookies(session: BrowserSession, response: Response): void {
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      const cookies = setCookieHeader.split(',');
      cookies.forEach(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        if (name && value) {
          session.cookies.set(name.trim(), value.trim());
        }
      });
    }
  }

  private buildCookieHeader(session: BrowserSession): string {
    const cookies: string[] = [];
    session.cookies.forEach((value, name) => {
      cookies.push(`${name}=${value}`);
    });
    return cookies.join('; ');
  }

  private extractLoginFormData(html: string): Record<string, string> {
    const formData: Record<string, string> = {};

    // Extract CSRF tokens
    const csrfPatterns = [
      /name="_token"\s+value="([^"]+)"/i,
      /name="csrf_token"\s+value="([^"]+)"/i,
      /<meta\s+name="csrf-token"\s+content="([^"]+)"/i
    ];

    for (const pattern of csrfPatterns) {
      const match = html.match(pattern);
      if (match) {
        formData._token = match[1];
        formData.csrf_token = match[1];
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
      }
    }

    return formData;
  }

  private isSuccessfulRedirect(location: string): boolean {
    if (!location) return false;
    
    const successPatterns = ['/dashboard', '/home', '/imoveis', '/painel', '/app'];
    const failurePatterns = ['/login', '/signin', '/auth', 'error'];
    
    const locationLower = location.toLowerCase();
    
    if (failurePatterns.some(pattern => locationLower.includes(pattern))) {
      return false;
    }
    
    return successPatterns.some(pattern => locationLower.includes(pattern));
  }

  private containsSuccessIndicators(html: string): boolean {
    const indicators = ['dashboard', 'logout', 'sair', 'bem-vindo', 'perfil'];
    const htmlLower = html.toLowerCase();
    return indicators.some(indicator => htmlLower.includes(indicator));
  }

  private extractErrorMessage(html: string): string | null {
    const errorPatterns = [
      /<div[^>]*class="[^"]*alert[^"]*error[^"]*"[^>]*>([^<]+)</i,
      /<div[^>]*class="[^"]*error[^"]*"[^>]*>([^<]+)</i
    ];

    for (const pattern of errorPatterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  private generateSessionId(): string {
    return `dwv_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getValidSession(): AuthSession | null {
    const sessionKey = `dwv_${this.credentials.email}`;
    const session = this.sessionStore.get(sessionKey);
    
    if (!session) return null;
    
    if (session.expires < new Date()) {
      this.sessionStore.delete(sessionKey);
      return null;
    }
    
    return session;
  }

  private storeSession(session: AuthSession): void {
    const sessionKey = `dwv_${this.credentials.email}`;
    this.sessionStore.set(sessionKey, session);
  }
}

// Supporting interfaces
interface BrowserSession {
  cookies: Map<string, string>;
  headers: Map<string, string>;
  sessionId: string;
  lastActivity: Date;
}

interface LoginPageData {
  html: string;
  formData: Record<string, string>;
  url: string;
}

/**
 * Create headless authentication instance
 */
export function createHeadlessAuth(credentials: DWVCredentials): HeadlessDWVAuth {
  return new HeadlessDWVAuth(credentials);
}