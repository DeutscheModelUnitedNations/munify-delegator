import { m } from '#lib/paraglide/messages.js';
import { db } from '#api/db/db.js';
import type * as schema from '#api/db/schema/index.js';
import { apiError } from '#api/services/errors/apiError.js';
import {
	acceptsApplications,
	applicationTextsComplete
} from '#lib/helpers/applicationReadiness.js';

/** The application texts an update may change alongside applying. */
export type ApplicationTextEdits = {
	experience?: string | null;
	motivation?: string | null;
};

/** A text as it is once the update is written: an edit replaces it, `null` included. */
const edited = <T>(edit: T | undefined, stored: T) => (edit === undefined ? stored : edit);

/**
 * Refuses registering yourself (as head delegate, single participant or supervisor) or joining a
 * delegation outside the window applications are taken in. A registration makes the caller a
 * participant, which opens the conference's members-only details, surveys and papers to them, so
 * a conference that is not taking applications must not hand that out. The team registering
 * somebody else is not bound to it.
 */
export async function assertRegistrationOpen(conferenceId: string) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { state: true, startAssignment: true, registrationDeadlineGracePeriodMinutes: true }
	});
	if (!conference || !acceptsApplications(conference)) {
		throw apiError('CONFLICT', m.applicationTimeframeClosed());
	}
}

/**
 * Refuses an application from a delegation or single participant that is not ready for it: too
 * few role applications, incomplete texts (judged with this update's edits applied), or a closed
 * registration window. Registering and joining are bound to the same window
 * (`assertRegistrationOpen`); editing a registration is open in any stage. The rules themselves live in
 * `#lib/helpers/applicationReadiness.js`, which the registration stages show as todos.
 */
export function assertApplicationReady(
	applicant: {
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
		throw apiError('CONFLICT', m.notEnoughRoleApplications());
	}
	if (
		!applicationTextsComplete({
			motivation: edited(edits.motivation, applicant.motivation),
			experience: edited(edits.experience, applicant.experience)
		})
	) {
		throw apiError('CONFLICT', m.missingInformation());
	}
	// `conference` is a required FK, but the relational type is nullable, so this is narrowed
	// rather than asserted.
	if (applicant.conference && !acceptsApplications(applicant.conference)) {
		throw apiError('CONFLICT', m.applicationTimeframeClosed());
	}
}
