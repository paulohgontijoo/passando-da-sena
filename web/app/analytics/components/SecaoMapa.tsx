'use client'
import { useMemo } from 'react'
import { Plot } from './PlotWrapper'
import { Sorteio, C, baseLayout } from '@/types/sorteios'

// Coordenadas das cidades que aparecem nos sorteios da Mega Sena
const COORDS: Record<string, [number, number]> = {
  'BRASÍLIA':          [-15.7801, -47.9292],
  'BRASILIA':          [-15.7801, -47.9292],
  'SÃO PAULO':         [-23.5505, -46.6333],
  'SAO PAULO':         [-23.5505, -46.6333],
  'RIO DE JANEIRO':    [-22.9068, -43.1729],
  'BELO HORIZONTE':    [-19.9167, -43.9345],
  'GOIÂNIA':           [-16.6869, -49.2648],
  'GOIANIA':           [-16.6869, -49.2648],
  'CURITIBA':          [-25.4284, -49.2733],
  'PORTO ALEGRE':      [-30.0346, -51.2177],
  'SALVADOR':          [-12.9714, -38.5014],
  'FORTALEZA':         [-3.7172,  -38.5433],
  'RECIFE':            [-8.0476,  -34.8770],
  'MANAUS':            [-3.1190,  -60.0217],
  'BELÉM':             [-1.4558,  -48.4902],
  'BELEM':             [-1.4558,  -48.4902],
}

interface Props { data: Sorteio[] }

export function SecaoMapa({ data }: Props) {
  const { cidadeRows, lat, lon, sizes, labels, hovers } = useMemo(() => {
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

    return {
      cidadeRows,
      lat:    withCoords.map(r => r.coord![0]),
      lon:    withCoords.map(r => r.coord![1]),
      sizes:  withCoords.map(r => 10 + (r.total / maxTotal) * 50),
      labels: withCoords.map(r => `${r.municipio}, ${r.uf}`),
      hovers: withCoords.map(r =>
        `${r.municipio}, ${r.uf}<br>${r.total} sorteios<br>${(r.acumulados / r.total * 100).toFixed(1)}% acumularam`
      ),
    }
  }, [data])

  return (
    <section id="mapa" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded shrink-0">05</span>
        <div>
          <h2 className="text-brand font-bold text-xl">Onde os Sorteios Acontecem</h2>
          <p className="text-muted text-sm mt-1">
            Distribuição geográfica dos sorteios. O tamanho da bolha é proporcional ao número de concursos realizados em cada cidade.
          </p>
        </div>
      </div>

      <Plot
        data={[{
          type: 'scattergeo',
          lat,
          lon,
          text: labels,
          hovertext: hovers,
          hoverinfo: 'text',
          mode: 'markers' as any,
          textposition: 'top center',
          textfont: { color: C.text, size: 11 },
          marker: {
            size: sizes,
            color: C.accent,
            opacity: 0.7,
            line: { color: C.hi, width: 1 },
          },
        }]}
        layout={{
          paper_bgcolor: C.bg,
          font: { color: C.text, family: 'Inter, sans-serif' },
          margin: { t: 10, r: 0, b: 0, l: 0 },
          geo: {
            scope: 'south america',
            resolution: 50,
            showland: true,
            landcolor: C.surface,
            showocean: true,
            oceancolor: C.bg,
            showframe: false,
            showcountries: true,
            countrycolor: C.grid,
            bgcolor: C.bg,
            center: { lat: -15, lon: -52 },
            projection: { scale: 3 },
          },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: 400 }}
      />

      {/* Ranking table */}
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
