import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import type { ConferenceListType, GlobalListType } from './types';

/** The `mailing_list` rows: which Listmonk list the sync keeps for which conference and type. */

export function loadMailingLists() {
	return db
		.select({
			id: schema.mailingList.id,
			listmonkListId: schema.mailingList.listmonkListId,
			conferenceId: schema.mailingList.conferenceId,
			listType: schema.mailingList.listType
		})
		.from(schema.mailingList);
}

export type MailingListRow = Awaited<ReturnType<typeof loadMailingLists>>[number];

/** Records the Listmonk list of a conference and type, replacing one that vanished. */
export async function saveMailingList({
	conferenceId,
	listType,
	listmonkListId
}: {
	conferenceId: string | null;
	listType: GlobalListType | ConferenceListType;
	listmonkListId: number;
}) {
	await db
		.insert(schema.mailingList)
		.values({ conferenceId, listType, listmonkListId })
		.onConflictDoUpdate({
			target: [schema.mailingList.conferenceId, schema.mailingList.listType],
			set: { listmonkListId, updatedAt: new Date() }
		});
}

export async function deleteMailingList(id: string) {
	await db.delete(schema.mailingList).where(eq(schema.mailingList.id, id));
}
