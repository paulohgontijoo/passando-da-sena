import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { Nav } from "@/components/Nav"
import { criarBolao } from "./actions"
import BuscaGrupos from "@/components/BuscaGrupos"

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

type Ciclo = { id: number; concurso_nr: number; status: string; valor_total_jogado: number; created_at: string }
type Bolao = { id: number; nome: string; descricao: string | null; ativo: boolean; created_at: string; ciclos: Ciclo[] }

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("nickname, role").eq("id", user.id).single()
  const isAdmin = profile?.role === "admin"

  const { data: membroRows } = await supabase
    .from("bolao_membros").select("bolao_id").eq("usuario_id", user.id)
  const meusIds = (membroRows ?? []).map((r) => r.bolao_id)

  let meusGrupos: Bolao[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from("boloes")
      .select("id, nome, descricao, ativo, created_at, ciclos(id, concurso_nr, status, valor_total_jogado, created_at)")
      .order("created_at", { ascending: false })
    meusGrupos = (data ?? []) as unknown as Bolao[]
  } else if (meusIds.length > 0) {
    const { data } = await supabase
      .from("boloes")
      .select("id, nome, descricao, ativo, created_at, ciclos(id, concurso_nr, status, valor_total_jogado, created_at)")
      .in("id", meusIds)
      .order("created_at", { ascending: false })
    meusGrupos = (data ?? []) as unknown as Bolao[]
  }

  type GrupoPublico = { id: number; nome: string; descricao: string | null; ciclos: { id: number }[] }
  let outrosGrupos: GrupoPublico[] = []
  if (!isAdmin) {
    const baseQuery = supabase
      .from("boloes")
      .select("id, nome, descricao, ciclos(id)")
      .eq("ativo", true)
      .order("created_at", { ascending: false })
    const { data } = meusIds.length > 0
      ? await baseQuery.not("id", "in", `(${meusIds.join(",")})`)
      : await baseQuery
    outrosGrupos = (data ?? []) as unknown as GrupoPublico[]
  }

  const { data: solicitacoes } = await supabase
    .from("bolao_solicitacoes").select("bolao_id")
    .eq("usuario_id", user.id).eq("status", "pendente")
  const pendentesSet = new Set((solicitacoes ?? []).map((s) => s.bolao_id))

  const gruposParaBusca = outrosGrupos.map((g) => ({
    id: g.id, nome: g.nome, descricao: g.descricao,
    totalCiclos: g.ciclos.length,
    solicitacaoPendente: pendentesSet.has(g.id),
  }))

  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main className="max-w-4xl mx-auto p-6 space-y-8">

        <section className="space-y-4">
          <div>
            <h1 className="text-primary text-2xl font-bold">Meus Grupos</h1>
            <p className="text-muted text-sm mt-0.5">Boloes que voce participa</p>
          </div>

          <div className="bg-surface rounded-lg p-5 space-y-3">
            <h2 className="text-brand text-sm font-semibold">Criar novo grupo</h2>
            <form action={criarBolao} className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Nome</span>
                <input type="text" name="nome" required placeholder="ex: Bolao dos Brothers"
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-52 focus:outline-none focus:border-accent" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Descricao</span>
                <input type="text" name="descricao" placeholder="Opcional"
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-52 focus:outline-none focus:border-accent" />
              </label>
              <button type="submit"
                className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2 rounded transition-colors cursor-pointer">
                Criar
              </button>
            </form>
          </div>

          {meusGrupos.length === 0 && (
            <div className="bg-surface rounded-lg p-6 text-muted text-sm text-center">
              Voce ainda nao participa de nenhum grupo. Crie um ou solicite ingresso abaixo.
            </div>
          )}

          <div className="space-y-3">
            {meusGrupos.map((b) => {
              const totalInvestido = b.ciclos.reduce((acc, c) => acc + c.valor_total_jogado, 0)
              const ultimoCiclo = [...b.ciclos].sort(
                (a, c) => new Date(c.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
              const ciclosAtivos = b.ciclos.filter(
                (c) => c.status === "aberto" || c.status === "rascunho"
              ).length
              return (
                <Link key={b.id} href={`/bolao/${b.id}`}
                  className="block bg-surface rounded-lg p-5 hover:bg-surface/80 transition-colors border border-transparent hover:border-muted/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-brand font-semibold">{b.nome}</span>
                        {!b.ativo && <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted">Inativo</span>}
                        {ciclosAtivos > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">
                            {ciclosAtivos} ativo{ciclosAtivos > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {b.descricao && <p className="text-muted text-xs">{b.descricao}</p>}
                      <p className="text-muted text-xs">
                        {b.ciclos.length} ciclo{b.ciclos.length !== 1 ? "s" : ""}
                        {ultimoCiclo ? ` · último: concurso #${ultimoCiclo.concurso_nr}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-muted text-xs">Total investido</p>
                      <p className="text-brand font-semibold">{fmt(totalInvestido)}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {!isAdmin && (
          <section className="space-y-4">
            <div>
              <h2 className="text-primary text-xl font-bold">Descobrir Grupos</h2>
              <p className="text-muted text-sm mt-0.5">Solicite ingresso em um grupo existente</p>
            </div>
            {gruposParaBusca.length === 0 ? (
              <div className="bg-surface rounded-lg p-6 text-muted text-sm text-center">
                Nao ha outros grupos disponiveis no momento.
              </div>
            ) : (
              <BuscaGrupos grupos={gruposParaBusca} />
            )}
          </section>
        )}
      </main>
    </div>
  )
}
