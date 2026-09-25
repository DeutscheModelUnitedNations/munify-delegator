import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { fetchUserParticipations } from '$api/services/participation';
import { tidyRoleApplications } from '$api/services/tidyRoleApplications';
import { makeEntryCode } from '$api/services/entryCodeGenerator';
import formatNames from '$lib/helpers/formatNames';
import { applicationFormSchema } from '$lib/schemata/applicationForm';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { eq, inArray } from 'drizzle-orm';
import dayjs from 'dayjs';

// Ported from abilities/entities/delegation.ts
abilityBuilder.delegation.allow(['read', 'update', 'delete']).when(systemAdmin);

// Delegates see their own delegation.
abilityBuilder.delegation.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { members: { user: { id } } } } : undefined;
});

// Supervisors see the delegations they supervise.
abilityBuilder.delegation.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { members: { supervisors: { user: { id } } } } } : undefined;
});

// The head delegate may change the delegation until it has applied.
abilityBuilder.delegation.allow(['update', 'delete']).when((ctx) => {
	const id = userId(ctx);
	return id
		? { where: { applied: false, members: { user: { id }, isHeadDelegate: true } } }
		: undefined;
});

// Project management and participant care manage their conference's delegations.
abilityBuilder.delegation.allow(['read', 'update']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return where ? { where } : undefined;
});

// Any team member of the conference may see them.
abilityBuilder.delegation.allow('read').when((ctx) => {
	const where = isTeamMemberOfConference(ctx);
	return where ? { where } : undefined;
});

export const DelegationRef = object({ table: 'delegation' });
query({ table: 'delegation' });

schemaBuilder.mutationFields((t) => ({
	createDelegation: t.drizzleField({
		type: DelegationRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			school: t.arg.string(),
			motivation: t.arg.string(),
			experience: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const id = userId(ctx);
			if (!id) {
				throw new GraphQLError('Must be logged in');
			}

			applicationFormSchema.parse({
				school: args.school,
				motivation: args.motivation,
				experience: args.experience
			});

			// Refuses if the user already takes part in this conference in any role.
			await fetchUserParticipations({
				conferenceId: args.conferenceId,
				userId: id,
				throwIfAnyIsFound: true
			});

			const created = await db.transaction(async (tx) => {
				const delegation = await tx
					.insert(schema.delegation)
					.values({
						conferenceId: args.conferenceId,
						school: args.school ?? undefined,
						motivation: args.motivation ?? undefined,
						experience: args.experience ?? undefined,
						entryCode: makeEntryCode()
					})
					.returning()
					.then(assertFirstEntryExists);

				// The creator becomes the head delegate.
				await tx.insert(schema.delegationMember).values({
					conferenceId: delegation.conferenceId,
					delegationId: delegation.id,
					userId: id,
					isHeadDelegate: true
				});

				return delegation;
			});

			return db.query.delegation
				.findFirst(
					query(
						ctx.abilities.delegation.filter('read').merge({ where: { id: created.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateDelegation: t.drizzleField({
		type: DelegationRef,
		args: {
			id: t.arg.id({ required: true }),
			applied: t.arg.boolean(),
			resetEntryCode: t.arg.boolean(),
			newHeadDelegateUserId: t.arg.id(),
			school: t.arg.string(),
			experience: t.arg.string(),
			motivation: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const updatable = ctx.abilities.delegation.filter('update').merge({ where: { id: args.id } });

			const delegation = await db.query.delegation
				.findFirst({
					...updatable.query.single,
					with: { members: true, conference: true, appliedForRoles: true }
				})
				.then(assertFindFirstExists);

			if (args.applied !== undefined && args.applied !== null) {
				// Drop applications the delegation has outgrown before judging whether it may apply.
				await tidyRoleApplications(delegation.id);

				if (args.applied) {
					if (delegation.members.length < 2) {
						throw new GraphQLError(m.notEnoughMembers());
					}
					if (delegation.appliedForRoles.length < 3) {
						throw new GraphQLError(m.notEnoughtRoleApplications());
					}
					if (
						!delegation.school ||
						!delegation.experience ||
						!delegation.motivation ||
						!applicationFormSchema.safeParse({
							school: args.school ?? delegation.school,
							motivation: args.motivation ?? delegation.motivation,
							experience: args.experience ?? delegation.experience
						}).success
					) {
						throw new GraphQLError(m.missingInformation());
					}
					// `conference` is a required FK, but the relational type is nullable, so this is
					// narrowed rather than asserted.
					const conference = delegation.conference;
					if (
						conference &&
						dayjs(conference.startAssignment)
							.add(conference.registrationDeadlineGracePeriodMinutes, 'minute')
							.isBefore(dayjs())
					) {
						throw new GraphQLError(m.applicationTimeframeClosed());
					}
				}

				await db
					.update(schema.delegation)
					.set({ applied: args.applied })
					.where(updatable.sql.where);
			}

			if (args.school || args.experience || args.motivation) {
				await db
					.update(schema.delegation)
					.set({
						school: args.school ?? undefined,
						experience: args.experience ?? undefined,
						motivation: args.motivation ?? undefined
					})
					.where(updatable.sql.where);
			}

			if (args.resetEntryCode) {
				await db
					.update(schema.delegation)
					.set({ entryCode: makeEntryCode() })
					.where(updatable.sql.where);
			}

			if (args.newHeadDelegateUserId) {
				const current = delegation.members.find((member) => member.isHeadDelegate);
				if (!current) {
					throw new GraphQLError('No head delegate member found');
				}
				const next = delegation.members.find(
					(member) => member.userId === args.newHeadDelegateUserId
				);
				if (!next) {
					throw new GraphQLError('No new head delegate member found');
				}

				await db.transaction(async (tx) => {
					await tx
						.update(schema.delegationMember)
						.set({ isHeadDelegate: false })
						.where(eq(schema.delegationMember.id, current.id));
					await tx
						.update(schema.delegationMember)
						.set({ isHeadDelegate: true })
						.where(eq(schema.delegationMember.id, next.id));
				});
			}

			return db.query.delegation
				.findFirst(
					query(
						ctx.abilities.delegation.filter('read').merge({ where: { id: args.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteDelegation: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.delegation)
				.where(
					ctx.abilities.delegation.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.delegation.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Delegation not found, or not yours to delete');
			}
			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Delegations left with no members.
	 *
	 * Rows are read before deletion so the caller still gets them back, which is what the legacy
	 * resolver did - after the delete there is nothing left to query.
	 */
	deleteEmptyDelegations: t.drizzleField({
		type: [DelegationRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const filter = ctx.abilities.delegation
				.filter('delete')
				.merge({ where: { NOT: { members: {} }, conferenceId: args.conferenceId } });

			// Read before deleting: afterwards there is nothing left to return.
			const doomed = await db.query.delegation.findMany(query(filter.query.many));
			if (doomed.length === 0) return [];

			await db.delete(schema.delegation).where(filter.sql.where);
			return doomed;
		}
	})
}));

const DelegationPreview = schemaBuilder.simpleObject('DelegationPreview', {
	fields: (t) => ({
		id: t.string(),
		conferenceId: t.string(),
		entryCode: t.string(),
		motivation: t.string({ nullable: true }),
		school: t.string({ nullable: true }),
		experience: t.string({ nullable: true }),
		memberCount: t.int(),
		headDelegateFullName: t.string(),
		applied: t.boolean(),
		conferenceTitle: t.string()
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * What somebody sees after entering a delegation's join code, before committing to join.
	 *
	 * Deliberately not ability-filtered: the caller is by definition not a member yet. Knowing the
	 * entry code is the authorisation, which is why it only needs a logged-in user.
	 */
	previewDelegation: t.field({
		type: DelegationPreview,
		args: {
			conferenceId: t.arg.id({ required: true }),
			entryCode: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			ctx.mustBeLoggedIn();

			const delegation = await db.query.delegation
				.findFirst({
					where: { conferenceId: args.conferenceId, entryCode: args.entryCode },
					with: {
						conference: { columns: { title: true } },
						members: { with: { user: { columns: { givenName: true, familyName: true } } } }
					}
				})
				.then(assertFindFirstExists);

			const headDelegate = delegation.members.find((member) => member.isHeadDelegate);

			return {
				id: delegation.id,
				conferenceId: delegation.conferenceId,
				entryCode: delegation.entryCode,
				motivation: delegation.motivation,
				school: delegation.school,
				experience: delegation.experience,
				memberCount: delegation.members.length,
				headDelegateFullName: formatNames(
					headDelegate?.user?.givenName,
					headDelegate?.user?.familyName
				),
				applied: delegation.applied,
				conferenceTitle: delegation.conference?.title ?? ''
			};
		}
	})
}));
