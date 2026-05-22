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
import { SecaoTabela }          from './components/SecaoTabela'
import { SecaoCombinacao }      from './components/SecaoCombinacao'

const DATE_MIN = '1996-03-11'
const DATE_MAX = new Date().toISOString().split('T')[0]

function parseDezenas(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n >= 1 && n <= 60)
    .slice(0, 15)
    .sort((a, b) => a - b)
    .filter((n, i, arr) => arr.indexOf(n) === i) // dedupe
}

export function AnalyticsClient() {
  const [sorteios, setSorteios]     = useState<Sorteio[]>([])
  const [loading, setLoading]       = useState(true)
  const [dateFrom, setDateFrom]     = useState(DATE_MIN)
  const [dateTo, setDateTo]         = useState(DATE_MAX)
  const [dezenasRaw, setDezenasRaw] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sorteios')
      .select('concurso,data_sorteio,numeros,acumulou,premio_sena,municipio,uf,local_sorteio,valor_acumulado,ganhadores_sena')
      .order('concurso', { ascending: true })
      .limit(10000)
      .then(({ data, error }) => {
        if (!error && data) setSorteios(data as Sorteio[])
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    return sorteios.filter(s => s.data_sorteio >= dateFrom && s.data_sorteio <= dateTo)
  }, [sorteios, dateFrom, dateTo])

  const dezenas = useMemo(() => parseDezenas(dezenasRaw), [dezenasRaw])
  const showCombinacao = dezenas.length >= 1

  const handleReset = () => {
    setDateFrom(DATE_MIN)
    setDateTo(DATE_MAX)
    setDezenasRaw('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted text-sm">
        Carregando {/* data */}sorteios...
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <FilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        dezenasRaw={dezenasRaw}
        totalFiltrado={filtered.length}
        totalGeral={sorteios.length}
        onDateFrom={setDateFrom}
        onDateTo={setDateTo}
        onDezenas={setDezenasRaw}
        onReset={handleReset}
        showCombinacao={showCombinacao}
      />

      <main className="flex-1 overflow-y-auto px-8 py-6 space-y-16">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-brand font-bold text-3xl">Análise Exploratória</h1>
              <span className="bg-accent/20 text-accent text-xs font-bold px-2 py-1 rounded border border-accent/40">
                EDA
              </span>
            </div>
            <p className="text-muted text-sm mt-1">
              {filtered.length.toLocaleString('pt-BR')} sorteios •{' '}
              {new Date(dateFrom).toLocaleDateString('pt-BR')} até {new Date(dateTo).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Sections */}
        {showCombinacao && (
          <SecaoCombinacao dezenas={dezenas} allSorteios={sorteios} />
        )}

        <SecaoFrequencia      data={filtered} />
        <SecaoParidadeSoma    data={filtered} />
        <SecaoTemporalAcumulo data={filtered} />
        <SecaoSazonalidade    data={filtered} />
        <SecaoMapa            data={filtered} />
        <SecaoTabela          data={filtered} />
      </main>
    </div>
  )
}
