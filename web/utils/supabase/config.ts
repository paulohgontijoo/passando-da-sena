// Centraliza os nomes das env vars geradas pelo Vercel Supabase integration.
// NEXT_PUBLIC_* sao inlined no bundle do browser em build time — so expor URL e anon key.
// Service role key nunca deve ser importada em modulos client-side.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_spdb_passando_da_sena_beta_SUPABASE_URL ?? ""

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_spdb_passando_da_sena_beta_SUPABASE_ANON_KEY ?? ""
