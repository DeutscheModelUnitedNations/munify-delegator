import type { ActionResult } from '@sveltejs/kit';

// Limits for resolution uploads, shared by the management page (client and form
// action) and the createResolution mutation. The batch total stays below the
// BODY_SIZE_LIMIT of the production image (64M, see Dockerfile), so an oversized
// batch gets a proper error message instead of an HTTP 413 from the adapter.
export const MAX_RESOLUTION_FILE_SIZE = 10_000_000;
export const MAX_RESOLUTION_UPLOAD_FILES = 50;
export const MAX_RESOLUTION_UPLOAD_TOTAL_SIZE = 60_000_000;

export type ResolutionUploadProblem =
	| 'noFiles'
	| 'tooManyFiles'
	| 'notPdf'
	| 'fileTooLarge'
	| 'batchTooLarge';

type UploadFile = Pick<File, 'name' | 'type' | 'size'>;

export function isPdfFile(file: Pick<File, 'name' | 'type'>) {
	return file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf');
}

/** Returns why the given files can't be uploaded as one batch, or `undefined` if they can. */
export function findResolutionUploadProblem(
	files: UploadFile[]
): ResolutionUploadProblem | undefined {
	if (files.length === 0) return 'noFiles';
	if (files.length > MAX_RESOLUTION_UPLOAD_FILES) return 'tooManyFiles';
	if (!files.every(isPdfFile)) return 'notPdf';
	if (files.some((file) => file.size > MAX_RESOLUTION_FILE_SIZE)) return 'fileTooLarge';
	const totalSize = files.reduce((sum, file) => sum + file.size, 0);
	if (totalSize > MAX_RESOLUTION_UPLOAD_TOTAL_SIZE) return 'batchTooLarge';
	return undefined;
}

export function buildResolutionUploadForm(files: File[], committeeId: string) {
	const formData = new FormData();
	for (const file of files) {
		formData.append('files', file);
	}
	if (committeeId) {
		formData.append('committeeId', committeeId);
	}
	return formData;
}

export function parseResolutionUploadForm(formData: FormData) {
	const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
	const committeeId = formData.get('committeeId');
	return {
		files,
		committeeId: typeof committeeId === 'string' && committeeId ? committeeId : undefined
	};
}

/**
 * Interprets the response of the uploadResolutions form action. `error` is the
 * server-provided message (if any) for a failed upload; `storedAny` tells whether
 * at least some files were persisted, so the list needs refreshing.
 */
export function summarizeResolutionUploadResult(result: ActionResult) {
	if (result.type === 'failure') {
		const uploadError = result.data?.uploadError;
		const uploaded = result.data?.uploaded;
		return {
			ok: false,
			error: typeof uploadError === 'string' ? uploadError : undefined,
			storedAny: typeof uploaded === 'number' && uploaded > 0
		};
	}
	if (result.type === 'error') {
		return { ok: false, error: result.error?.message, storedAny: false };
	}
	return { ok: true, error: undefined, storedAny: true };
}
