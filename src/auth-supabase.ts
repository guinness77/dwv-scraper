import { dwvSupabaseAuthService } from './services/dwvSupabaseAuthService';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Supabase auth script loaded');
  
  // Check if already authenticated
  if (dwvSupabaseAuthService.isAuthenticated()) {
    console.log('✅ Already authenticated');
    const successMessage = document.getElementById('success-message') as HTMLDivElement;
    if (successMessage) {
      successMessage.textContent = 'You are already authenticated! Redirecting...';
      successMessage.classList.remove('hidden');
      setTimeout(() => {
        window.location.href = '/dwv-supabase-demo.html';
      }, 2000);
    }
    return;
  }

  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const errorMessage = document.getElementById('error-message') as HTMLDivElement;
  const successMessage = document.getElementById('success-message') as HTMLDivElement;

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('📋 Form submitted');
      
      // Hide messages
      errorMessage.classList.add('hidden');
      successMessage.classList.add('hidden');
      errorMessage.textContent = '';
      successMessage.textContent = '';

      const email = (document.getElementById('email') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;

      console.log('🔐 Attempting login via Supabase edge function for:', email);

      try {
        // Show loading state
        const submitButton = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement;
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Authenticating...';

        // Attempt authentication via Supabase edge function with auto-fetch enabled
        const result = await dwvSupabaseAuthService.authenticate(email, password, true);
        
        console.log('🔍 Authentication result:', result);

        if (result.success) {
          console.log('✅ Login successful!');
          
          // Check if properties were auto-fetched
          if (result.propertiesData && result.propertiesData.success) {
            const propertyCount = result.propertiesData.total_found;
            successMessage.innerHTML = `
              <div>
                <p class="font-bold">✅ Login successful!</p>
                <p class="mt-2">🏠 Found ${propertyCount} properties automatically!</p>
                <p class="text-sm mt-1">Redirecting to view all properties...</p>
              </div>
            `;
          } else {
            successMessage.textContent = 'Login successful! Redirecting to demo page...';
          }
          
          successMessage.classList.remove('hidden');
          
          // Store the properties data if available
          if (result.propertiesData) {
            sessionStorage.setItem('auto_fetched_properties', JSON.stringify(result.propertiesData));
          }
          
          // Redirect to demo page after a short delay
          setTimeout(() => {
            window.location.href = '/dwv-supabase-demo.html';
          }, 2000);
        } else {
          console.error('❌ Login failed:', result.message);
          errorMessage.textContent = result.message || 'Login failed. Please check your credentials.';
          errorMessage.classList.remove('hidden');
          
          // Restore button state
          submitButton.disabled = false;
          submitButton.textContent = originalText || 'Login via Supabase';
        }
        
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
        submitButton.textContent = 'Login via Supabase';
      }
    });
  } else {
    console.error('❌ Login form not found');
  }
});