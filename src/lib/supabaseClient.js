import { createClient } from '@supabase/supabase-js';
import { PUBLIC_VITE_SUPABASE_URL, PUBLIC_VITE_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_VITE_SUPABASE_URL, PUBLIC_VITE_SUPABASE_ANON_KEY);
