'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Preços oficiais da Caixa por loteria e quantidade de dezenas
const LOTERIAS = {
  megasena: {
    label: 'Mega-Sena',
    min: 6, max: 15, total: 60,
    precos: { 6: 5, 7: 35, 8: 140, 9: 420, 10: 1050, 11: 2310, 12: 4620, 13: 8580, 14: 15015, 15: 25025 } as Record<number, number>,
  },
  quina: {
    label: 'Quina',
    min: 5, max: 7, total: 80,
    precos: { 5: 2, 6: 12, 7: 42 } as Record<number, number>,
  },
  lotofacil: {
    label: 'Lotofácil',
    min: 15, max: 17, total: 25,
    precos: { 15: 3, 16: 48, 17: 408 } as Record<number, number>,
  },
} as const

type LoteriaTipo = keyof typeof LOTERIAS

const PREVIEW_PARTICIPANTES = [3, 5, 8, 10, 15, 20]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  bolaoId: number
  bolaoNome: string
  topNumeros: { num: number; freq: number }[]
}

export function NovoCicloForm({ bolaoId, bolaoNome, topNumeros }: Props) {
  const router = useRouter()
  const [loteria, setLoteria] = useState<LoteriaTipo>('megasena')
  const [concursoNr, setConcursoNr] = useState('')
  const [numNums, setNumNums] = useState<number>(LOTERIAS.megasena.min)
  const [numJogos, setNumJogos] = useState(1)
  const [mostrarJogos, setMostrarJogos] = useState(false)
  const [jogos, setJogos] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = LOTERIAS[loteria]
  const precoJogo = config.precos[numNums] ?? config.precos[config.min]
  const valorTotal = numJogos * precoJogo

  // Ao trocar loteria, resetar numNums para o mínimo
  function handleLoteria(tipo: LoteriaTipo) {
    setLoteria(tipo)
    setNumNums(LOTERIAS[tipo].min)
  }

  function addJogo() {
    setJogos((p) => [...p, ''])
  }
  function removeJogo(i: number) {
    setJogos((p) => p.filter((_, idx) => idx !== i))
  }
  function updateJogo(i: number, v: string) {
    setJogos((p) => p.map((x, idx) => (idx === i ? v : x)))
  }

  function parseJogo(raw: string): number[] | null {
    const nums = raw
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= config.total)
    const unique = [...new Set(nums)]
    if (unique.length < config.min || unique.length > config.max) return null
    return unique
  }

  // Sugerir jogos a partir dos top números (seleção circular)
  function sugerirJogos() {
    const nums = topNumeros.slice(0, 30).map((t) => t.num)
    const novasLinhas: string[] = []
    for (let j = 0; j < numJogos; j++) {
      const start = (j * numNums) % nums.length
      const slice: number[] = []
      for (let k = 0; k < numNums; k++) {
        slice.push(nums[(start + k) % nums.length])
      }
      novasLinhas.push([...new Set(slice)].sort((a, b) => a - b).join(' '))
    }
    setJogos(novasLinhas)
    setMostrarJogos(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!concursoNr || Number(concursoNr) < 1) {
      setError('Informe o número do concurso.')
      return
    }

    let numerosPayload: number[][] | undefined
    if (mostrarJogos && jogos.some((j) => j.trim())) {
      const parsedJogos: number[][] = []
      for (let i = 0; i < jogos.length; i++) {
        if (!jogos[i].trim()) continue
        const p = parseJogo(jogos[i])
        if (!p) {
          setError(`Jogo ${i + 1}: insira entre ${config.min} e ${config.max} números válidos (1–${config.total}).`)
          return
        }
        parsedJogos.push(p)
      }
      numerosPayload = parsedJogos
    }

    const fd = new FormData()
    fd.set('bolao_id', String(bolaoId))
    fd.set('concurso_nr', concursoNr)
    fd.set('tipo_loteria', loteria)
    fd.set('valor_total_jogado', String(valorTotal))
    if (numerosPayload) fd.set('numeros', JSON.stringify(numerosPayload))

    setLoading(true)
    try {
      const resp = await fetch('/api/ciclos', { method: 'POST', body: fd })
      if (!resp.ok) {
        const data = await resp.json()
        setError(data.error ?? 'Erro ao criar ciclo.')
        return
      }
      router.push('/bolao')
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bolão (read-only) */}
      <div className="bg-surface rounded-lg p-5">
        <p className="text-muted text-xs uppercase tracking-wide mb-1">Bolão</p>
        <p className="text-brand font-medium">{bolaoNome}</p>
      </div>

      {/* Dados do concurso */}
      <div className="bg-surface rounded-lg p-5 space-y-4">
        <h2 className="text-brand font-semibold">Dados do Concurso</h2>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-muted text-xs uppercase tracking-wide">Loteria</span>
            <select
              value={loteria}
              onChange={(e) => handleLoteria(e.target.value as LoteriaTipo)}
              className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
            >
              {Object.entries(LOTERIAS).map(([key, l]) => (
                <option key={key} value={key}>{l.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-muted text-xs uppercase tracking-wide">Número do Concurso</span>
            <input
              type="number"
              value={concursoNr}
              onChange={(e) => setConcursoNr(e.target.value)}
              min="1"
              placeholder="ex: 2850"
              className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-muted text-xs uppercase tracking-wide">
              Dezenas por jogo ({config.min}–{config.max})
            </span>
            <input
              type="number"
              value={numNums}
              onChange={(e) => setNumNums(Math.max(config.min, Math.min(config.max, Number(e.target.value))))}
              min={config.min}
              max={config.max}
              className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-muted text-xs uppercase tracking-wide">Quantidade de jogos</span>
            <input
              type="number"
              value={numJogos}
              onChange={(e) => setNumJogos(Math.max(1, Number(e.target.value)))}
              min="1"
              className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="bg-primary rounded p-3 flex items-center justify-between">
          <span className="text-muted text-sm">Preço por jogo</span>
          <span className="text-highlight font-mono font-semibold">{fmt(precoJogo)}</span>
        </div>
      </div>

      {/* Calculadora de custo */}
      <div className="bg-surface rounded-lg p-5 space-y-3">
        <h2 className="text-brand font-semibold">Previsão de Custo</h2>
        <div className="bg-primary rounded p-3 flex items-center justify-between mb-2">
          <span className="text-muted text-sm">Total investido ({numJogos} jogo{numJogos > 1 ? 's' : ''} × {fmt(precoJogo)})</span>
          <span className="text-highlight font-bold text-lg">{fmt(valorTotal)}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs">
              <th className="text-left pb-2">Participantes</th>
              <th className="text-right pb-2">Valor por cota</th>
            </tr>
          </thead>
          <tbody>
            {PREVIEW_PARTICIPANTES.map((n) => (
              <tr key={n} className="border-t border-muted/10">
                <td className="py-1.5 text-muted">{n} pessoas</td>
                <td className="py-1.5 text-right text-brand font-mono font-medium">
                  {fmt(valorTotal / n)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sugestão EDA */}
      {topNumeros.length > 0 && (
        <div className="bg-surface rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-brand font-semibold">Sugestão EDA</h2>
            <span className="text-muted text-xs">Top {topNumeros.length} mais frequentes (histórico Mega-Sena)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {topNumeros.map((t) => (
              <div key={t.num} className="flex flex-col items-center">
                <span className="bg-accent/20 text-accent border border-accent/30 rounded-full w-9 h-9 flex items-center justify-center text-sm font-mono font-bold">
                  {t.num}
                </span>
                <span className="text-muted text-xs mt-0.5">{t.freq}x</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={sugerirJogos}
            className="text-sm text-accent hover:underline cursor-pointer"
          >
            Gerar {numJogos} jogo{numJogos > 1 ? 's' : ''} com esses números →
          </button>
        </div>
      )}

      {/* Jogos (opcional) */}
      <div className="bg-surface rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-brand font-semibold">
            Números dos Jogos
            <span className="text-muted text-xs font-normal ml-2">(opcional — pode adicionar depois)</span>
          </h2>
          <button
            type="button"
            onClick={() => setMostrarJogos((v) => !v)}
            className="text-xs text-muted hover:text-brand cursor-pointer"
          >
            {mostrarJogos ? 'Ocultar' : 'Informar agora'}
          </button>
        </div>

        {mostrarJogos && (
          <div className="space-y-3">
            <p className="text-muted text-xs">
              {config.min}–{config.max} números de 1 a {config.total}, separados por espaço ou vírgula.
            </p>
            {jogos.map((jogo, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-muted text-xs w-14">Jogo {idx + 1}</span>
                <input
                  type="text"
                  value={jogo}
                  onChange={(e) => updateJogo(idx, e.target.value)}
                  placeholder={`${config.min} dezenas`}
                  className="flex-1 bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm font-mono focus:outline-none focus:border-accent"
                />
                {jogos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeJogo(idx)}
                    className="text-muted hover:text-accent cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addJogo}
              className="text-xs text-accent hover:underline cursor-pointer"
            >
              + Adicionar jogo
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-accent text-sm">{error}</p>}

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
  )
}
