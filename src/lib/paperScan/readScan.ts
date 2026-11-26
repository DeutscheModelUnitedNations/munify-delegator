import { parseSignedCode } from '#lib/signedCode/signedCode';
import { decodeAreas, type PageAreas } from './areas';
import type { PaperField } from './fields';
import type { FoundMarker } from './markers';
import { readPaper, type FieldReading } from './readPaper';
import type { Picture } from './picture';

/** The fields a page's code says it carries; `null` for a code of a page without any. */
function areasOfCode(code: string): PageAreas | null {
	const claims = parseSignedCode(code)?.claims;
	if (claims?.kind !== 'print' || !claims.areas) return null;
	const areas = decodeAreas(claims.areas);
	return areas && areas.areas.length > 0 ? areas : null;
}

/**
 * The fields of the page whose code is `code`, read off `picture`: `[]` for a page without any,
 * `null` when the page is not wholly readable in the picture (`readPaper`).
 */
export function readPageOfCode({
	picture,
	code,
	located
}: {
	picture: Picture;
	code: string;
	/** The markers in the picture, where they were looked for already. */
	located?: readonly FoundMarker[];
}): FieldReading[] | null {
	const areas = areasOfCode(code);
	return areas ? readPaper({ picture, areas, located }) : [];
}

/** The fields printed on the page whose code is `code`; none for a page without any. */
export const fieldsOfCode = (code: string): PaperField[] =>
	areasOfCode(code)?.areas.map(({ field }) => field) ?? [];
