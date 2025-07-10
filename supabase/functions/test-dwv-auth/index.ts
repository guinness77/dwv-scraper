import { corsHeaders } from '../_shared/cors.ts';
import { createAuthManager, DWVCredentials } from '../_shared/dwv-auth-manager.ts';

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
    
    // Create authentication manager
    const authManager = createAuthManager(DWV_CREDENTIALS);
    
    // Attempt authentication
    const authResult = await authManager.authenticate();
    
    // Log the result
    console.log(`Authentication result: ${authResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Method used: ${authResult.method}`);
    console.log(`Message: ${authResult.message}`);
    
    // Prepare response (hide sensitive cookie data)
    const response = {
      success: authResult.success,
      message: authResult.message,
      method: authResult.method,
      cookies: authResult.cookies ? 'Session cookies received (hidden for security)' : null,
      redirectLocation: authResult.redirectLocation || null,
      sessionId: authResult.sessionId || null,
      timestamp: new Date().toISOString(),
      headers: authResult.headers ? Object.keys(authResult.headers) : null
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
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});