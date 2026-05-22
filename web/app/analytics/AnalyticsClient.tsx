'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Sorteio } from '@/types/sorteios'
import { FilterBar }            from './components/FilterBar'
import { SecaoFrequencia }      from './components/SecaoFrequencia'
import { SecaoParidadeSoma }    from './components/SecaoParidadeSoma'
import { SecaoTemporalAcumulo } from './components/SecaoTemporalAcumulo'
import { SecaoSazonalidade }    from './components/SecaoSazonalidade'
import { SecaoMapa }            from './components/SecaoMapa'
import { SecaoHeatmapPares }      from './components/SecaoHeatmapPares'
import { SecaoTabela }          from './components/SecaoTabela'
import { SecaoCombinacao }      from './components/SecaoCombinacao'

const YEAR_MIN = 1996
const YEAR_MAX = new Date().getFullYear()

function parseDezenas(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n >= 1 && n <= 60)
    .slice(0, 15)
    .sort((a, b) => a - b)
    .filter((n, i, arr) => arr.indexOf(n) === i)
}

export function AnalyticsClient() {
  const [sorteios, setSorteios]       = useState<Sorteio[]>([])
  const [loading, setLoading]         = useState(true)
  const [yearFrom, setYearFrom]       = useState(YEAR_MIN)
  const [yearTo, setYearTo]           = useState(YEAR_MAX)
  const [dezenasRaw, setDezenasRaw]   = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const fields = 'concurso,data_sorteio,numeros,acumulou,premio_sena,municipio,uf,local_sorteio,valor_acumulado,ganhadores_sena'
    const BATCH = 1000

    async function fetchAll() {
      const all: Sorteio[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('sorteios')
          .select(fields)
          .order('concurso', { ascending: true })
          .range(from, from + BATCH - 1)
        if (error || !data || data.length === 0) break
        all.push(...(data as Sorteio[]))
        if (data.length < BATCH) break
        from += BATCH
      }
      setSorteios(all)
      setLoading(false)
    }

    fetchAll()
  }, [])

  const dateFrom = `${yearFrom}-01-01`
  const dateTo   = `${yearTo}-12-31`

  const filtered = useMemo(() => {
    return sorteios.filter(s => s.data_sorteio >= dateFrom && s.data_sorteio <= dateTo)
  }, [sorteios, dateFrom, dateTo])

  const dezenas = useMemo(() => parseDezenas(dezenasRaw), [dezenasRaw])
  const showCombinacao = dezenas.length >= 1

  const handleReset = () => {
    setYearFrom(YEAR_MIN)
    setYearTo(YEAR_MAX)
    setDezenasRaw('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted text-sm">
        Carregando sorteios...
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Overlay escuro ao abrir sidebar no mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: slide-in no mobile, estática no desktop */}
      <div className={`fixed inset-y-0 left-0 z-40 md:static md:z-auto transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <FilterBar
          yearFrom={yearFrom}
          yearTo={yearTo}
          yearMin={YEAR_MIN}
          yearMax={YEAR_MAX}
          dezenasRaw={dezenasRaw}
          totalFiltrado={filtered.length}
          onYearFrom={setYearFrom}
          onYearTo={setYearTo}
          onDezenas={setDezenasRaw}
          onReset={handleReset}
          showCombinacao={showCombinacao}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-16">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Hamburger (mobile only) */}
          <button
            className="md:hidden mt-2 text-muted hover:text-brand shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1" />
              <rect y="9" width="20" height="2" rx="1" />
              <rect y="15" width="20" height="2" rx="1" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-brand font-bold text-3xl">Análise Exploratória</h1>
              <span className="bg-accent/20 text-accent text-xs font-bold px-2 py-1 rounded border border-accent/40">
                EDA
              </span>
            </div>
            <p className="text-muted text-sm mt-1">
              {filtered.length.toLocaleString('pt-BR')} sorteios •{' '}
              {new Date(dateFrom + 'T00:00:00').toLocaleDateString('pt-BR')} até{' '}
              {new Date(dateTo + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {showCombinacao && (
          <SecaoCombinacao dezenas={dezenas} allSorteios={sorteios} />
        )}

        <SecaoTabela          data={filtered} />
        <SecaoFrequencia      data={filtered} />
        <SecaoParidadeSoma    data={filtered} />
        <SecaoTemporalAcumulo data={filtered} />
        <SecaoSazonalidade    data={filtered} />
        <SecaoMapa            data={filtered} />
        <SecaoHeatmapPares    data={filtered} />
      </main>
    </div>
  )
}
