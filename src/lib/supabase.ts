// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// These variables are loaded from your .env.local file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase URL or Service Key is missing from environment variables.");
}

// Create a Supabase client with the service_role key, which allows it to bypass
// Row Level Security policies. This is safe to do in a server-side environment.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
