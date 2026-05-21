import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'
import { NavLink } from './NavLink'
import type { UserRole } from '@/types/database'

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  moderador: 'Mod',
  apostador: 'Apostador',
}

export async function Nav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('nickname, role').eq('id', user.id).single()
    : { data: null }

  const isMod = profile?.role === 'admin' || profile?.role === 'moderador'

  return (
    <nav className="bg-primary border-b border-muted/20 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link
          href="/dashboard"
          className="text-brand font-bold text-lg hover:text-accent transition-colors"
        >
          Passando da Sena
        </Link>
        <div className="flex gap-4">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/bolao">Bolao</NavLink>
          <NavLink href="/analytics">Analytics</NavLink>
          {isMod && <NavLink href="/admin/usuarios">Usuarios</NavLink>}
        </div>
      </div>

      {profile && (
        <div className="flex items-center gap-3">
          <span className="text-brand text-sm font-medium">{profile.nickname}</span>
          <span className="text-xs px-1.5 py-0.5 border border-muted/30 rounded text-muted">
            {roleLabel[profile.role as UserRole]}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-muted text-xs hover:text-accent transition-colors cursor-pointer"
            >
              Sair
            </button>
          </form>
        </div>
      )}
    </nav>
  )
}
