import { browser } from '$app/environment';
import type { PaperConferenceInfo } from './paperDisplay';

/**
 * What a resolution header prints about the conference. The header embeds the emblem rather than
 * linking it, so it is read into a data URL (once per file).
 */
export async function conferenceHeaderInfo(
	conference:
		| { title: string; longTitle: string | null; emblemFile: { url: string } | null }
		| null
		| undefined
): Promise<PaperConferenceInfo | undefined> {
	if (!conference) return undefined;
	return {
		title: conference.title,
		longTitle: conference.longTitle,
		emblemDataURL: await fetchFileAsDataURL(conference.emblemFile?.url)
	};
}

const cache = new Map<string, Promise<string | null>>();

/**
 * A stored file as a data URL. A file's URL stays the same for hours, so each one is read once.
 * `null` without a URL, on the server, or when the file cannot be read.
 */
function fetchFileAsDataURL(url: string | null | undefined): Promise<string | null> {
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
