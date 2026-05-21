import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { logout } from "@/app/login/actions"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Dashboard</h1>
      <p>Logado como: {user.email}</p>
      <form action={logout}>
        <button type="submit">Sair</button>
      </form>
    </main>
  )
}
