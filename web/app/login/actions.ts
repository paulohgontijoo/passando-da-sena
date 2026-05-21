'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function login(formData: FormData) {
  const nickname = (formData.get('nickname') as string | null)?.trim()
  const telefone = (formData.get('telefone') as string | null)?.replace(/\D/g, '')

  if (!nickname || !telefone) redirect('/login?error=invalid')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: `${nickname}@bolao.local`,
    password: telefone!,
  })

  if (error) redirect('/login?error=credentials')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const nome     = (formData.get('nome')     as string | null)?.trim()
  const nickname = (formData.get('nickname') as string | null)?.trim()
  const telefone = (formData.get('telefone') as string | null)?.replace(/\D/g, '')

  if (!nome || !nickname || !telefone) redirect('/login?modo=cadastro&error=invalid')
  if (telefone.length < 10)            redirect('/login?modo=cadastro&error=telefone')

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email: `${nickname}@bolao.local`,
    password: telefone,
    email_confirm: true,
    user_metadata: { nickname, telefone, nome, role: 'apostador' },
  })

  if (error?.message?.includes('already')) redirect('/login?modo=cadastro&error=exists')
  if (error) redirect('/login?modo=cadastro&error=server')

  redirect('/login?success=cadastro')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
