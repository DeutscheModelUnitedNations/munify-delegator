import { m } from '#lib/paraglide/messages';
import { db, type Transaction } from '#api/db/db';
import type * as schema from '#api/db/schema/index';
import { apiError } from '#api/services/errors';
import formatNames from '#lib/helpers/formatNames';
import {
	applicationBlockers,
	applicationBlockerTexts,
	type ApplicationBlocker
} from '#lib/helpers/applicationBlockers';
import {
	acceptsApplications,
	acceptsSupervisorSignups,
	applicationTextsComplete
} from '#lib/helpers/applicationReadiness';

/** The application texts an update may change alongside applying. */
export type ApplicationTextEdits = {
	experience?: string | null;
	motivation?: string | null;
};

/** A text as it is once the update is written: an edit replaces it, `null` included. */
const edited = <T>({ edit, stored }: { edit: T | undefined; stored: T }) =>
	edit === undefined ? stored : edit;

/**
 * Refuses registering yourself (as head delegate or single participant) or joining a
 * delegation outside the window applications are taken in. A registration makes the caller a
 * participant, which opens the conference's members-only details, surveys and papers to them, so
 * a conference that is not taking applications must not hand that out. The team registering
 * somebody else is not bound to it.
 */
export async function assertRegistrationOpen(conferenceId: string) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: {
			state: true,
			applicationDeadline: true,
			registrationDeadlineGracePeriodMinutes: true
		}
	});
	if (!conference || !acceptsApplications({ conference })) {
		throw apiError({ code: 'CONFLICT', message: m.applicationTimeframeClosed() });
	}
}

/**
 * Whether supervisors may sign themselves up to the conference right now: until it is over
 * (`acceptsSupervisorSignups`). Unlike delegates and single participants they are not bound to the
 * registration window. False for a conference that does not exist.
 */
export async function supervisorSignupOpen(conferenceId: string) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { state: true }
	});
	return !!conference && acceptsSupervisorSignups({ conference });
}

/** Refuses a supervisor signing themselves up once the conference is over (`supervisorSignupOpen`). */
export async function assertSupervisorSignupOpen(conferenceId: string) {
	if (!(await supervisorSignupOpen(conferenceId))) {
		throw apiError({ code: 'CONFLICT', message: m.supervisorSignupClosed() });
	}
}

/**
 * Refuses an application from a delegation or single participant that is not ready for it: too
 * few role applications, incomplete texts (judged with this update's edits applied), or a closed
 * registration window. Registering and joining are bound to the same window
 * (`assertRegistrationOpen`); editing a registration is open in any stage. The rules themselves live in
 * `#lib/helpers/applicationReadiness`, which the registration stages show as todos.
 */
export function assertApplicationReady({
	applicant,
	edits,
	minRoleApplications
}: {
	applicant: {
		experience: string | null;
		motivation: string | null;
		appliedForRoles: unknown[];
		conference: {
			state: (typeof schema.conference.$inferSelect)['state'];
			applicationDeadline: Date;
			registrationDeadlineGracePeriodMinutes: number;
		} | null;
	};
	edits: ApplicationTextEdits;
	minRoleApplications: number;
}) {
	if (applicant.appliedForRoles.length < minRoleApplications) {
		throw apiError({ code: 'CONFLICT', message: m.notEnoughRoleApplications() });
	}
	if (
		!applicationTextsComplete({
			motivation: edited({ edit: edits.motivation, stored: applicant.motivation }),
			experience: edited({ edit: edits.experience, stored: applicant.experience })
		})
	) {
		throw apiError({ code: 'CONFLICT', message: m.missingInformation() });
	}
	// `conference` is a required FK, but the relational type is nullable, so this is narrowed
	// rather than asserted.
	if (applicant.conference && !acceptsApplications({ conference: applicant.conference })) {
		throw apiError({ code: 'CONFLICT', message: m.applicationTimeframeClosed() });
	}
}

/** What `applicationBlockers` judges an application's people by, of its conference. */
const AGE_LIMIT_COLUMNS = {
	startConference: true,
	participantMinAge: true,
	participantMaxAge: true,
	supervisorMinAge: true
} as const;

/** Where the people of an application are read from: the database, or a transaction's view of it. */
type Reader = Pick<Transaction, 'query'>;

type UserRow = typeof schema.user.$inferSelect;

/** An application's people and what holds each of them back (`applicationBlockers`). */
export type ApplicationPeople = {
	applied: boolean;
	people: UserRow[];
	blockers: ApplicationBlocker[];
};

/** The members of the delegation and what holds each back; undefined for no such delegation. */
export async function delegationApplicationPeople({
	delegationId,
	reader = db
}: {
	delegationId: string;
	reader?: Reader;
}): Promise<ApplicationPeople | undefined> {
	const delegation = await reader.query.delegation.findFirst({
		where: { id: delegationId },
		columns: { applied: true },
		with: {
			conference: { columns: AGE_LIMIT_COLUMNS },
			members: { columns: { id: true }, with: { user: true } }
		}
	});
	if (!delegation?.conference) return undefined;
	const people = delegation.members.flatMap((member) => (member.user ? [member.user] : []));
	return {
		applied: delegation.applied,
		people,
		blockers: applicationBlockers({ conference: delegation.conference, people })
	};
}

/** The single participant and what holds them back; undefined for no such registration. */
export async function singleParticipantApplicationPeople({
	singleParticipantId,
	reader = db
}: {
	singleParticipantId: string;
	reader?: Reader;
}): Promise<ApplicationPeople | undefined> {
	const registration = await reader.query.singleParticipant.findFirst({
		where: { id: singleParticipantId },
		columns: { applied: true },
		with: { conference: { columns: AGE_LIMIT_COLUMNS }, user: true }
	});
	if (!registration?.conference || !registration.user) return undefined;
	const people = [registration.user];
	return {
		applied: registration.applied,
		people,
		blockers: applicationBlockers({ conference: registration.conference, people })
	};
}

/**
 * Refuses (CONFLICT) sending an application while the plausibility checks find anything about one
 * of its people (`applicationBlockers`), naming each of them and what is wrong.
 */
export function assertNoApplicationBlockers(application: ApplicationPeople | undefined) {
	if (!application || application.blockers.length === 0) return;
	const details = application.blockers.map((blocker) => {
		const person = application.people.find((candidate) => candidate.id === blocker.userId);
		const name = formatNames({ givenName: person?.givenName, familyName: person?.familyName });
		return `${name}: ${applicationBlockerTexts(blocker).join('; ')}`;
	});
	throw apiError({
		code: 'CONFLICT',
		message: m.applicationBlocked({ details: details.join('. ') })
	});
}
