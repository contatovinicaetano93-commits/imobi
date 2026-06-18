type AuthStateListener = (isSignedIn: boolean) => void;

const listeners = new Set<AuthStateListener>();

export function subscribeAuthState(listener: AuthStateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitAuthState(isSignedIn: boolean): void {
  for (const listener of listeners) {
    listener(isSignedIn);
  }
}
