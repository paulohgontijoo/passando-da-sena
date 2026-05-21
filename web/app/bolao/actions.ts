'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function assertMod() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'moderador'].includes(profile.role)) {
    throw new Error('Acesso negado')
  }
  return { supabase, user }
}

// ── Ciclos ────────────────────────────────────────────────

export async function criarCiclo(formData: FormData) {
  const { supabase, user } = await assertMod()

  const bolao_id = Number(formData.get('bolao_id'))
  const concurso_nr = Number(formData.get('concurso_nr'))
  const valor_total_jogado = Number(formData.get('valor_total_jogado'))
  const numerosRaw = formData.get('numeros') as string // JSON string de arrays

  if (!bolao_id || !concurso_nr || !valor_total_jogado) {
    throw new Error('Campos obrigatorios ausentes')
  }

  // Cria o ciclo
  const { data: ciclo, error: cicloErr } = await supabase
    .from('ciclos')
    .insert({
      bolao_id,
      concurso_nr,
      valor_total_jogado,
      status: 'aberto',
      criado_por: user.id,
    })
    .select()
    .single()

  if (cicloErr || !ciclo) throw new Error(cicloErr?.message ?? 'Erro ao criar ciclo')

  // Registra as apostas (array de arrays de numeros)
  if (numerosRaw) {
    const jogos: number[][] = JSON.parse(numerosRaw)
    const apostasPayload = jogos.map((numeros) => ({
      ciclo_id: ciclo.id,
      numeros,
      registrado_por: user.id,
    }))
    const { error: apostasErr } = await supabase.from('apostas').insert(apostasPayload)
    if (apostasErr) throw new Error(apostasErr.message)
  }

  revalidatePath('/bolao')
  redirect('/bolao')
}

export async function atualizarStatusCiclo(cicloId: number, status: string) {
  const { supabase } = await assertMod()
  const updates: Record<string, unknown> = { status }
  if (status === 'fechado') updates.fechado_at = new Date().toISOString()

  const { error } = await supabase
    .from('ciclos')
    .update(updates)
    .eq('id', cicloId)

  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

export async function registrarPremio(cicloId: number, premio_obtido: number) {
  const { supabase } = await assertMod()
  const { error } = await supabase
    .from('ciclos')
    .update({ premio_obtido, status: 'sorteado' })
    .eq('id', cicloId)

  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

// ── Participacoes ─────────────────────────────────────────

export async function solicitarParticipacao(cicloId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('participacoes').insert({
    ciclo_id: cicloId,
    usuario_id: user.id,
    status: 'pendente',
    num_cotas: 1,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function aprovarParticipacao(participacaoId: number) {
  const { supabase } = await assertMod()
  const { error } = await supabase
    .from('participacoes')
    .update({ status: 'aprovado', updated_at: new Date().toISOString() })
    .eq('id', participacaoId)

  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

export async function rejeitarParticipacao(participacaoId: number) {
  const { supabase } = await assertMod()
  const { error } = await supabase
    .from('participacoes')
    .update({ status: 'rejeitado', updated_at: new Date().toISOString() })
    .eq('id', participacaoId)

  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

export async function marcarPagamento(participacaoId: number, valor: number) {
  const { supabase } = await assertMod()
  const { error } = await supabase
    .from('participacoes')
    .update({ valor_pago: valor, updated_at: new Date().toISOString() })
    .eq('id', participacaoId)

  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

// ── Boloes ────────────────────────────────────────────────

export async function criarBolao(formData: FormData) {
  const { supabase, user } = await assertMod()
  const nome = (formData.get('nome') as string).trim()
  const descricao = (formData.get('descricao') as string | null)?.trim() || null

  if (!nome) throw new Error('Nome obrigatorio')

  const { error } = await supabase.from('boloes').insert({
    nome,
    descricao,
    criado_por: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}
