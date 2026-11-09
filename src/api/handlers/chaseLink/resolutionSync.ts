import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inArray } from 'drizzle-orm';
import { resolutionToTypst } from '@deutschemodelunitednations/munify-resolution-editor/res-markup';
import type {
	Resolution,
	ResolutionHeaderData
} from '@deutschemodelunitednations/munify-resolution-editor/schema';
import { emblemFileOf, resolutionHeader, resolutionTitle } from './resolutionHeader';
import { db, schema } from '#api/db/db';
import { resolutionPubsub } from '#api/pubsub';
import { compileTypst } from '#api/services/typst';
import { readStoredFile, storeGeneratedFile } from '#api/handlers/storedFile/storedFileService';
import { filePurpose } from '#api/handlers/storedFile/storageClient';
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
	const { render, remove } = resolutionChanges({
		adopted: adoptedResolutions(papers),
		existing: await linkedResolutions(conferenceId)
	});
	await removeResolutions(remove);
	if (render.length === 0) return;

	const contents = await readTexts({
		remote,
		snapshotIds: render.map((resolution) => resolution.snapshotId)
	});
	const context = await headerContext(conferenceId);
	for (const resolution of render) {
		const content = readableText(contents.get(resolution.snapshotId));
		// not a text this editor can print; it stays behind until a newer vote
		if (content) await storeResolution({ conferenceId, resolution, content, context });
	}
}

/** The conference's resolutions the link brought. */
async function linkedResolutions(conferenceId: string) {
	const rows = await db.query.resolution.findMany({
		where: { conferenceId, chasePaperId: { isNotNull: true } },
		columns: { id: true, chasePaperId: true, chaseSnapshotId: true }
	});
	return rows.flatMap(({ id, chasePaperId, chaseSnapshotId }) =>
		chasePaperId ? [{ id, chasePaperId, chaseSnapshotId }] : []
	);
}

async function removeResolutions(ids: string[]) {
	if (ids.length === 0) return;
	await db.delete(schema.resolution).where(inArray(schema.resolution.id, ids));
	resolutionPubsub.removed();
}

function readableText(text: string | undefined) {
	return text === undefined ? undefined : readableResolution(text);
}

/** Renders one adopted resolution, stores its PDF and writes its `resolution` row. */
async function storeResolution({
	conferenceId,
	resolution,
	content,
	context
}: {
	conferenceId: string;
	resolution: AdoptedResolution;
	content: Resolution;
	context: HeaderContext;
}) {
	const committee = context.committees.get(resolution.committeeId);
	const pdf = await renderPdf({
		resolution,
		content,
		header: resolutionHeader({ resolution, conference: context.conference, committee }),
		emblem: context.emblem
	});
	const title = resolutionTitle(resolution);
	const fileId = await storeGeneratedFile({
		conferenceId,
		purpose: filePurpose({ kind: 'resolution', field: 'content' }),
		fileName: `${title}.pdf`,
		mimeType: 'application/pdf',
		bytes: new Uint8Array(pdf)
	});
	const [row] = await db
		.insert(schema.resolution)
		.values({
			conferenceId,
			committeeId: committee ? resolution.committeeId : null,
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
	return {
		conference,
		committees: new Map(committees.map((committee) => [committee.id, committee])),
		emblem: await readEmblem(conference?.emblemFile)
	};
}

async function readEmblem(file: { key: string; mimeType: string } | null | undefined) {
	if (!file) return null;
	const bytes = await readStoredFile(file.key);
	return bytes ? { mimeType: file.mimeType, bytes } : null;
}

type HeaderContext = Awaited<ReturnType<typeof headerContext>>;

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
		const emblemFile = emblemFileOf(emblem);
		await writeFile(join(dir, emblemFile.path), emblemFile.bytes);
		const source = resolutionToTypst(content, header, { emblemPath: emblemFile.path });
		return await compileTypst({ dir, source });
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
