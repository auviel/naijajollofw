/**
 * Cloudflare Worker bindings. Prefer `npm run cf-typegen` after wrangler.jsonc
 * changes. Kept loose so `tsc` works before Wrangler generates full types.
 *
 * HYPERDRIVE → Neon Postgres. NEXT_TAG_CACHE_D1 → OpenNext revalidateTag only.
 */
interface CloudflareEnv {
  HYPERDRIVE?: { connectionString: string };
  NEXT_INC_CACHE_R2_BUCKET?: unknown;
  NEXT_TAG_CACHE_D1?: unknown;
  IMAGES?: unknown;
  ASSETS?: unknown;
  WORKER_SELF_REFERENCE?: unknown;
  CLOUDFLARE_ENV?: string;
}
