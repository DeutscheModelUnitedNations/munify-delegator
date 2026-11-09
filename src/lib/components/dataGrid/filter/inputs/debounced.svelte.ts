/**
 * A text being typed, handed on once typing pauses, so a filter does not ask the backend for every
 * keystroke. While nobody types, the field shows the value it is given (`shown`), so a field
 * reused for another condition never keeps the old text.
 */
export function createDraft({
	onsettle,
	delay = 300
}: {
	onsettle: (value: string) => void;
	delay?: number;
}) {
	let draft = $state<string | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;
	const settle = () => {
		clearTimeout(timer);
		if (draft === null) return;
		onsettle(draft);
		draft = null;
	};
	return {
		shown(value: string) {
			return draft ?? value;
		},
		type(next: string) {
			draft = next;
			clearTimeout(timer);
			timer = setTimeout(settle, delay);
		},
		/** Hands the text on at once (when the field loses focus) */
		settle
	};
}
