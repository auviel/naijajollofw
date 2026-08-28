import { generateObject } from "ai";
import { z } from "zod";
import { getAiChatModel } from "@/lib/ai/core/models";

const searchInterpretationSchema = z.object({
  searchQueries: z
    .array(z.string().min(1).max(80))
    .min(1)
    .max(4)
    .describe(
      "Short menu keyword phrases (dish names, proteins, sides, spice level)",
    ),
});

/** Expand a diner's natural-language craving into catalog keyword phrases. */
export async function interpretSearchQuery(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const { object } = await generateObject({
      model: getAiChatModel(),
      schema: searchInterpretationSchema,
      prompt: `You help search a Nigerian restaurant menu (jollof rice, suya, plantain, pepper soup, egusi, etc.).

Extract 1–4 short keyword phrases to find matching dishes. Use real dish names and common ingredients. Do not invent items that are not plausible for this cuisine.

Customer request: "${trimmed}"`,
    });

    const unique = new Set<string>();
    unique.add(trimmed);
    for (const phrase of object.searchQueries) {
      const normalized = phrase.trim();
      if (normalized) unique.add(normalized);
    }
    return [...unique];
  } catch {
    return [trimmed];
  }
}
