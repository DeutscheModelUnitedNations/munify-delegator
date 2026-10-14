import { fetchFileAsDataURL } from '$lib/api/fileDataURL';
import type { PaperConferenceInfo } from './paperDisplay';

/**
 * What a resolution header prints about the conference. The header embeds the emblem rather than
 * linking it, so it is read into a data URL (once per file).
 */
export async function conferenceHeaderInfo(
	conference:
		{ title: string; longTitle: string | null; emblemUrl: string | null } | null | undefined
): Promise<PaperConferenceInfo | undefined> {
	if (!conference) return undefined;
	return {
		title: conference.title,
		longTitle: conference.longTitle,
		emblemDataURL: await fetchFileAsDataURL(conference.emblemUrl)
	};
}
