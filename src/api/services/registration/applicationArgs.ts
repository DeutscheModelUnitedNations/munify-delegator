import type { SchoolChoice } from '#api/handlers/school/schoolService';
import { applicationFormSchema } from '#lib/schemata/applicationForm';

/** What an application to a conference names: the conference, the applicant's school and texts. */
export type ApplicationArgs = SchoolChoice & {
	conferenceId: string;
	motivation?: string | null;
	experience?: string | null;
};

/** Refuses an application whose school or texts break the form's limits. */
export function parseApplicationArgs(args: ApplicationArgs) {
	applicationFormSchema.parse({
		schoolId: args.schoolId,
		schoolName: args.schoolName,
		motivation: args.motivation,
		experience: args.experience
	});
}
