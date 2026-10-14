import { client } from '$lib/api/rumbleClient/client';

const USER_MATCH_LIMIT = 100;

/**
 * The ids of the people rumble's trigram `search` finds for the term as typed, best match first;
 * `undefined` for an empty term, which narrows nothing. A list that searches by person asks for
 * its rows by these ids, since the person's name lives on another table than the list's own.
 */
export async function matchingUserIds(search: string): Promise<string[] | undefined> {
	const term = search.trim();
	if (!term) return undefined;
	const users = await client.query.users({
		__args: { search: term, limit: USER_MATCH_LIMIT },
		id: true
	});
	return users.map((user) => user.id);
}
