/**
 * Reads the file picked in an `<input type="file">` as text and hands it to `onText`. Does nothing
 * when the event did not come from a file input or no file was picked.
 */
export function readSelectedTextFile(e: Event, onText: (text: string) => void) {
	if (!(e.target instanceof HTMLInputElement)) return;
	const file = e.target.files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = (e) => {
		const result = e.target?.result;
		if (typeof result === 'string') {
			onText(result);
		}
	};
	reader.readAsText(file);
}
