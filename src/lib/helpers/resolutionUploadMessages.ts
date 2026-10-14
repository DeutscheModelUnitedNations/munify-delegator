import { m } from '$lib/paraglide/messages';
import { MAX_RESOLUTION_UPLOAD_FILES, type ResolutionUploadProblem } from './resolutionUpload';

// Kept apart from resolutionUpload.ts so the validation logic stays free of the
// generated Paraglide runtime and can be unit-tested on its own.
export const resolutionUploadProblemMessages: Record<ResolutionUploadProblem, () => string> = {
	noFiles: () => m.resolutionUploadNoFiles(),
	tooManyFiles: () => m.resolutionUploadTooManyFiles({ max: MAX_RESOLUTION_UPLOAD_FILES }),
	notPdf: () => m.resolutionUploadOnlyPdf(),
	fileTooLarge: () => m.resolutionUploadTooLarge()
};
