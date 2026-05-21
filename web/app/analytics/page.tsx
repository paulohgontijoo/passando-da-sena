import { Nav } from '@/components/Nav'

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col h-screen">
      <Nav />
      <iframe
        src="/reports/eda.html"
        title="Análise Exploratória — Mega Sena"
        className="flex-1 w-full border-0"
      />
    </div>
  )
}
