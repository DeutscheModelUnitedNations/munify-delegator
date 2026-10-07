import { browser } from '$app/environment';

/**
 * A value mirrored to localStorage under `key`, JSON encoded. Reading `current` is reactive;
 * assigning to it writes through, even when it is the same object (callers that mutate a value in
 * place assign it back to save it).
 *
 * Per-viewer convenience only: the value starts as `initial` on the server and whenever storage is
 * missing, blocked or holds something unparseable, so the page has to work without it. Changes made
 * in another tab are not picked up.
 */
export class PersistedState<T> {
	readonly #key: string;
	// Raw, not a deep proxy: values are replaced wholesale and have to serialise as plain JSON
	#value: T;

	constructor(key: string, initial: T) {
		this.#key = key;
		this.#value = $state.raw(this.#read(initial));
	}

	get current(): T {
		return this.#value;
	}

	set current(value: T) {
		this.#value = value;
		this.#write(value);
	}

	#read(fallback: T): T {
		if (!browser) return fallback;
		try {
			const stored = localStorage.getItem(this.#key);
			return stored === null ? fallback : JSON.parse(stored);
		} catch {
			return fallback;
		}
	}

	#write(value: T) {
		if (!browser) return;
		try {
			localStorage.setItem(this.#key, JSON.stringify(value));
		} catch {
			// Storage full or blocked: the value just stays in memory
		}
	}
}
