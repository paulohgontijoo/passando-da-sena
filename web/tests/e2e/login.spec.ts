import { test, expect } from '@playwright/test'

// Todos os testes desta suite rodam sem sessão autenticada
test.use({ storageState: { cookies: [], origins: [] } })

test('aparência da tela de login', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveScreenshot('login-default.png', { threshold: 0.15 })
})

test('exibe erro: credenciais inválidas', async ({ page }) => {
  await page.goto('/login?error=credentials')
  await expect(page).toHaveScreenshot('login-error-credentials.png', { threshold: 0.15 })
})

test('exibe erro: dados inválidos', async ({ page }) => {
  await page.goto('/login?error=invalid')
  await expect(page).toHaveScreenshot('login-error-invalid.png', { threshold: 0.15 })
})

test('campos obrigatórios presentes', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})

test('sem sessão: /dashboard redireciona para /login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
