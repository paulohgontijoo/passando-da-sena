import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Passando da Sena',
  description: 'Mega Sena Bolão Analytics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
