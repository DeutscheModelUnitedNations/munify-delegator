import { client } from '#lib/api/rumbleClient/client';

/** A school the picker offers: what it is called and where it is. */
export type SchoolOption = { id: string; name: string; city: string | null };

/** Too short a search matches half the schools; the picker waits for a little more. */
const MIN_SEARCH_LENGTH = 2;

/** The schools matching what was typed, the likeliest first, copied out of the query result. */
export async function searchSchoolOptions(search: string): Promise<SchoolOption[]> {
	const term = search.trim();
	if (term.length < MIN_SEARCH_LENGTH) return [];
	const schools = await client.query.searchSchools({
		__args: { search: term, limit: 8 },
		id: true,
		name: true,
		city: true
	});
	return schools.map((school) => ({
		id: school.id,
		name: school.name,
		city: school.city ?? null
	}));
}
