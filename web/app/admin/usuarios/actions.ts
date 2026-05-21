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
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'moderador'].includes(profile.role)) {
    throw new Error('Acesso negado')
  }
  return user
}

export async function criarUsuario(formData: FormData) {
  await assertAdmin()
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

export async function alterarRole(userId: string, novaRole: string) {
  await assertAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role: novaRole })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}
