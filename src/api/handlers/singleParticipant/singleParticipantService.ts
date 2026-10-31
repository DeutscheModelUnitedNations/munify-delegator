import { type Transaction, db, schema } from '#api/db/db';
import { singleParticipantPubsub } from '#api/pubsub';
import {
	ensureConferenceParticipant,
	setParticipantSchool
} from '#api/handlers/conferenceParticipant/conferenceParticipantService';
import {
	fetchParticipationsAndTeamMembership,
	isParticipantOrTeamMember
} from '#api/services/registration/participation';
import {
	assertApplicationReady,
	assertRegistrationOpen
} from '#api/services/registration/applicationReadiness';
import { nullToUndefined } from '#api/services/args';
import type { ApplicationArgs } from '#api/services/registration/applicationArgs';
import { MIN_ROLE_APPLICATIONS } from '#lib/helpers/applicationReadiness';
import { m } from '#lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { apiError } from '#api/services/errors';
import { resolveSchoolChoice } from '#api/handlers/school/schoolService';
import { markSeatedFromWaitingList } from '#api/handlers/waitingListEntry/waitingListEntryService';

/**
 * The user's existing single registration in the conference, if any, after making sure they may
 * register (again): not already in the conference in another way - unlike the delegation flow an
 * existing single registration is tolerated, and edited - and not already sent in, which is the
 * same line the update ability draws (CONFLICT otherwise).
 */
async function ownRegistrationToEdit({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	const { foundDelegationMember, foundSupervisor, foundTeamMember, foundSingleParticipant } =
		await fetchParticipationsAndTeamMembership({ conferenceId, userId });
	if (foundDelegationMember || foundSupervisor || foundTeamMember) {
		throw apiError({
			code: 'CONFLICT',
			message: m.youCantApplyAsSingleParticipantAsYouAreAlreadyAppliedInTheConference()
		});
	}
	if (foundSingleParticipant?.applied) {
		throw apiError({ code: 'CONFLICT', message: m.youAreAlreadySingleParticipant() });
	}
	return foundSingleParticipant;
}

/** Links a single participant to a custom conference role (the join table behind `appliedForRoles`). */
async function applyForRoles({
	tx,
	singleParticipantId,
	roleIds
}: {
	tx: Transaction;
	singleParticipantId: string;
	roleIds: string[];
}) {
	if (roleIds.length === 0) return;
	await tx
		.insert(schema.singleParticipantRoleWish)
		.values(roleIds.map((roleId) => ({ a: roleId, b: singleParticipantId })))
		.onConflictDoNothing();
}

async function unapplyForRoles({
	tx,
	singleParticipantId,
	roleIds
}: {
	tx: Transaction;
	singleParticipantId: string;
	roleIds: string[];
}) {
	if (roleIds.length === 0) return;
	await tx.delete(schema.singleParticipantRoleWish).where(
		whereRows({
			table: schema.singleParticipantRoleWish,
			filter: { b: singleParticipantId, a: { in: roleIds } }
		})
	);
}

/**
 * Registers the user as a single participant applying for `roleId`, which the caller checked
 * (`assertCanCreateSingleParticipant`). An existing registration of theirs in the conference that
 * is not sent in yet is updated instead (`ownRegistrationToEdit`); a new one is only taken while
 * the conference takes applications. Returns the row id.
 */
export async function registerSingleParticipant({
	userId,
	args
}: {
	userId: string;
	args: ApplicationArgs & { roleId: string };
}) {
	const existing = await ownRegistrationToEdit({ userId, conferenceId: args.conferenceId });
	// Editing an existing registration is open in any stage; a new one only while applications are taken.
	if (!existing) await assertRegistrationOpen(args.conferenceId);
	// The person's row, the registration and the role it applies for go in together, so a refused
	// insert leaves none of them.
	const rowId = await db.transaction(async (tx) => {
		const participantId = await ensureConferenceParticipant({
			tx,
			conferenceId: args.conferenceId,
			userId
		});
		// The school they name is their own; the registration keeps none.
		await setParticipantSchool({
			tx,
			participantIds: [participantId],
			schoolId: await resolveSchoolChoice({ choice: args, tx })
		});
		let rowId: string;
		if (existing) {
			// Only the texts given; `null` clears one.
			const texts = { motivation: args.motivation, experience: args.experience };
			if (texts.motivation !== undefined || texts.experience !== undefined) {
				await tx
					.update(schema.singleParticipant)
					.set(texts)
					.where(whereRows({ table: schema.singleParticipant, filter: { id: existing.id } }));
			}
			rowId = existing.id;
		} else {
			const created = await tx
				.insert(schema.singleParticipant)
				.values({
					conferenceParticipantId: participantId,
					motivation: nullToUndefined(args.motivation),
					experience: nullToUndefined(args.experience)
				})
				.returning()
				.then(assertFirstEntryExists);
			rowId = created.id;
		}

		await applyForRoles({ tx, singleParticipantId: rowId, roleIds: [args.roleId] });

		return rowId;
	});
	if (existing) singleParticipantPubsub.updated(existing.id);
	else singleParticipantPubsub.created();
	return rowId;
}

export type SingleParticipantUpdate = {
	id: string;
	experience?: string | null;
	motivation?: string | null;
	applyForRolesIdList?: string[] | null;
	unApplyForRolesIdList?: string[] | null;
	applied?: boolean | null;
};

/**
 * Refuses (CONFLICT) sending in the application unless it is ready, judged as it stands inside the
 * transaction, after this update's role changes and with its texts.
 */
async function assertReadyToApply({
	tx,
	update
}: {
	tx: Transaction;
	update: SingleParticipantUpdate;
}) {
	const participant = await tx.query.singleParticipant
		.findFirst({
			where: { id: update.id },
			columns: { experience: true, motivation: true },
			with: {
				appliedForRoles: { columns: { id: true } },
				conference: {
					columns: {
						state: true,
						applicationDeadline: true,
						registrationDeadlineGracePeriodMinutes: true
					}
				}
			}
		})
		.then(assertFindFirstExists);
	assertApplicationReady({
		applicant: participant,
		edits: update,
		minRoleApplications: MIN_ROLE_APPLICATIONS.singleParticipant
	});
}

/**
 * Updates a single participant's application and the roles it applies for, in one transaction;
 * the caller checked it may (`assertCanUpdateSingleParticipant`). Sending it in is refused unless
 * it is ready with this update's changes (`assertReadyToApply`).
 */
export async function updateSingleParticipantApplication(update: SingleParticipantUpdate) {
	await db.transaction(async (tx) => {
		await applyForRoles({
			tx,
			singleParticipantId: update.id,
			roleIds: update.applyForRolesIdList ?? []
		});
		await unapplyForRoles({
			tx,
			singleParticipantId: update.id,
			roleIds: update.unApplyForRolesIdList ?? []
		});
		if (update.applied) await assertReadyToApply({ tx, update });

		// Motivation and experience are nullable, so an explicit null clears them. A call that only
		// changes role applications has nothing to set, and drizzle rejects an empty `set`.
		const values = {
			experience: update.experience,
			motivation: update.motivation,
			applied: update.applied ?? undefined
		};
		if (Object.values(values).some((value) => value !== undefined)) {
			await tx
				.update(schema.singleParticipant)
				.set(values)
				.where(whereRows({ table: schema.singleParticipant, filter: { id: update.id } }));
		}
	});
	singleParticipantPubsub.updated(update.id);
}

/**
 * Management assigning a user directly as a single participant with a role, which the caller
 * checked (`assertCanCreateAppliedSingleParticipant`). Refuses (CONFLICT) a user who already takes
 * part in the conference or is on its team. Returns the row id.
 */
export async function createAssignedSingleParticipant(args: {
	userId: string;
	conferenceId: string;
	roleId: string;
}) {
	if (await isParticipantOrTeamMember({ userId: args.userId, conferenceId: args.conferenceId })) {
		throw apiError({ code: 'CONFLICT', message: m.singleParticipantUserHasOtherRole() });
	}

	const created = await db.transaction(async (tx) => {
		const waiting = await markSeatedFromWaitingList({
			tx,
			conferenceId: args.conferenceId,
			userId: args.userId
		});
		const participantId = await ensureConferenceParticipant({
			tx,
			conferenceId: args.conferenceId,
			userId: args.userId
		});
		await setParticipantSchool({
			tx,
			participantIds: [participantId],
			schoolId: waiting?.schoolId ?? undefined
		});

		const participant = await tx
			.insert(schema.singleParticipant)
			.values({
				conferenceParticipantId: participantId,
				applied: true,
				assignedRoleId: args.roleId
			})
			.returning()
			.then(assertFirstEntryExists);
		return participant;
	});
	singleParticipantPubsub.created();

	return created.id;
}
