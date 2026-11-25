import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { storeGeneratedFile } from '../storedFile/storedFileService';

/**
 * Files an AI assistant moves into the guide (`importGuideFile`): the server downloads them from
 * an allowlisted host (`GUIDE_IMPORT_HOSTS`), never anywhere else, and stores them as guide
 * files. Images and PDFs only, up to `MAX_IMPORT_BYTES`.
 */

const MAX_IMPORT_BYTES = 20_000_000;

const IMPORT_TYPES: Record<string, string> = {
	'application/pdf': 'pdf',
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/svg+xml': 'svg'
};

const MAX_REDIRECTS = 3;

/** The URL, if it is https on one of `hosts`; undefined otherwise. */
export function importableUrl({ url, hosts }: { url: string; hosts: readonly string[] }) {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return undefined;
	}
	if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
		return undefined;
	}
	return hosts.includes(parsed.hostname.toLowerCase()) ? parsed : undefined;
}

/** The file name a download gets: the URL's last path segment, with the type's extension. */
export function importFileName({ url, mimeType }: { url: URL; mimeType: string }) {
	const last = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? 'datei');
	const extension = IMPORT_TYPES[mimeType];
	const base = last.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'datei';
	return base.toLowerCase().endsWith(`.${extension}`) ? base : `${base}.${extension}`;
}

/** The type of a response, if it is one the guide takes. */
export function importType(contentType: string | null) {
	const type = (contentType ?? '').split(';')[0].trim().toLowerCase();
	return type in IMPORT_TYPES ? type : undefined;
}

const refused = () => apiError({ code: 'INVALID_INPUT', message: m.guideImportRefused() });

/** Downloads `url`, following redirects only within the allowlist. */
async function download({ url, hosts }: { url: URL; hosts: readonly string[] }) {
	let current = url;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
		const response = await fetch(current, {
			redirect: 'manual',
			signal: AbortSignal.timeout(20_000)
		});
		if (response.status >= 300 && response.status < 400) {
			const next = importableUrl({
				url: new URL(response.headers.get('location') ?? '', current).toString(),
				hosts
			});
			if (!next) throw refused();
			current = next;
			continue;
		}
		if (!response.ok) throw refused();
		return { response, url: current };
	}
	throw refused();
}

/** Reads the body, refusing it once it grows beyond `MAX_IMPORT_BYTES`. */
async function readLimited(response: Response) {
	const declared = Number(response.headers.get('content-length') ?? 0);
	if (declared > MAX_IMPORT_BYTES) {
		throw apiError({ code: 'INVALID_INPUT', message: m.guideImportTooLarge() });
	}
	const bytes = new Uint8Array(await response.arrayBuffer());
	if (bytes.byteLength > MAX_IMPORT_BYTES || bytes.byteLength === 0) {
		throw apiError({ code: 'INVALID_INPUT', message: m.guideImportTooLarge() });
	}
	return bytes;
}

/** Downloads a file from an allowlisted host and stores it as a guide file; answers its id. */
export async function importGuideFile({
	conferenceId,
	url,
	hosts
}: {
	conferenceId: string;
	url: string;
	hosts: readonly string[];
}) {
	const allowed = importableUrl({ url, hosts });
	if (!allowed) throw refused();
	const { response, url: finalUrl } = await download({ url: allowed, hosts });
	const mimeType = importType(response.headers.get('content-type'));
	if (!mimeType) throw apiError({ code: 'INVALID_INPUT', message: m.guideImportWrongType() });
	const bytes = await readLimited(response);
	const fileName = importFileName({ url: finalUrl, mimeType });
	const id = await storeGeneratedFile({
		conferenceId,
		purpose: 'guide/file',
		fileName,
		mimeType,
		bytes
	});
	return { id, fileName, mimeType, size: bytes.byteLength };
}
