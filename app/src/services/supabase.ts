import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'placeholder_url';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

const options: any = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
};

const isServer = typeof Bun !== 'undefined' || typeof process !== 'undefined' && !process.release?.name;

if (!isServer) {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  require('react-native-url-polyfill/auto');
  options.auth.storage = AsyncStorage;
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, options);