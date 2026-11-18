import { z } from 'zod';
import { createServerSource } from '#lib/components/dataGrid/serverSource';
import type { SchoolRow } from '#lib/dataGrid/tables/schools';

const schoolRowSchema = z.object({
	id: z.string(),
	name: z.string(),
	city: z.string().nullable(),
	foreign: z.boolean(),
	delegations: z.number(),
	participants: z.number(),
	applied: z.number(),
	seated: z.number(),
	supervisors: z.number(),
	waitingList: z.number(),
	conferences: z.number(),
	participantsOverall: z.number()
});

/** Reads the rows the table engine answered for the schools table. */
function parseSchoolRows(values: readonly unknown[] | null): SchoolRow[] {
	return z.array(schoolRowSchema).parse(values ?? []);
}

/**
 * Every school, with how many people each sends to the conference and took part overall: the API's table engine counts,
 * searches, filters, sorts and groups them, and answers the rows whole.
 */
export function schoolsSource(conferenceId: string) {
	return createServerSource<SchoolRow>({
		table: 'schools',
		conferenceId,
		rowsFor: async ({ values }) => {
			const rows = parseSchoolRows(values);
			return () => rows;
		}
	});
}
