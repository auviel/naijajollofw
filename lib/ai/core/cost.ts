export const AI_MODEL_HISTORY_LIMIT = 12;

export function trimMessagesForModel<T>(messages: T[]): T[] {
  if (messages.length <= AI_MODEL_HISTORY_LIMIT) return messages;
  return messages.slice(-AI_MODEL_HISTORY_LIMIT);
}

export function capSearchLimit(limit?: number, max = 5): number {
  return Math.min(Math.max(limit ?? max, 1), max);
}
