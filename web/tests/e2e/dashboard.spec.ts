import { test, expect } from '@playwright/test'

// storageState com sessão autenticada injetado pelo playwright.config.ts

test('aparência do dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page).toHaveScreenshot('dashboard.png', {
    threshold: 0.15,
    // mascara o email do usuário para evitar falsos negativos se o usuário de teste mudar
    mask: [page.locator('span.text-muted.text-xs')],
  })
})

test('navbar: links Dashboard e Analytics presentes', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Analytics' })).toBeVisible()
})

test('navbar: botão Sair presente', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
})

test('navegação: Dashboard → Analytics → Dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('link', { name: 'Analytics' }).click()
  await expect(page).toHaveURL(/\/analytics/)
  await page.goBack()
  await expect(page).toHaveURL(/\/dashboard/)
})
