'use client'

interface Section {
  id: string
  label: string
  num: string
  group?: string
}

const SECTIONS: Section[] = [
  { group: 'ANÁLISE',    id: 'frequencia',      num: '01', label: 'Frequência Histórica' },
  { id: 'paridade-soma', num: '02', label: 'Paridade e Soma' },
  { id: 'acumulo-temporal', num: '03', label: 'Histórico de Acúmulos' },
  { id: 'sazonalidade',  num: '04', label: 'Sazonalidade' },
  { group: 'LOCALIDADE', id: 'mapa', num: '05', label: 'Mapa do Brasil' },
  { group: 'CONSULTA',   id: 'tabela', num: '06', label: 'Buscar Concurso' },
]

interface Props {
  dateFrom: string
  dateTo:   string
  dezenasRaw: string
  totalFiltrado: number
  totalGeral: number
  onDateFrom: (v: string) => void
  onDateTo:   (v: string) => void
  onDezenas:  (v: string) => void
  onReset:    () => void
  showCombinacao: boolean
}

export function FilterBar({
  dateFrom, dateTo, dezenasRaw, totalFiltrado, totalGeral,
  onDateFrom, onDateTo, onDezenas, onReset, showCombinacao,
}: Props) {
  const sections = showCombinacao
    ? [...SECTIONS, { group: 'SUA COMBINAÇÃO', id: 'combinacao', num: '★', label: 'Sua Combinação' }]
    : SECTIONS

  return (
    <aside className="w-52 shrink-0 h-full overflow-y-auto flex flex-col border-r border-muted/20 bg-primary">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-muted/20">
        <div className="text-accent font-bold text-sm tracking-widest uppercase">Passando da Sena</div>
        <div className="text-muted text-xs mt-0.5">Analytics Lab</div>
      </div>

      <div className="px-4 py-4 space-y-4 flex-1">
        {/* Period */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <span className="text-muted text-xs uppercase tracking-wide font-medium">Período</span>
          </div>
          <div className="space-y-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => onDateFrom(e.target.value)}
              className="w-full bg-surface border border-muted/30 rounded px-2 py-1 text-brand text-xs focus:outline-none focus:border-accent"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => onDateTo(e.target.value)}
              className="w-full bg-surface border border-muted/30 rounded px-2 py-1 text-brand text-xs focus:outline-none focus:border-accent"
            />
          </div>
          <p className="text-muted text-xs mt-1.5">
            <span className="text-brand font-medium">{totalFiltrado.toLocaleString('pt-BR')}</span> sorteios
          </p>
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

        {/* Section list */}
        <nav className="space-y-0.5 pt-2">
          {sections.map((s, i) => (
            <div key={s.id}>
              {s.group && (
                <p className="text-muted text-xs uppercase tracking-widest font-medium pt-3 pb-1">
                  {s.group}
                </p>
              )}
              <a
                href={`#${s.id}`}
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
