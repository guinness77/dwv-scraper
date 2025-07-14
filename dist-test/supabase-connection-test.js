import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase environment variables. Make sure to create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);
(async () => {
    const credentials = {
        email: 'fer.scarduelli@gmail.com',
        password: 'dwv@junttus',
    };
    console.log('🧪 Running Supabase connection test...');
    console.log(`Attempting to sign in with user: ${credentials.email}`);
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
        console.error('Login failed:', error.message);
        // @ts-ignore
        if (error.cause) {
            // @ts-ignore
            console.error('Cause:', error.cause);
        }
    }
    else if (data.session) {
        console.log('✅ Login successful!');
        console.log('Test session received.');
    }
    else {
        console.log('Login attempt returned no session and no error.');
    }
})().catch(error => {
    console.error('💥 Test script failed:', error);
});
