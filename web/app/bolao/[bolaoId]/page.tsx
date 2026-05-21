import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Nav } from '@/components/Nav'
import { adicionarMembro, alterarRoleMembro, removerMembro } from '@/app/bolao/actions'
import type { CicloStatus } from '@/types/database'

const statusLabel: Record<CicloStatus, string> = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  fechado: 'Fechado',
  sorteado: 'Sorteado',
}

const statusColor: Record<CicloStatus, string> = {
  rascunho: 'bg-muted/20 text-muted',
  aberto: 'bg-green-900/40 text-green-400',
  fechado: 'bg-yellow-900/40 text-highlight',
  sorteado: 'bg-blue-900/40 text-blue-400',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Params = { params: Promise<{ bolaoId: string }> }

export default async function BolaoDetalhePage({ params }: Params) {
  const { bolaoId } = await params
  const id = Number(bolaoId)
  if (isNaN(id)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('nickname, role').eq('id', user.id).single()

  const { data: bolao } = await supabase
    .from('boloes').select('id, nome, descricao, ativo').eq('id', id).single()
  if (!bolao) notFound()

  const { data: ciclos } = await supabase
    .from('ciclos')
    .select('id, concurso_nr, status, valor_total_jogado, valor_cota, premio_obtido, created_at')
    .eq('bolao_id', id)
    .order('created_at', { ascending: false })

  const { data: membros } = await supabase
    .from('bolao_membros')
    .select('id, role, usuario_id, profiles(nickname)')
    .eq('bolao_id', id)
    .order('created_at')

  // Checar se o usuário atual é mod deste grupo
  const isAdmin = profile?.role === 'admin'
  const meuMembro = (membros ?? []).find((m) => m.usuario_id === user.id)
  const isMod = isAdmin || meuMembro?.role === 'moderador'

  // Usuários que ainda não são membros (para adicionar)
  const membroIds = new Set((membros ?? []).map((m) => m.usuario_id))
  const { data: todosUsuarios } = isMod
    ? await supabase.from('profiles').select('id, nickname').order('nickname')
    : { data: [] }
  const usuariosDisponiveis = (todosUsuarios ?? []).filter((u) => !membroIds.has(u.id))

  type Ciclo = {
    id: number; concurso_nr: number; status: string
    valor_total_jogado: number; valor_cota: number
    premio_obtido: number | null; created_at: string
  }

  type Membro = {
    id: number; role: string; usuario_id: string
    profiles: { nickname: string } | null
  }

  const lista = (ciclos ?? []) as Ciclo[]
  const listaMembros = (membros ?? []) as unknown as Membro[]

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/bolao" className="text-muted text-xs hover:text-brand transition-colors">
              ← Grupos
            </Link>
            <h1 className="text-primary text-2xl font-bold mt-1">{bolao.nome}</h1>
            {bolao.descricao && <p className="text-muted text-sm mt-0.5">{bolao.descricao}</p>}
          </div>
          {isMod && (
            <Link
              href={`/bolao/ciclos/novo?bolaoId=${bolao.id}`}
              className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2 rounded transition-colors shrink-0"
            >
              + Novo Ciclo
            </Link>
          )}
        </div>

        {/* Ciclos */}
        {lista.length === 0 && (
          <div className="bg-surface rounded-lg p-6 text-muted text-sm text-center">
            Nenhum ciclo neste grupo ainda.
            {isMod && (
              <Link href={`/bolao/ciclos/novo?bolaoId=${bolao.id}`} className="text-accent hover:underline ml-1">
                Criar o primeiro ciclo.
              </Link>
            )}
          </div>
        )}

        {lista.length > 0 && (
          <div className="space-y-3">
            {lista.map((ciclo) => (
              <Link
                key={ciclo.id}
                href={`/bolao/ciclos/${ciclo.id}`}
                className="block bg-surface rounded-lg p-5 hover:bg-surface/80 transition-colors border border-transparent hover:border-muted/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-brand font-semibold">Concurso #{ciclo.concurso_nr}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[ciclo.status as CicloStatus]}`}>
                        {statusLabel[ciclo.status as CicloStatus]}
                      </span>
                    </div>
                    <p className="text-muted text-xs">
                      {new Date(ciclo.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div>
                      <p className="text-muted text-xs">Total jogado</p>
                      <p className="text-brand font-semibold text-sm">{fmt(ciclo.valor_total_jogado)}</p>
                    </div>
                    {ciclo.valor_cota > 0 && (
                      <div>
                        <p className="text-muted text-xs">Valor/cota</p>
                        <p className="text-highlight text-sm">{fmt(ciclo.valor_cota)}</p>
                      </div>
                    )}
                    {ciclo.premio_obtido !== null && (
                      <div>
                        <p className="text-muted text-xs">Prêmio</p>
                        <p className="text-green-400 text-sm font-medium">{fmt(ciclo.premio_obtido)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Membros do grupo */}
        <div className="bg-surface rounded-lg p-5 space-y-4">
          <h2 className="text-brand font-semibold">
            Membros
            <span className="text-muted text-xs font-normal ml-2">({listaMembros.length})</span>
          </h2>

          <div className="space-y-2">
            {listaMembros.map((m) => {
              const isSelf = m.usuario_id === user.id
              const nickname = m.profiles?.nickname ?? '—'
              return (
                <div key={m.id} className={`flex items-center justify-between rounded px-4 py-3 ${isSelf ? 'bg-accent/10 border border-accent/30' : 'bg-primary'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-brand text-sm font-medium w-28 truncate">
                      {nickname}
                      {isSelf && <span className="text-muted text-xs ml-1">(você)</span>}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'moderador' ? 'bg-highlight/20 text-highlight' : 'bg-muted/20 text-muted'}`}>
                      {m.role === 'moderador' ? 'Moderador' : 'Apostador'}
                    </span>
                  </div>

                  {/* Ações de gestão de membro (apenas mod, não em si mesmo) */}
                  {isMod && !isSelf && (
                    <div className="flex items-center gap-2">
                      <form action={alterarRoleMembroAction.bind(null, id, m.id)}>
                        <select
                          name="role"
                          defaultValue={m.role}
                          className="bg-primary border border-muted/20 rounded px-2 py-1 text-muted text-xs focus:outline-none"
                        >
                          <option value="apostador">Apostador</option>
                          <option value="moderador">Moderador</option>
                        </select>
                        <button type="submit" className="ml-1 text-xs text-muted hover:text-brand cursor-pointer">✓</button>
                      </form>
                      <form action={removerMembroAction.bind(null, id, m.id)}>
                        <button type="submit" className="text-xs text-muted hover:text-accent cursor-pointer px-2 py-1 border border-muted/20 rounded">
                          Remover
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Adicionar membro */}
          {isMod && usuariosDisponiveis.length > 0 && (
            <form action={adicionarMembroAction.bind(null, id)} className="flex flex-wrap gap-2 items-end pt-4 border-t border-muted/20">
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Adicionar membro</span>
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
                <span className="text-muted text-xs uppercase tracking-wide">Role</span>
                <select
                  name="role"
                  defaultValue="apostador"
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
                >
                  <option value="apostador">Apostador</option>
                  <option value="moderador">Moderador</option>
                </select>
              </label>
              <button type="submit" className="text-sm border border-muted/30 text-muted hover:text-brand px-4 py-2 rounded cursor-pointer transition-colors">
                + Adicionar
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

async function adicionarMembroAction(bolaoId: number, formData: FormData) {
  'use server'
  await adicionarMembro(bolaoId, formData)
}

async function alterarRoleMembroAction(bolaoId: number, membroId: number, formData: FormData) {
  'use server'
  await alterarRoleMembro(bolaoId, membroId, formData)
}

async function removerMembroAction(bolaoId: number, membroId: number, _fd: FormData) {
  'use server'
  await removerMembro(bolaoId, membroId)
}
