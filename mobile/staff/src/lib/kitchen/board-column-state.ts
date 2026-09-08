import type { BoardColumnId } from "@/components/kitchen/column-tabs";

const VALID: ReadonlySet<string> = new Set(["cooking", "ready", "all"]);

function normalizeColumnId(id: string): BoardColumnId {
  if (VALID.has(id)) return id as BoardColumnId;
  // Legacy "new" tab → cooking (pending now lives there).
  return "cooking";
}

/** Survives navigating to ticket detail and back (module scope). */
let activeColumnId: BoardColumnId = "cooking";
let columnTouched = false;

export function getPersistedBoardColumn(): {
  activeColumnId: BoardColumnId;
  columnTouched: boolean;
} {
  return {
    activeColumnId: normalizeColumnId(activeColumnId),
    columnTouched,
  };
}

export function setPersistedBoardColumn(
  id: BoardColumnId,
  touched = true,
): void {
  activeColumnId = normalizeColumnId(id);
  columnTouched = touched;
}
