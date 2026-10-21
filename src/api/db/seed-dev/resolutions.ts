import { resolutionPdf } from '../seed-data/pdfDocuments';
import { addSeedFile } from './files';
import type { ConferenceSeed } from './context';

/**
 * The resolutions the committees passed, from the running conference on: one per agenda item
 * of the first three committees, plus a final declaration without a committee, so the downloads
 * show a group per committee and the untagged group.
 */
export async function addResolutions(cs: ConferenceSeed) {
	const state = cs.plan.conference.state;
	if (state !== 'ACTIVE' && state !== 'POST') return;
	const conference = cs.conference.longTitle ?? cs.conference.title;
	let number = 0;

	async function add(
		committee: { id: string; name: string } | null,
		topic: string,
		headline: string
	) {
		number++;
		const fileName = `Resolution ${number} - ${topic}.pdf`;
		const fileId = addSeedFile(cs.batch, {
			conferenceId: cs.id,
			kind: 'resolution',
			field: 'content',
			bytes: await resolutionPdf({
				conference,
				committee: committee?.name ?? null,
				headline,
				topic,
				number: `Res. ${number}/${new Date().getFullYear()}`
			}),
			mimeType: 'application/pdf',
			fileName
		});
		cs.batch.resolution.push({
			id: cs.rowId(`resolution-${number}`),
			conferenceId: cs.id,
			committeeId: committee?.id ?? null,
			title: topic,
			fileName,
			fileId
		});
	}

	for (const committee of cs.committees.slice(0, 3)) {
		const row = cs.batch.committee.find((c) => c.id === committee.id);
		const headline = row?.resolutionHeadline ?? `Resolution der ${committee.name}`;
		for (const agendaItemId of committee.agendaItemIds) {
			const item = cs.batch.committeeAgendaItem.find((a) => a.id === agendaItemId);
			if (item) await add(committee, item.title, headline);
		}
	}
	await add(null, 'Abschlusserklärung der Konferenz', 'Gemeinsame Abschlusserklärung');
}
