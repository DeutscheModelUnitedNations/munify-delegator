import { ENTRY_CODE_LENGTH, isLookupReady, normalizeEntryCode } from './entryCode';

/** How long typing has to pause before a six-letter code counts as complete. */
const SETTLE_MS = 800;

/**
 * The state of a field for a delegation entry code or a supervisor connection code: `value` is
 * bound to the input and kept normalized, `ready` is the code to look up (or undefined while it is
 * incomplete). A code seeded from a link counts as complete straight away.
 */
export function createEntryCodeInput(initial = '') {
	let value = $state(normalizeEntryCode(initial).slice(0, ENTRY_CODE_LENGTH));
	let settled = $state(true);
	let timer: ReturnType<typeof setTimeout> | undefined;

	return {
		get value() {
			return value;
		},
		set value(next: string) {
			value = normalizeEntryCode(next).slice(0, ENTRY_CODE_LENGTH);
			settled = false;
			clearTimeout(timer);
			timer = setTimeout(() => (settled = true), SETTLE_MS);
		},
		get ready() {
			return isLookupReady({ code: value, settled }) ? value : undefined;
		}
	};
}
