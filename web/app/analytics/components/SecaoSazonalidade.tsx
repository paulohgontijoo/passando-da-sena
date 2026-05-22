'use client'
import { useMemo } from 'react'
import { Plot } from './PlotWrapper'
import { Sorteio, C, baseLayout, MESES } from '@/types/sorteios'

interface Props { data: Sorteio[] }

export function SecaoSazonalidade({ data }: Props) {
  const { meses, totais, acumulados, taxas, picoMes, calmoMes } = useMemo(() => {
    const byMes = Array.from({ length: 12 }, () => ({ total: 0, acumulados: 0 }))

    data.forEach(s => {
      const mes = new Date(s.data_sorteio).getMonth()
      byMes[mes].total++
      if (s.acumulou) byMes[mes].acumulados++
    })

    const taxas = byMes.map(m => m.total > 0 ? (m.acumulados / m.total) * 100 : 0)
    const picoMes  = taxas.indexOf(Math.max(...taxas))
    const calmoMes = taxas.indexOf(Math.min(...taxas))

    return {
      meses: MESES,
      totais: byMes.map(m => m.total),
      acumulados: byMes.map(m => m.acumulados),
      taxas,
      picoMes,
      calmoMes,
    }
  }, [data])

  const barColors = taxas.map((t, i) => i === picoMes ? C.accent : i === calmoMes ? C.hi : C.muted)

  return (
    <section id="sazonalidade" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded shrink-0">05</span>
        <div>
          <h2 className="text-brand font-bold text-xl">Sazonalidade dos Acúmulos</h2>
          <p className="text-muted text-sm mt-1">
            Em quais meses do ano os prêmios costumam acumular mais.
            Isso não prediz o futuro — reflete o padrão histórico do período selecionado.
          </p>
        </div>
      </div>

      <div className="border border-accent/30 rounded-lg bg-surface p-4 flex gap-8 text-brand">
        <div>
          <div className="text-accent text-2xl font-bold">{MESES[picoMes]}</div>
          <div className="text-muted text-xs uppercase tracking-wide">Mês com mais acúmulos</div>
          <div className="text-muted text-xs">{taxas[picoMes].toFixed(1)}% dos sorteios acumulam</div>
        </div>
        <div>
          <div className="text-hi text-2xl font-bold">{MESES[calmoMes]}</div>
          <div className="text-muted text-xs uppercase tracking-wide">Mês com menos acúmulos</div>
          <div className="text-muted text-xs">{taxas[calmoMes].toFixed(1)}% dos sorteios acumulam</div>
        </div>
        <div>
          <div className="text-brand text-2xl font-bold">
            {(data.filter(s => s.acumulou).length / data.length * 100).toFixed(1)}%
          </div>
          <div className="text-muted text-xs uppercase tracking-wide">Taxa geral de acúmulo</div>
        </div>
      </div>

      <Plot
        data={[{
          type: 'bar',
          x: meses,
          y: taxas,
          marker: { color: barColors },
          text: taxas.map(t => `${t.toFixed(1)}%`),
          textposition: 'outside',
          textfont: { color: C.text, size: 11 },
          hovertemplate: '%{x}<br>Taxa de acúmulo: %{y:.1f}%<extra></extra>',
        }]}
        layout={{
          ...baseLayout(),
          xaxis: { ...baseLayout().xaxis, title: 'Mês' },
          yaxis: { ...baseLayout().yaxis, title: 'Taxa de acúmulo (%)', range: [0, Math.max(...taxas) * 1.2] },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: 300 }}
      />
    </section>
  )
}
