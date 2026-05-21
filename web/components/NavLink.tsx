'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  href: string
  children: React.ReactNode
}

export function NavLink({ href, children }: Props) {
  const pathname = usePathname()
  const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`text-sm transition-colors hover:text-accent ${active ? 'text-brand font-medium' : 'text-muted'}`}
    >
      {children}
    </Link>
  )
}
