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
  if (!profile || profile.role !== 'admin') throw new Error('Acesso negado')
  return { user, supabase }
}

export async function criarUsuario(formData: FormData) {
  await assertAdmin()
  const admin = createAdminClient()

  const nome     = (formData.get('nome')     as string).trim()
  const nickname = (formData.get('nickname') as string).trim()
  const telefone = (formData.get('telefone') as string).replace(/\D/g, '')
  const role     = (formData.get('role')     as string) || 'apostador'

  if (!nome || !nickname || !telefone) throw new Error('Todos os campos sao obrigatorios')
  if (!['apostador', 'moderador', 'admin'].includes(role)) throw new Error('Role invalida')

  const { error } = await admin.auth.admin.createUser({
    email: `${nickname}@bolao.local`,
    password: telefone,
    email_confirm: true,
    user_metadata: { nome, nickname, telefone, role },
  })

  if (error?.message?.toLowerCase().includes('already')) {
    redirect('/admin/usuarios?error=exists')
  }
  if (error) redirect('/admin/usuarios?error=server')
  revalidatePath('/admin/usuarios')
}

export async function editarUsuario(userId: string, formData: FormData) {
  const { supabase } = await assertAdmin()
  const admin = createAdminClient()

  const nome     = (formData.get('nome')     as string).trim()
  const nickname = (formData.get('nickname') as string).trim()
  const telefone = (formData.get('telefone') as string).replace(/\D/g, '')

  if (!nome || !nickname || !telefone) throw new Error('Todos os campos sao obrigatorios')

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    email: `${nickname}@bolao.local`,
    password: telefone,
    email_confirm: true,
    user_metadata: { nome, nickname, telefone },
  })
  if (authErr) throw new Error(authErr.message)

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ nome, nickname, telefone })
    .eq('id', userId)
  if (profileErr) throw new Error(profileErr.message)

  revalidatePath('/admin/usuarios')
  redirect('/admin/usuarios')
}

export async function excluirUsuario(userId: string) {
  const { user, supabase } = await assertAdmin()
  if (userId === user.id) throw new Error('Nao e possivel excluir sua propria conta')

  await supabase.from('boloes').update({ criado_por: user.id }).eq('criado_por', userId)
  await supabase.from('ciclos').update({ criado_por: user.id }).eq('criado_por', userId)
  await supabase.from('apostas').update({ registrado_por: user.id }).eq('registrado_por', userId)
  await supabase.from('participacoes').delete().eq('usuario_id', userId)

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error()

  revalidatePath('/admin/usuarios')
  redirect('/admin/usuarios')
}

export async function alterarRole(userId: string, novaRole: string) {
  const { supabase } = await assertAdmin()
  const { error } = await supabase.from('profiles').update({ role: novaRole }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}
