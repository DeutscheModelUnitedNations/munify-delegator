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
	discussionPoints?: string[] | null;
}) {
	const created = await db
		.insert(schema.committeeAgendaItem)
		.values({
			committeeId: values.committeeId,
			title: values.title,
			teaserText: values.teaserText ?? undefined,
			discussionPoints: values.discussionPoints ?? undefined
		})
		.returning({ id: schema.committeeAgendaItem.id })
		.then(assertFirstEntryExists);
	committeeAgendaItemPubsub.created();
	return created.id;
}

/**
 * Changes the given fields of an agenda item; `null` leaves the title, teaser and points for
 * discussion as they are. The points are one value: the whole list, in order.
 */
export async function updateAgendaItem({
	id,
	title,
	teaserText,
	discussionPoints,
	reviewHelpStatus
}: {
	id: string;
	title?: string | null;
	teaserText?: string | null;
	discussionPoints?: string[] | null;
	reviewHelpStatus?: ReviewHelpStatus;
}) {
	const values = {
		title: title ?? undefined,
		teaserText: teaserText ?? undefined,
		discussionPoints: discussionPoints ?? undefined,
		reviewHelpStatus
	};
	// a save that changed nothing (the client sends only what changed) writes nothing
	if (Object.values(values).every((value) => value === undefined)) return;
	await db
		.update(schema.committeeAgendaItem)
		.set(values)
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
