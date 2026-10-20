// Memory only: a new app process must ask about a restored session again.
// Kept outside React so auth-related remounts cannot replay the splash.
export function createStartupState() {
  let snapshot = { splashDone: false, authReady: false, needsChoice: false };
  const listeners = new Set<() => void>();
  function update(next: typeof snapshot) {
    if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
    snapshot = next;
    listeners.forEach(listener => listener());
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    finishSplash: () => update({ ...snapshot, splashDone: true }),
    resolveAuth: (signedIn: boolean) => update({
      ...snapshot, authReady: true,
      needsChoice: !snapshot.authReady ? signedIn : signedIn && snapshot.needsChoice,
    }),
    continueSession: () => update({ ...snapshot, needsChoice: false }),
  };
}

export const startupState = createStartupState();
