import { createQrPngDataUrl } from '@svelte-put/qr';
import { toDataURL } from '@svelte-put/qr/img';
import { downloadFromURL } from '#lib/utils/downloadHelpers';
import { logger } from '#lib/logger';

/** How every QR code of the app looks: DMUN's blue, with the conference emblem in the middle. */
export function qrStyle(logoUrl?: string) {
	return {
		shape: 'circle',
		// a logo needs the highest correction; without one a lower level keeps the code coarser
		errorCorrectionLevel: logoUrl ? 'H' : 'M',
		moduleFill: '#01548F',
		anchorOuterFill: '#1B1837',
		anchorInnerFill: '#01548F',
		logo: logoUrl
	} as const;
}

/** Saves a QR code as a PNG, styled like the one on screen and on white. */
export async function downloadQrPng({
	data,
	logoUrl,
	filename
}: {
	data: string;
	logoUrl?: string;
	filename: string;
}) {
	// The emblem has to be inlined: an SVG drawn onto a canvas loads nothing from elsewhere
	const logo = logoUrl
		? await toDataURL(logoUrl).catch((error: unknown) => {
				logger.warn('Loading the emblem for a QR code failed', error);
				return undefined;
			})
		: undefined;
	const url = await createQrPngDataUrl({
		...qrStyle(logo),
		data,
		width: 1024,
		height: 1024,
		backgroundFill: '#FFFFFF'
	});
	await downloadFromURL({ url, filename });
}
