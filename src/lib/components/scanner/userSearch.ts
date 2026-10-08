import { client } from '$lib/api/rumbleClient/client';
import { containsWord } from '$lib/components/commandPalette/commandPaletteSearch';
import { takesPart, type UserSuggestion } from './suggestions';

const SUGGESTION_LIMIT = 5;
const MIN_SEARCH_LENGTH = 2;

/**
 * Users matching a name or an email, best match first. One query through rumble's trigram
 * `search` with the first word; the others narrow it with a cheap `ilike`, see `searchConference`.
 * Whether a match takes part in the conference is read off the five rows that came back, rather
 * than filtered for in the query, which made every search scan the participation tables.
 */
export async function searchUsers(conferenceId: string, term: string): Promise<UserSuggestion[]> {
	const [search, ...otherWords] = term.trim().split(/\s+/);
	if (!search || term.trim().length < MIN_SEARCH_LENGTH) return [];
	const inConference = { conferenceId: { eq: conferenceId } };

	const users = await client.query.users({
		__args: {
			search,
			...(otherWords.length > 0 && { where: { AND: otherWords.map(containsWord) } }),
			limit: SUGGESTION_LIMIT
		},
		id: true,
		givenName: true,
		familyName: true,
		email: true,
		delegationMemberships: { __args: { where: inConference }, id: true },
		singleParticipant: { __args: { where: inConference }, id: true },
		conferenceSupervisor: { __args: { where: inConference }, id: true },
		teamMember: { __args: { where: inConference }, id: true },
		waitingListEntry: { __args: { where: inConference }, id: true }
	});

	return users
		.map((user) => ({
			id: user.id,
			name: [user.givenName, user.familyName].filter(Boolean).join(' '),
			email: user.email,
			inConference: takesPart(user)
		}))
		.sort((a, b) => Number(b.inConference) - Number(a.inConference));
}
