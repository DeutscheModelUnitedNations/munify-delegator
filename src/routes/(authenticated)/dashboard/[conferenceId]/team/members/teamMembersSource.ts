import { client } from '#lib/api/rumbleClient/client';
import { createServerSource } from '#lib/components/dataGrid/serverSource';
import { toTeamMemberRow, type TeamMemberRow } from './teamMemberRows';

/**
 * The team members of the ids given, in that order: fetched live, built by the reader wherever it
 * is called (in a `$derived`, where that is tracked).
 */
async function rowsFor(ids: string[]): Promise<() => TeamMemberRow[]> {
	if (ids.length === 0) return () => [];
	const members = await client.liveQuery.teamMembers({
		__args: { where: { id: { in: ids } } },
		id: true,
		role: true,
		createdAt: true,
		user: {
			id: true,
			givenName: true,
			familyName: true,
			email: true,
			birthday: true,
			phone: true,
			street: true,
			zip: true,
			city: true,
			country: true,
			gender: true,
			foodPreference: true
		}
	});
	return () => {
		const byId = new Map(members.map((member) => [member.id, toTeamMemberRow(member)]));
		return ids.flatMap((id) => {
			const row = byId.get(id);
			return row ? [row] : [];
		});
	};
}

/** The team table's rows: the API's table engine picks and orders the members. */
export function teamMembersSource(conferenceId: string) {
	return createServerSource<TeamMemberRow>({
		table: 'teamMembers',
		conferenceId,
		rowsFor: ({ ids }) => rowsFor(ids)
	});
}
