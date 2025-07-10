import { corsHeaders } from '../_shared/cors.ts';
import { createAuthManager, DWVCredentials } from '../_shared/dwv-auth-manager.ts';
import { createScraper } from '../_shared/dwv-scraper.ts';

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
    
    // Step 1: Authenticate
    console.log('🔐 Authenticating with DWV App...');
    const authManager = createAuthManager(DWV_CREDENTIALS);
    const authResult = await authManager.authenticate();
    
    if (!authResult.success) {
      throw new Error(`Authentication failed: ${authResult.message}`);
    }
    
    console.log(`✅ Authentication successful using method: ${authResult.method}`);
    
    // Step 2: Scrape properties
    console.log('🔍 Starting property extraction...');
    const scraper = createScraper(authResult.cookies!);
    const scrapingResult = await scraper.scrapeProperties();
    
    if (!scrapingResult.success) {
      throw new Error(`Scraping failed: ${scrapingResult.error}`);
    }
    
    console.log(`✅ Scraping completed: ${scrapingResult.properties.length} properties found`);
    
    // Step 3: Return results
    const response = {
      success: true,
      properties: scrapingResult.properties,
      total_found: scrapingResult.total_found,
      message: scrapingResult.message,
      source: scrapingResult.source,
      auth_method: authResult.method,
      timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});