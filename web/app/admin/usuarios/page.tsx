import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Nav } from '@/components/Nav'
import { criarUsuario, alterarRole } from './actions'
import type { UserRole } from '@/types/database'

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  moderador: 'Moderador',
  apostador: 'Apostador',
}

export default async function AdminUsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'moderador'].includes(profile.role)) redirect('/dashboard')

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('id, nickname, telefone, role, created_at')
    .order('created_at')

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-primary text-2xl font-bold">Usuários</h1>

        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-brand font-semibold mb-4">Novo Usuário</h2>
          <form action={criarUsuario} className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Nickname</span>
              <input
                type="text"
                name="nickname"
                required
                autoCapitalize="none"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-36 focus:outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Telefone (senha)</span>
              <input
                type="tel"
                name="telefone"
                required
                placeholder="11987654321"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-44 focus:outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Role</span>
              <select
                name="role"
                defaultValue="apostador"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
              >
                <option value="apostador">Apostador</option>
                <option value="moderador">Moderador</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="submit"
              className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2 rounded transition-colors cursor-pointer"
            >
              Criar
            </button>
          </form>
        </div>

        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-brand font-semibold mb-4">
            Cadastrados
            <span className="text-muted text-xs font-normal ml-2">({usuarios?.length ?? 0})</span>
          </h2>

          <div className="space-y-2">
            {(usuarios ?? []).map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-primary rounded px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="text-brand text-sm font-medium w-28 truncate">{u.nickname}</span>
                  <span className="text-muted text-xs font-mono">{u.telefone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === 'admin'
                      ? 'bg-accent/20 text-accent'
                      : u.role === 'moderador'
                      ? 'bg-highlight/20 text-highlight'
                      : 'bg-muted/20 text-muted'
                  }`}>
                    {roleLabel[u.role as UserRole]}
                  </span>
                  {profile.role === 'admin' && u.id !== user.id && (
                    <form action={alterarRoleAction.bind(null, u.id)}>
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="bg-primary border border-muted/20 rounded px-2 py-1 text-muted text-xs focus:outline-none"
                      >
                        <option value="apostador">Apostador</option>
                        <option value="moderador">Moderador</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button type="submit" className="text-xs text-muted hover:text-brand ml-1 cursor-pointer">
                        Salvar
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

async function alterarRoleAction(userId: string, formData: FormData) {
  'use server'
  const role = formData.get('role') as string
  await alterarRole(userId, role)
}
