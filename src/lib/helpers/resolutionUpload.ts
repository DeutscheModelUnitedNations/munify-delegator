// Limits for resolution uploads, shared by the management page and the upload's server-side check.
// Every file goes up in its own request, so only the single file is capped, not the batch.
export const MAX_RESOLUTION_FILE_SIZE = 10_000_000;
export const MAX_RESOLUTION_UPLOAD_FILES = 50;

export type ResolutionUploadProblem = 'noFiles' | 'tooManyFiles' | 'notPdf' | 'fileTooLarge';

type UploadFile = Pick<File, 'name' | 'type' | 'size'>;

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
