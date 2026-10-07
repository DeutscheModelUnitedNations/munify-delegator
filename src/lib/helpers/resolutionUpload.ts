// Limits for resolution uploads, shared by the management page and the createResolution mutation.
// Every file goes up in its own request, so only the single file is capped, not the batch.
export const MAX_RESOLUTION_FILE_SIZE = 10_000_000;
export const MAX_RESOLUTION_UPLOAD_FILES = 50;

export type ResolutionUploadProblem = 'noFiles' | 'tooManyFiles' | 'notPdf' | 'fileTooLarge';

type UploadFile = Pick<File, 'name' | 'type' | 'size'>;

const PDF_DATA_URL_PREFIX = 'data:application/pdf;base64,';

export function isPdfFile(file: Pick<File, 'name' | 'type'>) {
	return file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf');
}

/** Returns why the given files can't be uploaded, or `undefined` if they can. */
export function findResolutionUploadProblem(
	files: UploadFile[]
): ResolutionUploadProblem | undefined {
	if (files.length === 0) return 'noFiles';
	if (files.length > MAX_RESOLUTION_UPLOAD_FILES) return 'tooManyFiles';
	if (!files.every(isPdfFile)) return 'notPdf';
	if (files.some((file) => file.size > MAX_RESOLUTION_FILE_SIZE)) return 'fileTooLarge';
	return undefined;
}

/** The number of bytes a base64 payload decodes to. */
function base64ByteLength(base64: string) {
	const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
	return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * The server's side of `findResolutionUploadProblem`: the mutation receives the file as a data URL,
 * so it checks the name, the media type the browser recorded and the decoded size.
 */
export function findResolutionFileProblem(
	fileName: string,
	dataURL: string
): Extract<ResolutionUploadProblem, 'notPdf' | 'fileTooLarge'> | undefined {
	if (!fileName.toLowerCase().endsWith('.pdf') || !dataURL.startsWith(PDF_DATA_URL_PREFIX)) {
		return 'notPdf';
	}
	if (base64ByteLength(dataURL.slice(PDF_DATA_URL_PREFIX.length)) > MAX_RESOLUTION_FILE_SIZE) {
		return 'fileTooLarge';
	}
	return undefined;
}

/**
 * Uploads the files one request at a time, so a failure keeps the files before and after it.
 * Returns the names of the ones that failed.
 */
export async function uploadEach<F extends Pick<File, 'name'>>(
	files: readonly F[],
	upload: (file: F) => Promise<unknown>
): Promise<string[]> {
	const failed: string[] = [];
	for (const file of files) {
		try {
			await upload(file);
		} catch {
			failed.push(file.name);
		}
	}
	return failed;
}
