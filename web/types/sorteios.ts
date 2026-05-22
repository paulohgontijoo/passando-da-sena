export interface Sorteio {
  concurso: number
  data_sorteio: string
  numeros: number[]
  acumulou: boolean
  premio_sena: number | null
  municipio: string | null
  uf: string | null
  local_sorteio: string | null
  valor_acumulado: number | null
  ganhadores_sena: number | null
}

// Plotly theme colors shared across all charts
export const C = {
  accent:  '#e94560',
  hi:      '#f5a623',
  muted:   '#8892b0',
  midMuted:'#a0aec0',
  surface: '#161b22',
  bg:      '#1a1a2e',
  text:    '#e2e8f0',
  grid:    '#2d3748',
}

export const baseLayout = (extra: Record<string, unknown> = {}) => ({
  paper_bgcolor: C.bg,
  plot_bgcolor:  C.surface,
  font: { color: C.text, family: 'Inter, sans-serif', size: 12 },
  margin: { t: 40, r: 20, b: 50, l: 70 },
  xaxis: { gridcolor: C.grid, zerolinecolor: C.grid, tickfont: { color: C.text }, title: { font: { color: C.text } } },
  yaxis: { gridcolor: C.grid, zerolinecolor: C.grid, tickfont: { color: C.text }, title: { font: { color: C.text } } },
  showlegend: false,
  ...extra,
})

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function formatMoeda(v: number | null): string {
  if (!v) return '—'
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)} bi`
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)} M`
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} K`
  return `R$ ${v.toFixed(2)}`
}

export function formatData(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
