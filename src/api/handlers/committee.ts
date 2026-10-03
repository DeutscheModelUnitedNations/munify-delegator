import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PROJECT_MANAGEMENT_ROLES,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';

// Ported from abilities/entities/committee.ts
abilityBuilder.committee.allow('read');
abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);

// Project management edits its committees; creating and removing them is the seeding document's job.
abilityBuilder.committee
	.allow('update')
	.when((ctx) => where(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));

export const CommitteeRef = object({ table: 'committee' });
query({ table: 'committee' });
const pubsub = rumblePubsub({ table: 'committee' });

schemaBuilder.mutationFields((t) => ({
	updateCommittee: t.drizzleField({
		type: CommitteeRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			abbreviation: t.arg.string(),
			resolutionHeadline: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.committee)
				.set({
					name: args.name ?? undefined,
					abbreviation: args.abbreviation ?? undefined,
					// Deliberately not `?? undefined`: the legacy resolver passed this straight through,
					// so sending null clears the headline rather than leaving it untouched.
					resolutionHeadline: args.resolutionHeadline
				})
				.where(
					(await ctx.abilities.committee.filter('update')).merge({ where: { id: args.id } }).sql
						.where
				);

			pubsub.updated(args.id);

			return db.query.committee
				.findFirst(
					query(
						(await ctx.abilities.committee.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
