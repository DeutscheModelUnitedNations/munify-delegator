import { db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { committeeAgendaItemPubsub, paperPubsub } from '#api/pubsub';

type ReviewHelpStatus = (typeof schema.reviewHelpStatus.enumValues)[number];

/** Adds an agenda item to a committee and returns its id. */
export async function createAgendaItem(values: {
	committeeId: string;
	title: string;
	teaserText?: string | null;
}) {
	const created = await db
		.insert(schema.committeeAgendaItem)
		.values({
			committeeId: values.committeeId,
			title: values.title,
			teaserText: values.teaserText ?? undefined
		})
		.returning({ id: schema.committeeAgendaItem.id })
		.then(assertFirstEntryExists);
	committeeAgendaItemPubsub.created();
	return created.id;
}

/** Changes the given fields of an agenda item; `null` leaves the title and teaser as they are. */
export async function updateAgendaItem({
	id,
	title,
	teaserText,
	reviewHelpStatus
}: {
	id: string;
	title?: string | null;
	teaserText?: string | null;
	reviewHelpStatus?: ReviewHelpStatus;
}) {
	await db
		.update(schema.committeeAgendaItem)
		.set({ title: title ?? undefined, teaserText: teaserText ?? undefined, reviewHelpStatus })
		.where(whereRows({ table: schema.committeeAgendaItem, filter: { id } }));
	committeeAgendaItemPubsub.updated(id);
}

/** Deletes an agenda item; its papers stay, without an agenda item, and are announced so. */
export async function deleteAgendaItem(id: string) {
	const paperIds = await db.transaction(async (tx) => {
		const papers = await tx.query.paper.findMany({
			where: { agendaItemId: id },
			columns: { id: true }
		});
		await tx
			.delete(schema.committeeAgendaItem)
			.where(whereRows({ table: schema.committeeAgendaItem, filter: { id } }));
		return papers.map((paper) => paper.id);
	});
	committeeAgendaItemPubsub.removed();
	if (paperIds.length > 0) paperPubsub.updated(paperIds);
}
