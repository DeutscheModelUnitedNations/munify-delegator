/**
 * How every QR code of the app looks on screen, as the conference's `qrCorporateDesign` says: in
 * the corporate design DMUN's blue with round modules and the conference emblem in the middle, or
 * plain black squares. The PDFs draw the same two looks (`#lib/api/pdfQr`).
 */
export function qrStyle({ logoUrl, corporate }: { logoUrl?: string; corporate: boolean }) {
	if (!corporate) {
		return {
			shape: 'square',
			errorCorrectionLevel: 'M',
			moduleFill: '#000000',
			anchorOuterFill: '#000000',
			anchorInnerFill: '#000000',
			logo: undefined
		} as const;
	}
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
