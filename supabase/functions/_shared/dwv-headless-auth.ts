/**
 * Headless Browser Authentication for DWV App
 * Uses Puppeteer for real browser automation to handle JavaScript-driven authentication
 */

// Hybrid authentication approach - Puppeteer with HTTP fallback
// Import enhanced auth as fallback
import { createEnhancedAuth } from './dwv-enhanced-auth.ts';

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
  private sessionStore: Map<string, AuthSession> = new Map();

  constructor(credentials: DWVCredentials) {
    this.credentials = credentials;
  }

  /**
   * Main authentication method with hybrid approach (Puppeteer + HTTP fallback)
   */
  async authenticate(): Promise<AuthResult> {
    console.log('🤖 Starting hybrid authentication (Puppeteer with HTTP fallback)...');
    
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

      // Try Puppeteer first, fallback to HTTP if it fails
      try {
        console.log('🌐 Attempting Puppeteer authentication...');
        const puppeteerResult = await this.performPuppeteerLogin();
        
        if (puppeteerResult.success && puppeteerResult.session) {
          this.storeSession(puppeteerResult.session);
          console.log('✅ Puppeteer authentication successful');
          return puppeteerResult;
        }
      } catch (puppeteerError) {
        console.warn('⚠️ Puppeteer failed, falling back to HTTP authentication:', puppeteerError.message);
      }

      // Fallback to enhanced HTTP authentication
      console.log('🔄 Falling back to enhanced HTTP authentication...');
      const httpResult = await this.performHttpFallback();
      
      if (httpResult.success) {
        // Convert HTTP result to our session format
        const authSession: AuthSession = {
          cookies: httpResult.cookies || '',
          sessionId: this.generateSessionId(),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          isValid: true
        };
        
        this.storeSession(authSession);
        console.log('✅ HTTP fallback authentication successful');
        
        return {
          success: true,
          message: 'HTTP fallback authentication successful',
          session: authSession,
          debugInfo: {
            method: 'http_fallback',
            originalMethod: httpResult.method
          }
        };
      }
      
      throw new Error('Both Puppeteer and HTTP authentication methods failed');
      
    } catch (error) {
      console.error('❌ All authentication methods failed:', error);
      return {
        success: false,
        message: `Authentication failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * HTTP fallback authentication method
   */
  private async performHttpFallback(): Promise<any> {
    const enhancedAuth = createEnhancedAuth(this.credentials);
    return await enhancedAuth.authenticate();
  }

  /**
   * Perform authentication using Puppeteer browser automation
   */
  private async performPuppeteerLogin(): Promise<AuthResult> {
    console.log('🌐 Attempting Puppeteer browser launch...');
    
    // Try to dynamically import Puppeteer
    let puppeteer: any;
    try {
      puppeteer = await import('https://esm.sh/puppeteer-core@19.11.1');
    } catch (importError) {
      throw new Error(`Puppeteer import failed: ${importError.message}`);
    }
    
    let browser: any = null;
    let page: any = null;

    try {
      // Launch browser with settings optimized for Supabase Edge Functions (serverless)
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--memory-pressure-off',
          '--max_old_space_size=4096'
        ],
        // Optimize for serverless environment
        timeout: 30000,
        protocolTimeout: 30000
      });

      page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      console.log('📄 Navigating to login page...');
      
      // Navigate to login page
      await page.goto(`${this.baseUrl}/login`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      console.log('🔍 Waiting for login form elements...');
      
      // Wait for form elements to be present (React app needs time to load)
      await page.waitForSelector('input[name="username"], input[id="email"]', { timeout: 15000 });
      await page.waitForSelector('input[name="password"], input[id="password"]', { timeout: 15000 });
      await page.waitForSelector('button[type="submit"], button:contains("Entrar")', { timeout: 15000 });

      console.log('✍️ Filling login form...');
      
      // Fill in credentials - try different field selectors
      const emailFilled = await this.fillEmailField(page);
      const passwordFilled = await this.fillPasswordField(page);
      
      if (!emailFilled || !passwordFilled) {
        throw new Error('Could not fill login form fields');
      }

      console.log('🔑 Submitting login form...');
      
      // Submit form and wait for navigation
      const submitButton = await page.$('button[type="submit"]') ||
                           await page.$('button:contains("Entrar")') ||
                           await page.$('.css-4ujxrj'); // The specific button class we found
      
      if (!submitButton) {
        throw new Error('Could not find submit button');
      }

      // Click submit and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        submitButton.click()
      ]);

      console.log('📊 Analyzing authentication result...');
      
      // Check current URL to determine success
      const currentUrl = page.url();
      console.log('🔍 Current URL after login:', currentUrl);
      
      // Check for success indicators
      if (this.isSuccessfulUrl(currentUrl)) {
        console.log('✅ Login successful - extracting session...');
        
        // Extract cookies for session
        const cookies = await page.cookies();
        const cookieString = cookies
          .map(cookie => `${cookie.name}=${cookie.value}`)
          .join('; ');

        // Create session
        const authSession: AuthSession = {
          cookies: cookieString,
          sessionId: this.generateSessionId(),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          isValid: true
        };

        return {
          success: true,
          message: 'Puppeteer authentication successful',
          session: authSession,
          debugInfo: {
            finalUrl: currentUrl,
            cookieCount: cookies.length
          }
        };
      } else {
        // Check for error messages on the page
        const errorMessage = await this.extractErrorMessage(page);
        throw new Error(errorMessage || `Login failed - redirected to: ${currentUrl}`);
      }

    } finally {
      // Always cleanup browser resources - critical for serverless environment
      if (page) {
        try {
          await page.close();
          console.log('✅ Page closed successfully');
        } catch (e) {
          console.warn('⚠️ Warning: Could not close page:', e);
        }
      }
      
      if (browser) {
        try {
          await browser.close();
          console.log('✅ Browser closed successfully');
        } catch (e) {
          console.warn('⚠️ Warning: Could not close browser:', e);
        }
      }
      
      // Force garbage collection if available (helps in serverless)
      if (typeof globalThis.gc === 'function') {
        try {
          globalThis.gc();
        } catch (e) {
          // Ignore gc errors
        }
      }
    }
  }

  /**
   * Fill email field with multiple selector strategies
   */
  private async fillEmailField(page: any): Promise<boolean> {
    const selectors = [
      'input[name="username"]',
      'input[id="email"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="telefone" i]'
    ];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          await element.type(this.credentials.email, { delay: 100 });
          console.log(`✅ Email filled using selector: ${selector}`);
          return true;
        }
      } catch (error) {
        console.log(`❌ Failed to fill email with selector ${selector}:`, error.message);
      }
    }

    return false;
  }

  /**
   * Fill password field with multiple selector strategies
   */
  private async fillPasswordField(page: any): Promise<boolean> {
    const selectors = [
      'input[name="password"]',
      'input[id="password"]',
      'input[type="password"]',
      'input[placeholder*="senha" i]'
    ];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          await element.type(this.credentials.password, { delay: 100 });
          console.log(`✅ Password filled using selector: ${selector}`);
          return true;
        }
      } catch (error) {
        console.log(`❌ Failed to fill password with selector ${selector}:`, error.message);
      }
    }

    return false;
  }

  /**
   * Extract error message from page
   */
  private async extractErrorMessage(page: any): Promise<string | null> {
    try {
      const errorSelectors = [
        '.alert-error',
        '.error-message',
        '[class*="error"]',
        '[class*="alert"]'
      ];

      for (const selector of errorSelectors) {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      }
    } catch (error) {
      console.warn('Could not extract error message:', error);
    }

    return null;
  }

  /**
   * Check if URL indicates successful authentication
   */
  private isSuccessfulUrl(url: string): boolean {
    const successPatterns = ['/dashboard', '/home', '/imoveis', '/painel', '/app'];
    const failurePatterns = ['/login', '/signin', '/sign-in', '/auth', 'error'];
    
    const urlLower = url.toLowerCase();
    
    // Check for failure patterns first
    if (failurePatterns.some(pattern => urlLower.includes(pattern))) {
      return false;
    }
    
    // Check for success patterns
    return successPatterns.some(pattern => urlLower.includes(pattern));
  }

  /**
   * Helper methods for session management
   */

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


/**
 * Create headless authentication instance
 */
export function createHeadlessAuth(credentials: DWVCredentials): HeadlessDWVAuth {
  return new HeadlessDWVAuth(credentials);
}