import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Nav } from '@/components/Nav'
import {
  aprovarParticipacao,
  rejeitarParticipacao,
  marcarPagamento,
  atualizarStatusCiclo,
  registrarPremio,
  criarBolao,
  adicionarParticipante,
} from './actions'
import type { CicloStatus, ParticipacaoStatus } from '@/types/database'

const statusLabel: Record<ParticipacaoStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

const cicloStatusLabel: Record<CicloStatus, string> = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  fechado: 'Fechado',
  sorteado: 'Sorteado',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function BolaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('nickname, role').eq('id', user.id).single()

  const isMod = profile?.role === 'admin' || profile?.role === 'moderador'

  const { data: bolaoAtivo } = await supabase
    .from('boloes').select('id, nome, descricao').eq('ativo', true)
    .order('created_at', { ascending: false }).limit(1).single()

  const { data: ciclos } = bolaoAtivo
    ? await supabase
        .from('ciclos')
        .select('id, concurso_nr, status, valor_total_jogado, valor_cota, premio_obtido, tipo_loteria, created_at')
        .eq('bolao_id', bolaoAtivo.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const cicloAtivo = ciclos?.find((c) => c.status === 'aberto' || c.status === 'rascunho') ?? null

  const { data: participacoes } = cicloAtivo
    ? await supabase
        .from('participacoes')
        .select('id, usuario_id, status, num_cotas, valor_pago, profiles(nickname)')
        .eq('ciclo_id', cicloAtivo.id)
        .order('created_at')
    : { data: [] }

  const { data: apostas } = cicloAtivo
    ? await supabase.from('apostas').select('id, numeros').eq('ciclo_id', cicloAtivo.id).order('id')
    : { data: [] }

  // Usuarios nao ainda no ciclo ativo (para adicionar diretamente)
  const participanteIds = new Set((participacoes ?? []).map((p) => p.usuario_id))
  const { data: todosUsuarios } = await supabase
    .from('profiles').select('id, nickname, role').order('nickname')
  const usuariosDisponiveis = (todosUsuarios ?? []).filter((u) => !participanteIds.has(u.id))

  const totalPago = (participacoes ?? [])
    .filter((p) => p.status === 'aprovado')
    .reduce((acc, p) => acc + p.valor_pago, 0)
  const totalDevido = (participacoes ?? [])
    .filter((p) => p.status === 'aprovado')
    .reduce((acc, p) => acc + p.num_cotas * (cicloAtivo?.valor_cota ?? 0), 0)

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-primary text-2xl font-bold">Bolão</h1>
            {bolaoAtivo && <p className="text-muted text-sm">{bolaoAtivo.nome}</p>}
          </div>
          {isMod && bolaoAtivo && (
            <Link
              href="/bolao/ciclos/novo"
              className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
            >
              + Novo Ciclo
            </Link>
          )}
        </div>

        {/* Criar bolao */}
        {!bolaoAtivo && isMod && (
          <div className="bg-surface rounded-lg p-6 space-y-4">
            <h2 className="text-brand font-semibold">Criar Bolão</h2>
            <form action={criarBolao} className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Nome</span>
                <input
                  type="text" name="nome" required placeholder="ex: Bolão dos Brothers"
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-56 focus:outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Descrição</span>
                <input
                  type="text" name="descricao" placeholder="Opcional"
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm w-56 focus:outline-none focus:border-accent"
                />
              </label>
              <button type="submit" className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2 rounded transition-colors cursor-pointer">
                Criar
              </button>
            </form>
          </div>
        )}

        {!bolaoAtivo && !isMod && (
          <div className="bg-surface rounded-lg p-6 text-muted text-sm">Nenhum bolão ativo no momento.</div>
        )}

        {/* Ciclo ativo */}
        {cicloAtivo && (
          <div className="bg-surface rounded-lg p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-brand font-semibold text-lg">Concurso #{cicloAtivo.concurso_nr}</h2>
                <span className="text-muted text-xs">{cicloStatusLabel[cicloAtivo.status as CicloStatus]}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-muted text-xs">Valor da cota</p>
                  <p className="text-highlight font-bold text-xl">{fmt(cicloAtivo.valor_cota)}</p>
                </div>
                {isMod && (
                  <Link
                    href={`/bolao/ciclos/${cicloAtivo.id}/editar`}
                    className="text-xs border border-muted/30 text-muted hover:text-brand px-3 py-1.5 rounded transition-colors"
                  >
                    Editar
                  </Link>
                )}
              </div>
            </div>

            {(apostas ?? []).length > 0 && (
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-2">Jogos ({apostas!.length})</p>
                <div className="flex flex-wrap gap-2">
                  {apostas!.map((a) => (
                    <span key={a.id} className="bg-primary rounded px-3 py-1 text-brand text-sm font-mono">
                      {[...a.numeros].sort((x, y) => x - y).join(' · ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(apostas ?? []).length === 0 && (
              <p className="text-muted text-xs">Nenhum jogo registrado ainda.</p>
            )}

            <div className="grid grid-cols-3 gap-4 border-t border-muted/20 pt-4">
              <div>
                <p className="text-muted text-xs">Total investido</p>
                <p className="text-brand font-semibold">{fmt(cicloAtivo.valor_total_jogado)}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Arrecadado</p>
                <p className={`font-semibold ${totalPago >= cicloAtivo.valor_total_jogado ? 'text-green-400' : 'text-highlight'}`}>
                  {fmt(totalPago)}
                </p>
              </div>
              <div>
                <p className="text-muted text-xs">A receber</p>
                <p className="text-accent font-semibold">{fmt(Math.max(0, totalDevido - totalPago))}</p>
              </div>
            </div>

            {isMod && cicloAtivo.status === 'aberto' && (
              <div className="flex gap-2 border-t border-muted/20 pt-4">
                <form action={atualizarStatusCiclo.bind(null, cicloAtivo.id, 'fechado')}>
                  <button type="submit" className="text-xs bg-primary border border-muted/30 text-muted hover:text-brand px-3 py-1.5 rounded cursor-pointer">
                    Fechar ciclo
                  </button>
                </form>
              </div>
            )}

            {isMod && cicloAtivo.status === 'fechado' && (
              <form action={registrarPremioAction.bind(null, cicloAtivo.id)} className="flex gap-2 items-center border-t border-muted/20 pt-4">
                <input
                  type="number" name="premio" step="0.01" min="0" placeholder="Prêmio obtido (R$)"
                  className="bg-primary border border-muted/30 rounded px-3 py-1.5 text-brand text-sm w-48 focus:outline-none focus:border-accent"
                />
                <button type="submit" className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded cursor-pointer">
                  Registrar resultado
                </button>
              </form>
            )}
          </div>
        )}

        {/* Participantes */}
        {cicloAtivo && (
          <div className="bg-surface rounded-lg p-6">
            <h2 className="text-brand font-semibold mb-4">
              Participantes
              <span className="text-muted text-xs font-normal ml-2">
                {(participacoes ?? []).filter((p) => p.status === 'aprovado').length} aprovados ·{' '}
                {(participacoes ?? []).filter((p) => p.status === 'pendente').length} pendentes
              </span>
            </h2>

            {(participacoes ?? []).length === 0 && (
              <p className="text-muted text-sm mb-4">Nenhuma solicitação ainda.</p>
            )}

            <div className="space-y-2">
              {(participacoes ?? []).map((p) => {
                const profileData = Array.isArray(p.profiles)
                  ? (p.profiles[0] as { nickname: string } | undefined)
                  : (p.profiles as { nickname: string } | null)
                const valorDevido = p.num_cotas * (cicloAtivo?.valor_cota ?? 0)
                const pago = p.valor_pago >= valorDevido && valorDevido > 0

                return (
                  <div key={p.id} className="flex items-center justify-between bg-primary rounded px-4 py-3">
                    <div className="flex items-center gap-4">
                      <span className="text-brand text-sm font-medium w-28 truncate">
                        {profileData?.nickname ?? '—'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'aprovado' ? 'bg-green-900/40 text-green-400'
                          : p.status === 'rejeitado' ? 'bg-red-900/40 text-accent'
                          : 'bg-yellow-900/40 text-highlight'
                      }`}>
                        {statusLabel[p.status as ParticipacaoStatus]}
                      </span>
                      <span className="text-muted text-xs">{p.num_cotas} cota{p.num_cotas > 1 ? 's' : ''}</span>
                    </div>

                    <div className="flex items-center gap-6">
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
                                <button type="submit" className="text-xs bg-green-800 hover:bg-green-700 text-white px-2 py-1 rounded cursor-pointer">Aprovar</button>
                              </form>
                              <form action={rejeitarParticipacao.bind(null, p.id)}>
                                <button type="submit" className="text-xs bg-red-900 hover:bg-red-800 text-white px-2 py-1 rounded cursor-pointer">Rejeitar</button>
                              </form>
                            </>
                          )}
                          {p.status === 'aprovado' && !pago && (
                            <form action={marcarPagamentoAction.bind(null, p.id, valorDevido)}>
                              <button type="submit" className="text-xs bg-primary border border-muted/30 text-muted hover:text-brand px-2 py-1 rounded cursor-pointer">Marcar pago</button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Adicionar participante diretamente */}
            {isMod && usuariosDisponiveis.length > 0 && (
              <form action={adicionarParticipanteAction.bind(null, cicloAtivo.id)} className="flex flex-wrap gap-2 items-end mt-4 pt-4 border-t border-muted/20">
                <label className="flex flex-col gap-1">
                  <span className="text-muted text-xs uppercase tracking-wide">Adicionar participante</span>
                  <select
                    name="usuario_id"
                    className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
                  >
                    {usuariosDisponiveis.map((u) => (
                      <option key={u.id} value={u.id}>{u.nickname ?? u.id}</option>
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
                <button type="submit" className="text-sm bg-primary border border-muted/30 text-muted hover:text-brand px-4 py-2 rounded cursor-pointer transition-colors">
                  + Adicionar aprovado
                </button>
              </form>
            )}
          </div>
        )}

        {/* Historico */}
        {(ciclos ?? []).filter((c) => c.status === 'sorteado' || c.status === 'fechado').length > 0 && (
          <div className="bg-surface rounded-lg p-6">
            <h2 className="text-brand font-semibold mb-4">Histórico</h2>
            <div className="space-y-2">
              {(ciclos ?? [])
                .filter((c) => c.status === 'sorteado' || c.status === 'fechado')
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-primary rounded px-4 py-3">
                    <div>
                      <span className="text-brand text-sm">Concurso #{c.concurso_nr}</span>
                      <span className="text-muted text-xs ml-3">{cicloStatusLabel[c.status as CicloStatus]}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-brand text-sm">{fmt(c.valor_total_jogado)}</p>
                        {c.premio_obtido !== null && (
                          <p className="text-green-400 text-xs">Prêmio: {fmt(c.premio_obtido)}</p>
                        )}
                      </div>
                      {isMod && (
                        <Link href={`/bolao/ciclos/${c.id}/editar`} className="text-xs text-muted hover:text-brand transition-colors">
                          Editar
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

async function registrarPremioAction(cicloId: number, formData: FormData) {
  'use server'
  const premio = Number(formData.get('premio'))
  await registrarPremio(cicloId, premio)
}

async function marcarPagamentoAction(participacaoId: number, valor: number, _fd: FormData) {
  'use server'
  await marcarPagamento(participacaoId, valor)
}

async function adicionarParticipanteAction(cicloId: number, formData: FormData) {
  'use server'
  await adicionarParticipante(cicloId, formData)
}
