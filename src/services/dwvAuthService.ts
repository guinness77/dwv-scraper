import { supabase } from './supabase';

export class DWVAuthService {
  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in:', error.message);
      throw new Error(error.message);
    }

    return data;
  }
}

export const dwvAuthService = new DWVAuthService();