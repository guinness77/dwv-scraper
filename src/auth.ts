import { dwvDirectAuthService } from './services/dwvDirectAuthService';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Auth script loaded');
  
  // Check if already authenticated
  const isAuthenticated = await dwvDirectAuthService.testAuthentication();
  if (isAuthenticated) {
    console.log('✅ Already authenticated, redirecting...');
    window.location.href = '/';
    return;
  }

  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const errorMessage = document.getElementById('error-message') as HTMLDivElement;

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('📋 Form submitted');
      
      errorMessage.classList.add('hidden');
      errorMessage.textContent = '';

      const email = (document.getElementById('email') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;

      console.log('🔐 Attempting login for:', email);

      try {
        // Show loading state
        const submitButton = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement;
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        // Attempt authentication
        const result = await dwvDirectAuthService.authenticate(email, password);
        
        console.log('🔍 Authentication result:', result);

        if (result.success) {
          console.log('✅ Login successful!');
          
          // Test if we're really authenticated
          const verified = await dwvDirectAuthService.testAuthentication();
          if (verified) {
            console.log('✅ Authentication verified, redirecting...');
            window.location.href = result.redirectLocation || '/';
          } else {
            console.warn('⚠️ Authentication not verified after login');
            errorMessage.textContent = 'Login appeared successful but session could not be verified. Please try again.';
            errorMessage.classList.remove('hidden');
          }
        } else {
          console.error('❌ Login failed:', result.message);
          errorMessage.textContent = result.message || 'Login failed. Please check your credentials.';
          errorMessage.classList.remove('hidden');
        }

        // Restore button state
        submitButton.disabled = false;
        submitButton.textContent = originalText || 'Login';
        
      } catch (error) {
        console.error('💥 Login error:', error);
        
        if (error instanceof Error) {
          errorMessage.textContent = `Error: ${error.message}`;
        } else {
          errorMessage.textContent = 'An unexpected error occurred. Please try again.';
        }
        errorMessage.classList.remove('hidden');
        
        // Restore button state
        const submitButton = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
      }
    });
  } else {
    console.error('❌ Login form not found');
  }
});