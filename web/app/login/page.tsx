import { login } from './actions'

type Props = {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const errorMessage =
    params.error === 'credentials'
      ? 'Nickname ou telefone incorretos.'
      : params.error === 'invalid'
        ? 'Preencha todos os campos.'
        : null

  return (
    <main className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface rounded-lg p-8 shadow-xl">
        <h1 className="text-brand text-2xl font-bold mb-1">Passando da Sena</h1>
        <p className="text-muted text-sm mb-6">Mega Sena Bolao Analytics</p>

        {errorMessage && (
          <p role="alert" className="text-accent text-sm mb-4">
            {errorMessage}
          </p>
        )}

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
            <span className="text-muted text-xs uppercase tracking-wide">Telefone</span>
            <input
              type="tel"
              name="telefone"
              required
              autoComplete="tel"
              placeholder="11987654321"
              className="bg-primary border border-muted/30 rounded px-3 py-2 text-brand text-sm focus:outline-none focus:border-accent"
            />
          </label>

          <button
            type="submit"
            className="mt-2 bg-accent hover:bg-accent/90 text-white font-semibold py-2 rounded transition-colors cursor-pointer"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  )
}
