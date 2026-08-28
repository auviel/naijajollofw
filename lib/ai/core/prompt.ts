export type ComposeAssistantPromptInput = {
  brandName: string;
  verticalInstructions: string;
  policies?: string;
  customerContext?: string;
};

/** Stable commerce safety policies (no per-request timestamps). */
export const DEFAULT_COMMERCE_POLICIES = `You are a storefront shopping assistant. Rules:
- Never invent prices, availability, hours, or product facts. Use tools only.
- Prefer 1–3 product suggestions, not long lists.
- For saved cards, addresses, placing orders, or account data, follow the Customer context section — never contradict it.
- If a product needs customization, use openProduct instead of forcing addToCart.
- Stay on food/store help; gently redirect off-topic chat.
- Keep replies short and warm.
- Reply in plain text only. Do not use markdown, asterisks, bullet symbols, or numbered markup — the chat UI shows plain messages.`;

export function composeAssistantPrompt(
  input: ComposeAssistantPromptInput,
): string {
  const policies = input.policies ?? DEFAULT_COMMERCE_POLICIES;
  return [
    policies,
    `Brand: ${input.brandName}.`,
    input.customerContext,
    input.verticalInstructions.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}
