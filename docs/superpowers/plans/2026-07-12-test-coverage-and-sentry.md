# Test Coverage + Sentry Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Vitest coverage gates, critical-path tests, Playwright smoke, and `@sentry/nextjs` errors+tracing with email spike alerts for Naija Jollof.

**Architecture:** Layered — unit/integration in Vitest, smoke in Playwright, production observability via Sentry three-runtime init + `handleApiError` capture for 500s.

**Tech Stack:** Vitest 3 + `@vitest/coverage-v8`, Playwright, GitHub Actions, `@sentry/nextjs`, Next.js 16 App Router

---

### Task 1: Vitest coverage config

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json`
- Create: nothing yet

- [ ] Install `@vitest/coverage-v8` and `@playwright/test`
- [ ] Update vitest include to `tests/{unit,integration}/**/*.test.ts`
- [ ] Add coverage thresholds 70% on `lib/**` and `app/api/**`
- [ ] Add scripts `test:coverage`, `test:e2e`, `test:e2e:ui`

### Task 2: Sentry SDK wiring

**Files:**
- Create: `instrumentation-client.ts`, `instrumentation.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `app/global-error.tsx`
- Modify: `next.config.ts`, `.env.example`, `.gitignore`, `middleware.ts` (if tunnel needs exclusion — matcher is path-specific so OK), CSP connect-src

- [ ] `npm install @sentry/nextjs`
- [ ] Init all three runtimes with DSN from env, tracing sampler favoring checkout/diner
- [ ] Wrap next config with `withSentryConfig`
- [ ] Document env vars

### Task 3: Capture unexpected API errors

**Files:**
- Modify: `lib/utils/errors.ts`
- Modify: `tests/unit/api-errors.test.ts`

- [ ] On non-AppError/non-Zod failures, `Sentry.captureException`
- [ ] Update unit test (mock Sentry)

### Task 4: Critical-path unit tests

**Files:**
- Create: `tests/unit/diner-validation.test.ts`
- Create: other small pure tests as needed

### Task 5: Playwright smoke

**Files:**
- Create: `playwright.config.ts`, `e2e/storefront-smoke.spec.ts`, `e2e/staff-login.spec.ts`

### Task 6: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

### Task 7: Email alerts

- [ ] Create Sentry workflows for new issue + frequency spike (API or document UI steps if token missing)

### Task 8: Verify

- [ ] `npm run test:coverage`
- [ ] `npm run test:e2e` (with webServer)
- [ ] Confirm build with Sentry wrap succeeds without auth token (silent skip)
