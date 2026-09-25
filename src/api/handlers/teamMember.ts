import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	TEAM_ADMIN_ROLES,
	assertMayManageConference,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { enum_ } from '$api/rumble';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/teamMember.ts
abilityBuilder.teamMember.allow(['read', 'update', 'delete']).when(systemAdmin);

// Team members can see each other.
abilityBuilder.teamMember.allow('read').when((ctx) => {
	const where = isTeamMemberOfConference(ctx);
	return where ? { where } : undefined;
});

// Project management and team coordinators manage the team.
abilityBuilder.teamMember.allow(['update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, TEAM_ADMIN_ROLES);
	return where ? { where } : undefined;
});

export const TeamMemberRef = object({ table: 'teamMember' });
query({ table: 'teamMember' });

const teamRoleEnum = enum_({ tsName: 'teamRole' });

schemaBuilder.mutationFields((t) => ({
	createTeamMember: t.drizzleField({
		type: TeamMemberRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true }),
			role: t.arg({ type: teamRoleEnum })
		},
		resolve: async (query, _root, args, ctx) => {
			// Project management only - and, unlike the other create checks, a system admin who is
			// not on the team passes too. That matches the legacy resolver exactly.
			await assertMayManageConference(args.conferenceId, userId(ctx), ['PROJECT_MANAGEMENT'], {
				allowSystemAdmin: true,
				ctx
			});

			const existing = await db.query.teamMember.findFirst({
				where: { conferenceId: args.conferenceId, userId: args.userId }
			});
			if (existing) {
				throw new GraphQLError('User is already a team member');
			}

			const created = await db
				.insert(schema.teamMember)
				.values({
					conferenceId: args.conferenceId,
					userId: args.userId,
					role: args.role ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.teamMember
				.findFirst(
					query(
						ctx.abilities.teamMember.filter('read').merge({ where: { id: created.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateTeamMember: t.drizzleField({
		type: TeamMemberRef,
		args: {
			id: t.arg.id({ required: true }),
			role: t.arg({ type: teamRoleEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.teamMember)
				.set({ role: args.role })
				.where(
					ctx.abilities.teamMember.filter('update').merge({ where: { id: args.id } }).sql.where
				);

			return db.query.teamMember
				.findFirst(
					query(
						ctx.abilities.teamMember.filter('read').merge({ where: { id: args.id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteTeamMember: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.teamMember)
				.where(
					ctx.abilities.teamMember.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.teamMember.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Team member not found, or not yours to delete');
			}
			return true;
		}
	})
}));
