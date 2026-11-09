import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inArray } from 'drizzle-orm';
import { unEmblemSvg } from '@deutschemodelunitednations/munify-resolution-editor';
import { resolutionToTypst } from '@deutschemodelunitednations/munify-resolution-editor/res-markup';
import type {
	Resolution,
	ResolutionHeaderData
} from '@deutschemodelunitednations/munify-resolution-editor/schema';
import { db, schema } from '#api/db/db';
import { resolutionPubsub } from '#api/pubsub';
import { compileTypst } from '#api/services/typst';
import { readStoredFile, storeGeneratedFile } from '#api/handlers/storedFile/storedFileService';
import { filePurpose } from '#api/handlers/storedFile/storageClient';
import { m } from '#lib/paraglide/messages';
import {
	adoptedResolutions,
	readableResolution,
	resolutionChanges,
	type AdoptedResolution,
	type ChasePaper
} from './adoptedResolutions';
import type { ChaseClient } from './chaseRemote';
import { PAGE_SIZE } from './liveTable';

/**
 * Takes the resolutions the linked CHASE adopted for one conference over as the conference's
 * resolutions (`docs/plans/chase-link.md`): renders each adopted text here, in this conference's
 * header (its emblem, the committee's resolution headline), stores the PDF and keeps one
 * `resolution` row per paper. The worker hands over the papers as it keeps them, without texts;
 * only the texts to render are read. A paper that is no longer adopted takes its resolution with
 * it; the old PDFs are left to the file cleanup.
 */
export async function syncResolutions({
	remote,
	conferenceId,
	papers
}: {
	remote: ChaseClient;
	conferenceId: string;
	papers: readonly ChasePaper[];
}) {
	const adopted = adoptedResolutions(papers);

	const existing = (
		await db.query.resolution.findMany({
			where: { conferenceId, chasePaperId: { isNotNull: true } },
			columns: { id: true, chasePaperId: true, chaseSnapshotId: true }
		})
	).flatMap(({ id, chasePaperId, chaseSnapshotId }) =>
		chasePaperId ? [{ id, chasePaperId, chaseSnapshotId }] : []
	);
	const { render, remove } = resolutionChanges({ adopted, existing });

	if (remove.length > 0) {
		await db.delete(schema.resolution).where(inArray(schema.resolution.id, remove));
		resolutionPubsub.removed();
	}
	if (render.length === 0) return;

	const contents = await readTexts({
		remote,
		snapshotIds: render.map((resolution) => resolution.snapshotId)
	});
	const context = await headerContext(conferenceId);
	for (const resolution of render) {
		const text = contents.get(resolution.snapshotId);
		const content = text === undefined ? undefined : readableResolution(text);
		// not a text this editor can print; it stays behind until a newer vote
		if (!content) continue;
		const pdf = await renderPdf({
			resolution,
			content,
			header: headerFor({ resolution, context }),
			emblem: context.emblem
		});
		const title = resolution.title ?? resolution.documentNumber ?? m.resolution();
		const fileId = await storeGeneratedFile({
			conferenceId,
			purpose: filePurpose({ kind: 'resolution', field: 'content' }),
			fileName: `${title}.pdf`,
			mimeType: 'application/pdf',
			bytes: new Uint8Array(pdf)
		});
		const committeeId = context.committees.has(resolution.committeeId)
			? resolution.committeeId
			: null;
		const [row] = await db
			.insert(schema.resolution)
			.values({
				conferenceId,
				committeeId,
				title,
				fileId,
				chasePaperId: resolution.paperId,
				chaseSnapshotId: resolution.snapshotId
			})
			// a newer text replaces the PDF; the title and committee stay as the team may have set them
			.onConflictDoUpdate({
				target: schema.resolution.chasePaperId,
				set: { fileId, chaseSnapshotId: resolution.snapshotId, updatedAt: new Date() }
			})
			.returning({ id: schema.resolution.id });
		resolutionPubsub.created();
		if (row) resolutionPubsub.updated(row.id);
	}
}

/** The texts of the given snapshots, by id; a list answers at most a page. */
async function readTexts({
	remote,
	snapshotIds
}: {
	remote: ChaseClient;
	snapshotIds: readonly string[];
}) {
	const texts = new Map<string, string>();
	for (let start = 0; start < snapshotIds.length; start += PAGE_SIZE) {
		const snapshots = await remote.query.paperContentSnapshots({
			__args: { where: { id: { in: snapshotIds.slice(start, start + PAGE_SIZE) } } },
			id: true,
			content: true
		});
		for (const snapshot of snapshots) texts.set(snapshot.id, snapshot.content);
	}
	return texts;
}

/** What the headers of a conference's resolutions print, read once per sync. */
async function headerContext(conferenceId: string) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { title: true, longTitle: true },
		with: { emblemFile: { columns: { key: true, mimeType: true } } }
	});
	const committees = await db.query.committee.findMany({
		where: { conferenceId },
		columns: { id: true, abbreviation: true, name: true, resolutionHeadline: true },
		with: { agendaItems: { columns: { id: true, title: true } } }
	});
	const emblemFile = conference?.emblemFile;
	const emblemBytes = emblemFile ? await readStoredFile(emblemFile.key) : null;
	return {
		conference,
		committees: new Map(committees.map((committee) => [committee.id, committee])),
		emblem: emblemFile && emblemBytes ? { mimeType: emblemFile.mimeType, bytes: emblemBytes } : null
	};
}

type HeaderContext = Awaited<ReturnType<typeof headerContext>>;

function headerFor({
	resolution,
	context
}: {
	resolution: AdoptedResolution;
	context: HeaderContext;
}): ResolutionHeaderData {
	const committee = context.committees.get(resolution.committeeId);
	return {
		conferenceName: context.conference?.title ?? 'Model UN',
		conferenceTitle:
			context.conference?.longTitle ?? context.conference?.title ?? 'Model United Nations',
		committeeAbbreviation: committee?.abbreviation,
		committeeFullName: committee?.name,
		committeeResolutionHeadline: committee?.resolutionHeadline ?? undefined,
		documentNumber: resolution.documentNumber,
		topic: committee?.agendaItems.find((item) => item.id === resolution.agendaItemId)?.title
	};
}

const EMBLEM_EXTENSIONS: Record<string, string> = {
	'image/svg+xml': 'svg',
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif'
};

async function renderPdf({
	resolution,
	content,
	header,
	emblem
}: {
	resolution: AdoptedResolution;
	content: Resolution;
	header: ResolutionHeaderData;
	emblem?: HeaderContext['emblem'];
}) {
	const dir = await mkdtemp(join(tmpdir(), 'mun-link-'));
	try {
		const extension = emblem && EMBLEM_EXTENSIONS[emblem.mimeType];
		const emblemPath = extension ? `emblem.${extension}` : 'emblem.svg';
		await writeFile(join(dir, emblemPath), extension && emblem ? emblem.bytes : unEmblemSvg);
		const source = resolutionToTypst(content, header, { emblemPath });
		return await compileTypst({ dir, source });
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
