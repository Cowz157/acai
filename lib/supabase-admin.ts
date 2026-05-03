import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

/**
 * Client server-only com service_role — bypassa RLS.
 * NUNCA importar isso em código que roda no browser.
 * Uso: handlers de webhook, API routes admin, scripts.
 *
 * Lazy init: o cliente só é construído na primeira chamada (runtime),
 * não no momento do import. Assim o build do Next.js não quebra mesmo
 * que as env vars não estejam disponíveis em build time.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local",
    )
  }
  cached = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return cached
}
