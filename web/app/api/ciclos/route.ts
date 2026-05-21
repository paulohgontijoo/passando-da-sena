import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'moderador'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const formData = await req.formData()
  const bolao_id = Number(formData.get('bolao_id'))
  const concurso_nr = Number(formData.get('concurso_nr'))
  const valor_total_jogado = Number(formData.get('valor_total_jogado'))
  const numerosRaw = formData.get('numeros') as string

  if (!bolao_id || !concurso_nr || !valor_total_jogado) {
    return NextResponse.json({ error: 'Campos obrigatorios ausentes' }, { status: 400 })
  }

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

  if (cicloErr || !ciclo) {
    return NextResponse.json({ error: cicloErr?.message ?? 'Erro ao criar ciclo' }, { status: 500 })
  }

  if (numerosRaw) {
    const jogos: number[][] = JSON.parse(numerosRaw)
    const apostasPayload = jogos.map((numeros) => ({
      ciclo_id: ciclo.id,
      numeros,
      registrado_por: user.id,
    }))
    const { error: apostasErr } = await supabase.from('apostas').insert(apostasPayload)
    if (apostasErr) {
      return NextResponse.json({ error: apostasErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ciclo_id: ciclo.id })
}
