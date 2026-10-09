import { client } from '$lib/api/rumbleClient/client';
import {
	participation,
	searchEveryWord
} from '$lib/components/commandPalette/commandPaletteSearch';
import { looksLikeUserId, takesPart, type UserSuggestion } from './suggestions';

const SUGGESTION_LIMIT = 5;
const MIN_SEARCH_LENGTH = 2;

/**
 * The people whose access card id contains the term, so a typed or scanned card finds its owner.
 * Only rows the caller may read come back.
 */
async function searchCardHolders(conferenceId: string, term: string): Promise<UserSuggestion[]> {
	const statuses = await client.query.conferenceParticipantStatuses({
		__args: {
			where: { conferenceId: { eq: conferenceId }, accessCardId: { ilike: `%${term}%` } },
			limit: SUGGESTION_LIMIT
		},
		user: {
			id: true,
			givenName: true,
			familyName: true,
			email: true,
			...participation(conferenceId)
		}
	});
	return statuses.map(({ user }) => ({
		id: user.id,
		name: [user.givenName, user.familyName].filter(Boolean).join(' '),
		email: user.email,
		inConference: takesPart(user)
	}));
}

/**
 * People matching a name or an email: rumble's trigram `search` for each word, keeping the people
 * every word found, see `searchEveryWord`. Only people with a part in the conference are searched,
 * so a name shared with someone elsewhere never shows.
 */
async function searchNames(conferenceId: string, words: string[]): Promise<UserSuggestion[]> {
	const inConference = { conferenceId: { eq: conferenceId } };
	const users = await searchEveryWord(
		words,
		(search, limit) =>
			client.query.users({
				__args: {
					search,
					where: {
						OR: [
							{ delegationMemberships: inConference },
							{ singleParticipant: inConference },
							{ conferenceSupervisor: inConference },
							{ teamMember: inConference },
							{ waitingListEntry: inConference }
						]
					},
					limit
				},
				id: true,
				givenName: true,
				familyName: true,
				email: true,
				...participation(conferenceId)
			}),
		SUGGESTION_LIMIT
	);

	return users.map((user) => ({
		id: user.id,
		name: [user.givenName, user.familyName].filter(Boolean).join(' '),
		email: user.email,
		inConference: takesPart(user)
	}));
}

/**
 * Suggestions for what was typed: the owner of a matching access card first, then the people
 * matching by name or email, those with a part in the conference before the rest.
 */
export async function searchUsers(conferenceId: string, term: string): Promise<UserSuggestion[]> {
	const words = term.trim().split(/\s+/);
	if (!words[0] || term.trim().length < MIN_SEARCH_LENGTH) return [];

	const [cardHolders, byName] = await Promise.all([
		searchCardHolders(conferenceId, term.trim()),
		searchNames(conferenceId, words)
	]);
	const named = byName
		.filter((user) => !cardHolders.some((holder) => holder.id === user.id))
		.sort((a, b) => Number(b.inConference) - Number(a.inConference));
	return [...cardHolders, ...named];
}

/**
 * The user id a scanned or typed code stands for: the owner of the access card with that number,
 * else the code itself, which is what a badge's own code is. Ids are never looked up, and a lookup
 * that cannot be made (offline) leaves the code as it is.
 */
export async function resolveScannedCode(conferenceId: string, code: string): Promise<string> {
	if (looksLikeUserId(code)) return code;
	try {
		const statuses = await client.query.conferenceParticipantStatuses({
			__args: {
				where: { conferenceId: { eq: conferenceId }, accessCardId: { eq: code } },
				limit: 1
			},
			userId: true
		});
		return statuses.at(0)?.userId ?? code;
	} catch {
		return code;
	}
}
