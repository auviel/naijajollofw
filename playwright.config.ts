import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          CHECKOUT_SIMULATE_PAYMENTS: "true",
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
          TURNSTILE_SECRET_KEY: "",
          SQUARE_ACCESS_TOKEN: "",
          SQUARE_LOCATION_ID: "",
          NEXT_PUBLIC_SQUARE_LOCATION_ID: "",
          NEXT_PUBLIC_SQUARE_APPLICATION_ID: "",
        },
      },
});
