import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Nav } from '@/components/Nav'
import { criarBolao } from './actions'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Ciclo = {
  id: number
  concurso_nr: number
  status: string
  valor_total_jogado: number
  created_at: string
}

type Bolao = {
  id: number
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
  ciclos: Ciclo[]
}

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', user.id)
    .single()

  const isMod = profile?.role === 'admin' || profile?.role === 'moderador'

  const { data: rawBoloes } = await supabase
    .from('boloes')
    .select('id, nome, descricao, ativo, created_at, ciclos(id, concurso_nr, status, valor_total_jogado, created_at)')
    .order('created_at', { ascending: false })

  const boloes = (rawBoloes ?? []) as unknown as Bolao[]

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-primary text-2xl font-bold">Grupos de Bolão</h1>
          <p className="text-muted text-sm mt-1">Selecione um grupo para ver os ciclos</p>
        </div>

        {/* Criar grupo */}
        {(
          <div className="bg-surface rounded-lg p-6 space-y-4">
            <h2 className="text-brand font-semibold">Novo Grupo</h2>
            <form action={criarBolao} className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Nome</span>
                <input
                  type="text"
                  name="nome"
                  required
                  placeholder="ex: Bolão dos Brothers"
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-56 focus:outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Descrição</span>
                <input
                  type="text"
                  name="descricao"
                  placeholder="Opcional"
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-56 focus:outline-none focus:border-accent"
                />
              </label>
              <button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2 rounded transition-colors cursor-pointer"
              >
                Criar
              </button>
            </form>
          </div>
        )}

        {boloes.length === 0 && (
          <div className="bg-surface rounded-lg p-6 text-muted text-sm text-center">
            Nenhum grupo cadastrado ainda.
          </div>
        )}

        {/* Lista de grupos */}
        <div className="space-y-3">
          {boloes.map((b) => {
            const totalInvestido = b.ciclos.reduce((acc, c) => acc + c.valor_total_jogado, 0)
            const ultimoCiclo = b.ciclos.sort(
              (a, c) => new Date(c.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
            const ciclosAtivos = b.ciclos.filter(
              (c) => c.status === 'aberto' || c.status === 'rascunho'
            ).length

            return (
              <Link
                key={b.id}
                href={`/bolao/${b.id}`}
                className="block bg-surface rounded-lg p-5 hover:bg-surface/80 transition-colors border border-transparent hover:border-muted/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-brand font-semibold">{b.nome}</span>
                      {!b.ativo && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted">
                          Inativo
                        </span>
                      )}
                      {ciclosAtivos > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">
                          {ciclosAtivos} ativo{ciclosAtivos > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {b.descricao && (
                      <p className="text-muted text-xs">{b.descricao}</p>
                    )}
                    <p className="text-muted text-xs">
                      {b.ciclos.length} ciclo{b.ciclos.length !== 1 ? 's' : ''}
                      {ultimoCiclo ? ` · último: concurso #${ultimoCiclo.concurso_nr}` : ''}
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
      </main>
    </div>
  )
}
