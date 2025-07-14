import { dwvAuthService } from './services/dwvAuthService';

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = '/';
  }

  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const errorMessage = document.getElementById('error-message') as HTMLDivElement;

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMessage.classList.add('hidden');

      const email = (document.getElementById('email') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;

      try {
        const { data, error } = await dwvAuthService.signInWithPassword(email, password);

        if (error) {
          throw error;
        }
        
        if (data.user) {
          window.location.href = '/';
        } else {
          errorMessage.textContent = 'Login failed. Please check your credentials.';
          errorMessage.classList.remove('hidden');
        }
      } catch (error) {
        if (error instanceof Error) {
          errorMessage.textContent = error.message;
        } else {
          errorMessage.textContent = 'An unknown error occurred.';
        }
        errorMessage.classList.remove('hidden');
      }
    });
  }
});