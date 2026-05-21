import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'
import { NavLink } from './NavLink'
import type { UserRole } from '@/types/database'

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  apostador: '',  // apostador nao exibe badge de role
}

export async function Nav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('nickname, role').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.role === 'admin'

  // Fallback: derivar nickname do email sintetico (nickname@bolao.local)
  const displayName = profile?.nickname ?? user?.email?.split('@')[0] ?? '—'

  return (
    <nav className="bg-primary border-b border-muted/20 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-brand font-bold text-lg hover:text-accent transition-colors"
        >
          Passando da Sena
        </Link>
        <div className="flex gap-4">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/bolao">Grupos</NavLink>
          <NavLink href="/analytics">Analytics</NavLink>
          {isAdmin && <NavLink href="/admin/usuarios">Usuarios</NavLink>}
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-brand text-sm font-medium">{displayName}</span>
          {profile?.role === 'admin' && (
            <span className="text-xs px-1.5 py-0.5 border border-accent/40 rounded text-accent">
              Admin
            </span>
          )}
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
