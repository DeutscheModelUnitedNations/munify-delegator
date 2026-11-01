import { z } from 'zod';

export interface CertificateSessionLayoutOptions {
	/** Width of the area the list is centred in: the page, or the box the team placed it in. */
	pageWidth: number;
	/** Left edge of that area (0 for the page). */
	left?: number;
	/** Baseline of the heading; the rows go below it. */
	top: number;
	/** Nothing is drawn below this (the verification QR code sits there). */
	bottom: number;
	/** Text width at a font size, as the PDF font measures it. */
	measure: (text: string, size: number) => number;
	fontSize?: number;
}

export interface CertificateSessionLayout {
	heading: { x: number; y: number; size: number };
	/** `x` is the left edge of the checkmark, `y` the text baseline. */
	rows: { name: string; x: number; y: number }[];
	size: number;
	box: number;
}

const GAP = 5;
const COLUMN_GAP = 28;
const MIN_SCALE = 0.6;

/** How many columns a list of sessions is split into: one for a few, more for many. */
function columnCount(sessions: number) {
	if (sessions <= 6) return 1;
	if (sessions <= 16) return 2;
	return 3;
}

/**
 * Where the check-in sessions go on a certificate: a centered heading, then the sessions in one to
 * three columns, filled top to bottom, the block centered on the page. When they do not fit above
 * `bottom`, everything is scaled down (to 60 %), and rows that still do not fit are left out.
 * Undefined without sessions.
 */
export function layoutCertificateSessions({
	sessions,
	heading,
	options
}: {
	/** The names of the sessions the holder was at. */
	sessions: readonly string[];
	heading: string;
	options: CertificateSessionLayoutOptions;
}): CertificateSessionLayout | undefined {
	if (sessions.length === 0) return undefined;

	const columns = columnCount(sessions.length);
	const perColumn = Math.ceil(sessions.length / columns);
	const baseSize = options.fontSize ?? 9;
	const needed = (perColumn + 1.5) * baseSize * 1.6;
	const scale = Math.max(MIN_SCALE, Math.min(1, (options.top - options.bottom) / needed));
	const size = baseSize * scale;
	const lineHeight = size * 1.6;
	const box = size * 0.9;

	const groups = Array.from({ length: columns }, (_, column) =>
		sessions.slice(column * perColumn, (column + 1) * perColumn)
	).filter((group) => group.length > 0);
	const widths = groups.map(
		(group) => box + GAP + Math.max(...group.map((name) => options.measure(name, size)))
	);
	const total = widths.reduce((sum, width) => sum + width, 0) + COLUMN_GAP * (groups.length - 1);

	const headingSize = size * 1.1;
	const firstRow = options.top - lineHeight * 1.5;
	const left = options.left ?? 0;
	let x = left + (options.pageWidth - total) / 2;
	const rows: CertificateSessionLayout['rows'] = [];
	groups.forEach((group, column) => {
		group.forEach((name, index) => {
			const y = firstRow - index * lineHeight;
			if (y >= options.bottom) rows.push({ name, x, y });
		});
		x += widths[column] + COLUMN_GAP;
	});

	return {
		heading: {
			x: left + (options.pageWidth - options.measure(heading, headingSize)) / 2,
			y: options.top,
			size: headingSize
		},
		rows,
		size,
		box
	};
}

const sessionsClaim = z.array(z.string());

/**
 * The names of the check-in sessions a signed certificate states the holder was at (its `a`
 * claim). Certificates issued before sessions were listed, or with a claim of another shape, state
 * none.
 */
export function sessionsFromClaim(claim: unknown): string[] {
	const parsed = sessionsClaim.safeParse(claim);
	return parsed.success ? parsed.data : [];
}
