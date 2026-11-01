/** The arguments of the school queries and mutations, checked and made ready for the service. */
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

/** A typed school name as it is stored: trimmed, with runs of whitespace collapsed. */
export function cleanSchoolName(name: string) {
	return name.replace(/\s+/g, ' ').trim();
}

/** A school's new name: never empty; `null` and left out both keep the name. */
export const schoolRenameSchema = z
	.string()
	.refine((name) => cleanSchoolName(name) !== '', { error: () => m.schoolNameRequired() })
	.nullish();

/** `searchSchools`' arguments: up to 50 schools, 10 when the limit is left out. */
export const searchSchoolsArgsSchema = z.object({
	search: z.string(),
	limit: z
		.number()
		.int()
		.nullish()
		.transform((limit) => Math.min(Math.max(limit ?? 10, 1), 50))
});

const CONFERENCE_SCHOOL_SORT_COLUMNS = [
	'name',
	'city',
	'delegations',
	'participants',
	'applied',
	'seated',
	'supervisors',
	'waitingList'
] as const;
export type ConferenceSchoolSortColumn = (typeof CONFERENCE_SCHOOL_SORT_COLUMNS)[number];

/**
 * `conferenceSchools`' arguments as the page asks for them: sorted by the participants, most first,
 * unless told otherwise; up to 500 rows a page.
 */
export const conferenceSchoolsArgsSchema = z.object({
	conferenceId: z.string(),
	search: z.string().nullish(),
	sortColumn: z
		.enum(CONFERENCE_SCHOOL_SORT_COLUMNS, { error: () => m.invalidSortColumn() })
		.nullish()
		.transform((column) => column ?? 'participants'),
	sortDesc: z
		.boolean()
		.nullish()
		.transform((desc) => desc ?? true),
	limit: z
		.number()
		.int()
		.transform((limit) => Math.min(Math.max(limit, 1), 500)),
	offset: z
		.number()
		.int()
		.transform((offset) => Math.max(offset, 0))
});
