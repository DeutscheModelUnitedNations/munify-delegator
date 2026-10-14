import { applicationFormSchema } from '$lib/schemata/applicationForm';
import { m } from '$lib/paraglide/messages';
import dayjs from 'dayjs';
import type * as schema from '$api/db/schema';
import { apiError } from '$api/services/apiError';

/** The application texts an update may change alongside applying. */
export type ApplicationTextEdits = {
	school?: string | null;
	experience?: string | null;
	motivation?: string | null;
};

/**
 * Refuses an application from a delegation or single participant that is not ready for it: too
 * few role applications, incomplete texts (judged with this update's edits applied), or a closed
 * registration window. Only sent applications count, so this is where the conference's stage is
 * enforced - registering, joining and editing are open in any stage.
 */
export function assertApplicationReady(
	applicant: {
		school: string | null;
		experience: string | null;
		motivation: string | null;
		appliedForRoles: unknown[];
		conference: {
			state: (typeof schema.conference.$inferSelect)['state'];
			startAssignment: Date;
			registrationDeadlineGracePeriodMinutes: number;
		} | null;
	},
	edits: ApplicationTextEdits,
	minRoleApplications: number
) {
	if (applicant.appliedForRoles.length < minRoleApplications) {
		throw apiError('CONFLICT', m.notEnoughtRoleApplications());
	}
	if (
		!applicant.school ||
		!applicant.experience ||
		!applicant.motivation ||
		!applicationFormSchema.safeParse({
			school: edits.school ?? applicant.school,
			motivation: edits.motivation ?? applicant.motivation,
			experience: edits.experience ?? applicant.experience
		}).success
	) {
		throw apiError('CONFLICT', m.missingInformation());
	}
	// `conference` is a required FK, but the relational type is nullable, so this is narrowed
	// rather than asserted.
	const conference = applicant.conference;
	if (conference && conference.state !== 'PARTICIPANT_REGISTRATION') {
		throw apiError('CONFLICT', m.applicationTimeframeClosed());
	}
	if (
		conference &&
		dayjs(conference.startAssignment)
			.add(conference.registrationDeadlineGracePeriodMinutes, 'minute')
			.isBefore(dayjs())
	) {
		throw apiError('CONFLICT', m.applicationTimeframeClosed());
	}
}
