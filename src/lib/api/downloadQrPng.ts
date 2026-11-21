import { createQrPngDataUrl } from '@svelte-put/qr';
import { toDataURL } from '@svelte-put/qr/img';
import { client } from '#lib/api/rumbleClient/client';
import { qrStyle } from '#lib/helpers/qrStyle';
import { downloadFromURL } from '#lib/utils/downloadHelpers';
import { logger } from '#lib/logger';

/** Saves a QR code as a PNG, styled like the one on screen and on white. */
export async function downloadQrPng({
	data,
	conferenceId,
	emblem = false,
	filename
}: {
	data: string;
	/** The conference whose design (and emblem) the code takes. */
	conferenceId: string;
	/** Whether the emblem goes in the middle, as on screen. */
	emblem?: boolean;
	filename: string;
}) {
	const conference = await client.query.conference({
		__args: { id: conferenceId },
		qrCorporateDesign: true,
		emblemFile: { url: true }
	});
	const emblemUrl = emblem && conference.qrCorporateDesign ? conference.emblemFile?.url : undefined;
	// The emblem has to be inlined: an SVG drawn onto a canvas loads nothing from elsewhere
	const logo = emblemUrl
		? await toDataURL(emblemUrl).catch((error: unknown) => {
				logger.warn('Loading the emblem for a QR code failed', error);
				return undefined;
			})
		: undefined;
	const url = await createQrPngDataUrl({
		...qrStyle({ logoUrl: logo, corporate: conference.qrCorporateDesign }),
		data,
		width: 1024,
		height: 1024,
		backgroundFill: '#FFFFFF'
	});
	await downloadFromURL({ url, filename });
}
