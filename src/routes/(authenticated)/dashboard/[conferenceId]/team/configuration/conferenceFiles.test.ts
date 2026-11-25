import { beforeEach, describe, expect, test, vi } from 'vitest';

const { uploadFile } = vi.hoisted(() => ({
	uploadFile: vi.fn(async ({ file, target }: { file?: File; target: { field: string } }) =>
		file ? `${target.field}-id` : undefined
	)
}));

vi.mock('#lib/api/uploadFile', () => ({ uploadFile }));

import { uploadConferenceFiles } from './conferenceFiles';

const pdf = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });

beforeEach(() => {
	uploadFile.mockClear();
});

describe('uploadConferenceFiles', () => {
	test('names only the touched files, so the stored others are kept', async () => {
		// Strict: an untouched file must not be named at all, `null` removes it
		expect(
			await uploadConferenceFiles({
				conferenceId: 'c1',
				files: {
					logo: undefined,
					contract: pdf,
					guardianConsent: undefined,
					mediaConsent: null,
					termsAndConditions: undefined
				}
			})
		).toStrictEqual({ contractFileId: 'contract-id', mediaConsentFileId: null });
		expect(uploadFile).toHaveBeenCalledWith({
			file: pdf,
			target: { kind: 'conference', field: 'contract', conferenceId: 'c1' }
		});
	});

	test('sends nothing when no file was touched', async () => {
		expect(await uploadConferenceFiles({ conferenceId: 'c1', files: {} })).toStrictEqual({});
	});
});
