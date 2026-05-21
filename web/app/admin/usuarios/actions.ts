'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'moderador'].includes(profile.role)) {
    throw new Error('Acesso negado')
  }
  return { user, supabase }
}

export async function criarUsuario(formData: FormData) {
  const { } = await assertAdmin()
  const admin = createAdminClient()

  const nickname = (formData.get('nickname') as string).trim()
  const telefone = (formData.get('telefone') as string).trim()
  const role = (formData.get('role') as string) || 'apostador'

  if (!nickname || !telefone) throw new Error('Nickname e telefone sao obrigatorios')
  if (!['apostador', 'moderador', 'admin'].includes(role)) throw new Error('Role invalida')

  const { error } = await admin.auth.admin.createUser({
    email: `${nickname}@bolao.local`,
    password: telefone,
    email_confirm: true,
    user_metadata: { nickname, telefone, role },
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}

export async function editarUsuario(userId: string, formData: FormData) {
  const { supabase } = await assertAdmin()
  const admin = createAdminClient()

  const nickname = (formData.get('nickname') as string).trim()
  const telefone = (formData.get('telefone') as string).trim()

  if (!nickname || !telefone) throw new Error('Campos obrigatorios')

  // Atualiza Auth (email sintetico + senha)
  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    email: `${nickname}@bolao.local`,
    password: telefone,
    email_confirm: true,
    user_metadata: { nickname, telefone },
  })
  if (authErr) throw new Error(authErr.message)

  // Atualiza profiles
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ nickname, telefone })
    .eq('id', userId)
  if (profileErr) throw new Error(profileErr.message)

  revalidatePath('/admin/usuarios')
  redirect('/admin/usuarios')
}

export async function excluirUsuario(userId: string) {
  const { user } = await assertAdmin()
  if (userId === user.id) throw new Error('Nao e possivel excluir sua propria conta')

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}

export async function alterarRole(userId: string, novaRole: string) {
  const { supabase } = await assertAdmin()
  const { error } = await supabase.from('profiles').update({ role: novaRole }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}
