'use client'

import { useRef } from 'react'

export default function TelefoneInput({ name, autoComplete }: { name: string; autoComplete?: string }) {
  const ref = useRef<HTMLInputElement>(null)

  function handleInput() {
    if (!ref.current) return
    ref.current.value = ref.current.value.replace(/[^0-9]/g, '')
  }

  return (
    <input
      ref={ref}
      type="tel"
      name={name}
      required
      inputMode="numeric"
      pattern="[0-9]{10,11}"
      autoComplete={autoComplete ?? 'tel'}
      placeholder="(11) 99999-9999"
      onInput={handleInput}
      className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
    />
  )
}
