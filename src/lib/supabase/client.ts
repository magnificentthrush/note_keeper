'use client';

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

// Create a stub client for SSR that matches the real client interface
function createStubClient(): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ data: null, error: null }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        listBuckets: async () => ({ data: null, error: null }),
      }),
    },
  } as unknown as SupabaseClient;
}

export function createClient(): SupabaseClient {
  // Always use the real client in browser, stub only during SSR
  if (typeof window === 'undefined') {
    return createStubClient();
  }

  // In browser - use singleton pattern
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = `Missing Supabase environment variables. 
      NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Missing'}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Set' : 'Missing'}
      Please check your .env.local file and restart the dev server.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Validate URL format
  if (!supabaseUrl.includes('.supabase.co') && supabaseUrl !== 'https://placeholder.supabase.co') {
    console.warn('Supabase URL does not appear to be valid:', supabaseUrl);
  }

  try {
    supabaseClient = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    throw error;
  }
}
