import { corsHeaders } from '../_shared/cors.ts';
import { createBackgroundProcessor, ProcessConfig } from '../_shared/dwv-background-processor.ts';

// Get configuration from environment variables
const DWV_CREDENTIALS = {
  email: Deno.env.get('DWV_EMAIL') || 'fer.scarduelli@gmail.com',
  password: Deno.env.get('DWV_PASSWORD') || 'dwv@junttus'
};

const SUPABASE_CONFIG = {
  url: Deno.env.get('SUPABASE_URL') || '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
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
    console.log('🤖 Starting DWV background process...');
    console.log('📊 Environment check:', {
      hasEmail: !!DWV_CREDENTIALS.email,
      hasPassword: !!DWV_CREDENTIALS.password,
      hasSupabaseUrl: !!SUPABASE_CONFIG.url,
      hasServiceKey: !!SUPABASE_CONFIG.serviceKey,
      email: DWV_CREDENTIALS.email ? DWV_CREDENTIALS.email.substring(0, 5) + '***' : 'MISSING'
    });
    
    // Validate configuration
    if (!DWV_CREDENTIALS.email || !DWV_CREDENTIALS.password) {
      console.error('❌ DWV credentials missing:', {
        email: !!DWV_CREDENTIALS.email,
        password: !!DWV_CREDENTIALS.password
      });
      throw new Error('DWV credentials not configured');
    }
    
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.serviceKey) {
      console.error('❌ Supabase config missing:', {
        url: !!SUPABASE_CONFIG.url,
        serviceKey: !!SUPABASE_CONFIG.serviceKey
      });
      throw new Error('Supabase configuration not found');
    }
    
    console.log('✅ Configuration validated successfully');
    
    // Create process configuration
    const config: ProcessConfig = {
      credentials: DWV_CREDENTIALS,
      supabase: SUPABASE_CONFIG,
      options: {
        maxRetries: 3,
        retryDelay: 2000,
        batchSize: 10,
        enableLogging: true
      }
    };
    
    console.log('🔧 Creating background processor...');
    
    // Create and execute background processor
    const processor = createBackgroundProcessor(config);
    
    console.log('▶️ Executing background process...');
    const result = await processor.executeProcess();
    
    console.log('📋 Process result:', {
      success: result.success,
      propertiesExtracted: result.propertiesExtracted,
      propertiesSaved: result.propertiesSaved,
      hasError: !!result.error
    });
    
    // Prepare response
    const response = {
      success: result.success,
      message: result.message,
      data: {
        propertiesExtracted: result.propertiesExtracted,
        propertiesSaved: result.propertiesSaved,
        debugInfo: result.debugInfo
      },
      timestamp: new Date().toISOString(),
      error: result.error || null
    };
    
    const statusCode = result.success ? 200 : 500;
    
    return new Response(
      JSON.stringify(response, null, 2),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('❌ Background process failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: `Background process failed: ${error.message}`,
        data: {
          propertiesExtracted: 0,
          propertiesSaved: 0
        },
        timestamp: new Date().toISOString(),
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});