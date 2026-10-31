import { db, schema, type Transaction } from '#api/db/db';
import { sql } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { waitingListEntryPubsub } from '#api/pubsub';
import { resolveSchoolChoice, type SchoolChoice } from '#api/handlers/school/schoolService';

/**
 * Refuses (CONFLICT) a waiting list entry the conference cannot take: the waiting list is only open during
 * preparation, and it is for people without a place, so an applicant who was given a role cannot
 * join it. Rejected applicants keep their registration and are sent here (`ApplicationRejected`),
 * so a registration alone does not count. Until the assignment is released nobody knows whether
 * they have a place, and refusing only those who do would tell them, so every applicant waits.
 */
async function assertWaitingListOpenFor({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
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

	if (!conference) throw apiError({ code: 'NOT_FOUND', message: m.conferenceNotFound() });
	if (conference.state !== 'PREPARATION') {
		throw apiError({ code: 'CONFLICT', message: m.waitingListNotOpen() });
	}
	if (existing) throw apiError({ code: 'CONFLICT', message: m.waitingListAlreadyOn() });

	const registrations = [singleParticipant, delegationMember?.delegation].filter(
		(registration) => registration !== undefined
	);
	if (registrations.length === 0) return;
	if (!conference.assignmentReleased) {
		throw apiError({ code: 'CONFLICT', message: m.waitingListAfterAssignmentRelease() });
	}
	if (registrations.some(holdsRole))
		throw apiError({ code: 'CONFLICT', message: m.waitingListAlreadyAccepted() });
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
export async function markSeatedFromWaitingList({
	tx,
	conferenceId,
	userId
}: {
	tx: Transaction;
	conferenceId: string;
	userId: string;
}): Promise<{ schoolId: string | null } | undefined> {
	const [entry] = await tx
		.update(schema.waitingListEntry)
		.set({ assignedAt: sql`coalesce(${schema.waitingListEntry.assignedAt}, now())` })
		.where(whereRows({ table: schema.waitingListEntry, filter: { conferenceId, userId } }))
		.returning({ id: schema.waitingListEntry.id, schoolId: schema.waitingListEntry.schoolId });
	if (!entry) return undefined;
	waitingListEntryPubsub.updated(entry.id);
	return { schoolId: entry.schoolId };
}

/** What an entrant writes about themselves; on an update, a field left out stays as it is. */
type EntryTexts = {
	motivation?: string | null;
	experience?: string | null;
	requests?: string | null;
};

/**
 * Puts the user on the conference's waiting list, with the school they name, if the list is open
 * to them (`assertWaitingListOpenFor`). Returns the entry's id.
 */
export async function createWaitingListEntry({
	conferenceId,
	userId,
	school,
	texts
}: {
	conferenceId: string;
	userId: string;
	school: SchoolChoice;
	texts: { motivation: string; experience: string; requests?: string | null };
}) {
	await assertWaitingListOpenFor({ conferenceId, userId });
	const created = await db.transaction(async (tx) =>
		tx
			.insert(schema.waitingListEntry)
			.values({
				conferenceId,
				userId,
				schoolId: (await resolveSchoolChoice({ choice: school, tx })) ?? undefined,
				...texts,
				requests: texts.requests ?? undefined
			})
			.returning({ id: schema.waitingListEntry.id })
			.then(assertFirstEntryExists)
	);
	waitingListEntryPubsub.created();
	return created.id;
}

/**
 * Changes the given fields of an entry the caller may update (`assertCanUpdateWaitingListEntry`):
 * `null` clears the requests and keeps the motivation and experience, which are never empty. The school is
 * resolved in the same transaction, so a refused update creates no school.
 */
export async function updateWaitingListEntry({
	id,
	school,
	texts,
	hidden
}: {
	id: string;
	school: SchoolChoice;
	texts: EntryTexts;
	hidden?: boolean | null;
}) {
	await db.transaction(async (tx) => {
		await tx
			.update(schema.waitingListEntry)
			.set({
				schoolId: await resolveSchoolChoice({ choice: school, tx }),
				motivation: texts.motivation ?? undefined,
				experience: texts.experience ?? undefined,
				requests: texts.requests,
				hidden: hidden ?? undefined,
				updatedAt: new Date()
			})
			.where(whereRows({ table: schema.waitingListEntry, filter: { id } }));
	});
	waitingListEntryPubsub.updated(id);
}
