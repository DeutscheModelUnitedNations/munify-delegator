import { type Transaction, db, schema } from '#api/db/db.js';
import {
	ensureConferenceParticipant,
	setParticipantSchool
} from '#api/handlers/conferenceParticipant/conferenceParticipantService.js';
import {
	fetchParticipationsAndTeamMembership,
	isParticipantOrTeamMember
} from '#api/services/registration/participation.js';
import {
	assertApplicationReady,
	assertRegistrationOpen
} from '#api/services/registration/applicationReadiness.js';
import { nullToUndefined } from '#api/services/args.js';
import { applicationFormSchema } from '#lib/schemata/applicationForm.js';
import { MIN_ROLE_APPLICATIONS } from '#lib/helpers/applicationReadiness.js';
import { m } from '#lib/paraglide/messages.js';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq, inArray } from 'drizzle-orm';
import { apiError } from '#api/services/errors/apiError.js';
import { resolveSchoolChoice, type SchoolChoice } from '#api/handlers/school/schoolService.js';
import { markSeatedFromWaitingList } from '#api/handlers/waitingListEntry/waitingListEntryService.js';

/**
 * The caller's existing single registration in the conference, if any, after making sure they may
 * register (again): not already in the conference in another way - unlike the delegation flow an
 * existing single registration is tolerated, and edited - and not already sent in, which is the
 * same line the update ability draws. That the role applied for is one of the conference's is
 * checked next (`assertRolesOf`).
 */
export async function ownRegistrationToEdit(
	userId: string,
	args: SchoolChoice & {
		conferenceId: string;
		motivation?: string | null;
		experience?: string | null;
	}
) {
	applicationFormSchema.parse({
		schoolId: args.schoolId,
		schoolName: args.schoolName,
		motivation: args.motivation,
		experience: args.experience
	});

	const { foundDelegationMember, foundSupervisor, foundTeamMember, foundSingleParticipant } =
		await fetchParticipationsAndTeamMembership({ conferenceId: args.conferenceId, userId });
	if (foundDelegationMember || foundSupervisor || foundTeamMember) {
		throw apiError(
			'CONFLICT',
			m.youCantApplyAsSingleParticipantAsYouAreAlreadyAppliedInTheConference()
		);
	}
	if (foundSingleParticipant?.applied) {
		throw apiError('CONFLICT', m.youAreAlreadySingleParticipant());
	}
	return foundSingleParticipant;
}

/** Links a single participant to a custom conference role (the join table behind `appliedForRoles`). */
async function applyForRoles(tx: Transaction, singleParticipantId: string, roleIds: string[]) {
	if (roleIds.length === 0) return;
	await tx
		.insert(schema.singleParticipantRoleWish)
		.values(roleIds.map((roleId) => ({ a: roleId, b: singleParticipantId })))
		.onConflictDoNothing();
}

async function unapplyForRoles(tx: Transaction, singleParticipantId: string, roleIds: string[]) {
	if (roleIds.length === 0) return;
	await tx
		.delete(schema.singleParticipantRoleWish)
		.where(
			and(
				eq(schema.singleParticipantRoleWish.b, singleParticipantId),
				inArray(schema.singleParticipantRoleWish.a, roleIds)
			)
		);
}

/**
 * Registering as a single participant. If the user already has an entry for this conference
 * the legacy resolver updated it instead of failing, so this does the same: `existing` is what
 * `ownRegistrationToEdit` found. Returns the row id.
 */
export async function registerSingleParticipant(
	userId: string,
	args: SchoolChoice & {
		conferenceId: string;
		roleId: string;
		motivation?: string | null;
		experience?: string | null;
	},
	existing: { id: string } | undefined
) {
	// Editing an existing registration is open in any stage; a new one only while applications are taken.
	if (!existing) await assertRegistrationOpen(args.conferenceId);
	// The person's row, the registration and the role it applies for go in together, so a refused
	// insert leaves none of them.
	return db.transaction(async (tx) => {
		const participantId = await ensureConferenceParticipant(tx, args.conferenceId, userId);
		// The school they name is their own; the registration keeps none.
		await setParticipantSchool(tx, [participantId], await resolveSchoolChoice(args, tx));
		let rowId: string;
		if (existing) {
			await tx
				.update(schema.singleParticipant)
				.set({ motivation: args.motivation, experience: args.experience })
				.where(eq(schema.singleParticipant.id, existing.id));
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

		await applyForRoles(tx, rowId, [args.roleId]);

		return rowId;
	});
}

/**
 * Updates a single participant's application and the roles it applies for, in one transaction.
 * The caller checks first that it may (`assertCanUpdateSingleParticipant`).
 */
export async function updateSingleParticipantApplication(args: {
	id: string;
	experience?: string | null;
	motivation?: string | null;
	applyForRolesIdList?: string[] | null;
	unApplyForRolesIdList?: string[] | null;
	applied?: boolean | null;
}) {
	if (args.applied) {
		const participant = await db.query.singleParticipant
			.findFirst({
				where: { id: args.id },
				with: { appliedForRoles: true, conference: true }
			})
			.then(assertFindFirstExists);

		assertApplicationReady(participant, args, MIN_ROLE_APPLICATIONS.singleParticipant);
	}

	applicationFormSchema.parse({ experience: args.experience, motivation: args.motivation });

	// A call that only changes role applications has nothing to set, and drizzle rejects an
	// empty `set` ("No values to set").
	await db.transaction(async (tx) => {
		// Motivation and experience are nullable, so an explicit null clears them.
		const values = {
			experience: args.experience,
			motivation: args.motivation,
			applied: args.applied ?? undefined
		};
		if (Object.values(values).some((value) => value !== undefined)) {
			await tx
				.update(schema.singleParticipant)
				.set(values)
				.where(eq(schema.singleParticipant.id, args.id));
		}

		await applyForRoles(tx, args.id, args.applyForRolesIdList ?? []);
		await unapplyForRoles(tx, args.id, args.unApplyForRolesIdList ?? []);
	});
}

/**
 * Management assigning a user directly as a single participant with a role, which the caller
 * checked (`assertCanCreateAppliedSingleParticipant`). Returns the row id.
 */
export async function createAssignedSingleParticipant(args: {
	userId: string;
	conferenceId: string;
	roleId: string;
}) {
	if (await isParticipantOrTeamMember({ userId: args.userId, conferenceId: args.conferenceId })) {
		throw apiError('CONFLICT', m.singleParticipantUserHasOtherRole());
	}

	const created = await db.transaction(async (tx) => {
		const waiting = await markSeatedFromWaitingList(tx, args.conferenceId, args.userId);
		const participantId = await ensureConferenceParticipant(tx, args.conferenceId, args.userId);
		await setParticipantSchool(tx, [participantId], waiting?.schoolId ?? undefined);

		return tx
			.insert(schema.singleParticipant)
			.values({
				conferenceParticipantId: participantId,
				applied: true,
				assignedRoleId: args.roleId
			})
			.returning()
			.then(assertFirstEntryExists);
	});

	return created.id;
}
