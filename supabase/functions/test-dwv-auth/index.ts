import { corsHeaders } from '../_shared/cors.ts';
import { createHeadlessAuth, DWVCredentials } from '../_shared/dwv-headless-auth.ts';

// Get credentials from environment variables
const DWV_CREDENTIALS: DWVCredentials = {
  email: Deno.env.get('DWV_EMAIL') || 'fer.scarduelli@gmail.com',
  password: Deno.env.get('DWV_PASSWORD') || 'dwv@junttus'
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🔐 Starting enhanced DWV authentication test...');
    console.log(`📧 Testing with email: ${DWV_CREDENTIALS.email}`);
    
    // Create headless authentication manager (Hybrid Puppeteer + HTTP fallback)
    const authManager = createHeadlessAuth(DWV_CREDENTIALS);
    
    // Attempt authentication
    const authResult = await authManager.authenticate();
    
    // Log the result
    console.log(`Authentication result: ${authResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Message: ${authResult.message}`);
    
    // Prepare response (hide sensitive cookie data)
    const response = {
      success: authResult.success,
      message: authResult.message,
      method: 'hybrid_headless_auth',
      cookies: authResult.session?.cookies ? 'Session cookies received (hidden for security)' : null,
      sessionId: authResult.session?.sessionId || null,
      sessionExpires: authResult.session?.expires?.toISOString() || null,
      timestamp: new Date().toISOString(),
      debugInfo: authResult.debugInfo || null,
      // Additional debug info
      debug: {
        credentials_configured: !!(DWV_CREDENTIALS.email && DWV_CREDENTIALS.password),
        email_used: DWV_CREDENTIALS.email,
        site_url: 'https://app.dwvapp.com.br',
        hybrid_auth_enabled: true,
        addresses_307_redirect: true
      }
    };
    
    return new Response(
      JSON.stringify(response, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        debug: {
          credentials_configured: !!(DWV_CREDENTIALS.email && DWV_CREDENTIALS.password),
          email_used: DWV_CREDENTIALS.email,
          site_url: 'https://app.dwvapp.com.br'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});