import type { AttendanceentryWhereInputArgument } from '#lib/api/rumbleClient/client';
import { containing } from '#lib/components/tanStackTable/serverQuery';

/** How many scans the people list of a session shows at first, and adds on each "show more". */
export const SESSION_PEOPLE_PAGE = 50;

/**
 * The scans of a session whose person matches every word of the search: by given or family name,
 * email or access card number. Matching per word finds "Ada Lovelace" as well as "Lovelace Ada".
 */
export function sessionPeopleWhere({
	sessionId,
	search
}: {
	sessionId: string;
	search: string;
}): AttendanceentryWhereInputArgument {
	const words = search.trim().split(/\s+/).filter(Boolean);
	const inSession = { sessionId: { eq: sessionId } };
	if (words.length === 0) return inSession;
	return {
		...inSession,
		AND: words.map((word) => ({
			conferenceParticipant: {
				OR: [
					{
						user: {
							OR: [
								{ givenName: containing(word) },
								{ familyName: containing(word) },
								{ email: containing(word) }
							]
						}
					},
					{ accessCardId: containing(word) }
				]
			}
		}))
	};
}
