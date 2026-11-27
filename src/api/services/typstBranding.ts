import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from '#api/db/db';
import { readStoredFile } from '#api/handlers/storedFile/storedFileService';
import { brandOfSeries, typstLang, type TypstBrand } from '#lib/helpers/typstTemplate';

/**
 * What a conference decides about the PDFs the app sets with Typst (`#lib/helpers/typstTemplate`):
 * its name, the brand of its series, its language and its logo, written next to the source.
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
	/** The logo's file name in `dir`, when the conference has one Typst can show. */
	logoPath?: string;
};

/**
 * The branding of a conference, with its logo (else its emblem) written into `dir`; undefined
 * for an unknown conference.
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
	let logoPath: string | undefined;
	for (const fileId of [conference.logoFileId, conference.emblemFileId]) {
		if (!fileId || logoPath) continue;
		logoPath = await writeTypstImage({ dir, fileId, name: 'logo' });
	}
	return {
		conferenceName: conference.title,
		brand: brandOfSeries(conference.series?.abbreviation),
		lang: typstLang(conference.language),
		logoPath
	};
}
