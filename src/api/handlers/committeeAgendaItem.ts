import { db, schema } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import {
	type TeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { eq } from 'drizzle-orm';

// Ported from abilities/entities/committeeAgendaItem.ts
abilityBuilder.committeeAgendaItem.allow('read');
abilityBuilder.committeeAgendaItem.allow(['update', 'delete']).when(systemAdmin);

// Scoped through the committee, since an agenda item has no direct conference relation.
abilityBuilder.committeeAgendaItem.allow(['update', 'delete']).when((ctx) => {
	const committee = isTeamMemberOfConference(ctx, ['PROJECT_MANAGEMENT']);
	return committee ? { where: { committee } } : undefined;
});

export const CommitteeAgendaItemRef = object({ table: 'committeeAgendaItem' });
query({ table: 'committeeAgendaItem' });

const reviewHelpStatusEnum = enum_({ tsName: 'reviewHelpStatus' });

/** Roles that may flag an agenda item as needing review help. */
const REVIEW_ROLES = [
	'REVIEWER',
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE'
] as const satisfies readonly TeamRole[];

schemaBuilder.mutationFields((t) => ({
	createAgendaItem: t.drizzleField({
		type: CommitteeAgendaItemRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			title: t.arg.string({ required: true }),
			teaserText: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			// Agenda items are created by the chase integration, not by conference staff: the legacy
			// resolver required the `admin` or `service_user` OIDC role rather than a team role.
			if (!ctx.hasRole('admin') && !ctx.hasRole('service_user')) {
				throw new GraphQLError('Only admins can create agenda items');
			}

			const created = await db
				.insert(schema.committeeAgendaItem)
				.values({
					committeeId: args.committeeId,
					title: args.title,
					teaserText: args.teaserText ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.committeeAgendaItem
				.findFirst(
					query(
						ctx.abilities.committeeAgendaItem.filter('read').merge({ where: { id: created.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateAgendaItem: t.drizzleField({
		type: CommitteeAgendaItemRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			teaserText: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.committeeAgendaItem)
				.set({ title: args.title ?? undefined, teaserText: args.teaserText ?? undefined })
				.where(
					ctx.abilities.committeeAgendaItem.filter('update').merge({ where: { id: args.id } }).sql
						.where
				);

			return db.query.committeeAgendaItem
				.findFirst(
					query(
						ctx.abilities.committeeAgendaItem.filter('read').merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteAgendaItem: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.committeeAgendaItem)
				.where(
					ctx.abilities.committeeAgendaItem.filter('delete').merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.committeeAgendaItem.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Agenda item not found, or not yours to delete');
			}
			return true;
		}
	}),

	setAgendaItemReviewHelpStatus: t.drizzleField({
		type: CommitteeAgendaItemRef,
		args: {
			agendaItemId: t.arg.id({ required: true }),
			status: t.arg({ type: reviewHelpStatusEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw new GraphQLError('Must be logged in');
			}

			const agendaItem = await db.query.committeeAgendaItem
				.findFirst({
					where: { id: args.agendaItemId },
					with: { committee: { columns: { conferenceId: true } } }
				})
				.then(assertFindFirstExists);

			// Reviewers get this on top of the update ability, which they do not otherwise hold for
			// agenda items - hence the separate check rather than an ability filter.
			const teamMember = agendaItem.committee
				? await db.query.teamMember.findFirst({
						where: {
							conferenceId: agendaItem.committee.conferenceId,
							userId: callerId,
							role: { in: [...REVIEW_ROLES] }
						}
					})
				: undefined;

			if (!teamMember) {
				throw new GraphQLError('Access denied - requires reviewer status');
			}

			await db
				.update(schema.committeeAgendaItem)
				.set({ reviewHelpStatus: args.status })
				.where(eq(schema.committeeAgendaItem.id, args.agendaItemId));

			return db.query.committeeAgendaItem
				.findFirst(
					query(
						ctx.abilities.committeeAgendaItem
							.filter('read')
							.merge({ where: { id: args.agendaItemId } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
