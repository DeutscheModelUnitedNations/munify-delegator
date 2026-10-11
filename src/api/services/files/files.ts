/**
 * The stored files that are served from `/files/<kind>/<id>/<field>` instead of being selected
 * through GraphQL.
 *
 * Uploads still arrive as data URLs and are stored as text, but nothing reads that text through
 * GraphQL any more: the browser gets a URL it can cache, and the route below decodes the stored
 * value to bytes. Moving the storage to a binary column later only changes `readStoredFile` (`fileReader.ts`).
 */
const FILE_SOURCES = {
	conference: {
		image: { column: 'imageDataURL', cacheable: true },
		emblem: { column: 'emblemDataURL', cacheable: true },
		logo: { column: 'logoDataURL', cacheable: true },
		contract: { column: 'contractContent', cacheable: false },
		guardianConsent: { column: 'guardianConsentContent', cacheable: false },
		mediaConsent: { column: 'mediaConsentContent', cacheable: false },
		termsAndConditions: { column: 'termsAndConditionsContent', cacheable: false },
		certificate: { column: 'certificateContent', cacheable: false }
	},
	place: {
		sitePlan: { column: 'sitePlanDataURL', cacheable: true }
	},
	resolution: {
		content: { column: 'content', cacheable: false }
	}
} as const;

export type FileKind = keyof typeof FILE_SOURCES;

function isFileKind(kind: string): kind is FileKind {
	return Object.hasOwn(FILE_SOURCES, kind);
}

/** What a route segment names, or `undefined` when it is not a servable file. */
export function findFileSource(kind: string, field: string) {
	if (!isFileKind(kind)) return undefined;
	const fields: Record<string, { column: string; cacheable: boolean }> = FILE_SOURCES[kind];
	if (!Object.hasOwn(fields, field)) return undefined;
	return { kind, column: fields[field].column, cacheable: fields[field].cacheable };
}

export type DecodedDataURL = { mimeType: string; bytes: Uint8Array<ArrayBuffer> };

/** Splits a `data:<mime>;base64,<payload>` string into its type and bytes. */
export function decodeDataURL(dataURL: string): DecodedDataURL | undefined {
	const match = /^data:([^;,]*)((?:;[^;,]*)*),(.*)$/s.exec(dataURL);
	if (!match) return undefined;
	const [, mimeType, parameters, payload] = match;
	const isBase64 = parameters.split(';').includes('base64');
	const bytes = isBase64
		? Uint8Array.from(Buffer.from(payload, 'base64'))
		: new TextEncoder().encode(decodeURIComponent(payload));
	return { mimeType: mimeType || 'application/octet-stream', bytes };
}

/**
 * The `/files` URL of a file on `row`, or null when the row holds none (or the reader may not see
 * it). Versioned so a re-upload is fetched again.
 */
export function storedFileUrl(
	kind: FileKind,
	row: { id: string; updatedAt: Date },
	field: string,
	stored: string | null
): string | null {
	if (!stored) return null;
	return `/files/${kind}/${row.id}/${field}?v=${row.updatedAt.getTime()}`;
}

/** A path segment is only ever an id, so anything else is rejected before it reaches a query. */
export function isValidFileId(id: string): boolean {
	return /^[\w-]{1,64}$/.test(id);
}

export type StoredFile =
	| { status: 'found'; mimeType: string; bytes: Uint8Array<ArrayBuffer>; fileName?: string }
	| { status: 'missing' }
	| { status: 'forbidden' };

/** Turns the row a file query returned into the file, or says why there is none. */
export function fileFromRow(row: unknown, column: string): StoredFile {
	if (typeof row !== 'object' || row === null) return { status: 'missing' };
	const fields = new Map(Object.entries(row));
	const stored = fields.get(column);
	const decoded = typeof stored === 'string' ? decodeDataURL(stored) : undefined;
	if (!decoded) return { status: 'missing' };
	const fileName = fields.get('fileName');
	return {
		status: 'found',
		...decoded,
		fileName: typeof fileName === 'string' ? fileName : undefined
	};
}

/**
 * The response headers of a served file. Public images carry a `?v=` that changes with every
 * upload, so they can be kept for good; everything else may be for members only, so it is kept
 * per user and revalidated on use.
 */
export function fileHeaders(
	file: { mimeType: string; fileName?: string },
	cacheable: boolean,
	etag: string
): Headers {
	const headers = new Headers({
		ETag: etag,
		'Content-Type': file.mimeType,
		'X-Content-Type-Options': 'nosniff',
		'Cache-Control': cacheable ? 'public, max-age=31536000, immutable' : 'private, no-cache'
	});
	if (file.fileName) {
		headers.set(
			'Content-Disposition',
			`inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
		);
	}
	return headers;
}

/** The status a file that cannot be served is answered with. */
export const FAILURE_STATUS = { missing: 404, forbidden: 403 } as const;

/** The GraphQL document that reads one stored file (and a resolution's file name). */
export function fileQuery(kind: FileKind, column: string): string {
	const extra = kind === 'resolution' ? ' fileName' : '';
	return `query ($id: ID!) { ${kind}(id: $id) { ${column}${extra} } }`;
}
