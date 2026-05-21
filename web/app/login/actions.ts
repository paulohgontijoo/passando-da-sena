'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const nickname = (formData.get('nickname') as string | null)?.trim()
  const telefone = (formData.get('telefone') as string | null)?.trim()

  if (!nickname || !telefone) redirect('/login?error=invalid')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: `${nickname}@bolao.local`,
    password: telefone!,
  })

  if (error) redirect('/login?error=credentials')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
