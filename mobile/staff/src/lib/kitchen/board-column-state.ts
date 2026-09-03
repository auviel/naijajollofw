import type { BoardColumnId } from "@/components/kitchen/column-tabs";

/** Survives navigating to ticket detail and back (module scope). */
let activeColumnId: BoardColumnId = "new";
let columnTouched = false;

export function getPersistedBoardColumn(): {
  activeColumnId: BoardColumnId;
  columnTouched: boolean;
} {
  return { activeColumnId, columnTouched };
}

export function setPersistedBoardColumn(
  id: BoardColumnId,
  touched = true,
): void {
  activeColumnId = id;
  columnTouched = touched;
}
