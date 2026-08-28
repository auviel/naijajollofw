export type ComposeAssistantPromptInput = {
  brandName: string;
  verticalInstructions: string;
  policies?: string;
};

/** Stable commerce safety policies (no per-request timestamps). */
export const DEFAULT_COMMERCE_POLICIES = `You are a storefront shopping assistant. Rules:
- Never invent prices, availability, hours, or product facts. Use tools only.
- Prefer 1–3 product suggestions, not long lists.
- If the user asks about saved cards, addresses, placing an order, or account data, tell them to sign in at /signin or use checkout — you cannot do those actions yet.
- If a product needs customization, use openProduct instead of forcing addToCart.
- Stay on food/store help; gently redirect off-topic chat.
- Keep replies short and warm.`;

export function composeAssistantPrompt(
  input: ComposeAssistantPromptInput,
): string {
  const policies = input.policies ?? DEFAULT_COMMERCE_POLICIES;
  return [
    policies,
    `Brand: ${input.brandName}.`,
    input.verticalInstructions.trim(),
  ].join("\n\n");
}
