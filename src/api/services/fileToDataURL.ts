export async function toDataURL(file: File): Promise<string> {
	const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
	console.log(dataUrl.slice(0, 100));
	return dataUrl;
}

/**
 * Decodes a data URL as produced by `toDataURL`. Returns `undefined` if the value
 * is not a data URL. A missing media type defaults to `application/pdf`, which is
 * what all stored documents are.
 */
export function fromDataURL(dataUrl: string) {
	const match = /^data:(?<mime>[^;,]+)?(?<base64>;base64)?,(?<data>.*)$/s.exec(dataUrl);
	if (!match?.groups) return undefined;

	const { mime, base64, data } = match.groups;
	const bytes = base64
		? Buffer.from(data, 'base64')
		: Buffer.from(decodeURIComponent(data), 'utf-8');
	return { mime: mime || 'application/pdf', bytes };
}
