'use client'
import { useMemo } from 'react'
import { Plot } from './PlotWrapper'
import { Sorteio, C, baseLayout } from '@/types/sorteios'

const COORDS: Record<string, [number, number]> = {
  'BRASÍLIA':       [-15.7801, -47.9292],
  'BRASILIA':       [-15.7801, -47.9292],
  'SÃO PAULO':      [-23.5505, -46.6333],
  'SAO PAULO':      [-23.5505, -46.6333],
  'RIO DE JANEIRO': [-22.9068, -43.1729],
  'BELO HORIZONTE': [-19.9167, -43.9345],
  'GOIÂNIA':        [-16.6869, -49.2648],
  'GOIANIA':        [-16.6869, -49.2648],
  'CURITIBA':       [-25.4284, -49.2733],
  'PORTO ALEGRE':   [-30.0346, -51.2177],
  'SALVADOR':       [-12.9714, -38.5014],
  'FORTALEZA':      [-3.7172,  -38.5433],
  'RECIFE':         [-8.0476,  -34.8770],
  'MANAUS':         [-3.1190,  -60.0217],
  'BELÉM':          [-1.4558,  -48.4902],
  'BELEM':          [-1.4558,  -48.4902],
}

interface Props { data: Sorteio[] }

export function SecaoMapa({ data }: Props) {
  const { cidadeRows, lat, lon, sizes, labels, hovers, insights } = useMemo(() => {
    const map: Record<string, { municipio: string; uf: string; total: number; acumulados: number }> = {}

    data.forEach(s => {
      if (!s.municipio || !s.uf) return
      const key = `${s.municipio}__${s.uf}`
      if (!map[key]) map[key] = { municipio: s.municipio, uf: s.uf, total: 0, acumulados: 0 }
      map[key].total++
      if (s.acumulou) map[key].acumulados++
    })

    const cidadeRows = Object.values(map).sort((a, b) => b.total - a.total)
    const withCoords = cidadeRows.map(r => {
      const coord = COORDS[r.municipio] ?? COORDS[r.municipio.normalize('NFD').replace(/[̀-ͯ]/g, '')]
      return { ...r, coord: coord ?? null }
    }).filter(r => r.coord)

    const maxTotal = Math.max(...withCoords.map(r => r.total), 1)
    const totalSorteios = cidadeRows.reduce((s, r) => s + r.total, 0)
    const top = cidadeRows[0]
    const topShare = totalSorteios > 0 ? (top?.total / totalSorteios * 100) : 0
    const highAccCity = cidadeRows
      .filter(r => r.total >= 20)
      .sort((a, b) => (b.acumulados / b.total) - (a.acumulados / a.total))[0]

    return {
      cidadeRows,
      lat:    withCoords.map(r => r.coord![0]),
      lon:    withCoords.map(r => r.coord![1]),
      sizes:  withCoords.map(r => 10 + (r.total / maxTotal) * 50),
      labels: withCoords.map(r => `${r.municipio}, ${r.uf}`),
      hovers: withCoords.map(r =>
        `${r.municipio}, ${r.uf}<br>${r.total} sorteios<br>${(r.acumulados / r.total * 100).toFixed(1)}% acumularam`
      ),
      insights: { top, topShare, highAccCity, totalCidades: cidadeRows.length },
    }
  }, [data])

  const { top, topShare, highAccCity, totalCidades } = insights

  return (
    <section id="mapa" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded shrink-0">06</span>
        <div>
          <h2 className="text-brand font-bold text-xl">Onde os Sorteios Acontecem</h2>
          <p className="text-muted text-sm mt-1">
            Distribuição geográfica dos sorteios. O tamanho da bolha é proporcional ao número de concursos realizados em cada cidade.
          </p>
        </div>
      </div>

      {top && (
        <div className="border border-accent/30 rounded-lg bg-surface p-4 space-y-3 text-brand">
          <p className="text-brand text-sm">
            <span className="text-accent font-bold">{top.municipio}</span> domina com{' '}
            <span className="text-accent font-bold">{top.total.toLocaleString('pt-BR')} sorteios</span>{' '}
            — <span className="text-brand font-bold">{topShare.toFixed(1)}%</span> de todos no período.
            {highAccCity && (
              <>{' '}<span className="text-hi font-bold">{highAccCity.municipio}</span> tem a maior taxa de
              acúmulo entre cidades relevantes:{' '}
              <span className="text-hi font-bold">
                {(highAccCity.acumulados / highAccCity.total * 100).toFixed(1)}%
              </span>{' '}
              dos seus sorteios não tiveram ganhador.</>
            )}
          </p>
          <div className="flex gap-8">
            <div>
              <div className="text-accent text-2xl font-bold">{top.total.toLocaleString('pt-BR')}</div>
              <div className="text-muted text-xs uppercase tracking-wide">Sorteios em {top.municipio.split(' ')[0]}</div>
            </div>
            <div>
              <div className="text-brand text-2xl font-bold">{totalCidades}</div>
              <div className="text-muted text-xs uppercase tracking-wide">Cidades distintas</div>
            </div>
            {highAccCity && (
              <div>
                <div className="text-hi text-2xl font-bold">
                  {(highAccCity.acumulados / highAccCity.total * 100).toFixed(0)}%
                </div>
                <div className="text-muted text-xs uppercase tracking-wide">
                  Acúmulo em {highAccCity.municipio.split(' ')[0]}
                </div>
              </div>
            )}
          </div>
          <p className="text-muted text-xs">
            A concentração em poucas cidades reflete a logística histórica dos sorteios da Caixa, não influência nos resultados.
          </p>
        </div>
      )}

      <Plot
        data={[{
          type: 'scattergeo',
          lat, lon,
          text: labels,
          hovertext: hovers,
          hoverinfo: 'text',
          mode: 'markers' as any,
          textposition: 'top center',
          textfont: { color: C.text, size: 11 },
          marker: { size: sizes, color: C.accent, opacity: 0.7, line: { color: C.hi, width: 1 } },
        }]}
        layout={{
          paper_bgcolor: C.bg,
          font: { color: C.text, family: 'Inter, sans-serif' },
          margin: { t: 10, r: 0, b: 0, l: 0 },
          geo: {
            scope: 'south america',
            resolution: 50,
            showland: true, landcolor: C.surface,
            showocean: true, oceancolor: C.bg,
            showframe: false,
            showcountries: true, countrycolor: C.grid,
            bgcolor: C.bg,
            center: { lat: -15, lon: -52 },
            projection: { scale: 3 },
          },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: 400 }}
      />

      <div>
        <h3 className="text-brand text-sm font-semibold mb-2">Ranking de locais</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-muted/20 text-muted text-xs uppercase">
                <th className="text-left py-2 pr-4">#</th>
                <th className="text-left py-2 pr-4">Cidade</th>
                <th className="text-right py-2 pr-4">Sorteios</th>
                <th className="text-right py-2">% Acumulados</th>
              </tr>
            </thead>
            <tbody>
              {cidadeRows.slice(0, 10).map((r, i) => (
                <tr key={`${r.municipio}-${r.uf}`} className="border-b border-muted/10 hover:bg-surface/50">
                  <td className="py-2 pr-4 text-muted">{i + 1}</td>
                  <td className="py-2 pr-4 text-brand">{r.municipio}, {r.uf}</td>
                  <td className="py-2 pr-4 text-right text-brand">{r.total.toLocaleString('pt-BR')}</td>
                  <td className="py-2 text-right" style={{ color: r.acumulados / r.total > 0.6 ? C.accent : C.text }}>
                    {(r.acumulados / r.total * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
