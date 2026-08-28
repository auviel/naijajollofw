export function getSanityEnv() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() ?? "";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const apiVersion =
    process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2025-01-01";
  return { projectId, dataset, apiVersion };
}

export function isSanityConfigured(): boolean {
  return Boolean(getSanityEnv().projectId);
}
