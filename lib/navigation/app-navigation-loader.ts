/** Client-only navigation loader signal (route transitions, not background fetches). */

type Listener = () => void;

const listeners = new Set<Listener>();

let navigationPending = false;

export function isAppNavigationPending(): boolean {
  return navigationPending;
}

export function beginAppNavigation(): void {
  if (navigationPending) return;
  navigationPending = true;
  for (const listener of listeners) {
    listener();
  }
}

export function clearAppNavigation(): void {
  if (!navigationPending) return;
  navigationPending = false;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAppNavigation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
