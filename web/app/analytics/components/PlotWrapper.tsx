'use client'
import dynamic from 'next/dynamic'

const PlotRaw = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-muted text-sm">
      Carregando gráfico...
    </div>
  ),
})

// Wrapper sem tipagem estrita — Plotly types são complexos e mudam entre versões
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Plot(props: any) {
  return <PlotRaw {...props} />
}
