# Kitchen Insist + Permission Priming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship full-screen insist for due-now New tickets and a one-shot notification priming sheet in the Kitchen staff app.

**Architecture:** Root hosts above tabs poll kitchen orders / check push permission. Local KV remembers Accepts and priming choice. Sound loop lives in `insist.ts`.

**Tech Stack:** Expo Router, React Native Modal, expo-audio, expo-haptics, expo-notifications, SecureStore KV, `@naijajollof/api-types`

## Global Constraints

- Insist: one ticket at a time, newest first; New only (not deferred Later).
- Accept: local only; does not call transition API.
- Priming: once until Allow/Maybe later; never block Board.
- Respect Sound/Haptic prefs; reuse `assets/sounds/bump.wav`.

---

### Task 1: Accept store + insist alert loop

**Files:**
- Create: `mobile/staff/src/lib/kitchen/insist-ack.ts`
- Modify: `mobile/staff/src/lib/kitchen/insist.ts`

- [ ] Implement ack load/save (JSON array of order ids in `kitchen.insist.ack.ids`)
- [ ] `isInsistAcked(id)`, `ackInsistOrder(id)`, `pruneInsistAcks(activePendingIds)`
- [ ] Add `startInsistAlertLoop` / `stopInsistAlertLoop` (~2s chime + light haptic)
- [ ] Typecheck staff app

### Task 2: Insist overlay + host

**Files:**
- Create: `mobile/staff/src/components/kitchen/insist-overlay.tsx`
- Create: `mobile/staff/src/components/kitchen/insist-host.tsx`
- Modify: `mobile/staff/src/app/_layout.tsx`

- [ ] Overlay UI: ticket meta + Start + Accept + “N more”
- [ ] Host: poll `/api/orders?filter=active&channel=kitchen&limit=80` while logged in + active
- [ ] Filter eligible: `pending_acceptance` && !deferred; skip acked; sort newest first
- [ ] Accept / Start wired; mount host in root when `user`
- [ ] Manual: seed New ticket → overlay; Accept then Start path

### Task 3: Permission priming sheet + host

**Files:**
- Create: `mobile/staff/src/components/kitchen/permission-prime-sheet.tsx`
- Create: `mobile/staff/src/components/kitchen/permission-prime-host.tsx`
- Modify: `mobile/staff/src/app/_layout.tsx`

- [ ] Sheet copy + Allow / Maybe later
- [ ] KV `kitchen.pref.notif.primed`; show only if unset && permission undetermined
- [ ] Pause insist while priming visible
- [ ] Manual: fresh install path shows sheet once

### Task 4: Verify

- [ ] Staff `tsc --noEmit`
- [ ] Smoke: Later ticket no insist; prefs mute sound; Maybe later skips OS prompt
