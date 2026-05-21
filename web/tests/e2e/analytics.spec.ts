import { test, expect } from '@playwright/test'

test('aparência da página de analytics', async ({ page }) => {
  await page.goto('/analytics')
  // aguarda o iframe carregar antes de tirar screenshot
  const iframe = page.locator('iframe[title="Analise Exploratoria — Mega Sena"]')
  await expect(iframe).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1_000) // margem para o Plotly renderizar
  await expect(page).toHaveScreenshot('analytics.png', { threshold: 0.2, fullPage: true })
})

test('iframe do relatório EDA presente e visível', async ({ page }) => {
  await page.goto('/analytics')
  const iframe = page.locator('iframe[title="Analise Exploratoria — Mega Sena"]')
  await expect(iframe).toBeVisible({ timeout: 15_000 })
  await expect(iframe).toHaveAttribute('src', '/reports/eda.html')
})

test('iframe ocupa a viewport inteira', async ({ page }) => {
  await page.goto('/analytics')
  const iframe = page.locator('iframe')
  await expect(iframe).toBeVisible()
  const box = await iframe.boundingBox()
  expect(box).not.toBeNull()
  // largura deve preencher pelo menos 99% da viewport
  expect(box!.width).toBeGreaterThanOrEqual(page.viewportSize()!.width * 0.99)
})
