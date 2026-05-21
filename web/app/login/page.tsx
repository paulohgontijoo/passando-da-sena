import { login, signup } from './actions'
import Link from 'next/link'
import TelefoneInput from '@/components/TelefoneInput'

export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<{ error?: string; success?: string; modo?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const isCadastro = params.modo === 'cadastro'

  const errorMessage = isCadastro
    ? params.error === 'invalid'   ? 'Preencha todos os campos.'
    : params.error === 'telefone'  ? 'Telefone deve ter ao menos 10 dígitos.'
    : params.error === 'exists'    ? 'Nickname ou telefone já cadastrado.'
    : params.error === 'server'    ? 'Erro ao criar conta. Tente novamente.'
    : null
    : params.error === 'credentials' ? 'Nickname ou telefone incorretos.'
    : params.error === 'invalid'     ? 'Preencha todos os campos.'
    : null

  const successMessage =
    params.success === 'cadastro' ? 'Conta criada! Faça login para entrar.' : null

  return (
    <main className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface rounded-lg p-8 shadow-xl">
        <h1 className="text-brand text-2xl font-bold mb-1">Passando da Sena</h1>
        <p className="text-muted text-sm mb-6">Mega Sena Bolão Analytics</p>

        {errorMessage && (
          <p role="alert" className="text-accent text-sm mb-4">{errorMessage}</p>
        )}
        {successMessage && (
          <p role="status" className="text-green-400 text-sm mb-4">{successMessage}</p>
        )}

        {isCadastro ? (
          <form action={signup} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Nome</span>
              <input
                type="text"
                name="nome"
                required
                autoComplete="name"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Nickname</span>
              <input
                type="text"
                name="nickname"
                required
                autoComplete="username"
                autoCapitalize="none"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Número</span>
              <TelefoneInput name="telefone" autoComplete="tel" />
            </label>

            <button
              type="submit"
              className="mt-2 bg-accent hover:bg-accent/90 text-white font-semibold py-2 rounded transition-colors cursor-pointer"
            >
              Criar conta
            </button>
          </form>
        ) : (
          <form action={login} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Nickname</span>
              <input
                type="text"
                name="nickname"
                required
                autoComplete="username"
                autoCapitalize="none"
                className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-wide">Número</span>
              <TelefoneInput name="telefone" autoComplete="tel" />
            </label>

            <button
              type="submit"
              className="mt-2 bg-accent hover:bg-accent/90 text-white font-semibold py-2 rounded transition-colors cursor-pointer"
            >
              Entrar
            </button>
          </form>
        )}

        <p className="text-muted text-xs text-center mt-6">
          {isCadastro ? (
            <>Já tem conta?{' '}
              <Link href="/login" className="text-accent hover:underline">Entrar</Link>
            </>
          ) : (
            <>Novo no grupo?{' '}
              <Link href="/login?modo=cadastro" className="text-accent hover:underline">Criar conta</Link>
            </>
          )}
        </p>
      </div>
    </main>
  )
}
