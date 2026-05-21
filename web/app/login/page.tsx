import { login } from "./actions"

type Props = {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const errorMessage =
    params.error === "credentials"
      ? "Email ou senha incorretos."
      : params.error === "invalid"
        ? "Dados invalidos."
        : null

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 360, margin: "20vh auto", padding: "0 1rem" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Passando da Sena</h1>

      {errorMessage && (
        <p role="alert" style={{ color: "red", marginBottom: "1rem" }}>
          {errorMessage}
        </p>
      )}

      <form action={login} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            style={{ padding: "0.5rem", fontSize: "1rem" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Senha
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            minLength={8}
            style={{ padding: "0.5rem", fontSize: "1rem" }}
          />
        </label>

        <button type="submit" style={{ padding: "0.75rem", fontSize: "1rem", cursor: "pointer" }}>
          Entrar
        </button>
      </form>
    </main>
  )
}
