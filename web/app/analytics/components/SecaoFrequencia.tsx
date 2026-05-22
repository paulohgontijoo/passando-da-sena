'use client'
import { useMemo } from 'react'
import { Plot } from './PlotWrapper'
import { Sorteio, C, baseLayout } from '@/types/sorteios'

interface Props { data: Sorteio[] }

export function SecaoFrequencia({ data }: Props) {
  const { dezenas, freq, media, top, bottom } = useMemo(() => {
    const freq = new Array(61).fill(0)
    data.forEach(s => s.numeros.forEach(n => freq[n]++)  )
    const vals = freq.slice(1)
    const media = vals.reduce((a, b) => a + b, 0) / 60
    const sorted = [...vals.map((v, i) => ({ d: i + 1, v }))].sort((a, b) => b.v - a.v)
    const topSet  = new Set(sorted.slice(0, 5).map(x => x.d))
    const botSet  = new Set(sorted.slice(-5).map(x => x.d))
    return { dezenas: Array.from({ length: 60 }, (_, i) => i + 1), freq: freq.slice(1), media, top: sorted[0], bottom: sorted[sorted.length - 1] }
  }, [data])

  const colors = dezenas.map((d, i) => {
    const sorted = [...freq.map((v, j) => ({ d: j + 1, v }))].sort((a, b) => b.v - a.v)
    const topSet  = new Set(sorted.slice(0, 5).map(x => x.d))
    const botSet  = new Set(sorted.slice(-5).map(x => x.d))
    if (topSet.has(d)) return C.accent
    if (botSet.has(d)) return C.hi
    return C.muted
  })

  const acimaDaMedia = freq.filter(v => v > media).length

  return (
    <section id="frequencia" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded shrink-0">02</span>
        <div>
          <h2 className="text-brand font-bold text-xl">Frequência Histórica</h2>
          <p className="text-muted text-sm mt-1">
            Quantas vezes cada número de 1 a 60 foi sorteado no período selecionado.
            A linha tracejada é a média — onde estariam todas as dezenas se a distribuição fosse perfeitamente uniforme.
          </p>
        </div>
      </div>

      {/* Insight box */}
      <div className="border border-accent/30 rounded-lg bg-surface p-4 space-y-3 text-brand">
        <p className="text-brand text-sm">
          <span className="text-accent font-bold">Dezena {top.d}</span> lidera com{' '}
          <span className="text-accent font-bold">{top.v} aparições.</span>{' '}
          <span className="text-brand font-bold">Dezena {bottom.d}</span> é a menos frequente:{' '}
          <span className="text-brand font-bold">{bottom.v}x.</span>
        </p>
        <div className="flex gap-8">
          <div>
            <div className="text-hi text-2xl font-bold">{Math.round(media)}x</div>
            <div className="text-muted text-xs uppercase tracking-wide">Média geral</div>
          </div>
          <div>
            <div className="text-brand text-2xl font-bold">{acimaDaMedia}</div>
            <div className="text-muted text-xs uppercase tracking-wide">Acima da média</div>
          </div>
          <div>
            <div className="text-brand text-2xl font-bold">{top.v - bottom.v}</div>
            <div className="text-muted text-xs uppercase tracking-wide">Maior diferença</div>
          </div>
        </div>
        <p className="text-muted text-xs">
          Em {data.length.toLocaleString('pt-BR')} sorteios, diferenças de {Math.round(top.v - bottom.v)} aparições entre a mais e a
          menos frequente são esperadas pela aleatoriedade — nenhuma dezena desvia de forma estrutural.
        </p>
      </div>

      <Plot
        data={[
          {
            type: 'bar',
            x: dezenas,
            y: freq,
            marker: { color: colors },
            hovertemplate: 'Dezena %{x}<br>%{y} aparições<extra></extra>',
          },
          {
            type: 'scatter',
            mode: 'lines',
            x: [1, 60],
            y: [media, media],
            line: { color: C.text, dash: 'dot', width: 1.5 },
            hoverinfo: 'skip',
          },
        ]}
        layout={{
          ...baseLayout(),
          xaxis: { ...baseLayout().xaxis, title: 'Dezena', tickmode: 'linear', tick0: 1, dtick: 5 },
          yaxis: { ...baseLayout().yaxis, title: 'Aparições' },
          annotations: [{
            x: 60, y: media, text: `Média: ${Math.round(media)}x`,
            showarrow: false, xanchor: 'right', font: { color: C.text, size: 11 },
          }],
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: 320 }}
      />
      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: C.accent }} /> Top 5</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: C.hi }} /> Bottom 5</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: C.muted }} /> Demais</span>
      </div>
    </section>
  )
}
