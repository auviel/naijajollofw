type Listener = () => void;

const listeners = new Set<Listener>();

/** Ask the kitchen board (and any other subscribers) to refetch now. */
export function requestBoardRefresh(): void {
  for (const listener of listeners) listener();
}

export function subscribeBoardRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
