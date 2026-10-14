import { browser } from '$app/environment';

const cache = new Map<string, Promise<string | null>>();

/**
 * A stored file as a data URL, for the few consumers that embed a file rather than link it (the
 * resolution header's emblem, which the editor and `/api/pdf` take inline). A file's URL stays the
 * same for hours, so each one is read once. `null` without a URL, on the server, or when the file
 * cannot be read.
 */
export function fetchFileAsDataURL(url: string | null | undefined): Promise<string | null> {
	if (!url || !browser) return Promise.resolve(null);
	let dataURL = cache.get(url);
	if (!dataURL) {
		dataURL = readAsDataURL(url);
		cache.set(url, dataURL);
		// A failed read is tried again next time.
		void dataURL.then((value) => {
			if (value === null) cache.delete(url);
		});
	}
	return dataURL;
}

async function readAsDataURL(url: string): Promise<string | null> {
	try {
		const response = await fetch(url);
		if (!response.ok) return null;
		const blob = await response.blob();
		return await new Promise((resolve) => {
			const reader = new FileReader();
			reader.onerror = () => resolve(null);
			reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
			reader.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
}
