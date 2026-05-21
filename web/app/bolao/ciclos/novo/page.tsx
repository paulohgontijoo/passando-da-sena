import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Nav } from '@/components/Nav'
import { NovoCicloForm } from './NovoCicloForm'

export default async function NovoCicloPage({ searchParams }: { searchParams: Promise<{ bolaoId?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'moderador'].includes(profile.role)) redirect('/dashboard')

  // Bolão: usa bolaoId do searchParam se fornecido, senão pega o ativo mais recente
  const params = await searchParams
  const bolaoIdParam = params.bolaoId ? Number(params.bolaoId) : null

  let bolaoQuery = supabase.from('boloes').select('id, nome')
  if (bolaoIdParam) {
    bolaoQuery = bolaoQuery.eq('id', bolaoIdParam)
  } else {
    bolaoQuery = bolaoQuery.eq('ativo', true).order('created_at', { ascending: false }).limit(1)
  }
  const { data: bolao } = await bolaoQuery.single()

  if (!bolao) redirect('/bolao')

  // Top números por frequência (apenas para Mega-Sena — o EDA existente cobre isso)
  const { data: topNumerosRaw } = await supabase.rpc('top_numeros_frequentes', { n: 20 })
  const topNumeros: { num: number; freq: number }[] = (topNumerosRaw ?? []).map(
    (r: { num: number; freq: number }) => ({ num: r.num, freq: Number(r.freq) })
  )

  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-primary text-2xl font-bold mb-6">Novo Ciclo</h1>
        <NovoCicloForm bolaoId={bolao.id} bolaoNome={bolao.nome} topNumeros={topNumeros} />
      </main>
    </div>
  )
}
