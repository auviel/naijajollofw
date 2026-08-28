export type ChatTextSegment = {
  bold: boolean;
  text: string;
};

/** Parse lightweight `**bold**` markers from model replies into display segments. */
export function parseChatTextSegments(text: string): ChatTextSegment[] {
  const segments: ChatTextSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({
        bold: false,
        text: cleanStrayMarkdown(text.slice(lastIndex, index)),
      });
    }
    segments.push({ bold: true, text: match[1] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      bold: false,
      text: cleanStrayMarkdown(text.slice(lastIndex)),
    });
  }

  if (segments.length === 0) {
    return [{ bold: false, text: cleanStrayMarkdown(text) }];
  }

  return segments;
}

function cleanStrayMarkdown(text: string): string {
  return text.replace(/\*\*/g, "");
}
