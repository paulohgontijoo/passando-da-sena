import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Nav } from '@/components/Nav'
import type { CicloStatus, ParticipacaoStatus } from '@/types/database'

const statusCicloLabel: Record<CicloStatus, string> = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  fechado: 'Fechado',
  sorteado: 'Sorteado',
}

const statusParticipacaoColor: Record<ParticipacaoStatus, string> = {
  pendente: 'text-highlight',
  aprovado: 'text-green-400',
  rejeitado: 'text-accent',
}

const statusParticipacaoLabel: Record<ParticipacaoStatus, string> = {
  pendente: 'Aguardando',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Participacao = {
  id: number
  status: string
  num_cotas: number
  valor_pago: number
  ciclos: {
    id: number
    concurso_nr: number
    status: string
    valor_cota: number
    premio_obtido: number | null
    boloes: { nome: string } | null
  } | null
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', user.id)
    .single()

  const { data: rawParticipacoes } = await supabase
    .from('participacoes')
    .select('id, status, num_cotas, valor_pago, ciclos(id, concurso_nr, status, valor_cota, premio_obtido, boloes(nome))')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })

  const participacoes = (rawParticipacoes ?? []) as unknown as Participacao[]

  const ativas = participacoes.filter(
    (p) => p.ciclos?.status === 'aberto' || p.ciclos?.status === 'rascunho'
  )

  const historico = participacoes.filter(
    (p) => p.ciclos?.status === 'sorteado' || p.ciclos?.status === 'fechado'
  )

  const totalPago = participacoes
    .filter((p) => p.status === 'aprovado')
    .reduce((acc, p) => acc + p.valor_pago, 0)

  const totalPremios = participacoes
    .filter((p) => p.status === 'aprovado' && p.ciclos?.premio_obtido)
    .reduce((acc, p) => {
      const ciclo = p.ciclos!
      const totalCotas = 0 // premio_obtido is total, not per cota — show raw
      return acc + (ciclo.premio_obtido ?? 0)
    }, 0)

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-primary text-2xl font-bold">
            Olá, {profile?.nickname ?? 'jogador'} 👋
          </h1>
          <p className="text-muted text-sm mt-1">Sua participação no bolão</p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-surface rounded-lg p-4">
            <p className="text-muted text-xs uppercase tracking-wide">Participações</p>
            <p className="text-brand text-2xl font-bold mt-1">{participacoes.length}</p>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <p className="text-muted text-xs uppercase tracking-wide">Total pago</p>
            <p className="text-highlight text-2xl font-bold mt-1">{fmt(totalPago)}</p>
          </div>
          <div className="bg-surface rounded-lg p-4 col-span-2 sm:col-span-1">
            <p className="text-muted text-xs uppercase tracking-wide">Prêmios obtidos</p>
            <p className="text-green-400 text-2xl font-bold mt-1">{fmt(totalPremios)}</p>
          </div>
        </div>

        {/* Ciclos ativos */}
        {ativas.length > 0 && (
          <div className="bg-surface rounded-lg p-6 space-y-4">
            <h2 className="text-brand font-semibold">Em andamento</h2>
            {ativas.map((p) => {
              const ciclo = p.ciclos!
              const valorDevido = p.status === 'aprovado' ? p.num_cotas * ciclo.valor_cota : 0
              return (
                <Link
                  key={p.id}
                  href={`/bolao/ciclos/${ciclo.id}`}
                  className="block bg-primary rounded-lg px-4 py-3 hover:bg-primary/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand font-semibold text-sm">
                        Concurso #{ciclo.concurso_nr}
                      </p>
                      <p className="text-muted text-xs">{ciclo.boloes?.nome}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${statusParticipacaoColor[p.status as ParticipacaoStatus]}`}>
                        {statusParticipacaoLabel[p.status as ParticipacaoStatus]}
                      </span>
                      <p className="text-muted text-xs mt-0.5">
                        {p.num_cotas} cota{p.num_cotas > 1 ? 's' : ''}
                        {valorDevido > 0 ? ` · ${fmt(p.valor_pago)} / ${fmt(valorDevido)}` : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Sem participação ativa */}
        {ativas.length === 0 && (
          <div className="bg-surface rounded-lg p-6 text-center space-y-3">
            <p className="text-muted text-sm">Você não está em nenhum ciclo ativo.</p>
            <Link
              href="/dashboard"
              className="inline-block text-sm text-accent hover:underline"
            >
              Ver ciclos disponíveis →
            </Link>
          </div>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <div className="bg-surface rounded-lg p-6">
            <h2 className="text-brand font-semibold mb-4">Histórico</h2>
            <div className="space-y-2">
              {historico.map((p) => {
                const ciclo = p.ciclos!
                return (
                  <Link
                    key={p.id}
                    href={`/bolao/ciclos/${ciclo.id}`}
                    className="flex items-center justify-between bg-primary rounded px-4 py-3 hover:bg-primary/80 transition-colors"
                  >
                    <div>
                      <span className="text-brand text-sm">Concurso #{ciclo.concurso_nr}</span>
                      <span className="text-muted text-xs ml-3">{ciclo.boloes?.nome}</span>
                      <span className="text-muted text-xs ml-2">
                        · {statusCicloLabel[ciclo.status as CicloStatus]}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-brand text-sm">{fmt(p.valor_pago)}</p>
                      {ciclo.premio_obtido !== null && (
                        <p className="text-green-400 text-xs">Prêmio: {fmt(ciclo.premio_obtido)}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
