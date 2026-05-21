import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { Nav } from "@/components/Nav"
import { editarUsuario } from "@/app/admin/usuarios/actions"
import TelefoneInput from "@/components/TelefoneInput"

type Params = { params: Promise<{ id: string }> }

export default async function EditarUsuarioPage({ params }: Params) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") redirect("/dashboard")

  const { data: target } = await supabase
    .from("profiles")
    .select("id, nickname, nome, telefone, role")
    .eq("id", id)
    .single()
  if (!target) redirect("/admin/usuarios")

  const action = editarUsuario.bind(null, id)

  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main className="max-w-md mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/usuarios" className="text-muted text-sm hover:text-accent transition-colors">
            &larr; Voltar
          </Link>
          <h1 className="text-primary text-2xl font-bold">Editar Usuário</h1>
        </div>

        <div className="bg-surface rounded-lg p-6">
          <form action={action} className="space-y-4">
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Nome</span>
              <input type="text" name="nome" defaultValue={target.nome ?? ""} required autoComplete="off"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent" />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Nickname</span>
              <input type="text" name="nickname" defaultValue={target.nickname ?? ""} required autoCapitalize="none" autoComplete="off"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent" />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">
                Número (deixe igual se não quiser alterar)
              </span>
              <TelefoneInput name="telefone" autoComplete="off" />
            </label>

            <div className="flex gap-3 pt-2">
              <button type="submit"
                className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-5 py-2 rounded transition-colors cursor-pointer">
                Salvar
              </button>
              <Link href="/admin/usuarios"
                className="border border-muted/30 text-muted hover:text-brand px-5 py-2 rounded text-sm transition-colors">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
