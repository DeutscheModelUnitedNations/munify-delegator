import { db, schema } from '$api/db/db';
import type { ApiContext } from '$api/rumble';
import {
	fetchUserParticipations,
	isUserAlreadyRegistered
} from '$api/services/registration/participation';
import { assertApplicationReady } from '$api/services/registration/applicationReadiness';
import { nullToUndefined } from '$api/services/args';
import { applicationFormSchema } from '$lib/schemata/applicationForm';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { and, eq, inArray } from 'drizzle-orm';

/** Refuses role ids that are not custom roles of the given conference. */
async function assertRolesOf(conferenceId: string, roleIds: readonly string[]) {
	const unique = [...new Set(roleIds)];
	if (unique.length === 0) return;
	const roles = await db.query.customConferenceRole.findMany({
		where: { id: { in: unique }, conferenceId },
		columns: { id: true }
	});
	if (roles.length !== unique.length) {
		throw new GraphQLError('Not every given role belongs to this conference');
	}
}

/**
 * The caller's existing single registration in the conference, if any, after making sure they may
 * register (again): not already in the conference in another way - unlike the delegation flow an
 * existing single registration is tolerated, and edited - and not already sent in, which is the
 * same line the update ability draws. The role applied for has to be one of the conference's.
 */
async function ownRegistrationToEdit(conferenceId: string, userId: string, roleId: string) {
	const { foundDelegationMember, foundSupervisor, foundTeamMember, foundSingleParticipant } =
		await fetchUserParticipations({ conferenceId, userId });
	if (foundDelegationMember || foundSupervisor || foundTeamMember) {
		throw new GraphQLError(
			m.youCantApplyAsSingleParticipantAsYouAreAlreadyAppliedInTheConference()
		);
	}
	if (foundSingleParticipant?.applied) {
		throw new GraphQLError(m.youAreAlreadySingleParticipant());
	}
	await assertRolesOf(conferenceId, [roleId]);
	return foundSingleParticipant;
}

/** Links a single participant to a custom conference role (the join table behind `appliedForRoles`). */
async function applyForRoles(singleParticipantId: string, roleIds: string[]) {
	if (roleIds.length === 0) return;
	await db
		.insert(schema.customConferenceRoleToSingleParticipant)
		.values(roleIds.map((roleId) => ({ a: roleId, b: singleParticipantId })))
		.onConflictDoNothing();
}

async function unapplyForRoles(singleParticipantId: string, roleIds: string[]) {
	if (roleIds.length === 0) return;
	await db
		.delete(schema.customConferenceRoleToSingleParticipant)
		.where(
			and(
				eq(schema.customConferenceRoleToSingleParticipant.b, singleParticipantId),
				inArray(schema.customConferenceRoleToSingleParticipant.a, roleIds)
			)
		);
}

/**
 * Registering as a single participant. If the user already has an entry for this conference
 * the legacy resolver updated it instead of failing, so this does the same. Returns the row id.
 */
export async function registerSingleParticipant(
	userId: string,
	args: {
		conferenceId: string;
		roleId: string;
		school?: string | null;
		motivation?: string | null;
		experience?: string | null;
	}
) {
	applicationFormSchema.parse({
		school: args.school,
		motivation: args.motivation,
		experience: args.experience
	});

	const existing = await ownRegistrationToEdit(args.conferenceId, userId, args.roleId);

	let rowId: string;
	if (existing) {
		await db
			.update(schema.singleParticipant)
			.set({
				school: args.school,
				motivation: args.motivation,
				experience: args.experience
			})
			.where(eq(schema.singleParticipant.id, existing.id));
		rowId = existing.id;
	} else {
		const created = await db
			.insert(schema.singleParticipant)
			.values({
				conferenceId: args.conferenceId,
				userId,
				school: nullToUndefined(args.school),
				motivation: nullToUndefined(args.motivation),
				experience: nullToUndefined(args.experience)
			})
			.returning()
			.then(assertFirstEntryExists);
		rowId = created.id;
	}

	await applyForRoles(rowId, [args.roleId]);

	return rowId;
}

/** Updates a single participant's application and the roles it applies for. */
export async function updateSingleParticipantApplication(
	ctx: ApiContext,
	args: {
		id: string;
		school?: string | null;
		experience?: string | null;
		motivation?: string | null;
		applyForRolesIdList?: string[] | null;
		unApplyForRolesIdList?: string[] | null;
		applied?: boolean | null;
	}
) {
	const updatable = (await ctx.abilities.singleParticipant.filter('update')).merge({
		where: { id: args.id }
	});

	// Checked up front: the role changes below go to the join table directly, so an update
	// that matched no row would otherwise not stop them.
	const target = await db.query.singleParticipant
		.findFirst({ ...updatable.query.single, columns: { id: true, conferenceId: true } })
		.then(assertFindFirstExists);
	await assertRolesOf(target.conferenceId, args.applyForRolesIdList ?? []);

	if (args.applied) {
		const participant = await db.query.singleParticipant
			.findFirst({
				...updatable.query.single,
				with: { appliedForRoles: true, conference: true }
			})
			.then(assertFindFirstExists);

		assertApplicationReady(participant, args, 1);
	}

	applicationFormSchema.parse({
		school: args.school,
		experience: args.experience,
		motivation: args.motivation
	});

	// School, motivation and experience are nullable, so an explicit null clears them.
	const values = {
		school: args.school,
		experience: args.experience,
		motivation: args.motivation,
		applied: args.applied ?? undefined
	};
	// A call that only changes role applications has nothing to set, and drizzle rejects an
	// empty `set` ("No values to set").
	if (Object.values(values).some((value) => value !== undefined)) {
		await db.update(schema.singleParticipant).set(values).where(updatable.sql.where);
	}

	await applyForRoles(args.id, args.applyForRolesIdList ?? []);
	await unapplyForRoles(args.id, args.unApplyForRolesIdList ?? []);
}

/** Management assigning a user directly as a single participant with a role. Returns the row id. */
export async function createAssignedSingleParticipant(args: {
	userId: string;
	conferenceId: string;
	roleId: string;
}) {
	await assertRolesOf(args.conferenceId, [args.roleId]);
	if (await isUserAlreadyRegistered({ userId: args.userId, conferenceId: args.conferenceId })) {
		throw new GraphQLError(
			"User is already assigned a different role in the conference. Can't assign SingleParticipant."
		);
	}

	const created = await db.transaction(async (tx) => {
		// Best-effort: not every assigned user came from the waiting list.
		await tx
			.update(schema.waitingListEntry)
			.set({ assigned: true })
			.where(
				and(
					eq(schema.waitingListEntry.conferenceId, args.conferenceId),
					eq(schema.waitingListEntry.userId, args.userId)
				)
			);

		return tx
			.insert(schema.singleParticipant)
			.values({
				conferenceId: args.conferenceId,
				userId: args.userId,
				applied: true,
				assignedRoleId: args.roleId
			})
			.returning()
			.then(assertFirstEntryExists);
	});

	return created.id;
}
