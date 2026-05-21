import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { Nav } from "@/components/Nav"
import type { CicloStatus } from "@/types/database"

export const dynamic = "force-dynamic"

const statusLabel: Record<CicloStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  fechado: "Fechado",
  sorteado: "Sorteado",
}

const statusColor: Record<CicloStatus, string> = {
  rascunho: "bg-muted/20 text-muted",
  aberto: "bg-green-900/40 text-green-400",
  fechado: "bg-yellow-900/40 text-highlight",
  sorteado: "bg-blue-900/40 text-blue-400",
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

type SearchParams = Promise<{ status?: string }>

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("nickname, role").eq("id", user.id).single()

  const params = await searchParams
  const filtroStatus = params.status as CicloStatus | undefined
  const isAdmin = profile?.role === "admin"

  // IDs dos boloes onde o user e membro
  const { data: membroRows } = await supabase
    .from("bolao_membros").select("bolao_id").eq("usuario_id", user.id)
  const meusBoloesIds = (membroRows ?? []).map((r) => r.bolao_id)

  type Ciclo = {
    id: number; concurso_nr: number; status: string
    valor_total_jogado: number; valor_cota: number
    premio_obtido: number | null; created_at: string
    boloes: { id: number; nome: string } | null
  }

  let lista: Ciclo[] = []

  if (!isAdmin && meusBoloesIds.length === 0) {
    lista = []
  } else {
    let query = supabase
      .from("ciclos")
      .select("id, concurso_nr, status, valor_total_jogado, valor_cota, premio_obtido, created_at, boloes(id, nome)")
      .order("created_at", { ascending: false })

    if (!isAdmin) {
      query = query.in("bolao_id", meusBoloesIds)
    }
    if (filtroStatus) {
      query = query.eq("status", filtroStatus)
    }

    const { data: ciclos } = await query
    lista = (ciclos ?? []) as unknown as Ciclo[]
  }

  const STATUS_FILTROS = [
    { value: "", label: "Todos" },
    { value: "aberto", label: "Abertos" },
    { value: "fechado", label: "Fechados" },
    { value: "sorteado", label: "Sorteados" },
    { value: "rascunho", label: "Rascunho" },
  ]

  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-primary text-2xl font-bold">Dashboard</h1>
            <p className="text-muted text-sm mt-1">Timeline dos concursos do seu grupo</p>
          </div>
          <Link href="/bolao"
            className="text-sm text-muted hover:text-brand border border-muted/30 px-3 py-1.5 rounded transition-colors">
            Grupos &rarr;
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTROS.map((f) => (
            <Link key={f.value}
              href={f.value ? `/dashboard?status=${f.value}` : "/dashboard"}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                (filtroStatus ?? "") === f.value
                  ? "border-accent text-accent bg-accent/10"
                  : "border-muted/30 text-muted hover:text-brand hover:border-muted/60"
              }`}>
              {f.label}
            </Link>
          ))}
        </div>

        {lista.length === 0 && meusBoloesIds.length === 0 && !isAdmin && (
          <div className="bg-surface rounded-lg p-6 text-muted text-sm text-center">
            Voce nao esta em nenhum grupo ainda.{" "}
            <Link href="/bolao" className="text-accent hover:underline">Encontre ou crie um grupo.</Link>
          </div>
        )}

        {lista.length === 0 && (meusBoloesIds.length > 0 || isAdmin) && (
          <div className="bg-surface rounded-lg p-6 text-muted text-sm text-center">
            Nenhum ciclo encontrado.
          </div>
        )}

        <div className="space-y-3">
          {lista.map((ciclo) => (
            <Link key={ciclo.id} href={`/bolao/ciclos/${ciclo.id}`}
              className="block bg-surface rounded-lg p-5 hover:bg-surface/80 transition-colors border border-transparent hover:border-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-brand font-semibold">Concurso #{ciclo.concurso_nr}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[ciclo.status as CicloStatus]}`}>
                      {statusLabel[ciclo.status as CicloStatus]}
                    </span>
                  </div>
                  {ciclo.boloes && <p className="text-muted text-xs truncate">{ciclo.boloes.nome}</p>}
                  <p className="text-muted text-xs">{new Date(ciclo.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div>
                    <p className="text-muted text-xs">Total jogado</p>
                    <p className="text-brand font-semibold text-sm">{fmt(ciclo.valor_total_jogado)}</p>
                  </div>
                  {ciclo.valor_cota > 0 && (
                    <div>
                      <p className="text-muted text-xs">Valor/cota</p>
                      <p className="text-highlight text-sm font-medium">{fmt(ciclo.valor_cota)}</p>
                    </div>
                  )}
                  {ciclo.premio_obtido !== null && (
                    <div>
                      <p className="text-muted text-xs">Premio</p>
                      <p className="text-green-400 text-sm font-medium">{fmt(ciclo.premio_obtido)}</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
