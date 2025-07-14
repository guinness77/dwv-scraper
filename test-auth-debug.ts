/**
 * Test script to debug DWV authentication with enhanced logging
 */

import { createHeadlessAuth } from './supabase/functions/_shared/dwv-headless-auth.ts';

// Test credentials (using environment or defaults)
const credentials = {
  email: Deno.env.get('DWV_EMAIL') || 'fer.scarduelli@gmail.com',
  password: Deno.env.get('DWV_PASSWORD') || 'dwv@junttus'
};

async function testAuthentication() {
  console.log('🧪 Starting DWV authentication debug test...');
  console.log('📧 Using email:', credentials.email);
  
  try {
    const auth = createHeadlessAuth(credentials);
    const result = await auth.authenticate();
    
    console.log('🎯 Authentication result:', {
      success: result.success,
      message: result.message,
      hasSession: !!result.session,
      sessionId: result.session?.sessionId,
      error: result.error
    });
    
    if (result.success) {
      console.log('✅ Authentication successful!');
    } else {
      console.log('❌ Authentication failed:', result.message);
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (import.meta.main) {
  await testAuthentication();
}