# Kitchen Insist Overlay + Permission Priming — Design Spec

**Date:** 2026-09-03  
**Surface:** Expo staff app (`mobile/staff`)  
**Status:** Approved for implementation (approach 1)

## Problem

Cooks need a hard interrupt when a due-now New ticket arrives, and a one-time explanation before the OS notification prompt so push/insist are not a mid-shift dead end.

## Goals

1. Full-screen **insist** above tabs for one due-now New ticket at a time until Accept or Bump.
2. Looping short chime (~2s) + haptic while overlay is up (respect Sound/Haptic prefs).
3. Accept does **not** change order status; remember Accept on this device until the ticket leaves New.
4. One-shot **permission priming** bottom sheet after login before the system notification dialog.

## Non-goals

- Background ringtone (push covers background).
- Server-side Accept sync across devices.
- Insist for Later / deferred scheduled tickets.
- Quiet hours.
- Real inbox feed.

## Decisions locked

| Topic | Choice |
|-------|--------|
| Queue | One ticket at a time, newest first; after Accept/Bump, next unacked if any |
| Eligibility | `pending_acceptance` and **not** `isKitchenBoardDeferred` (New column only) |
| Accept memory | Local KV set of order ids; cleared when ticket leaves New / disappears |
| Alert | ~2s chime + light haptic pulse; reuse bump sound asset |
| Architecture | Root `InsistHost` above tabs; own poll while logged in (Board keeps its poll) |
| Priming | Once per install until Allow or Maybe later; not on login form |

## Insist overlay

### When visible

- User authenticated, app foreground, priming sheet not showing.
- At least one eligible unacked New ticket from kitchen active orders poll.

### UI

- Full-screen modal over tabs (dim/opaque kitchen surface, themed).
- Content: ticket #, wait age, customer, fulfillment, item summary, notes (1 line).
- Primary CTA: **Start** (Bump → `preparing`, same as board card).
- Secondary CTA: **Accept** (dismiss for this ticket only).
- If more waiting: meta “N more waiting”.

### Sound / haptic

- Start loop when overlay becomes visible; stop on dismiss / background / logout.
- Interval ~2s: play bump click + light impact haptic.
- Honor `kitchen.pref.sound` / `kitchen.pref.haptic` (default on).

### Bump failure

- Keep overlay on the same ticket; show alert with retry (mirror board).

## Permission priming

### When

- After auth gate lands past login (any tab).
- KV `kitchen.pref.notif.primed` unset.
- OS permission is `undetermined` (skip if already granted or denied).
- Do not re-show every cold launch once primed.

### UI

- Bottom sheet over Board/tabs (rounded top, themed surface).
- Title: **Allow notifications**
- Three benefit rows (icons + one line): hear tickets when phone is down; insist until Accept/Bump; change anytime in Preferences.
- Primary **Allow** → dismiss → `registerStaffPushDevice()` (OS prompt + token register); set primed.
- Secondary **Maybe later** → dismiss; set primed; Board usable without push.

### Priority vs insist

- If priming should show, show it first and **pause** insist until the sheet is dismissed.
- Preferences remains the path to enable push after Maybe later / Denied.

## Architecture

| Unit | Role |
|------|------|
| `insist-ack.ts` | Load/save/clear local Accept ids |
| `insist.ts` | Bump confirm + insist loop start/stop |
| `insist-overlay.tsx` | Presentational full-screen UI |
| `insist-host.tsx` | Poll, pick newest unacked, Accept/Bump, mount overlay |
| `permission-prime-sheet.tsx` | Priming UI |
| `permission-prime-host.tsx` | When to show; Allow / Maybe later |
| Root `_layout.tsx` | Mount hosts inside auth gate when logged in |

## Success criteria

- [ ] New due-now ticket → overlay + chime on any tab
- [ ] Accept → quiet for that id until status changes; next ticket if any
- [ ] Start → status `preparing`; overlay advances/clears
- [ ] Later tickets never insist
- [ ] Sound/Haptic prefs mute their channel
- [ ] Priming once; Allow triggers OS prompt; Maybe later never blocks Board
- [ ] Denied/granted skip priming sheet
