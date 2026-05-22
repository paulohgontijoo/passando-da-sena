'use client'
import { useMemo, useState } from 'react'
import { Sorteio, C, formatMoeda, formatData } from '@/types/sorteios'

interface Props { data: Sorteio[] }

const PAGE_SIZE = 20

export function SecaoTabela({ data }: Props) {
  const [query, setQuery] = useState('')
  const [page, setPage]   = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return [...data].sort((a, b) => b.concurso - a.concurso)

    // 4-digit number starting with 19/20 = year → search in data_sorteio
    const isYear = /^\d{4}$/.test(q) && (q.startsWith('19') || q.startsWith('20'))
    const num = parseInt(q, 10)

    return [...data]
      .filter(s => {
        if (isYear)              return s.data_sorteio.includes(q)
        if (!isNaN(num) && num >= 1 && num <= 60) return s.numeros.includes(num)
        if (!isNaN(num))         return s.concurso === num
        return s.data_sorteio.includes(q)
      })
      .sort((a, b) => b.concurso - a.concurso)
  }, [data, query])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleQuery = (v: string) => { setQuery(v); setPage(0) }

  return (
    <section id="tabela" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded shrink-0">06</span>
        <div>
          <h2 className="text-brand font-bold text-xl">Consultar Concursos</h2>
          <p className="text-muted text-sm mt-1">
            Busque por número do concurso, dezena ou ano (ex: "2024").
          </p>
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={e => handleQuery(e.target.value)}
        placeholder="Concurso, dezena ou ano..."
        className="w-full max-w-xs bg-surface border border-muted/30 rounded px-3 py-2 text-brand text-sm placeholder-muted focus:outline-none focus:border-accent"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-muted/20 text-muted text-xs uppercase">
              <th className="text-left py-2 pr-4">Concurso</th>
              <th className="text-left py-2 pr-4">Data</th>
              <th className="text-left py-2 pr-4">Dezenas</th>
              <th className="text-center py-2 pr-4">Acumulou</th>
              <th className="text-right py-2">Prêmio Sena</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">Nenhum resultado encontrado.</td>
              </tr>
            ) : pageData.map(s => (
              <tr key={s.concurso} className="border-b border-muted/10 hover:bg-surface/50">
                <td className="py-2 pr-4 text-muted font-mono">{s.concurso}</td>
                <td className="py-2 pr-4 text-brand">{formatData(s.data_sorteio)}</td>
                <td className="py-2 pr-4">
                  <div className="flex gap-1 flex-wrap">
                    {s.numeros.map(n => (
                      <span
                        key={n}
                        className="font-mono text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: query && String(n) === query.trim() ? C.accent : C.muted + '33',
                          color: query && String(n) === query.trim() ? '#fff' : C.text,
                        }}
                      >
                        {String(n).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 pr-4 text-center">
                  {s.acumulou
                    ? <span className="text-muted text-xs">—</span>
                    : <span style={{ color: C.accent }} className="text-xs font-bold">✓</span>
                  }
                </td>
                <td className="py-2 text-right" style={{ color: (s.premio_sena ?? 0) > 0 ? C.hi : C.muted }}>
                  {formatMoeda(s.premio_sena)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 rounded border border-muted/30 text-muted disabled:opacity-30 hover:border-accent hover:text-accent transition-colors"
          >
            ‹
          </button>
          <span className="text-muted">
            {page + 1} / {totalPages} — {filtered.length} concursos
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-3 py-1 rounded border border-muted/30 text-muted disabled:opacity-30 hover:border-accent hover:text-accent transition-colors"
          >
            ›
          </button>
        </div>
      )}
    </section>
  )
}
