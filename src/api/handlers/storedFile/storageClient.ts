import { S3mini } from 's3mini';

/**
 * The S3 bucket every uploaded file lives in, through s3mini. Nothing here reads the
 * environment, so the app (`storedFileService.ts`), the dev seed and the jobs each build one from
 * their own configuration.
 */
export interface StorageConfig {
	/** The bucket's URL as the app reaches it. */
	endpoint: string;
	/** The bucket's URL as browsers reach it; presigned URLs are signed for this host. */
	publicEndpoint?: string;
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
}

/** How long a browser has to start an upload it asked for. */
const UPLOAD_URL_SECONDS = 15 * 60;
/** How long a download URL stays valid. */
const DOWNLOAD_URL_SECONDS = 12 * 60 * 60;
/**
 * How long the same download URL is handed out again. s3mini signs with the current time, so a
 * URL signed per request would differ every time: the browser could never cache the file, and a
 * live query would see changed data on every refetch. A URL handed out stays valid for at least
 * `DOWNLOAD_URL_SECONDS` minus this.
 */
const DOWNLOAD_URL_REUSE_SECONDS = 6 * 60 * 60;
/** Past this many signed URLs, the expired ones are dropped. */
const MAX_REMEMBERED_DOWNLOADS = 10_000;

export function createStorage(config: StorageConfig) {
	const client = (endpoint: string) =>
		new S3mini({
			endpoint,
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
			region: config.region
		});
	const internal = client(config.endpoint);
	// Signing happens offline, so this one never talks to the storage itself.
	const external = config.publicEndpoint ? client(config.publicEndpoint) : internal;
	const downloads = new Map<string, { url: string; signedAt: number }>();

	function forgetExpiredDownloads(now: number) {
		if (downloads.size < MAX_REMEMBERED_DOWNLOADS) return;
		for (const [key, download] of downloads) {
			if (now - download.signedAt >= DOWNLOAD_URL_REUSE_SECONDS * 1000) downloads.delete(key);
		}
	}

	return {
		/**
		 * A URL the browser PUTs the file to. Type and length are signed, so the storage refuses
		 * anything but the file that was announced.
		 */
		presignUpload({ key, file }: { key: string; file: { mimeType: string; size: number } }) {
			return external.getPresignedUrl(
				'PUT',
				key,
				UPLOAD_URL_SECONDS,
				{},
				{
					'content-type': file.mimeType,
					'content-length': String(file.size)
				}
			);
		},

		/**
		 * A URL that serves the object, named `fileName` if given. Its type is the one the upload
		 * was signed with. Objects never change (a new upload gets a new key), so the browser may
		 * keep them as long as the URL is handed out.
		 */
		async presignDownload({ key, fileName }: { key: string; fileName?: string }) {
			const now = Date.now();
			const rememberedAs = `${key}\n${fileName ?? ''}`;
			const remembered = downloads.get(rememberedAs);
			if (remembered && now - remembered.signedAt < DOWNLOAD_URL_REUSE_SECONDS * 1000) {
				return remembered.url;
			}
			const query: Record<string, string> = {
				'response-cache-control': `private, max-age=${DOWNLOAD_URL_REUSE_SECONDS}, immutable`
			};
			if (fileName) query['response-content-disposition'] = contentDisposition(fileName);
			const url = await external.getPresignedUrl('GET', key, DOWNLOAD_URL_SECONDS, query);
			forgetExpiredDownloads(now);
			downloads.set(rememberedAs, { url, signedAt: now });
			return url;
		},

		/** The stored object's size, or undefined while nothing has been uploaded under `key`. */
		async sizeOf(key: string): Promise<number | undefined> {
			if (!(await internal.objectExists(key))) return undefined;
			return internal.getContentLength(key);
		},

		async put({ key, bytes, mimeType }: { key: string; bytes: Uint8Array; mimeType: string }) {
			await internal.putObject(key, bytes, mimeType);
		},

		/** Deletes the objects; a key with nothing under it counts as deleted. */
		async delete(keys: string[]) {
			if (keys.length === 0) return;
			const results = await internal.deleteObjects(keys);
			const failed = keys.filter((_, index) => !results[index]);
			if (failed.length > 0) {
				throw new Error(`Could not delete ${failed.length} objects: ${failed.join(', ')}`);
			}
		},

		/** Every object in the bucket. */
		async list(): Promise<{ key: string; lastModified: Date }[]> {
			return ((await internal.listObjects()) ?? []).map((object) => ({
				key: object.Key,
				lastModified: new Date(object.LastModified)
			}));
		}
	};
}

export type Storage = ReturnType<typeof createStorage>;

/**
 * `inline` with the file's name: in full as UTF-8 (`filename*`, RFC 6266), and as plain ASCII for
 * clients that only read `filename` (accents dropped, anything else outside it becomes `_`).
 */
export function contentDisposition(fileName: string) {
	const ascii = fileName
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^\w .-]/g, '_');
	// RFC 5987 allows fewer characters unescaped than `encodeURIComponent` leaves alone.
	const utf8 = encodeURIComponent(fileName).replace(
		/['()*!]/g,
		(char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
	);
	return `inline; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

/** What a `stored_file` row records as its purpose (`conference/logo`), see `FILE_SOURCES`. */
export function filePurpose({ kind, field }: { kind: string; field: string }) {
	return `${kind}/${field}`;
}

/**
 * Where an upload goes: grouped by conference and purpose, so the bucket stays browsable, and
 * ending in a fresh id, so a new upload never overwrites an object a link still points at.
 */
export function objectKey({
	conferenceId,
	purpose,
	uniqueId
}: {
	conferenceId: string;
	purpose: string;
	uniqueId: string;
}) {
	return `conferences/${conferenceId}/${purpose}/${uniqueId}`;
}
