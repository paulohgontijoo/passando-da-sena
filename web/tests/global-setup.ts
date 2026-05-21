import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

function loadTestEnv(): { email: string; password: string } {
  const envPath = path.join(__dirname, '../.env.test')
  if (!fs.existsSync(envPath)) {
    throw new Error(
      'Arquivo .env.test não encontrado.\n' +
      'Copie .env.test.example para .env.test e preencha as credenciais de teste.\n' +
      'Crie o usuário correspondente no Supabase (dashboard > Authentication > Users).'
    )
  }

  const vars: Record<string, string> = {}
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) vars[key.trim()] = rest.join('=').trim()
  })

  const email = vars['TEST_EMAIL']
  const password = vars['TEST_PASSWORD']
  if (!email || !password) throw new Error('TEST_EMAIL e TEST_PASSWORD são obrigatórios no .env.test')

  return { email, password }
}

async function globalSetup() {
  const { email, password } = loadTestEnv()
  const authDir = path.join(__dirname, '../playwright/.auth')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10_000 })

  await page.context().storageState({ path: path.join(authDir, 'user.json') })
  await browser.close()
}

export default globalSetup
