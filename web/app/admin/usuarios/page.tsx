import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { Nav } from "@/components/Nav"
import { criarUsuario, excluirUsuario, alterarRole } from "./actions"
import { ExcluirButton } from "@/components/ExcluirButton"
import TelefoneInput from "@/components/TelefoneInput"
import type { UserRole } from "@/types/database"

export const dynamic = "force-dynamic"

const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  moderador: "Moderador",
  apostador: "Apostador",
}

const roleBadge: Record<UserRole, string> = {
  admin: "bg-accent/20 text-accent",
  moderador: "bg-highlight/20 text-highlight",
  apostador: "bg-muted/20 text-muted",
}

type Props = { searchParams: Promise<{ error?: string }> }

export default async function AdminUsuariosPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const params = await searchParams
  const errorMessage =
    params.error === 'exists' ? 'Nickname ou número já cadastrado.'
    : params.error === 'server' ? 'Erro ao criar usuário. Tente novamente.'
    : null

  const { data: profile } = await supabase
    .from("profiles").select("nickname, role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") redirect("/dashboard")

  const { data: usuarios, error: usuariosErr } = await supabase
    .from("profiles")
    .select("id, nickname, nome, telefone, role, created_at")
    .order("created_at")
  if (usuariosErr) console.error("[admin/usuarios] query error:", usuariosErr.message)

  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-primary text-2xl font-bold">Usuários</h1>

        {errorMessage && (
          <p role="alert" className="text-accent text-sm">{errorMessage}</p>
        )}

        {/* Criar usuario */}
        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-brand font-semibold mb-4">Novo Usuário</h2>
          <form action={criarUsuario} className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Nome</span>
              <input type="text" name="nome" required autoComplete="off"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-40 focus:outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Nickname</span>
              <input type="text" name="nickname" required autoCapitalize="none" autoComplete="off"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-36 focus:outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Número (senha)</span>
              <TelefoneInput name="telefone" autoComplete="off" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Role</span>
              <select name="role" defaultValue="apostador"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent">
                <option value="apostador">Apostador</option>
                <option value="moderador">Moderador</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button type="submit"
              className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2 rounded transition-colors cursor-pointer">
              Criar
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-brand font-semibold mb-4">
            Cadastrados
            <span className="text-muted text-xs font-normal ml-2">({usuarios?.length ?? 0})</span>
          </h2>

          <div className="space-y-2">
            {(usuarios ?? []).map((u) => {
              const isSelf = u.id === user.id
              const role = u.role as UserRole
              return (
                <div key={u.id} className="flex items-center justify-between bg-primary rounded px-4 py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0">
                      <p className="text-brand text-sm font-medium truncate">
                        {u.nickname ?? <span className="text-muted italic">sem nickname</span>}
                        {isSelf && <span className="text-muted text-xs ml-1">(você)</span>}
                      </p>
                      {u.nome && <p className="text-muted text-xs truncate">{u.nome}</p>}
                    </div>
                    <span className="text-muted text-xs font-mono hidden sm:block shrink-0">{u.telefone}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${roleBadge[role]}`}>
                      {roleLabel[role]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isSelf && (
                      <form action={alterarRoleAction.bind(null, u.id)} className="flex items-center gap-1">
                        <select name="role" defaultValue={u.role}
                          className="bg-primary border border-muted/20 rounded px-2 py-1 text-muted text-xs focus:outline-none">
                          <option value="apostador">Apostador</option>
                          <option value="moderador">Moderador</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button type="submit" className="text-xs text-muted hover:text-brand cursor-pointer">✓</button>
                      </form>
                    )}
                    {!isSelf && (
                      <Link href={`/admin/usuarios/${u.id}/editar`}
                        className="text-xs text-muted hover:text-brand transition-colors px-2 py-1 border border-muted/20 rounded">
                        Editar
                      </Link>
                    )}
                    {!isSelf && (
                      <ExcluirButton userId={u.id} nickname={u.nickname ?? u.id} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

async function alterarRoleAction(userId: string, formData: FormData) {
  "use server"
  const role = formData.get("role") as string
  await alterarRole(userId, role)
}
