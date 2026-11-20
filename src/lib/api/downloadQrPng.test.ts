import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = { conference: vi.fn() };
const createQrPngDataUrl = vi.fn(async (_options: Record<string, unknown>) => 'data:image/png;qr');
const toDataURL = vi.fn(async (_url: string) => 'data:image/svg+xml;emblem');
const downloadFromURL = vi.fn(async (_args: { url: string; filename: string }) => undefined);

vi.mock('#lib/api/rumbleClient/client', () => ({ client: { query } }));
vi.mock('@svelte-put/qr', () => ({ createQrPngDataUrl }));
vi.mock('@svelte-put/qr/img', () => ({ toDataURL }));
vi.mock('#lib/utils/downloadHelpers', () => ({ downloadFromURL }));

const { downloadQrPng } = await import('./downloadQrPng');
const { logger } = await import('#lib/logger');

/** The conference answers with its design and emblem. */
function conference({ corporate, emblem }: { corporate: boolean; emblem: string | null }) {
	query.conference.mockResolvedValue({
		qrCorporateDesign: corporate,
		emblemFile: emblem ? { url: emblem } : null
	});
}

const drawn = () => createQrPngDataUrl.mock.calls.at(-1)?.[0];

beforeEach(() => vi.clearAllMocks());

describe('downloadQrPng', () => {
	it('saves a corporate code with the emblem inlined, on white', async () => {
		conference({ corporate: true, emblem: 'https://bucket/emblem.svg' });
		await downloadQrPng({ data: 'code', conferenceId: 'c', emblem: true, filename: 'qr.png' });
		expect(toDataURL).toHaveBeenCalledWith('https://bucket/emblem.svg');
		expect(drawn()).toMatchObject({
			data: 'code',
			shape: 'circle',
			logo: 'data:image/svg+xml;emblem',
			backgroundFill: '#FFFFFF'
		});
		expect(downloadFromURL).toHaveBeenCalledWith({
			url: 'data:image/png;qr',
			filename: 'qr.png'
		});
	});

	it('saves a plain code without the emblem where the conference wants plain ones', async () => {
		conference({ corporate: false, emblem: 'https://bucket/emblem.svg' });
		await downloadQrPng({ data: 'code', conferenceId: 'c', emblem: true, filename: 'qr.png' });
		expect(toDataURL).not.toHaveBeenCalled();
		expect(drawn()).toMatchObject({ shape: 'square', logo: undefined });
	});

	it('leaves the emblem out unless asked, or when the conference has none', async () => {
		conference({ corporate: true, emblem: 'https://bucket/emblem.svg' });
		await downloadQrPng({ data: 'code', conferenceId: 'c', filename: 'qr.png' });
		conference({ corporate: true, emblem: null });
		await downloadQrPng({ data: 'code', conferenceId: 'c', emblem: true, filename: 'qr.png' });
		expect(toDataURL).not.toHaveBeenCalled();
		expect(drawn()).toMatchObject({ shape: 'circle', logo: undefined });
	});

	it('still saves the code when the emblem does not load', async () => {
		const warn = vi.spyOn(logger, 'warn');
		conference({ corporate: true, emblem: 'https://bucket/emblem.svg' });
		toDataURL.mockRejectedValueOnce(new Error('offline'));
		await downloadQrPng({ data: 'code', conferenceId: 'c', emblem: true, filename: 'qr.png' });
		expect(warn).toHaveBeenCalled();
		expect(drawn()).toMatchObject({ logo: undefined });
		expect(downloadFromURL).toHaveBeenCalled();
	});
});
