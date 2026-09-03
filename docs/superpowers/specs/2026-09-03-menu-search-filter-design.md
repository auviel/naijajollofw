# Menu Search + Filter Sheet — Design Spec

**Date:** 2026-09-03  
**Surface:** Expo staff app (`mobile/staff`) — Menu tab  
**Status:** Approved in chat; awaiting implementation plan

## Problem

The Menu list uses horizontal category chips and no search. Finding an item across categories is slow; chips take vertical space and hide availability filtering.

## Goals

1. Search menu items by name from the Menu tab.
2. Filter by category and availability via a bottom sheet opened from a filter icon beside search.
3. Default to the full catalog (all active categories, all availability).
4. Keep list rows lean (thumb, name, price only — already shipped).

## Non-goals

- Server-side menu search API (filter client-side on `/api/menu` catalog)
- Multi-select category or availability
- Sort options
- Drag-gesture sheet library (`@gorhom/bottom-sheet`)
- Restoring category chips on the main list

## Decisions

| Topic | Choice |
|-------|--------|
| Filter contents | Category + availability (both in sheet) |
| Default | All categories + All availability |
| Sheet mechanism | Slide-up `Modal` (no new dependency) |
| Apply model | Draft in sheet; **Apply** commits; backdrop dismiss discards draft |
| Search | Client-side, case-insensitive match on item `name` |
| Active filter cue | Accent dot on filter icon when applied filters ≠ default |

## UI

### Toolbar (under page title)

- Row: existing `SearchField` (flex) + filter icon button (`options-outline` / `filter` Ionicons).
- Placeholder: `Search menu`.
- Filter button `accessibilityLabel`: `Filter menu`.
- When filters are non-default, show a small accent indicator on the icon (dot or filled variant).

### List

- Remove horizontal category chips.
- Show items from all active categories, filtered by applied category / availability / search query.
- Empty: `No items match.`
- Row unchanged: thumb, name, price; tap → item detail.

### Bottom sheet

- Transparent `Modal`, `animationType="slide"`, dimmed backdrop.
- Sheet anchored bottom: rounded top corners, safe-area padding, handle optional (visual only).
- **Category** (single select): `All`, then each active category by name.
- **Availability** (single select): `All` · `Available` · `Sold out`.
- Footer: **Reset** (draft → All + All) and **Apply** (commit draft → applied state, close sheet).
- Backdrop tap / Android back: close without applying draft.

## Data / behavior

- Source remains `GET /api/menu` (`KitchenMenuCatalog`).
- Applied state: `categoryId: string | null` (`null` = All), `availability: "all" | "available" | "sold_out"`.
- Opening the sheet copies applied → draft; editing only mutates draft until Apply.
- Search query is independent of the sheet (live as user types; no debounce required for local list).
- “Add item” still may pass the applied category when not All; if All, omit `categoryId` param (same as today when unset).

## Files (expected)

| File | Role |
|------|------|
| `mobile/staff/src/app/(tabs)/menu.tsx` | Wire search, filters, list filtering; host sheet or extract |
| `mobile/staff/src/components/kitchen/menu-filter-sheet.tsx` (optional extract) | Sheet UI if `menu.tsx` gets crowded |
| `mobile/staff/src/components/kitchen/search-field.tsx` | Reuse as-is |

## Acceptance

- [ ] Search field + filter icon appear under Menu title; chips gone.
- [ ] Default list shows all items from active categories.
- [ ] Typing filters by name; clearing restores filtered (non-search) list.
- [ ] Filter sheet offers category + availability; Apply updates list; dismiss without Apply leaves list unchanged.
- [ ] Reset in sheet sets draft to All + All; Apply then clears badge.
- [ ] Non-default applied filters show accent cue on filter icon.
