import { db, schema, type Transaction } from '#api/db/db.js';
import { and, eq, sql } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';

/**
 * Refuses a waiting list entry the conference cannot take: the waiting list is only open during
 * preparation, and it is for people without a place, so an applicant who was given a role cannot
 * join it. Rejected applicants keep their registration and are sent here (`ApplicationRejected`),
 * so a registration alone does not count. Until the assignment is released nobody knows whether
 * they have a place, and refusing only those who do would tell them, so every applicant waits.
 */
export async function assertWaitingListOpenFor(conferenceId: string, userId: string) {
	const where = { conferenceId, userId };
	// a registration names the conference and the user through the person's part in it
	const registration = { participant: where };
	const [conference, existing, singleParticipant, delegationMember] = await Promise.all([
		db.query.conference.findFirst({
			where: { id: conferenceId },
			columns: { state: true, assignmentReleased: true }
		}),
		db.query.waitingListEntry.findFirst({ where, columns: { id: true } }),
		db.query.singleParticipant.findFirst({
			where: registration,
			columns: { assignedRoleId: true }
		}),
		db.query.delegationMember.findFirst({
			where: registration,
			columns: { id: true },
			with: { delegation: { columns: { assignedRoleId: true } } }
		})
	]);

	if (!conference) throw apiError('NOT_FOUND', m.conferenceNotFound());
	if (conference.state !== 'PREPARATION') {
		throw apiError('CONFLICT', m.waitingListNotOpen());
	}
	if (existing) throw apiError('CONFLICT', m.waitingListAlreadyOn());

	const registrations = [singleParticipant, delegationMember?.delegation].filter(
		(registration) => registration !== undefined
	);
	if (registrations.length === 0) return;
	if (!conference.assignmentReleased) {
		throw apiError('CONFLICT', m.waitingListAfterAssignmentRelease());
	}
	if (registrations.some(holdsRole)) throw apiError('CONFLICT', m.waitingListAlreadyAccepted());
}

/** Whether a single participant was given a role, or a delegation a nation or non-state actor. */
function holdsRole(registration: { assignedRoleId: string | null }) {
	return Boolean(registration.assignedRoleId);
}

/**
 * Marks the user's waiting list entry in the conference as given a seat, keeping the date it
 * first was, and answers with the school the entry named so the new registration can carry it.
 * Not every user the team seats came from the waiting list: then this changes nothing.
 */
export async function markSeatedFromWaitingList(
	tx: Transaction,
	conferenceId: string,
	userId: string
): Promise<{ schoolId: string | null } | undefined> {
	const [entry] = await tx
		.update(schema.waitingListEntry)
		.set({
			assigned: true,
			assignedAt: sql`coalesce(${schema.waitingListEntry.assignedAt}, now())`
		})
		.where(
			and(
				eq(schema.waitingListEntry.conferenceId, conferenceId),
				eq(schema.waitingListEntry.userId, userId)
			)
		)
		.returning({ schoolId: schema.waitingListEntry.schoolId });
	return entry;
}
