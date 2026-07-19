import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://halwhhxeyfdhxywdyjpb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbHdoaHhleWZkaHh5d2R5anBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTQ3NzEsImV4cCI6MjA5OTc5MDc3MX0._HzRT3M-Q4woCxm032Bix6YdDEunytMzPSMD0IfBE3M';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

