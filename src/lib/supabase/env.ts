/** Public Supabase config — safe for browser and middleware. */

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY
  );
}

export function supabaseAuthConfigured(): boolean {
  return Boolean(getSupabaseUrl()?.trim() && getSupabaseAnonKey()?.trim());
}
