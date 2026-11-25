import { beforeEach, describe, expect, test, vi } from 'vitest';
import { m } from '#lib/paraglide/messages';

const passPostalGuide = vi.hoisted(() => vi.fn());
const fetchPostalRegistrationSources = vi.hoisted(() => vi.fn());
const downloadPostalRegistrationDocuments = vi.hoisted(() => vi.fn());
const postalParticipant = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('#lib/state/postalGuide.svelte.js', () => ({ passPostalGuide }));
vi.mock('./postalRegistrationSources', () => ({
	fetchPostalRegistrationSources,
	downloadPostalRegistrationDocuments
}));
vi.mock('./postalRegistrationData', () => ({ postalParticipant, postalRecipient: () => ({}) }));
vi.mock('svelte-sonner', () => ({ toast }));

const { downloadPostalRegistration } = await import('./postalRegistrationPdf');

const onStart = vi.fn();
const download = () => downloadPostalRegistration({ userId: 'ada', conferenceId: 'c', onStart });

describe('downloadPostalRegistration', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		passPostalGuide.mockResolvedValue(true);
		fetchPostalRegistrationSources.mockResolvedValue({ user: {}, conference: {} });
		postalParticipant.mockReturnValue({ birthday: new Date(), participant: {} });
	});

	test('downloads once the guide was passed', async () => {
		onStart.mockImplementation(() => expect(passPostalGuide).toHaveBeenCalled());
		await download();
		expect(onStart).toHaveBeenCalledOnce();
		expect(downloadPostalRegistrationDocuments).toHaveBeenCalledOnce();
		expect(toast.success).toHaveBeenCalledWith(m.postalRegistrationPDFGenerated());
	});

	test('does nothing when the guide is left', async () => {
		passPostalGuide.mockResolvedValue(false);
		await download();
		expect(onStart).not.toHaveBeenCalled();
		expect(fetchPostalRegistrationSources).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	test('says that the address or birthday is missing', async () => {
		postalParticipant.mockReturnValue(undefined);
		await download();
		expect(downloadPostalRegistrationDocuments).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith(m.incompleteAddressOrBirthdayForPostalRegistration());
	});

	test('says that it failed', async () => {
		downloadPostalRegistrationDocuments.mockRejectedValue(new Error('no template'));
		await download();
		expect(toast.error).toHaveBeenCalledWith(m.errorGeneratingPostalRegistrationPDF());
	});
});
