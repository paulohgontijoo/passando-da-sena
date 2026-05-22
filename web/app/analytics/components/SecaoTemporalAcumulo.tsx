'use client'
import { useMemo } from 'react'
import { Plot } from './PlotWrapper'
import { Sorteio, C, baseLayout, formatMoeda, formatData } from '@/types/sorteios'

interface Props { data: Sorteio[] }

export function SecaoTemporalAcumulo({ data }: Props) {
  const { datas, valores, ganhouX, ganhouY, pico } = useMemo(() => {
    const comAcumulo = data.filter(s => s.valor_acumulado != null && s.valor_acumulado > 0)
    const datas  = comAcumulo.map(s => s.data_sorteio)
    const valores = comAcumulo.map(s => s.valor_acumulado as number)

    const ganhouIdxs = comAcumulo
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => (s.ganhadores_sena ?? 0) > 0)
    const ganhouX = ganhouIdxs.map(({ s }) => s.data_sorteio)
    const ganhouY = ganhouIdxs.map(({ i }) => valores[i])

    const picoIdx = valores.indexOf(Math.max(...valores))
    const pico = comAcumulo[picoIdx]

    return { datas, valores, ganhouX, ganhouY, pico }
  }, [data])

  return (
    <section id="acumulo-temporal" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded shrink-0">03</span>
        <div>
          <h2 className="text-brand font-bold text-xl">Histórico de Acúmulos</h2>
          <p className="text-muted text-sm mt-1">
            Evolução do valor acumulado ao longo do tempo. Os pontos marcam sorteios em que alguém levou a sena.
          </p>
        </div>
      </div>

      {pico && (
        <div className="border border-accent/30 rounded-lg bg-surface p-4 flex gap-8 text-brand">
          <div>
            <div className="text-accent text-2xl font-bold">{formatMoeda(pico.valor_acumulado)}</div>
            <div className="text-muted text-xs uppercase tracking-wide">Maior pote registrado</div>
          </div>
          <div>
            <div className="text-brand text-2xl font-bold">{formatData(pico.data_sorteio)}</div>
            <div className="text-muted text-xs uppercase tracking-wide">Data — concurso {pico.concurso}</div>
          </div>
          <div>
            <div className="text-brand text-2xl font-bold">{ganhouX.length}</div>
            <div className="text-muted text-xs uppercase tracking-wide">Vezes que a sena foi ganha</div>
          </div>
        </div>
      )}

      <Plot
        data={[
          {
            type: 'scatter',
            mode: 'lines',
            x: datas,
            y: valores,
            line: { color: C.accent, width: 1.5 },
            fill: 'tozeroy',
            fillcolor: C.accent + '22',
            hovertemplate: '%{x}<br>Acumulado: R$ %{y:,.0f}<extra></extra>',
            name: 'Acumulado',
          },
          {
            type: 'scatter',
            mode: 'markers',
            x: ganhouX,
            y: ganhouY,
            marker: { color: C.hi, size: 8, symbol: 'star' },
            hovertemplate: '%{x}<br>Sena ganha!<extra></extra>',
            name: 'Sena ganha',
          },
        ]}
        layout={{
          ...baseLayout({ showlegend: true, legend: { font: { color: C.text } } }),
          xaxis: { ...baseLayout().xaxis, title: 'Data' },
          yaxis: { ...baseLayout().yaxis, title: 'Valor acumulado (R$)', tickformat: ',.0f' },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: 360 }}
      />
    </section>
  )
}
