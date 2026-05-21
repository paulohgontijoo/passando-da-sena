'use client'

import { excluirUsuario } from '@/app/admin/usuarios/actions'

interface Props {
  userId: string
  nickname: string
}

export function ExcluirButton({ userId, nickname }: Props) {
  return (
    <form action={excluirUsuario.bind(null, userId)}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(`Excluir ${nickname}? Esta ação não pode ser desfeita.`)) {
            e.preventDefault()
          }
        }}
        className="text-xs text-muted hover:text-accent cursor-pointer px-2 py-1 border border-muted/20 rounded transition-colors"
      >
        Excluir
      </button>
    </form>
  )
}
