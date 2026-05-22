'use client'
import { useMemo } from 'react'
import { Plot } from './PlotWrapper'
import { Sorteio, C, baseLayout } from '@/types/sorteios'

interface Props { data: Sorteio[] }

export function SecaoParidadeSoma({ data }: Props) {
  const { paridadeCounts, somaDist, medSoma, modoPares } = useMemo(() => {
    const paridadeCounts = new Array(7).fill(0)
    const somas: number[] = []

    data.forEach(s => {
      const pares = s.numeros.filter(n => n % 2 === 0).length
      paridadeCounts[pares]++
      somas.push(s.numeros.reduce((a, b) => a + b, 0))
    })

    const medSoma = somas.reduce((a, b) => a + b, 0) / somas.length
    const modoPares = paridadeCounts.indexOf(Math.max(...paridadeCounts))

    return { paridadeCounts, somaDist: somas, medSoma, modoPares }
  }, [data])

  const paridadeLabels = ['0 pares', '1 par', '2 pares', '3 pares', '4 pares', '5 pares', '6 pares']
  const paridadeColors = paridadeCounts.map((_, i) => i === modoPares ? C.accent : C.muted)

  return (
    <section id="paridade-soma" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded shrink-0">02</span>
        <div>
          <h2 className="text-brand font-bold text-xl">Paridade e Distribuição da Soma</h2>
          <p className="text-muted text-sm mt-1">
            Composição par/ímpar dos 6 números sorteados e distribuição da soma total.
            A combinação com <strong>{modoPares} par{modoPares !== 1 ? 'es' : ''}</strong> é a mais comum.
          </p>
        </div>
      </div>

      <div className="border border-accent/30 rounded-lg bg-surface p-4 flex gap-8 text-brand">
        <div>
          <div className="text-hi text-2xl font-bold">{modoPares}p / {6 - modoPares}í</div>
          <div className="text-muted text-xs uppercase tracking-wide">Combinação mais comum</div>
        </div>
        <div>
          <div className="text-brand text-2xl font-bold">{Math.round(medSoma)}</div>
          <div className="text-muted text-xs uppercase tracking-wide">Soma média</div>
        </div>
        <div>
          <div className="text-brand text-2xl font-bold">
            {(paridadeCounts[modoPares] / data.length * 100).toFixed(1)}%
          </div>
          <div className="text-muted text-xs uppercase tracking-wide">Dos sorteios</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Plot
          data={[{
            type: 'bar',
            x: paridadeLabels,
            y: paridadeCounts,
            marker: { color: paridadeColors },
            hovertemplate: '%{x}<br>%{y} sorteios<extra></extra>',
          }]}
          layout={{
            ...baseLayout({ title: { text: 'Composição par/ímpar', font: { color: C.text, size: 13 } } }),
            xaxis: { ...baseLayout().xaxis, tickangle: -30 },
            yaxis: { ...baseLayout().yaxis, title: 'Sorteios' },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: 280 }}
        />
        <Plot
          data={[{
            type: 'histogram',
            x: somaDist,
            marker: { color: C.accent, opacity: 0.8 },
            nbinsx: 30 as any,
            hovertemplate: 'Soma ~%{x}<br>%{y} sorteios<extra></extra>',
          }]}
          layout={{
            ...baseLayout({ title: { text: 'Distribuição da soma dos 6 números', font: { color: C.text, size: 13 } } }),
            xaxis: { ...baseLayout().xaxis, title: 'Soma' },
            yaxis: { ...baseLayout().yaxis, title: 'Sorteios' },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: 280 }}
        />
      </div>
    </section>
  )
}
