import type { SchoolChoice } from '#api/handlers/school/schoolService';

/** What an application to a conference names: the conference, the applicant's school and texts. */
export type ApplicationArgs = SchoolChoice & {
	conferenceId: string;
	motivation?: string | null;
	experience?: string | null;
};
