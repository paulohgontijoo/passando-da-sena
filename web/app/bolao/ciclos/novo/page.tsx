'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NovoCicloPage() {
  const router = useRouter()
  const [jogos, setJogos] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addJogo() {
    setJogos((prev) => [...prev, ''])
  }

  function removeJogo(idx: number) {
    setJogos((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateJogo(idx: number, value: string) {
    setJogos((prev) => prev.map((v, i) => (i === idx ? value : v)))
  }

  function parseJogo(raw: string): number[] | null {
    const nums = raw
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 60)
    const unique = [...new Set(nums)]
    if (unique.length < 6 || unique.length > 15) return null
    return unique
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    // Valida e serializa os jogos
    const jogosValidos: number[][] = []
    for (let i = 0; i < jogos.length; i++) {
      const parsed = parseJogo(jogos[i])
      if (!parsed) {
        setError(`Jogo ${i + 1}: insira entre 6 e 15 numeros validos (1-60), separados por espaco ou virgula.`)
        return
      }
      jogosValidos.push(parsed)
    }

    formData.set('numeros', JSON.stringify(jogosValidos))
    setLoading(true)

    try {
      const resp = await fetch('/api/ciclos', {
        method: 'POST',
        body: formData,
      })
      if (!resp.ok) {
        const data = await resp.json()
        setError(data.error ?? 'Erro ao criar ciclo.')
        return
      }
      router.push('/bolao')
    } catch {
      setError('Erro de conexao.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="bg-primary border-b border-muted/20 px-6 py-3 flex items-center gap-6">
        <span className="text-brand font-bold text-lg">Passando da Sena</span>
        <Link href="/bolao" className="text-muted text-sm hover:text-accent transition-colors">
          ← Voltar ao Bolao
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-primary text-2xl font-bold mb-6">Novo Ciclo</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-surface rounded-lg p-6 space-y-4">
            <h2 className="text-brand font-semibold">Dados do Concurso</h2>

            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Bolao ID</span>
              <input
                type="number"
                name="bolao_id"
                required
                min="1"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Numero do Concurso</span>
              <input
                type="number"
                name="concurso_nr"
                required
                min="1"
                placeholder="ex: 2850"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Valor Total Investido (R$)</span>
              <input
                type="number"
                name="valor_total_jogado"
                required
                min="0"
                step="0.01"
                placeholder="ex: 150.00"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="bg-surface rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-brand font-semibold">Jogos</h2>
              <button
                type="button"
                onClick={addJogo}
                className="text-xs text-accent hover:underline cursor-pointer"
              >
                + Adicionar jogo
              </button>
            </div>
            <p className="text-muted text-xs">
              Insira os numeros de cada jogo separados por espaco ou virgula (6 a 15 numeros, 1–60).
            </p>

            <div className="space-y-3">
              {jogos.map((jogo, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-muted text-xs w-12">Jogo {idx + 1}</span>
                  <input
                    type="text"
                    value={jogo}
                    onChange={(e) => updateJogo(idx, e.target.value)}
                    placeholder="ex: 4 12 23 35 47 58"
                    className="flex-1 bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm font-mono focus:outline-none focus:border-accent"
                  />
                  {jogos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeJogo(idx)}
                      className="text-muted hover:text-accent text-sm cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-accent text-sm">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded transition-colors cursor-pointer"
            >
              {loading ? 'Criando...' : 'Criar Ciclo'}
            </button>
            <Link
              href="/bolao"
              className="border border-muted/30 text-muted hover:text-brand px-6 py-2 rounded text-sm transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
