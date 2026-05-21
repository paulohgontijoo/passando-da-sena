export type UserRole = 'admin' | 'moderador' | 'apostador'
export type CicloStatus = 'rascunho' | 'aberto' | 'fechado' | 'sorteado'
export type ParticipacaoStatus = 'pendente' | 'aprovado' | 'rejeitado'

export interface Profile {
  id: string
  nickname: string
  telefone: string
  role: UserRole
  created_at: string
}

export interface Bolao {
  id: number
  nome: string
  descricao: string | null
  ativo: boolean
  criado_por: string
  created_at: string
}

export interface Ciclo {
  id: number
  bolao_id: number
  concurso_nr: number
  status: CicloStatus
  valor_total_jogado: number
  valor_cota: number
  premio_obtido: number | null
  criado_por: string
  created_at: string
  fechado_at: string | null
}

export interface Aposta {
  id: number
  ciclo_id: number
  numeros: number[]
  registrado_por: string
  created_at: string
}

export interface Participacao {
  id: number
  ciclo_id: number
  usuario_id: string
  status: ParticipacaoStatus
  num_cotas: number
  valor_pago: number
  created_at: string
  updated_at: string
}

// Joins usados nas queries
export interface ParticipacaoComPerfil extends Participacao {
  profiles: Pick<Profile, 'nickname' | 'role'>
  valor_devido: number // num_cotas * ciclo.valor_cota — calculado no cliente
}

export interface CicloComBolao extends Ciclo {
  boloes: Pick<Bolao, 'nome'>
}
