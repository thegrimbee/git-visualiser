import { test, expect, _electron as electron } from '@playwright/test'
import path from 'node:path'

test('app window opens and shows main tabs', async () => {
  const electronApp = await electron.launch({
    args: [path.join(process.cwd(), 'out/main/index.js')]
  })

  try {
    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    await expect(window.getByRole('tab', { name: /^Repository$/ })).toBeVisible()
    await expect(window.getByRole('tab', { name: /^Objects$/ })).toBeVisible()
    await expect(window.getByRole('tab', { name: /^Report Bug$/ })).toBeVisible()
  } finally {
    await electronApp.close()
  }
})