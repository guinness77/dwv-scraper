import { createEnhancedAuth } from './supabase/functions/_shared/dwv-enhanced-auth';

(async () => {
  const credentials = {
    email: 'fer.scarduelli@gmail.com',
    password: 'dwv@junttus',
  };
  const auth = createEnhancedAuth(credentials);
  console.log('🧪 Running EnhancedDWVAuth.authenticate() end-to-end test');
  const result = await auth.authenticate();
  console.log('\n🎯 Final Result:', result);
})().catch(error => {
  console.error('💥 Test failed:', error);
});