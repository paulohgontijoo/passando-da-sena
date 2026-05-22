'use client'

interface Section {
  id: string
  label: string
  num: string
  group?: string
}

const SECTIONS: Section[] = [
  { group: 'CONSULTA',   id: 'tabela',           num: '01', label: 'Buscar Concurso' },
  { group: 'ANÁLISE',    id: 'frequencia',       num: '02', label: 'Frequência Histórica' },
  {                       id: 'paridade-soma',    num: '03', label: 'Paridade e Soma' },
  {                       id: 'acumulo-temporal', num: '04', label: 'Histórico de Acúmulos' },
  {                       id: 'sazonalidade',     num: '05', label: 'Sazonalidade' },
  { group: 'LOCALIDADE', id: 'mapa',             num: '06', label: 'Mapa do Brasil' },
  { group: 'PARES',      id: 'heatmap-pares',    num: '07', label: 'Co-ocorrência de Pares' },
]

const THUMB = [
  'absolute w-full pointer-events-none appearance-none bg-transparent top-0',
  '[&::-webkit-slider-thumb]:pointer-events-auto',
  '[&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5',
  '[&::-webkit-slider-thumb]:rounded-full',
  '[&::-webkit-slider-thumb]:bg-accent',
  '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary',
  '[&::-webkit-slider-thumb]:cursor-pointer',
  '[&::-webkit-slider-thumb]:shadow-sm',
  '[&::-moz-range-thumb]:pointer-events-auto',
  '[&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5',
  '[&::-moz-range-thumb]:rounded-full',
  '[&::-moz-range-thumb]:bg-accent',
  '[&::-moz-range-thumb]:border-none',
  '[&::-moz-range-thumb]:cursor-pointer',
  '[&::-moz-range-track]:bg-transparent',
].join(' ')

function DualRangeSlider({
  min, max, valueFrom, valueTo,
  onChange,
}: {
  min: number
  max: number
  valueFrom: number
  valueTo: number
  onChange: (from: number, to: number) => void
}) {
  const pctFrom = ((valueFrom - min) / (max - min)) * 100
  const pctTo   = ((valueTo   - min) / (max - min)) * 100

  return (
    <div className="relative h-3.5 mt-1">
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-px bg-muted/30 rounded-full" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-px bg-accent rounded-full"
        style={{ left: `${pctFrom}%`, width: `${pctTo - pctFrom}%` }}
      />
      <input
        type="range" min={min} max={max} value={valueFrom}
        onChange={e => onChange(Math.min(+e.target.value, valueTo - 1), valueTo)}
        className={THUMB}
      />
      <input
        type="range" min={min} max={max} value={valueTo}
        onChange={e => onChange(valueFrom, Math.max(+e.target.value, valueFrom + 1))}
        className={THUMB}
      />
    </div>
  )
}

interface Props {
  yearFrom: number
  yearTo: number
  yearMin: number
  yearMax: number
  dezenasRaw: string
  totalFiltrado: number
  onYearFrom: (v: number) => void
  onYearTo: (v: number) => void
  onDezenas: (v: string) => void
  onReset: () => void
  showCombinacao: boolean
  onClose: () => void
}

export function FilterBar({
  yearFrom, yearTo, yearMin, yearMax,
  dezenasRaw, totalFiltrado,
  onYearFrom, onYearTo, onDezenas, onReset, showCombinacao, onClose,
}: Props) {
  const sections = showCombinacao
    ? [...SECTIONS, { group: 'SUA COMBINAÇÃO', id: 'combinacao', num: '★', label: 'Sua Combinação' }]
    : SECTIONS

  return (
    <aside className="w-52 h-full overflow-y-auto flex flex-col border-r border-muted/20 bg-primary">
      {/* Logo + close (mobile only) */}
      <div className="px-4 pt-5 pb-4 border-b border-muted/20 flex items-start justify-between">
        <div>
          <div className="text-accent font-bold text-sm tracking-widest uppercase">Passando da Sena</div>
          <div className="text-muted text-xs mt-0.5">Analytics Lab</div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-muted hover:text-brand text-base leading-none mt-0.5 px-1"
          aria-label="Fechar menu"
        >
          ✕
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 flex-1">
        {/* Period slider */}
        <div>
          <div className="flex items-center gap-1 mb-3">
            <span className="text-muted text-xs uppercase tracking-wide font-medium">Período</span>
          </div>
          <DualRangeSlider
            min={yearMin} max={yearMax}
            valueFrom={yearFrom} valueTo={yearTo}
            onChange={(f, t) => { onYearFrom(f); onYearTo(t) }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-brand text-xs font-medium">{yearFrom} – {yearTo}</span>
            <span className="text-accent text-xs font-medium">
              {totalFiltrado.toLocaleString('pt-BR')} sorteios
            </span>
          </div>
        </div>

        {/* Dezenas */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <span className="text-muted text-xs uppercase tracking-wide font-medium">Dezenas do bolão</span>
            <span
              className="text-muted text-xs cursor-help"
              title="Digite as dezenas do seu jogo (ex: 5 10 26 33 41 52). Ativa a seção Sua Combinação."
            >?</span>
          </div>
          <textarea
            value={dezenasRaw}
            onChange={e => onDezenas(e.target.value)}
            placeholder="ex: 5 10 26 33 41 52"
            rows={2}
            className="w-full bg-surface border border-muted/30 rounded px-2 py-1.5 text-brand text-xs placeholder-muted focus:outline-none focus:border-accent resize-none"
          />
          {showCombinacao && (
            <p className="text-accent text-xs mt-1">Combinação ativa ↓</p>
          )}
        </div>

        {/* Reset */}
        <button
          onClick={onReset}
          className="w-full text-muted text-xs border border-muted/20 rounded py-1.5 hover:border-accent hover:text-accent transition-colors"
        >
          ↺ Resetar filtros
        </button>

        {/* Nav */}
        <nav className="space-y-0.5 pt-2">
          {sections.map((s) => (
            <div key={s.id}>
              {s.group && (
                <p className="text-muted text-xs uppercase tracking-widest font-medium pt-3 pb-1">
                  {s.group}
                </p>
              )}
              <a
                href={`#${s.id}`}
                onClick={() => { if (window.innerWidth < 768) onClose() }}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-muted hover:text-brand hover:bg-surface/50 transition-colors text-xs group"
              >
                <span className="text-accent font-mono text-xs w-5 shrink-0">{s.num}</span>
                <span className="truncate group-hover:text-brand">{s.label}</span>
              </a>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}
