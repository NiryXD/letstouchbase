import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

type TokenGetter = () => Promise<string | null>;
let getClerkToken: TokenGetter | null = null;

/**
 * Called once from the root layout so every Supabase request carries the
 * Clerk session token (runbook section 2: third-party auth, not JWT templates).
 */
export function setClerkTokenGetter(getter: TokenGetter) {
  getClerkToken = getter;
}

export const supabase = createClient(url, anonKey, {
  accessToken: async () => (getClerkToken ? await getClerkToken() : null),
});
