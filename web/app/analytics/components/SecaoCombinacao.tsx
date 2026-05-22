'use client'
import { useEffect, useMemo, useState } from 'react'
import { Plot } from './PlotWrapper'
import { Sorteio, C, baseLayout, formatMoeda, formatData } from '@/types/sorteios'
import { createClient } from '@/utils/supabase/client'

interface SimilarRow {
  concurso: number
  data_sorteio: string
  numeros: number[]
  acumulou: boolean
  premio_sena: number | null
  municipio: string | null
  uf: string | null
  matches: number
}

interface Props {
  dezenas: number[]
  allSorteios: Sorteio[]
}

export function SecaoCombinacao({ dezenas, allSorteios }: Props) {
  const [similares, setSimilares] = useState<SimilarRow[]>([])
  const [loadingSim, setLoadingSim] = useState(false)

  // Frequency of each dezena in the input vs overall average
  const freqData = useMemo(() => {
    const freqAll = new Array(61).fill(0)
    allSorteios.forEach(s => s.numeros.forEach(n => freqAll[n]++))
    const media = allSorteios.length > 0
      ? Object.values(freqAll.slice(1)).reduce((a, b) => a + b, 0) / 60
      : 0

    return dezenas.map(d => ({
      dezena: d,
      freq: freqAll[d],
      pct: media > 0 ? ((freqAll[d] - media) / media * 100) : 0,
    }))
  }, [dezenas, allSorteios])

  // Pair co-occurrence
  const pares = useMemo(() => {
    if (dezenas.length < 2) return []
    const result: { par: string; total: number }[] = []
    for (let i = 0; i < dezenas.length; i++) {
      for (let j = i + 1; j < dezenas.length; j++) {
        const a = dezenas[i], b = dezenas[j]
        const total = allSorteios.filter(s => s.numeros.includes(a) && s.numeros.includes(b)).length
        result.push({ par: `${a}–${b}`, total })
      }
    }
    return result.sort((a, b) => b.total - a.total)
  }, [dezenas, allSorteios])

  // Fetch similar draws from RPC
  useEffect(() => {
    if (dezenas.length < 4) { setSimilares([]); return }

    setLoadingSim(true)
    const supabase = createClient()
    supabase
      .rpc('sorteios_similares', { p_dezenas: dezenas, p_min: 4 })
      .then(({ data, error }) => {
        if (!error && data) setSimilares(data as SimilarRow[])
        setLoadingSim(false)
      })
  }, [dezenas])

  const barColors = freqData.map(d => d.pct >= 0 ? C.accent : C.hi)

  return (
    <section id="combinacao" className="space-y-4 border-l-2 pl-4 text-brand" style={{ borderColor: C.accent }}>
      <div className="flex items-start gap-3">
        <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded shrink-0">★</span>
        <div>
          <h2 className="text-brand font-bold text-xl">Sua Combinação</h2>
          <p className="text-muted text-sm mt-1">
            Análise das dezenas <strong>{dezenas.join(', ')}</strong> no histórico completo.
          </p>
        </div>
      </div>

      {/* Frequency bars */}
      <div>
        <h3 className="text-brand text-sm font-semibold mb-2">Frequência individual vs média</h3>
        <Plot
          data={[{
            type: 'bar',
            x: freqData.map(d => `Dezena ${d.dezena}`),
            y: freqData.map(d => d.pct),
            marker: { color: barColors },
            text: freqData.map(d => `${d.freq}x`),
            textposition: 'outside',
            textfont: { color: C.text, size: 11 },
            hovertemplate: 'Dezena %{x}<br>%{y:.1f}% vs média<extra></extra>',
          }]}
          layout={{
            ...baseLayout(),
            xaxis: { ...baseLayout().xaxis },
            yaxis: { ...baseLayout().yaxis, title: '% acima/abaixo da média', zeroline: true, zerolinecolor: C.text, zerolinewidth: 1 },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: 260 }}
        />
        <div className="flex gap-4 text-xs text-muted mt-1">
          <span style={{ color: C.accent }}>■</span> acima da média
          <span style={{ color: C.hi }}>■</span> abaixo da média
        </div>
      </div>

      {/* Pair co-occurrence */}
      {pares.length > 0 && (
        <div>
          <h3 className="text-brand text-sm font-semibold mb-2">Co-ocorrência de pares</h3>
          <p className="text-muted text-xs mb-2">Quantas vezes cada par de dezenas saiu junto no mesmo sorteio.</p>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {pares.map(p => (
              <div key={p.par} className="bg-surface rounded px-3 py-2 flex justify-between items-center">
                <span className="text-muted text-xs font-mono">{p.par}</span>
                <span className="text-brand font-bold text-sm">{p.total}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar draws */}
      <div>
        <h3 className="text-brand text-sm font-semibold mb-1">
          Sorteios com ≥4 dezenas em comum
          {dezenas.length < 4 && (
            <span className="text-muted text-xs font-normal ml-2">(insira pelo menos 4 dezenas)</span>
          )}
        </h3>
        {loadingSim && <p className="text-muted text-sm">Buscando...</p>}
        {!loadingSim && similares.length === 0 && dezenas.length >= 4 && (
          <p className="text-muted text-sm">Nenhum sorteio encontrado com ≥4 dezenas em comum.</p>
        )}
        {similares.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-muted/20 text-muted text-xs uppercase">
                  <th className="text-left py-2 pr-4">Concurso</th>
                  <th className="text-left py-2 pr-4">Data</th>
                  <th className="text-left py-2 pr-4">Dezenas</th>
                  <th className="text-center py-2 pr-4">Acertos</th>
                  <th className="text-right py-2">Prêmio</th>
                </tr>
              </thead>
              <tbody>
                {similares.slice(0, 20).map(s => (
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
                              background: dezenas.includes(n) ? C.accent : C.muted + '33',
                              color: dezenas.includes(n) ? '#fff' : C.text,
                              fontWeight: dezenas.includes(n) ? 700 : 400,
                            }}
                          >
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-center">
                      <span
                        className="font-bold text-sm px-2 py-0.5 rounded"
                        style={{ background: C.accent + '33', color: C.accent }}
                      >
                        {s.matches}/6
                      </span>
                    </td>
                    <td className="py-2 text-right" style={{ color: (s.premio_sena ?? 0) > 0 ? C.hi : C.muted }}>
                      {formatMoeda(s.premio_sena)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
