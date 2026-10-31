import { client } from '#lib/api/rumbleClient/client';
import { participation, registrationIn } from '#lib/components/commandPalette/commandPaletteSearch';
import { takesPart, type UserSuggestion } from './suggestions';

const SUGGESTION_LIMIT = 5;
const MIN_SEARCH_LENGTH = 2;

/**
 * People matching a name or an email, on rumble's trigram `search` with the term as typed. Only
 * people with a part in the conference are searched, so a name shared with someone elsewhere
 * never shows.
 */
async function searchNames({
	conferenceId,
	term
}: {
	conferenceId: string;
	term: string;
}): Promise<UserSuggestion[]> {
	const inConference = { conferenceId: { eq: conferenceId } };
	const registeredIn = registrationIn(conferenceId);
	const users = await client.query.users({
		__args: {
			search: term,
			where: {
				OR: [
					{ delegationMemberships: registeredIn },
					{ singleParticipant: registeredIn },
					{ conferenceSupervisor: registeredIn },
					{ teamMember: inConference },
					{ waitingListEntry: inConference }
				]
			},
			limit: SUGGESTION_LIMIT
		},
		id: true,
		givenName: true,
		familyName: true,
		email: true,
		...participation(conferenceId)
	});

	return users.map((user) => ({
		id: user.id,
		name: [user.givenName, user.familyName].filter(Boolean).join(' '),
		email: user.email,
		inConference: takesPart(user)
	}));
}

/**
 * Suggestions for what was typed: the people matching by name or email, those with a part in the
 * conference before the rest.
 */
export async function searchUsers({
	conferenceId,
	term
}: {
	conferenceId: string;
	term: string;
}): Promise<UserSuggestion[]> {
	if (term.trim().length < MIN_SEARCH_LENGTH) return [];

	const byName = await searchNames({ conferenceId, term: term.trim() });
	return byName.sort((a, b) => Number(b.inConference) - Number(a.inConference));
}
