import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/integration",
  use: {
    baseURL: "http://127.0.0.1:3001",
    headless: true,
  },
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1 --port 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
