import { client } from '#lib/api/rumbleClient/client';

/** A delegation's role and who is in it, each with their committee. */
export function fetchDelegationSeat(delegationId: string) {
	return client.liveQuery.delegation({
		__args: { id: delegationId },
		id: true,
		applied: true,
		assignedRole: {
			id: true,
			kind: true,
			name: true,
			abbreviation: true,
			icon: true,
			nation: { alpha2Code: true, alpha3Code: true }
		},
		members: {
			id: true,
			isHeadDelegate: true,
			user: { id: true, givenName: true, familyName: true },
			assignedCommittee: { id: true, abbreviation: true, name: true }
		}
	});
}

/** The members by name, family name first. */
export function byName<M extends { user: { givenName: string; familyName: string } }>(
	members: readonly M[]
): M[] {
	const fullName = ({ user }: M) => `${user.familyName}${user.givenName}`;
	return members.toSorted((a, b) => fullName(a).localeCompare(fullName(b)));
}
