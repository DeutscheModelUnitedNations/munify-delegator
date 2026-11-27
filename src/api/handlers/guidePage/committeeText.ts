import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { db } from '#api/db/db';
import { compileTypst } from '#api/services/typst';
import { apiError } from '#api/services/errors';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import { committeeTextToTypst, imageFileIdsOf } from '#lib/guide/guideTypst';
import { fillPlaceholders, type GuideDocument } from '#lib/guide/document';
import { storeGeneratedFile } from '../storedFile/storedFileService';
import { typstBrandingOf, writeTypstImage } from '#api/services/typstBranding';

/**
 * The committee text of an agenda item (`docs/plans/guide.md`, "Committee text PDF"): its guide
 * page rendered with Typst when the page is published, stored and offered on the page.
 */

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
					conference: { columns: { id: true, title: true } },
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
			const path = await writeTypstImage({ dir, fileId, name: `image-${index}` });
			if (path) images.set(fileId, path);
		}
		const branding = await typstBrandingOf({ conferenceId: committee.conference.id, dir });
		const source = committeeTextToTypst({
			doc,
			images,
			header: {
				conference: committee.conference.title,
				committee: `${committee.name} (${committee.abbreviation})`,
				agendaItem: item.title,
				logoPath: branding?.logoPath,
				agendaItemLabel: m.guideAgendaItemLabel(),
				brand: branding?.brand ?? 'dmun',
				lang: branding?.lang ?? 'de'
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
