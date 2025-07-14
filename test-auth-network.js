/**
 * Network-focused test to understand DWV authentication flow
 * This will help us identify the correct authentication endpoint and method
 */

class NetworkAuthTest {
  constructor(credentials) {
    this.credentials = credentials;
    this.baseUrl = 'https://app.dwvapp.com.br';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async testAuthEndpoints() {
    console.log('🔍 Testing various authentication endpoints...');
    
    // Get initial cookies
    const loginPageResponse = await fetch(`${this.baseUrl}/login`);
    const cookies = this.extractCookies(loginPageResponse);
    console.log('🍪 Initial cookies:', cookies ? 'YES' : 'NO');

    const endpoints = [
      '/api/auth/signin',
      '/api/auth/callback/credentials',
      '/api/login',
      '/api/signin',
      '/auth/login',
      '/auth/signin',
      '/signin',
      '/sign-in',
      '/login'
    ];

    const payloads = [
      // JSON payloads
      { username: this.credentials.email, password: this.credentials.password },
      { email: this.credentials.email, password: this.credentials.password },
      { user: this.credentials.email, password: this.credentials.password },
      
      // NextAuth.js style
      { 
        username: this.credentials.email, 
        password: this.credentials.password,
        csrfToken: 'test',
        callbackUrl: '/dashboard'
      }
    ];

    for (const endpoint of endpoints) {
      console.log(`\n🎯 Testing endpoint: ${endpoint}`);
      
      for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        console.log(`  📦 Payload ${i + 1}:`, Object.keys(payload));
        
        try {
          // Try JSON
          const jsonResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': this.userAgent,
              'Origin': this.baseUrl,
              'Referer': `${this.baseUrl}/login`,
              'Cookie': cookies || ''
            },
            body: JSON.stringify(payload),
            redirect: 'manual'
          });

          console.log(`    JSON: ${jsonResponse.status} ${jsonResponse.statusText}`);
          if (jsonResponse.status !== 404 && jsonResponse.status !== 405) {
            const location = jsonResponse.headers.get('location');
            if (location) console.log(`    → Redirect: ${location}`);
            
            // If we get a different response, examine it
            if (jsonResponse.status === 200 || (jsonResponse.status >= 300 && jsonResponse.status < 400)) {
              const responseText = await jsonResponse.text().catch(() => 'Unable to read response');
              console.log(`    Response preview: ${responseText.substring(0, 200)}...`);
            }
          }

          // Try form data
          const formData = new URLSearchParams();
          for (const [key, value] of Object.entries(payload)) {
            formData.append(key, value);
          }

          const formResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'User-Agent': this.userAgent,
              'Origin': this.baseUrl,
              'Referer': `${this.baseUrl}/login`,
              'Cookie': cookies || ''
            },
            body: formData.toString(),
            redirect: 'manual'
          });

          console.log(`    FORM: ${formResponse.status} ${formResponse.statusText}`);
          if (formResponse.status !== 404 && formResponse.status !== 405) {
            const location = formResponse.headers.get('location');
            if (location) console.log(`    → Redirect: ${location}`);
          }

        } catch (error) {
          console.log(`    ERROR: ${error.message}`);
        }
      }
    }
  }

  extractCookies(response) {
    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) return '';

    return setCookieHeader
      .split(',')
      .map(cookie => cookie.split(';')[0].trim())
      .filter(cookie => cookie.length > 0)
      .join('; ');
  }
}

// Run the test
async function runNetworkTest() {
  const credentials = {
    email: 'fer.scarduelli@gmail.com',
    password: 'dwv@junttus'
  };

  const test = new NetworkAuthTest(credentials);
  await test.testAuthEndpoints();
}

runNetworkTest().catch(console.error);