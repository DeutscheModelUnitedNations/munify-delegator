import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from '#api/db/db';
import { readStoredFile } from '#api/handlers/storedFile/storedFileService';
import {
	brandOfSeries,
	typstLang,
	type TypstBrand,
	type TypstLogo
} from '#lib/helpers/typstTemplate';
import { copyBrandLogo } from './typst';

/**
 * What a conference decides about the PDFs the app sets with Typst (`#lib/helpers/typstTemplate`):
 * its name, the brand of its series, its language and its logo, written next to the source.
 *
 * The logo: MUN-SH and MUNBW print their official Wort-Bild-Marke (`typst-assets/logos/`, with a
 * white version for the dark background); any other conference its uploaded logo, else its
 * emblem; a conference of another DMUN series without either DMUN's mark. A conference without a
 * series may be another organizer's, so it never gets DMUN's.
 */

/** The image types Typst 0.10 reads, by the extension it needs. */
const IMAGE_EXTENSIONS: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif',
	'image/svg+xml': 'svg'
};

/**
 * Writes the stored file into `dir` as `name` plus its extension and answers that file name;
 * undefined for a missing file or a type Typst cannot read.
 */
export async function writeTypstImage({
	dir,
	fileId,
	name
}: {
	dir: string;
	fileId: string;
	name: string;
}) {
	const file = await db.query.storedFile.findFirst({
		where: { id: fileId },
		columns: { key: true, mimeType: true }
	});
	const extension = file ? IMAGE_EXTENSIONS[file.mimeType] : undefined;
	if (!file || !extension) return undefined;
	const bytes = await readStoredFile(file.key);
	if (!bytes) return undefined;
	const path = `${name}.${extension}`;
	await writeFile(join(dir, path), bytes);
	return path;
}

export type TypstBranding = {
	conferenceName: string;
	brand: TypstBrand;
	lang: string;
	/** The logo in `dir`, when the conference has one Typst can show. */
	logo?: TypstLogo;
};

/** The conference's own logo (else emblem), written into `dir`. */
async function uploadedLogo({
	fileIds,
	dir
}: {
	fileIds: (string | null)[];
	dir: string;
}): Promise<TypstLogo | undefined> {
	for (const fileId of fileIds) {
		if (!fileId) continue;
		const path = await writeTypstImage({ dir, fileId, name: 'logo' });
		if (path) return { path, clearSpace: false };
	}
	return undefined;
}

/** The logo a conference prints (see the top of this file). */
async function logoOf({
	brand,
	hasSeries,
	fileIds,
	dir
}: {
	brand: TypstBrand;
	hasSeries: boolean;
	fileIds: (string | null)[];
	dir: string;
}) {
	if (brand !== 'dmun') {
		const official = await copyBrandLogo({ brand, dir });
		if (official) return official;
	}
	const uploaded = await uploadedLogo({ fileIds, dir });
	if (uploaded || !hasSeries) return uploaded;
	return copyBrandLogo({ brand: 'dmun', dir });
}

/**
 * The branding of a conference, with its logo written into `dir`; undefined for an unknown
 * conference.
 */
export async function typstBrandingOf({
	conferenceId,
	dir
}: {
	conferenceId: string;
	dir: string;
}): Promise<TypstBranding | undefined> {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { title: true, language: true, logoFileId: true, emblemFileId: true },
		with: { series: { columns: { abbreviation: true } } }
	});
	if (!conference) return undefined;
	const brand = brandOfSeries(conference.series?.abbreviation);
	return {
		conferenceName: conference.title,
		brand,
		lang: typstLang(conference.language),
		logo: await logoOf({
			brand,
			hasSeries: !!conference.series,
			fileIds: [conference.logoFileId, conference.emblemFileId],
			dir
		})
	};
}
