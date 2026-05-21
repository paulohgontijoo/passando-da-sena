import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Nav } from '@/components/Nav'
import { solicitarParticipacao } from '@/app/bolao/actions'
import type { CicloStatus, ParticipacaoStatus } from '@/types/database'

const statusCicloLabel: Record<CicloStatus, string> = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  fechado: 'Fechado',
  sorteado: 'Sorteado',
}

const statusParticipacaoLabel: Record<ParticipacaoStatus, string> = {
  pendente: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

const statusParticipacaoColor: Record<ParticipacaoStatus, string> = {
  pendente: 'text-highlight',
  aprovado: 'text-green-400',
  rejeitado: 'text-accent',
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', user.id)
    .single()

  const { data: bolaoAtivo } = await supabase
    .from('boloes')
    .select('id, nome')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const cicloAtivo = bolaoAtivo
    ? (await supabase
        .from('ciclos')
        .select('id, concurso_nr, status, valor_total_jogado, valor_cota, premio_obtido, tipo_loteria')
        .eq('bolao_id', bolaoAtivo.id)
        .in('status', ['aberto', 'fechado'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      ).data
    : null

  const apostas = cicloAtivo
    ? (await supabase
        .from('apostas')
        .select('id, numeros')
        .eq('ciclo_id', cicloAtivo.id)
        .order('id')
      ).data ?? []
    : []

  const participacao = cicloAtivo
    ? (await supabase
        .from('participacoes')
        .select('id, status, num_cotas, valor_pago')
        .eq('ciclo_id', cicloAtivo.id)
        .eq('usuario_id', user.id)
        .single()
      ).data
    : null

  const valorDevido = participacao && cicloAtivo
    ? participacao.num_cotas * cicloAtivo.valor_cota
    : 0

  const isMod = profile?.role === 'admin' || profile?.role === 'moderador'

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-primary text-2xl font-bold">Dashboard</h1>
          {bolaoAtivo && <p className="text-muted text-sm mt-1">{bolaoAtivo.nome}</p>}
        </div>

        {!bolaoAtivo && (
          <div className="bg-surface rounded-lg p-6 text-muted text-sm">
            Nenhum bolao ativo no momento.
            {isMod && (
              <a href="/bolao" className="text-accent ml-2 hover:underline">Criar bolao</a>
            )}
          </div>
        )}

        {cicloAtivo && (
          <div className="bg-surface rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-brand font-semibold">
                  Concurso #{cicloAtivo.concurso_nr}
                </h2>
                <span className="text-muted text-xs capitalize">
                  {statusCicloLabel[cicloAtivo.status as CicloStatus]}
                </span>
              </div>
              <div className="text-right">
                <p className="text-muted text-xs">Valor da cota</p>
                <p className="text-highlight font-bold text-lg">{fmt(cicloAtivo.valor_cota)}</p>
              </div>
            </div>

            {apostas.length > 0 && (
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-2">
                  Jogos registrados ({apostas.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {apostas.map((a) => (
                    <div key={a.id} className="bg-primary rounded px-3 py-1 text-sm">
                      <span className="text-brand font-mono">
                        {[...a.numeros].sort((x, y) => x - y).join(' · ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-muted/20">
              <div>
                <p className="text-muted text-xs">Total investido</p>
                <p className="text-brand font-semibold">{fmt(cicloAtivo.valor_total_jogado)}</p>
              </div>
              {cicloAtivo.premio_obtido !== null && (
                <div>
                  <p className="text-muted text-xs">Premio obtido</p>
                  <p className="text-green-400 font-semibold">{fmt(cicloAtivo.premio_obtido)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {cicloAtivo && (
          <div className="bg-surface rounded-lg p-6">
            <h2 className="text-brand font-semibold mb-4">Sua Participação</h2>

            {!participacao && (
              <div className="space-y-3">
                <p className="text-muted text-sm">Você ainda não solicitou participação neste ciclo.</p>
                <form action={solicitarParticipacao.bind(null, cicloAtivo.id)}>
                  <button
                    type="submit"
                    className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2 rounded transition-colors cursor-pointer"
                  >
                    Solicitar participação
                  </button>
                </form>
              </div>
            )}

            {participacao && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-muted text-xs">Status</p>
                  <p className={`font-semibold text-sm ${statusParticipacaoColor[participacao.status as ParticipacaoStatus]}`}>
                    {statusParticipacaoLabel[participacao.status as ParticipacaoStatus]}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">Cotas</p>
                  <p className="text-brand font-semibold">{participacao.num_cotas}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Valor devido</p>
                  <p className="text-brand font-semibold">
                    {participacao.status === 'aprovado' ? fmt(valorDevido) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">Valor pago</p>
                  <p className={`font-semibold ${participacao.valor_pago >= valorDevido && valorDevido > 0 ? 'text-green-400' : 'text-highlight'}`}>
                    {fmt(participacao.valor_pago)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
