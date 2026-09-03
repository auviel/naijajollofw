type Listener = () => void;

let pendingAcceptance = 0;
let seenPending = 0;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

/** Call whenever board data refreshes. */
export function setBoardPendingAcceptance(count: number) {
  if (count === pendingAcceptance) return;
  pendingAcceptance = count;
  notify();
}

/** Call when Board tab is focused — clears the tab badge. */
export function markBoardSeen() {
  if (seenPending === pendingAcceptance) return;
  seenPending = pendingAcceptance;
  notify();
}

export function getBoardUnseenCount(): number {
  return Math.max(0, pendingAcceptance - seenPending);
}

export function subscribeBoardAttention(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
