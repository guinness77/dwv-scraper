import { corsHeaders } from '../_shared/cors.ts';
import { createHeadlessAuth, DWVCredentials } from '../_shared/dwv-headless-auth.ts';
import { createPropertyExtractor } from '../_shared/dwv-property-extractor.ts';

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
    console.log('🏠 Starting enhanced DWV property scraping...');
    console.log(`📧 Using email: ${DWV_CREDENTIALS.email}`);
    
    // Step 1: Authenticate
    console.log('🔐 Authenticating with DWV App...');
    console.log('🔍 DIAGNOSTIC: Using HeadlessDWVAuth with Puppeteer support');
    const authManager = createHeadlessAuth(DWV_CREDENTIALS);
    const authResult = await authManager.authenticate();
    console.log('🔍 DIAGNOSTIC: Authentication method used:', authResult.debugInfo?.method || 'unknown');
    
    if (!authResult.success) {
      throw new Error(`Authentication failed: ${authResult.message}`);
    }
    
    console.log(`✅ Authentication successful using method: ${authResult.debugInfo?.method || 'headless_auth'}`);
    
    // Step 2: Extract properties
    console.log('🔍 Starting property extraction...');
    const cookies = authResult.session?.cookies || '';
    if (!cookies) {
      throw new Error('No session cookies available for property extraction');
    }
    const extractor = createPropertyExtractor(cookies);
    const extractionResult = await extractor.extractProperties();
    
    if (!extractionResult.success) {
      throw new Error(`Property extraction failed: ${extractionResult.error}`);
    }
    
    console.log(`✅ Extraction completed: ${extractionResult.properties.length} properties found`);
    
    // Step 3: Return results
    const response = {
      success: true,
      properties: extractionResult.properties,
      total_found: extractionResult.total_found,
      message: extractionResult.message,
      source: extractionResult.source,
      auth_method: authResult.debugInfo?.method || 'headless_auth',
      timestamp: new Date().toISOString(),
      debug: {
        credentials_configured: !!(DWV_CREDENTIALS.email && DWV_CREDENTIALS.password),
        email_used: DWV_CREDENTIALS.email,
        site_url: 'https://app.dwvapp.com.br',
        extraction_strategies: ['API Endpoints', 'HTML Pages', 'Dashboard Area']
      }
    };
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('❌ DWV scraping failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        properties: [],
        total_found: 0,
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