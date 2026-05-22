'use client'
import { useMemo } from 'react'
import { Sorteio, baseLayout, C } from '@/types/sorteios'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

const LABELS = Array.from({ length: 60 }, (_, i) => i + 1)
const TICK_VALS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]

const COLORSCALE = [
  [0,    '#0d1117'],
  [0.15, '#2d0a3e'],
  [0.4,  '#7b1a3a'],
  [0.65, '#c0392b'],
  [0.85, '#e67e22'],
  [1.0,  '#f9ca24'],
]

export function SecaoHeatmapPares({ data }: { data: Sorteio[] }) {
  const { matrix, zmax, insights } = useMemo(() => {
    const m: (number | null)[][] = Array.from({ length: 60 }, (_, i) =>
      Array.from({ length: 60 }, (_, j) => (i === j ? null : 0))
    )
    for (const s of data) {
      const nums = s.numeros
      for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
          const a = nums[i] - 1
          const b = nums[j] - 1
          ;(m[a][b] as number)++
          ;(m[b][a] as number)++
        }
      }
    }

    let max = 0
    let topA = 0, topB = 0
    let min = Infinity
    let minA = 0, minB = 0
    let total = 0
    let count = 0

    for (let i = 0; i < 60; i++) {
      for (let j = i + 1; j < 60; j++) {
        const v = m[i][j] as number
        total += v
        count++
        if (v > max) { max = v; topA = i + 1; topB = j + 1 }
        if (v < min) { min = v; minA = i + 1; minB = j + 1 }
      }
    }

    const avg = count > 0 ? total / count : 0
    let aboveAvg = 0
    for (let i = 0; i < 60; i++)
      for (let j = i + 1; j < 60; j++)
        if ((m[i][j] as number) > avg) aboveAvg++

    return {
      matrix: m,
      zmax: max,
      insights: { topA, topB, topCount: max, minA, minB, minCount: min, avg, aboveAvg, totalPairs: count },
    }
  }, [data])

  const { topA, topB, topCount, minA, minB, minCount, avg, aboveAvg, totalPairs } = insights

  const axisCommon = {
    tickvals: TICK_VALS,
    ticktext: TICK_VALS.map(String),
    tickfont: { size: 10, color: C.muted },
    gridcolor: 'transparent',
    linecolor: C.grid,
  }

  const layout = baseLayout({
    height: 600,
    xaxis: { ...axisCommon, title: { text: 'Dezena', font: { color: C.muted, size: 11 } } },
    yaxis: { ...axisCommon, title: { text: 'Dezena', font: { color: C.muted, size: 11 } }, autorange: 'reversed' },
    margin: { t: 20, r: 90, b: 60, l: 65 },
  })

  return (
    <section id="heatmap-pares" className="space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <span className="bg-accent text-primary text-xs font-bold w-7 h-7 rounded flex items-center justify-center shrink-0">07</span>
        <div>
          <h2 className="text-brand font-bold text-xl">Co-ocorrência de Pares</h2>
          <p className="text-muted text-sm mt-0.5">
            Quantas vezes cada par de dezenas apareceu junto no mesmo sorteio. Quanto mais quente, mais frequente.
          </p>
        </div>
      </div>

      <div className="border border-accent/30 rounded-lg bg-surface p-4 space-y-3 text-brand">
        <p className="text-brand text-sm">
          O par mais frequente é{' '}
          <span className="text-accent font-bold">dezenas {topA} e {topB}</span>, que apareceram juntas{' '}
          <span className="text-accent font-bold">{topCount} vezes</span> — cerca de{' '}
          <span className="text-brand font-bold">{((topCount / data.length) * 100).toFixed(1)}%</span> dos sorteios.
          O par menos frequente ({minA} e {minB}) apareceu apenas{' '}
          <span className="text-muted font-bold">{minCount}x</span>.
        </p>
        <div className="flex gap-8">
          <div>
            <div className="text-accent text-2xl font-bold">{topCount}</div>
            <div className="text-muted text-xs uppercase tracking-wide">Par mais frequente</div>
            <div className="text-muted text-xs">{topA} + {topB}</div>
          </div>
          <div>
            <div className="text-brand text-2xl font-bold">{Math.round(avg)}</div>
            <div className="text-muted text-xs uppercase tracking-wide">Média por par</div>
            <div className="text-muted text-xs">{totalPairs.toLocaleString('pt-BR')} pares</div>
          </div>
          <div>
            <div className="text-hi text-2xl font-bold">{aboveAvg}</div>
            <div className="text-muted text-xs uppercase tracking-wide">Pares acima da média</div>
            <div className="text-muted text-xs">{((aboveAvg / totalPairs) * 100).toFixed(0)}% do total</div>
          </div>
        </div>
        <p className="text-muted text-xs">
          Com {data.length.toLocaleString('pt-BR')} sorteios e 15 pares por jogo, a diferença entre o par mais e menos
          frequente ({topCount - minCount}x) é esperada pela variação amostral — sem evidência de favorecimento.
        </p>
      </div>

      <Plot
        data={[{
          type: 'heatmap',
          z: matrix,
          x: LABELS,
          y: LABELS,
          zmin: 0,
          zmax,
          colorscale: COLORSCALE,
          hoverongaps: false,
          hovertemplate: 'Dezena %{x} + Dezena %{y}<br><b>%{z} sorteios</b><extra></extra>',
          colorbar: {
            tickfont: { color: C.muted, size: 10 },
            outlinewidth: 0,
            thickness: 14,
            len: 0.9,
          },
          showscale: true,
        } as any]}
        layout={layout as any}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
    </section>
  )
}
