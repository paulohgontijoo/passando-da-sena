import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Nav } from '@/components/Nav'
import { editarCiclo, adicionarAposta, excluirAposta, atualizarStatusCiclo } from '@/app/bolao/actions'

const LOTERIAS = [
  { value: 'megasena', label: 'Mega-Sena' },
  { value: 'quina', label: 'Quina' },
  { value: 'lotofacil', label: 'Lotofácil' },
  { value: 'lotomania', label: 'Lotomania' },
  { value: 'timemania', label: 'Timemania' },
  { value: 'dupla_sena', label: 'Dupla Sena' },
]

const STATUS_OPTS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'aberto', label: 'Aberto' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'sorteado', label: 'Sorteado' },
]

type Params = { params: Promise<{ id: string }> }

export default async function EditarCicloPage({ params }: Params) {
  const { id } = await params
  const cicloId = Number(id)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'moderador'].includes(profile.role)) redirect('/dashboard')

  const { data: ciclo } = await supabase
    .from('ciclos')
    .select('id, concurso_nr, status, valor_total_jogado, valor_cota, tipo_loteria, bolao_id')
    .eq('id', cicloId)
    .single()
  if (!ciclo) redirect('/bolao')

  const { data: apostas } = await supabase
    .from('apostas')
    .select('id, numeros')
    .eq('ciclo_id', cicloId)
    .order('id')

  const editarAction = editarCiclo.bind(null, cicloId)
  const adicionarApostaAction = adicionarAposta.bind(null, cicloId)

  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/bolao" className="text-muted text-sm hover:text-accent transition-colors">
            ← Voltar
          </Link>
          <h1 className="text-primary text-2xl font-bold">Editar Ciclo #{ciclo.concurso_nr}</h1>
        </div>

        {/* Dados do ciclo */}
        <div className="bg-surface rounded-lg p-6 space-y-4">
          <h2 className="text-brand font-semibold">Dados do Concurso</h2>
          <form action={editarAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Loteria</span>
                <select
                  name="tipo_loteria"
                  defaultValue={ciclo.tipo_loteria}
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
                >
                  {LOTERIAS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wide">Número do Concurso</span>
                <input
                  type="number"
                  name="concurso_nr"
                  defaultValue={ciclo.concurso_nr}
                  min="1"
                  required
                  className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Valor Total Investido (R$)</span>
              <input
                type="number"
                name="valor_total_jogado"
                defaultValue={ciclo.valor_total_jogado}
                min="0"
                step="0.01"
                required
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
              />
            </label>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-muted text-xs">Valor da cota atual</p>
                <p className="text-highlight font-semibold">
                  {ciclo.valor_cota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-5 py-2 rounded transition-colors cursor-pointer"
              >
                Salvar dados
              </button>
            </div>
          </form>
        </div>

        {/* Status */}
        <div className="bg-surface rounded-lg p-6 space-y-3">
          <h2 className="text-brand font-semibold">Status do Ciclo</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTS.map((s) => (
              <form key={s.value} action={atualizarStatusCiclo.bind(null, cicloId, s.value)}>
                <button
                  type="submit"
                  className={`text-sm px-4 py-1.5 rounded border cursor-pointer transition-colors ${
                    ciclo.status === s.value
                      ? 'bg-accent border-accent text-white'
                      : 'bg-primary border-muted/30 text-muted hover:text-brand'
                  }`}
                >
                  {s.label}
                </button>
              </form>
            ))}
          </div>
        </div>

        {/* Apostas */}
        <div className="bg-surface rounded-lg p-6 space-y-4">
          <h2 className="text-brand font-semibold">
            Jogos Registrados
            <span className="text-muted text-xs font-normal ml-2">({apostas?.length ?? 0})</span>
          </h2>

          {(apostas ?? []).length === 0 && (
            <p className="text-muted text-sm">Nenhum jogo registrado.</p>
          )}

          <div className="space-y-2">
            {(apostas ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-primary rounded px-4 py-2">
                <span className="text-brand text-sm font-mono">
                  {[...a.numeros].sort((x, y) => x - y).join(' · ')}
                </span>
                <form action={excluirAposta.bind(null, a.id, cicloId)}>
                  <button
                    type="submit"
                    className="text-muted text-xs hover:text-accent cursor-pointer transition-colors"
                  >
                    Remover
                  </button>
                </form>
              </div>
            ))}
          </div>

          {/* Adicionar jogo */}
          <form action={adicionarApostaAction} className="flex gap-2 items-center pt-2 border-t border-muted/20">
            <input
              type="text"
              name="numeros"
              placeholder="ex: 4 12 23 35 47 58"
              className="flex-1 bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm font-mono focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="text-sm bg-primary border border-muted/30 text-muted hover:text-brand px-4 py-2 rounded cursor-pointer"
            >
              + Adicionar jogo
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
