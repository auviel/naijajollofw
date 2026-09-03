# Menu Search + Filter Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add search + filter icon on the Menu tab that opens a slide-up filter sheet (category + availability), replacing category chips.

**Architecture:** Client-side filter over existing `GET /api/menu` catalog. Applied filters live in `menu.tsx`; draft filters live in `MenuFilterSheet` until Apply. Search uses shared `SearchField`.

**Tech Stack:** Expo / React Native `Modal`, `@expo/vector-icons`, existing `@/components/kitchen/search-field`, `@naijajollof/ui` theme tokens.

## Global Constraints

- No new deps (no `@gorhom/bottom-sheet`)
- Default: all categories + all availability
- Apply commits; backdrop dismiss discards draft
- Search: case-insensitive on item `name` only
- Empty copy: `No items match.`
- Accent dot on filter icon when applied ≠ default

---

### Task 1: MenuFilterSheet component

**Files:**
- Create: `mobile/staff/src/components/kitchen/menu-filter-sheet.tsx`

**Interfaces:**
- Produces:
  - `export type MenuAvailabilityFilter = "all" | "available" | "sold_out"`
  - `export type MenuFilterState = { categoryId: string | null; availability: MenuAvailabilityFilter }`
  - `export function MenuFilterSheet(props: { visible: boolean; categories: Array<{ id: string; name: string }>; value: MenuFilterState; onApply: (next: MenuFilterState) => void; onDismiss: () => void }): JSX.Element`

- [x] **Step 1: Create sheet**

On open (`visible` true), copy `value` into local draft via `useEffect`. Single-select rows for Category (All + categories) and Availability (All / Available / Sold out). Footer Reset sets draft to `{ categoryId: null, availability: "all" }`. Apply calls `onApply(draft)` then parent closes. Backdrop / `onRequestClose` call `onDismiss` without apply. Use `Modal` `animationType="slide"`, bottom-anchored sheet, safe area bottom inset, dimmed backdrop.

- [x] **Step 2: Typecheck component imports resolve**

Run from `mobile/staff`: `npx tsc --noEmit` (expect clean or only pre-existing errors unrelated to this file).

---

### Task 2: Wire Menu tab search + filters

**Files:**
- Modify: `mobile/staff/src/app/(tabs)/menu.tsx`
- Reuse: `mobile/staff/src/components/kitchen/search-field.tsx`

**Interfaces:**
- Consumes: `MenuFilterSheet`, `MenuFilterState` from Task 1

- [x] **Step 1: State + filtering**

Replace chip-driven `categoryId` default-to-first with:
- `search` string
- `applied: MenuFilterState` default `{ categoryId: null, availability: "all" }`
- `filterOpen` boolean

On load success, if `applied.categoryId` is set but missing from catalog, clear it to `null`.

`items` useMemo: flatten active category items (or single category if `applied.categoryId`), filter by availability, then by `search.trim()` case-insensitive on `name`.

`filtersActive` = applied ≠ default.

Add item still passes `categoryId` only when `applied.categoryId` is set. After create category, set `applied.categoryId` to new id (and availability unchanged).

- [x] **Step 2: UI**

Under title row: `SearchField` (flex) + filter `Pressable` (`options-outline`) with accent dot when `filtersActive`. Remove horizontal chips. Empty: `No items match.` Host `MenuFilterSheet` with `value={applied}`, `onApply` sets applied + closes, `onDismiss` closes only.

- [x] **Step 3: Manual verify on device**

Confirm acceptance checklist in the spec (device check by user).

- [x] **Step 4: Commit only if user asks** (do not commit unprompted)

---

## Spec coverage

| Spec requirement | Task |
|------------------|------|
| Search + filter icon toolbar | 2 |
| Remove chips | 2 |
| Default All + All | 2 |
| Sheet category + availability | 1 |
| Apply / Reset / discard on dismiss | 1 |
| Accent cue | 2 |
| Client-side name search | 2 |
| Add item categoryId when filtered | 2 |
