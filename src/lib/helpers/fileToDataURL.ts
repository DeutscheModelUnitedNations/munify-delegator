/**
 * Reads an upload into a `data:` URL, which is how documents and images are stored.
 *
 * Returning `undefined` for "no file" matters: the mutation treats `null` as "clear the column",
 * so a form submitted without touching an upload field has to leave the stored value alone.
 */
export function fileToDataURL(file: File | undefined | null): Promise<string | undefined> {
	if (!file || file.size === 0) return Promise.resolve(undefined);

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
		reader.onload = () => {
			const { result } = reader;
			if (typeof result !== 'string') {
				reject(new Error(`Could not read ${file.name} as a data URL`));
				return;
			}
			resolve(result);
		};
		reader.readAsDataURL(file);
	});
}
