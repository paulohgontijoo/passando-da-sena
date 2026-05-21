'use client'

import { useState, useTransition } from 'react'
import { solicitarIngresso, cancelarSolicitacao } from '@/app/bolao/actions'

type Grupo = {
  id: number
  nome: string
  descricao: string | null
  totalCiclos: number
  solicitacaoPendente: boolean
}

export default function BuscaGrupos({ grupos }: { grupos: Grupo[] }) {
  const [query, setQuery] = useState('')
  const [pending, startTransition] = useTransition()

  const filtrados = grupos.filter((g) =>
    g.nome.toLowerCase().includes(query.toLowerCase()) ||
    (g.descricao ?? '').toLowerCase().includes(query.toLowerCase())
  )

  function handleSolicitar(bolaoId: number) {
    startTransition(() => solicitarIngresso(bolaoId))
  }

  function handleCancelar(bolaoId: number) {
    startTransition(() => cancelarSolicitacao(bolaoId))
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Buscar grupo por nome ou descrição..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent placeholder:text-muted/50"
      />

      {query && filtrados.length === 0 && (
        <p className="text-muted text-sm text-center py-4">Nenhum grupo encontrado.</p>
      )}

      {(!query ? grupos : filtrados).map((g) => (
        <div
          key={g.id}
          className="bg-surface rounded-lg p-4 flex items-center justify-between gap-4"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="text-brand font-semibold text-sm truncate">{g.nome}</p>
            {g.descricao && <p className="text-muted text-xs truncate">{g.descricao}</p>}
            <p className="text-muted text-xs">{g.totalCiclos} ciclo{g.totalCiclos !== 1 ? 's' : ''}</p>
          </div>

          {g.solicitacaoPendente ? (
            <button
              onClick={() => handleCancelar(g.id)}
              disabled={pending}
              className="shrink-0 text-xs border border-muted/30 text-muted hover:text-accent hover:border-accent/40 px-3 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              Pendente · Cancelar
            </button>
          ) : (
            <button
              onClick={() => handleSolicitar(g.id)}
              disabled={pending}
              className="shrink-0 text-xs bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 px-3 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              Solicitar ingresso
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
