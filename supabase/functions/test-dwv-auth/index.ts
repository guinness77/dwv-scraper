// @deno-types="https://deno.land/x/servest@v1.3.1/types/react/index.d.ts"
import { corsHeaders } from '../_shared/cors.ts';
import { getToken, setToken, validateSession, logAuthEvent } from '../_shared/token-manager.ts';

// Get credentials from environment variables
const DWV_CREDENTIALS = {
  email: Deno.env.get('DWV_EMAIL') || 'fer.scarduelli@gmail.com', // Fallback for development
  password: Deno.env.get('DWV_PASSWORD') || 'dwv@junttus' // Fallback for development
};

// Token expiry in seconds (default: 24 hours)
const TOKEN_EXPIRY = parseInt(Deno.env.get('AUTH_TOKEN_EXPIRY') || '86400');

// Auth token key
const AUTH_TOKEN_KEY = 'dwv_auth_token';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Testando autenticação no DWV App...');
    
    const authResult = await testDWVAuthentication();
    
    return new Response(
      JSON.stringify({ 
        success: authResult.success,
        message: authResult.message,
        cookies: authResult.cookies ? 'Cookie recebido (não exibido por segurança)' : null,
        headers: authResult.headers || null,
        redirectLocation: authResult.redirectLocation || null,
        tokenExpiry: authResult.tokenExpiry || null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao testar autenticação:', error);
    logAuthEvent({
      type: 'failure',
      method: 'form',
      error: error.message
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function testDWVAuthentication(): Promise<{
  success: boolean;
  message: string;
  cookies?: string;
  headers?: Record<string, string>;
  redirectLocation?: string;
  tokenExpiry?: string;
}> {
  try {
    // Check for existing valid token
    const existingToken = await getToken(AUTH_TOKEN_KEY);
    if (existingToken) {
      console.log('Token existente encontrado, validando sessão...');
      const isValid = await validateSession(existingToken);
      
      if (isValid) {
        logAuthEvent({
          type: 'success',
          method: 'token'
        });
        
        return {
          success: true,
          message: 'Usando sessão existente válida',
          cookies: existingToken,
          tokenExpiry: new Date(Date.now() + TOKEN_EXPIRY * 1000).toISOString()
        };
      } else {
        console.log('Token existente inválido, tentando novo login...');
        logAuthEvent({
          type: 'failure',
          method: 'token',
          error: 'Token inválido ou expirado'
        });
      }
    }
    
    // First, get the login page to extract any CSRF tokens or form data
    console.log('Acessando página de login...');
    logAuthEvent({
      type: 'attempt',
      method: 'form'
    });
    
    const loginPageResponse = await fetch('https://app.dwvapp.com.br/login', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      }
    });
    
    if (!loginPageResponse.ok) {
      logAuthEvent({
        type: 'failure',
        method: 'form',
        error: `Falha ao acessar página de login: ${loginPageResponse.status}`,
        responseCode: loginPageResponse.status
      });
      
      return {
        success: false,
        message: `Falha ao acessar página de login: ${loginPageResponse.status} ${loginPageResponse.statusText}`
      };
    }
    
    const loginPageHtml = await loginPageResponse.text();
    console.log('Página de login acessada com sucesso');
    
    // Extract CSRF token if present - improved regex patterns
    const csrfMatch = loginPageHtml.match(/name="csrf_token"[^>]*value="([^"]+)"/i) ||
                     loginPageHtml.match(/name="_token"[^>]*value="([^"]+)"/i) ||
                     loginPageHtml.match(/"csrf_token":"([^"]+)"/i) ||
                     loginPageHtml.match(/name="csrf"[^>]*value="([^"]+)"/i) ||
                     loginPageHtml.match(/meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/i);
    
    const csrfToken = csrfMatch ? csrfMatch[1] : null;
    console.log('CSRF Token encontrado:', csrfToken || 'Nenhum');
    
    // Get cookies from login page
    const setCookieHeaders = loginPageResponse.headers.get('set-cookie') || '';
    console.log('Cookies recebidos da página de login:', setCookieHeaders ? 'Sim' : 'Não');
    
    // Check if login form exists
    const hasLoginForm = loginPageHtml.includes('form') && 
                        (loginPageHtml.includes('login') || loginPageHtml.includes('signin')) &&
                        (loginPageHtml.includes('password') || loginPageHtml.includes('senha'));
    
    console.log('Formulário de login encontrado:', hasLoginForm ? 'Sim' : 'Não');
    
    // Prepare login data
    const loginData = new URLSearchParams();
    loginData.append('email', DWV_CREDENTIALS.email);
    loginData.append('password', DWV_CREDENTIALS.password);
    
    // Add all possible CSRF token field names
    if (csrfToken) {
      loginData.append('csrf_token', csrfToken);
      loginData.append('_token', csrfToken);
      loginData.append('csrf', csrfToken);
    }
    
    // Attempt login with form
    console.log('Tentando login com formulário...');
    const loginResponse = await fetch('https://app.dwvapp.com.br/login', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://app.dwvapp.com.br',
        'Referer': 'https://app.dwvapp.com.br/login',
        'Cookie': setCookieHeaders,
      },
      body: loginData.toString(),
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    // Check if login was successful
    const responseHeaders = loginResponse.headers;
    const newCookies = responseHeaders.get('set-cookie') || '';
    const location = responseHeaders.get('location') || '';
    
    console.log('Status da resposta de login:', loginResponse.status);
    console.log('Location header:', location);
    console.log('Novos cookies recebidos:', newCookies ? 'Sim' : 'Não');
    
    // Collect all response headers for debugging
    const headersObj: Record<string, string> = {};
    responseHeaders.forEach((value, key) => {
      headersObj[key] = value;
    });
    
    // Successful login usually redirects to dashboard or home
    if (loginResponse.status === 302 && (location.includes('dashboard') || location.includes('home') || location === '/')) {
      const cookies = newCookies || setCookieHeaders;
      
      // Store the token for future use
      await setToken(AUTH_TOKEN_KEY, cookies, TOKEN_EXPIRY);
      
      logAuthEvent({
        type: 'success',
        method: 'form',
        responseCode: loginResponse.status
      });
      
      return {
        success: true,
        message: 'Login bem-sucedido com redirecionamento',
        cookies,
        headers: headersObj,
        redirectLocation: location,
        tokenExpiry: new Date(Date.now() + TOKEN_EXPIRY * 1000).toISOString()
      };
    }
    
    // Try API login if form login fails
    console.log('Login com formulário falhou, tentando API...');
    logAuthEvent({
      type: 'attempt',
      method: 'api'
    });
    
    // Try multiple API endpoints for login
    const apiEndpoints = [
      'https://app.dwvapp.com.br/api/auth/login',
      'https://app.dwvapp.com.br/api/login',
      'https://app.dwvapp.com.br/auth/login'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Tentando login via API: ${endpoint}`);
        
        const apiLoginResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': 'https://app.dwvapp.com.br',
            'Referer': 'https://app.dwvapp.com.br/login',
            'Cookie': setCookieHeaders,
          },
          body: JSON.stringify({
            email: DWV_CREDENTIALS.email,
            password: DWV_CREDENTIALS.password,
            ...(csrfToken && { _token: csrfToken, csrf_token: csrfToken })
          })
        });
        
        const apiCookies = apiLoginResponse.headers.get('set-cookie') || '';
        
        // Try to parse response as JSON
        let apiResponseData: any = null;
        const apiResponseText = await apiLoginResponse.text();
        
        try {
          apiResponseData = JSON.parse(apiResponseText);
        } catch (e) {
          console.log('Resposta da API não é JSON válido:', apiResponseText.substring(0, 500));
        }
        
        if (apiLoginResponse.ok) {
          const cookies = apiCookies || setCookieHeaders;
          
          // Store the token for future use
          await setToken(AUTH_TOKEN_KEY, cookies, TOKEN_EXPIRY);
          
          logAuthEvent({
            type: 'success',
            method: 'api',
            responseCode: apiLoginResponse.status
          });
          
          return {
            success: true,
            message: `Login via API ${endpoint} bem-sucedido`,
            cookies,
            headers: headersObj,
            tokenExpiry: new Date(Date.now() + TOKEN_EXPIRY * 1000).toISOString()
          };
        }
        
        console.log(`Login via API ${endpoint} falhou:`, apiLoginResponse.status);
        logAuthEvent({
          type: 'failure',
          method: 'api',
          error: `Login via API ${endpoint} falhou: ${apiLoginResponse.status}`,
          responseCode: apiLoginResponse.status
        });
      } catch (error) {
        console.error(`Erro ao tentar login via ${endpoint}:`, error);
        logAuthEvent({
          type: 'failure',
          method: 'api',
          error: `Erro ao tentar login via ${endpoint}: ${error.message}`
        });
      }
    }
    
    // If we get here, all login attempts failed
    return {
      success: false,
      message: `Login falhou. Form status: ${loginResponse.status}, Location: ${location}`,
      headers: headersObj,
      redirectLocation: location
    };
    
  } catch (error) {
    logAuthEvent({
      type: 'failure',
      method: 'form',
      error: error.message
    });
    
    return {
      success: false,
      message: `Erro durante autenticação: ${error.message}`
    };
  }
}