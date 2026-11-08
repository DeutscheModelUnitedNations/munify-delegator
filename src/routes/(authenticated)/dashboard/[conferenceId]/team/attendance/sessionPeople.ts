import type { AttendanceentryWhereInputArgument } from '#lib/api/rumbleClient/client';
import { containing } from '#lib/api/queryHelpers';
import { m } from '#lib/paraglide/messages';
import { fullName } from './attendanceSession';

/** How many scans the people list of a session shows at first, and adds on each "show more". */
export const SESSION_PEOPLE_PAGE = 50;

/** How many scans the export asks for at once: the API answers no more per list. */
export const SESSION_EXPORT_PAGE = 1000;

/**
 * Every row of a list the API answers a page at a time, asked for one page after the other until
 * one comes back short.
 */
export async function allPages<T>(fetchPage: (offset: number) => Promise<readonly T[]>) {
	const rows: T[] = [];
	for (let offset = 0; ; offset += SESSION_EXPORT_PAGE) {
		const page = await fetchPage(offset);
		rows.push(...page);
		if (page.length < SESSION_EXPORT_PAGE) return rows;
	}
}

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

/** What the export of a session reads of one scan. */
export interface ExportedScan {
	timestamp: Date;
	checkPassed: boolean | null;
	conferenceParticipant: {
		accessCardId: string | null;
		user: { id: string; givenName: string; familyName: string; email: string };
	};
	recordedBy: { givenName: string; familyName: string };
}

/** The columns of a session's export, in the order of `sessionPeopleCsvRow`. */
export function sessionPeopleCsvHeader() {
	return [
		m.timestamp(),
		m.givenName(),
		m.familyName(),
		m.email(),
		m.accessCardId(),
		m.sessionPeopleExportCheckPassed(),
		m.sessionPeopleExportRecordedBy(),
		m.userId()
	];
}

/**
 * One scan as a row of the export. The check column is empty for a session that only records,
 * which checks nothing.
 */
export function sessionPeopleCsvRow({
	scan,
	formatTime
}: {
	scan: ExportedScan;
	formatTime: (date: Date) => string;
}): string[] {
	const { user, accessCardId } = scan.conferenceParticipant;
	const check = scan.checkPassed === null ? '' : scan.checkPassed ? m.yes() : m.no();
	return [
		formatTime(scan.timestamp),
		user.givenName,
		user.familyName,
		user.email,
		accessCardId ?? '',
		check,
		fullName(scan.recordedBy),
		user.id
	];
}
