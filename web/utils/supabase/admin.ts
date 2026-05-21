import "server-only"
import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL } from "./config"

// Client com service role — bypassa RLS.
// Usar SOMENTE em Server Actions e Route Handlers para operacoes administrativas.
// Nunca expor este client ou a serviceRoleKey ao browser.
export function createAdminClient() {
  const serviceRoleKey =
    process.env.spdb_passando_da_sena_beta_SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente")
  }

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
