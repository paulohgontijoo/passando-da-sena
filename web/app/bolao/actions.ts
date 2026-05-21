'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Guards ─────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

async function assertModDoBolao(supabase: SupabaseClient, userId: string, bolaoId: number) {
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', userId).single()
  if (profile?.role === 'admin') return

  const { data: membro } = await supabase
    .from('bolao_membros')
    .select('role')
    .eq('bolao_id', bolaoId)
    .eq('usuario_id', userId)
    .single()

  if (!membro || membro.role !== 'moderador') throw new Error('Acesso negado')
}

async function getBolaoIdFromCiclo(supabase: SupabaseClient, cicloId: number): Promise<number> {
  const { data } = await supabase.from('ciclos').select('bolao_id').eq('id', cicloId).single()
  if (!data) throw new Error('Ciclo não encontrado')
  return data.bolao_id
}

async function getBolaoIdFromParticipacao(supabase: SupabaseClient, participacaoId: number): Promise<number> {
  const { data } = await supabase
    .from('participacoes')
    .select('ciclos(bolao_id)')
    .eq('id', participacaoId)
    .single()
  if (!data) throw new Error('Participação não encontrada')
  return (data.ciclos as unknown as { bolao_id: number }).bolao_id
}

// ── Ciclos ────────────────────────────────────────────────

export async function editarCiclo(cicloId: number, formData: FormData) {
  const { supabase, user } = await getAuthUser()
  const bolaoId = await getBolaoIdFromCiclo(supabase, cicloId)
  await assertModDoBolao(supabase, user.id, bolaoId)

  const concurso_nr = Number(formData.get('concurso_nr'))
  const tipo_loteria = formData.get('tipo_loteria') as string
  const valor_total_jogado = Number(formData.get('valor_total_jogado'))

  if (!concurso_nr || !valor_total_jogado) throw new Error('Campos obrigatórios ausentes')

  const { error } = await supabase
    .from('ciclos')
    .update({ concurso_nr, tipo_loteria, valor_total_jogado })
    .eq('id', cicloId)

  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
  redirect('/bolao')
}

export async function atualizarStatusCiclo(cicloId: number, status: string) {
  const { supabase, user } = await getAuthUser()
  const bolaoId = await getBolaoIdFromCiclo(supabase, cicloId)
  await assertModDoBolao(supabase, user.id, bolaoId)

  const updates: Record<string, unknown> = { status }
  if (status === 'fechado') updates.fechado_at = new Date().toISOString()

  const { error } = await supabase.from('ciclos').update(updates).eq('id', cicloId)
  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
  revalidatePath(`/bolao/ciclos/${cicloId}`)
}

export async function registrarPremio(cicloId: number, premio_obtido: number) {
  const { supabase, user } = await getAuthUser()
  const bolaoId = await getBolaoIdFromCiclo(supabase, cicloId)
  await assertModDoBolao(supabase, user.id, bolaoId)

  const { error } = await supabase
    .from('ciclos')
    .update({ premio_obtido, status: 'sorteado' })
    .eq('id', cicloId)
  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
  revalidatePath(`/bolao/ciclos/${cicloId}`)
}

// ── Apostas ───────────────────────────────────────────────

function parseNumbers(raw: string, min = 6, max = 15, total = 60): number[] {
  const nums = raw
    .split(/[\s,]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= total)
  const unique = [...new Set(nums)]
  if (unique.length < min || unique.length > max) {
    throw new Error(`Insira entre ${min} e ${max} números válidos (1–${total})`)
  }
  return unique
}

export async function adicionarAposta(cicloId: number, formData: FormData) {
  const { supabase, user } = await getAuthUser()
  const bolaoId = await getBolaoIdFromCiclo(supabase, cicloId)
  await assertModDoBolao(supabase, user.id, bolaoId)

  const raw = (formData.get('numeros') as string ?? '').trim()
  const numeros = parseNumbers(raw)

  const { error } = await supabase.from('apostas').insert({
    ciclo_id: cicloId,
    numeros,
    registrado_por: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/bolao/ciclos/${cicloId}/editar`)
  revalidatePath(`/bolao/ciclos/${cicloId}`)
}

export async function excluirAposta(apostaId: number, cicloId: number) {
  const { supabase, user } = await getAuthUser()
  const bolaoId = await getBolaoIdFromCiclo(supabase, cicloId)
  await assertModDoBolao(supabase, user.id, bolaoId)

  const { error } = await supabase.from('apostas').delete().eq('id', apostaId)
  if (error) throw new Error(error.message)
  revalidatePath(`/bolao/ciclos/${cicloId}/editar`)
  revalidatePath(`/bolao/ciclos/${cicloId}`)
}

// ── Participacoes ─────────────────────────────────────────

export async function adicionarParticipante(cicloId: number, formData: FormData) {
  const { supabase, user } = await getAuthUser()
  const bolaoId = await getBolaoIdFromCiclo(supabase, cicloId)
  await assertModDoBolao(supabase, user.id, bolaoId)

  const usuario_id = formData.get('usuario_id') as string
  const num_cotas = Math.max(1, Number(formData.get('num_cotas')) || 1)
  if (!usuario_id) throw new Error('Selecione um usuário')

  const { error } = await supabase.from('participacoes').insert({
    ciclo_id: cicloId,
    usuario_id,
    status: 'aprovado',
    num_cotas,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/bolao/ciclos/${cicloId}`)
}

export async function solicitarParticipacao(cicloId: number) {
  const { supabase, user } = await getAuthUser()

  const { error } = await supabase.from('participacoes').insert({
    ciclo_id: cicloId,
    usuario_id: user.id,
    status: 'pendente',
    num_cotas: 1,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath(`/bolao/ciclos/${cicloId}`)
}

export async function aprovarParticipacao(participacaoId: number) {
  const { supabase, user } = await getAuthUser()
  const bolaoId = await getBolaoIdFromParticipacao(supabase, participacaoId)
  await assertModDoBolao(supabase, user.id, bolaoId)

  const { error } = await supabase
    .from('participacoes')
    .update({ status: 'aprovado', updated_at: new Date().toISOString() })
    .eq('id', participacaoId)
  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

export async function rejeitarParticipacao(participacaoId: number) {
  const { supabase, user } = await getAuthUser()
  const bolaoId = await getBolaoIdFromParticipacao(supabase, participacaoId)
  await assertModDoBolao(supabase, user.id, bolaoId)

  const { error } = await supabase
    .from('participacoes')
    .update({ status: 'rejeitado', updated_at: new Date().toISOString() })
    .eq('id', participacaoId)
  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

export async function marcarPagamento(participacaoId: number, valor: number) {
  const { supabase, user } = await getAuthUser()
  const bolaoId = await getBolaoIdFromParticipacao(supabase, participacaoId)
  await assertModDoBolao(supabase, user.id, bolaoId)

  const { error } = await supabase
    .from('participacoes')
    .update({ valor_pago: valor, updated_at: new Date().toISOString() })
    .eq('id', participacaoId)
  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

// ── Boloes ────────────────────────────────────────────────

export async function criarBolao(formData: FormData) {
  // Qualquer usuario autenticado pode criar um grupo
  // O trigger handle_new_bolao insere o criador como moderador automaticamente
  const { supabase, user } = await getAuthUser()
  const nome = (formData.get('nome') as string).trim()
  const descricao = (formData.get('descricao') as string | null)?.trim() || null
  if (!nome) throw new Error('Nome obrigatório')

  const { data: bolao, error } = await supabase
    .from('boloes')
    .insert({ nome, descricao, criado_por: user.id })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/bolao')
  redirect(`/bolao/${bolao.id}`)
}

export async function criarCiclo(formData: FormData) {
  const { supabase, user } = await getAuthUser()
  const bolao_id = Number(formData.get('bolao_id'))
  const concurso_nr = Number(formData.get('concurso_nr'))
  const valor_total_jogado = Number(formData.get('valor_total_jogado'))
  const numerosRaw = formData.get('numeros') as string

  if (!bolao_id || !concurso_nr || !valor_total_jogado) {
    throw new Error('Campos obrigatórios ausentes')
  }

  await assertModDoBolao(supabase, user.id, bolao_id)

  const { data: ciclo, error: cicloErr } = await supabase
    .from('ciclos')
    .insert({ bolao_id, concurso_nr, valor_total_jogado, status: 'aberto', criado_por: user.id })
    .select()
    .single()

  if (cicloErr || !ciclo) throw new Error(cicloErr?.message ?? 'Erro ao criar ciclo')

  if (numerosRaw) {
    const jogos: number[][] = JSON.parse(numerosRaw)
    if (jogos.length > 0) {
      const { error } = await supabase.from('apostas').insert(
        jogos.map((numeros) => ({ ciclo_id: ciclo.id, numeros, registrado_por: user.id }))
      )
      if (error) throw new Error(error.message)
    }
  }

  revalidatePath(`/bolao/${bolao_id}`)
  redirect(`/bolao/ciclos/${ciclo.id}`)
}

// ── Membros do grupo ──────────────────────────────────────

export async function adicionarMembro(bolaoId: number, formData: FormData) {
  const { supabase, user } = await getAuthUser()
  await assertModDoBolao(supabase, user.id, bolaoId)

  const usuario_id = formData.get('usuario_id') as string
  const role = (formData.get('role') as string) || 'apostador'
  if (!usuario_id) throw new Error('Selecione um usuário')
  if (!['moderador', 'apostador'].includes(role)) throw new Error('Role inválida')

  // Só insere se ainda não é membro — alteração de role usa alterarRoleMembro
  const { data: existing } = await supabase
    .from('bolao_membros')
    .select('id')
    .eq('bolao_id', bolaoId)
    .eq('usuario_id', usuario_id)
    .maybeSingle()

  if (existing) return // já é membro, silencia sem erro

  const { error } = await supabase.from('bolao_membros').insert({
    bolao_id: bolaoId,
    usuario_id,
    role,
    adicionado_por: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/bolao/${bolaoId}`)
}

export async function alterarRoleMembro(bolaoId: number, membroId: number, formData: FormData) {
  const { supabase, user } = await getAuthUser()
  await assertModDoBolao(supabase, user.id, bolaoId)

  const role = formData.get('role') as string
  if (!['moderador', 'apostador'].includes(role)) throw new Error('Role inválida')

  const { error } = await supabase
    .from('bolao_membros')
    .update({ role })
    .eq('id', membroId)
    .eq('bolao_id', bolaoId)
  if (error) throw new Error(error.message)
  revalidatePath(`/bolao/${bolaoId}`)
}

export async function removerMembro(bolaoId: number, membroId: number) {
  const { supabase, user } = await getAuthUser()
  await assertModDoBolao(supabase, user.id, bolaoId)

  const { error } = await supabase
    .from('bolao_membros')
    .delete()
    .eq('id', membroId)
    .eq('bolao_id', bolaoId)
  if (error) throw new Error(error.message)
  revalidatePath(`/bolao/${bolaoId}`)
}

// ── Solicitações de ingresso ──────────────────────────────

export async function solicitarIngresso(bolaoId: number) {
  const { supabase, user } = await getAuthUser()

  const { error } = await supabase.from('bolao_solicitacoes').insert({
    bolao_id: bolaoId,
    usuario_id: user.id,
    status: 'pendente',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

export async function cancelarSolicitacao(bolaoId: number) {
  const { supabase, user } = await getAuthUser()

  const { error } = await supabase
    .from('bolao_solicitacoes')
    .delete()
    .eq('bolao_id', bolaoId)
    .eq('usuario_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/bolao')
}

export async function aprovarSolicitacao(solicitacaoId: number) {
  const { supabase, user } = await getAuthUser()

  const { data: sol } = await supabase
    .from('bolao_solicitacoes')
    .select('bolao_id, usuario_id')
    .eq('id', solicitacaoId)
    .single()
  if (!sol) throw new Error('Solicitação não encontrada')

  await assertModDoBolao(supabase, user.id, sol.bolao_id)

  await supabase
    .from('bolao_solicitacoes')
    .update({ status: 'aprovado' })
    .eq('id', solicitacaoId)

  await supabase.from('bolao_membros').insert({
    bolao_id: sol.bolao_id,
    usuario_id: sol.usuario_id,
    role: 'apostador',
    adicionado_por: user.id,
  })

  revalidatePath(`/bolao/${sol.bolao_id}`)
  revalidatePath('/bolao')
}

export async function rejeitarSolicitacao(solicitacaoId: number) {
  const { supabase, user } = await getAuthUser()

  const { data: sol } = await supabase
    .from('bolao_solicitacoes')
    .select('bolao_id')
    .eq('id', solicitacaoId)
    .single()
  if (!sol) throw new Error('Solicitação não encontrada')

  await assertModDoBolao(supabase, user.id, sol.bolao_id)

  await supabase
    .from('bolao_solicitacoes')
    .update({ status: 'rejeitado' })
    .eq('id', solicitacaoId)

  revalidatePath(`/bolao/${sol.bolao_id}`)
  revalidatePath('/bolao')
}
