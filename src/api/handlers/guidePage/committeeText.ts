import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { db } from '#api/db/db';
import { compileTypst } from '#api/services/typst';
import { apiError } from '#api/services/errors';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import { committeeTextToTypst, imageFileIdsOf } from '#lib/guide/guideTypst';
import { fillPlaceholders, type GuideDocument } from '#lib/guide/document';
import { readStoredFile, storeGeneratedFile } from '../storedFile/storedFileService';

/**
 * The committee text of an agenda item (`docs/plans/guide.md`, "Committee text PDF"): its guide
 * page rendered with Typst when the page is published, stored and offered on the page.
 */

/** The image types Typst 0.10 reads, by the extension it needs. */
const IMAGE_EXTENSIONS: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif',
	'image/svg+xml': 'svg'
};

/** Writes the stored file under `name` plus its extension; undefined for a type Typst cannot read. */
async function writeImage({ dir, fileId, name }: { dir: string; fileId: string; name: string }) {
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

/**
 * Renders the committee text of an agenda item page and stores it; answers the file's id. A
 * failed render refuses the publish (INVALID_INPUT) with what Typst said in the log.
 */
export async function renderCommitteeText(page: {
	id: string;
	title: string;
	content: GuideDocument;
	agendaItemId: string;
}) {
	const item = await db.query.committeeAgendaItem.findFirst({
		where: { id: page.agendaItemId },
		columns: { title: true },
		with: {
			committee: {
				columns: { name: true, abbreviation: true },
				with: {
					conference: { columns: { id: true, title: true, emblemFileId: true } },
					agendaItems: { columns: { title: true } }
				}
			}
		}
	});
	if (!item) return null;
	const { committee } = item;
	const doc = fillPlaceholders(page.content, {
		conference: committee.conference.title,
		committee: {
			name: committee.name,
			agendaItems: committee.agendaItems.map((agendaItem) => agendaItem.title)
		}
	});
	const dir = await mkdtemp(join(tmpdir(), 'guide-committee-text-'));
	try {
		const images = new Map<string, string>();
		for (const [index, fileId] of imageFileIdsOf(doc).entries()) {
			const path = await writeImage({ dir, fileId, name: `image-${index}` });
			if (path) images.set(fileId, path);
		}
		const emblemPath = committee.conference.emblemFileId
			? await writeImage({ dir, fileId: committee.conference.emblemFileId, name: 'emblem' })
			: undefined;
		const source = committeeTextToTypst({
			doc,
			images,
			header: {
				conference: committee.conference.title,
				committee: `${committee.name} (${committee.abbreviation})`,
				agendaItem: item.title,
				emblemPath,
				committeeLabel: m.committee(),
				agendaItemLabel: m.guideAgendaItemLabel()
			}
		});
		const pdf = await compileTypst({ dir, source });
		return await storeGeneratedFile({
			conferenceId: committee.conference.id,
			purpose: 'guide/committeeText',
			fileName: `${committee.abbreviation} - ${item.title}.pdf`,
			mimeType: 'application/pdf',
			bytes: new Uint8Array(pdf)
		});
	} catch (error) {
		logger.warn('Rendering a committee text failed', { pageId: page.id, error: String(error) });
		throw apiError({ code: 'INVALID_INPUT', message: m.guideCommitteeTextFailed() });
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
