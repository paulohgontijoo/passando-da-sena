import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Nav } from '@/components/Nav'
import {
  aprovarParticipacao,
  rejeitarParticipacao,
  atualizarStatusCiclo,
  registrarPremio,
  marcarPagamento,
  adicionarParticipante,
} from '@/app/bolao/actions'
import type { CicloStatus, ParticipacaoStatus } from '@/types/database'

export const dynamic = "force-dynamic"

const statusCicloLabel: Record<CicloStatus, string> = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  fechado: 'Fechado',
  sorteado: 'Sorteado',
}

const statusCicloColor: Record<CicloStatus, string> = {
  rascunho: 'bg-muted/20 text-muted',
  aberto: 'bg-green-900/40 text-green-400',
  fechado: 'bg-yellow-900/40 text-highlight',
  sorteado: 'bg-blue-900/40 text-blue-400',
}

const statusParticipacaoLabel: Record<ParticipacaoStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

const statusParticipacaoColor: Record<ParticipacaoStatus, string> = {
  pendente: 'bg-yellow-900/40 text-highlight',
  aprovado: 'bg-green-900/40 text-green-400',
  rejeitado: 'bg-red-900/40 text-accent',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Params = { params: Promise<{ id: string }> }

export default async function CicloDetalhePage({ params }: Params) {
  const { id } = await params
  const cicloId = Number(id)
  if (isNaN(cicloId)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', user.id)
    .single()

  const { data: ciclo } = await supabase
    .from('ciclos')
    .select('id, concurso_nr, status, valor_total_jogado, valor_cota, premio_obtido, created_at, fechado_at, bolao_id, boloes(id, nome)')
    .eq('id', cicloId)
    .single()

  if (!ciclo) notFound()

  const { data: apostas } = await supabase
    .from('apostas')
    .select('id, numeros')
    .eq('ciclo_id', cicloId)
    .order('id')

  const { data: rawParticipacoes } = await supabase
    .from('participacoes')
    .select('id, usuario_id, status, num_cotas, valor_pago, profiles(nickname)')
    .eq('ciclo_id', cicloId)
    .order('created_at')

  type Bolao = { id: number; nome: string }
  type CicloData = typeof ciclo & { boloes: Bolao | null }
  const cicloTyped = ciclo as unknown as CicloData

  type Participacao = {
    id: number
    usuario_id: string
    status: string
    num_cotas: number
    valor_pago: number
    profiles: { nickname: string } | null
  }
  const participacoes = (rawParticipacoes ?? []) as unknown as Participacao[]

  // Checar se usuário é mod deste grupo via bolao_membros (ou admin global)
  const { data: meuMembro } = await supabase
    .from('bolao_membros')
    .select('role')
    .eq('bolao_id', ciclo.bolao_id)
    .eq('usuario_id', user.id)
    .single()
  const isMod = profile?.role === 'admin' || meuMembro?.role === 'moderador'
  const isOwn = (uid: string) => uid === user.id

  const totalPago = participacoes
    .filter((p) => p.status === 'aprovado')
    .reduce((acc, p) => acc + p.valor_pago, 0)

  const totalDevido = participacoes
    .filter((p) => p.status === 'aprovado')
    .reduce((acc, p) => acc + p.num_cotas * ciclo.valor_cota, 0)

  // Usuários disponíveis para adicionar (mod only)
  const participanteIds = new Set(participacoes.map((p) => p.usuario_id))
  const { data: todosUsuarios } = isMod
    ? await supabase.from('profiles').select('id, nickname').order('nickname')
    : { data: [] }
  const usuariosDisponiveis = (todosUsuarios ?? []).filter((u) => !participanteIds.has(u.id))

  // Minha participação
  const minhaParticipacao = participacoes.find((p) => p.usuario_id === user.id)

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link
              href={`/bolao/${cicloTyped.boloes?.id ?? ''}`}
              className="text-muted text-xs hover:text-brand transition-colors"
            >
              ← {cicloTyped.boloes?.nome ?? 'Voltar'}
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-primary text-2xl font-bold">
                Concurso #{ciclo.concurso_nr}
              </h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusCicloColor[ciclo.status as CicloStatus]}`}>
                {statusCicloLabel[ciclo.status as CicloStatus]}
              </span>
            </div>
            {cicloTyped.boloes && (
              <p className="text-muted text-sm mt-0.5">{cicloTyped.boloes.nome}</p>
            )}
          </div>
          {isMod && (
            <Link
              href={`/bolao/ciclos/${cicloId}/editar`}
              className="text-xs border border-muted/30 text-muted hover:text-brand px-3 py-1.5 rounded transition-colors"
            >
              Editar
            </Link>
          )}
        </div>

        {/* Métricas */}
        <div className="bg-surface rounded-lg p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-muted text-xs">Valor da cota</p>
            <p className="text-highlight font-bold text-lg">{fmt(ciclo.valor_cota)}</p>
          </div>
          <div>
            <p className="text-muted text-xs">Total jogado</p>
            <p className="text-brand font-semibold">{fmt(ciclo.valor_total_jogado)}</p>
          </div>
          <div>
            <p className="text-muted text-xs">Arrecadado</p>
            <p className={`font-semibold ${totalPago >= ciclo.valor_total_jogado && ciclo.valor_total_jogado > 0 ? 'text-green-400' : 'text-highlight'}`}>
              {fmt(totalPago)}
            </p>
          </div>
          {ciclo.premio_obtido !== null ? (
            <div>
              <p className="text-muted text-xs">Prêmio obtido</p>
              <p className="text-green-400 font-semibold">{fmt(ciclo.premio_obtido)}</p>
            </div>
          ) : (
            <div>
              <p className="text-muted text-xs">A receber</p>
              <p className="text-accent font-semibold">{fmt(Math.max(0, totalDevido - totalPago))}</p>
            </div>
          )}
        </div>

        {/* Minha participação (apostadores) */}
        {!isMod && (
          <div className="bg-surface rounded-lg p-5">
            <h2 className="text-brand font-semibold mb-3">Minha participação</h2>
            {!minhaParticipacao ? (
              <p className="text-muted text-sm">Você não participa deste ciclo.</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-muted text-xs">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusParticipacaoColor[minhaParticipacao.status as ParticipacaoStatus]}`}>
                    {statusParticipacaoLabel[minhaParticipacao.status as ParticipacaoStatus]}
                  </span>
                </div>
                <div>
                  <p className="text-muted text-xs">Cotas</p>
                  <p className="text-brand font-semibold">{minhaParticipacao.num_cotas}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Pago / Devido</p>
                  <p className="text-brand font-semibold text-sm">
                    {fmt(minhaParticipacao.valor_pago)} / {fmt(minhaParticipacao.num_cotas * ciclo.valor_cota)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Apostas */}
        {(apostas ?? []).length > 0 && (
          <div className="bg-surface rounded-lg p-5">
            <h2 className="text-brand font-semibold mb-3">
              Jogos registrados
              <span className="text-muted text-xs font-normal ml-2">({apostas!.length})</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {apostas!.map((a) => (
                <span key={a.id} className="bg-primary rounded px-3 py-1.5 text-brand text-sm font-mono">
                  {[...a.numeros].sort((x, y) => x - y).join(' · ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Participantes */}
        <div className="bg-surface rounded-lg p-5">
          <h2 className="text-brand font-semibold mb-4">
            Participantes
            <span className="text-muted text-xs font-normal ml-2">
              {participacoes.filter((p) => p.status === 'aprovado').length} aprovados ·{' '}
              {participacoes.filter((p) => p.status === 'pendente').length} pendentes
            </span>
          </h2>

          {participacoes.length === 0 && (
            <p className="text-muted text-sm">Nenhuma solicitação ainda.</p>
          )}

          <div className="space-y-2">
            {participacoes.map((p) => {
              const valorDevido = p.num_cotas * ciclo.valor_cota
              const pago = p.valor_pago >= valorDevido && valorDevido > 0

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded px-4 py-3 ${isOwn(p.usuario_id) ? 'bg-accent/10 border border-accent/30' : 'bg-primary'}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-brand text-sm font-medium w-28 truncate">
                      {p.profiles?.nickname ?? '—'}
                      {isOwn(p.usuario_id) && (
                        <span className="text-muted text-xs ml-1">(você)</span>
                      )}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusParticipacaoColor[p.status as ParticipacaoStatus]}`}>
                      {statusParticipacaoLabel[p.status as ParticipacaoStatus]}
                    </span>
                    <span className="text-muted text-xs hidden sm:block">
                      {p.num_cotas} cota{p.num_cotas > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {p.status === 'aprovado' && (
                      <div className="text-right">
                        <p className="text-muted text-xs">{fmt(p.valor_pago)} / {fmt(valorDevido)}</p>
                        <p className={`text-xs font-medium ${pago ? 'text-green-400' : 'text-highlight'}`}>
                          {pago ? 'Pago' : 'Pendente'}
                        </p>
                      </div>
                    )}

                    {isMod && (
                      <div className="flex gap-2">
                        {p.status === 'pendente' && (
                          <>
                            <form action={aprovarParticipacao.bind(null, p.id)}>
                              <button type="submit" className="text-xs bg-green-800 hover:bg-green-700 text-white px-2 py-1 rounded cursor-pointer">
                                Aprovar
                              </button>
                            </form>
                            <form action={rejeitarParticipacao.bind(null, p.id)}>
                              <button type="submit" className="text-xs bg-red-900 hover:bg-red-800 text-white px-2 py-1 rounded cursor-pointer">
                                Rejeitar
                              </button>
                            </form>
                          </>
                        )}
                        {p.status === 'aprovado' && !pago && (
                          <form action={marcarPagamentoComValor.bind(null, p.id, valorDevido)}>
                            <button type="submit" className="text-xs border border-muted/30 text-muted hover:text-brand px-2 py-1 rounded cursor-pointer">
                              Marcar pago
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Adicionar participante (mod) */}
          {isMod && usuariosDisponiveis.length > 0 && (
            <form
              action={adicionarParticipante.bind(null, cicloId)}
              className="flex flex-wrap gap-2 items-end mt-4 pt-4 border-t border-muted/20"
            >
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Adicionar</span>
                <select
                  name="usuario_id"
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
                >
                  {usuariosDisponiveis.map((u) => (
                    <option key={u.id} value={u.id}>{u.nickname}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Cotas</span>
                <input
                  type="number" name="num_cotas" defaultValue="1" min="1"
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-20 focus:outline-none focus:border-accent"
                />
              </label>
              <button type="submit" className="text-sm border border-muted/30 text-muted hover:text-brand px-4 py-2 rounded cursor-pointer transition-colors">
                + Adicionar aprovado
              </button>
            </form>
          )}
        </div>

        {/* Ações do ciclo (mod) */}
        {isMod && (
          <div className="bg-surface rounded-lg p-5 space-y-4">
            <h2 className="text-brand font-semibold">Ações do ciclo</h2>

            {ciclo.status === 'aberto' && (
              <form action={atualizarStatusCiclo.bind(null, cicloId, 'fechado')}>
                <button type="submit" className="text-xs border border-muted/30 text-muted hover:text-brand px-3 py-1.5 rounded cursor-pointer transition-colors">
                  Fechar ciclo
                </button>
              </form>
            )}

            {ciclo.status === 'rascunho' && (
              <form action={atualizarStatusCiclo.bind(null, cicloId, 'aberto')}>
                <button type="submit" className="text-xs bg-green-800 hover:bg-green-700 text-white px-3 py-1.5 rounded cursor-pointer">
                  Abrir ciclo
                </button>
              </form>
            )}

            {ciclo.status === 'fechado' && ciclo.premio_obtido === null && (
              <form action={registrarPremioComValor.bind(null, cicloId)} className="flex gap-2 items-center">
                <input
                  type="number" name="premio" step="0.01" min="0" placeholder="Prêmio obtido (R$)"
                  className="bg-primary border border-muted/30 rounded px-3 py-1.5 text-brand text-sm w-48 focus:outline-none focus:border-accent"
                />
                <button type="submit" className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded cursor-pointer">
                  Registrar resultado
                </button>
              </form>
            )}

            {ciclo.status === 'sorteado' && ciclo.premio_obtido !== null && (
              <p className="text-green-400 text-sm">
                Resultado registrado: {fmt(ciclo.premio_obtido)}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

async function marcarPagamentoComValor(participacaoId: number, valor: number, _fd: FormData) {
  'use server'
  await marcarPagamento(participacaoId, valor)
}

async function registrarPremioComValor(cicloId: number, formData: FormData) {
  'use server'
  const premio = Number(formData.get('premio'))
  await registrarPremio(cicloId, premio)
}
