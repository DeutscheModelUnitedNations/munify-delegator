import { browser } from '$app/env';

/**
 * A value mirrored to localStorage under `key`, JSON encoded. Reading `current` is reactive;
 * assigning to it writes through, even when it is the same object (callers that mutate a value in
 * place assign it back to save it).
 *
 * Per-viewer convenience only: the value starts as `initial` on the server and whenever storage is
 * missing, blocked or holds something unparseable, so the page has to work without it. Changes made
 * in another tab are not picked up.
 */
export function createPersistedState<T>({ key, initial }: { key: string; initial: T }) {
	function read(fallback: T): T {
		if (!browser) return fallback;
		try {
			const stored = localStorage.getItem(key);
			return stored === null ? fallback : JSON.parse(stored);
		} catch {
			return fallback;
		}
	}

	function write(value: T) {
		if (!browser) return;
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Storage full or blocked: the value just stays in memory
		}
	}

	// Raw, not a deep proxy: values are replaced wholesale and have to serialise as plain JSON
	let value = $state.raw<T>(read(initial));

	return {
		get current(): T {
			return value;
		},
		set current(next: T) {
			value = next;
			write(next);
		}
	};
}

type PersistedState<T> = ReturnType<typeof createPersistedState<T>>;
