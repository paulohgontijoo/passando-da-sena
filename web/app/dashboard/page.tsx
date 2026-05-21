import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-bg">
      <nav className="bg-primary border-b border-muted/20 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-brand font-bold text-lg">Passando da Sena</span>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="text-brand text-sm hover:text-accent transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/analytics"
              className="text-muted text-sm hover:text-accent transition-colors"
            >
              Analytics
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted text-xs">{user.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-muted text-xs hover:text-accent transition-colors cursor-pointer"
            >
              Sair
            </button>
          </form>
        </div>
      </nav>

      <main className="p-6">
        <h1 className="text-primary text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted text-sm">Em construcao — gestao do bolao em breve.</p>
      </main>
    </div>
  )
}
