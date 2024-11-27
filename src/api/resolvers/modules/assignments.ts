import { db } from '$db/db';
import { findUniqueConferenceQueryArgs } from '$db/generated/graphql/Conference/queries/findUnique.base';
import { GraphQLError } from 'graphql';
import { ProjectSchema } from '../../../routes/assignment-assistant/[projectId]/appData.svelte';
import { builder } from '../builder';
import * as m from '$lib/paraglide/messages';

builder.mutationFields((t) => {
	return {
		setAssignmentData: t.field({
			type: t.builder.simpleObject('SetAssignmentDataResult', {
				fields: (t) => ({
					success: t.boolean()
				})
			}),
			args: {
				...findUniqueConferenceQueryArgs,
				data: t.arg({ type: 'Json' })
			},
			resolve: (root, args, ctx) => {
				const conference = db.conference.findUniqueOrThrow({
					where: {
						...args.where,
						AND: [ctx.permissions.allowDatabaseAccessTo('update').Conference]
					}
				});

				if (!args.data) {
					throw new GraphQLError(m.plausibilityIncompleteOrInvalidData());
				}

				const data = ProjectSchema.parse(args.data);

				db.$transaction(async (tx) => {
					// TODO implement
				});

				return {
					success: true
				};
			}
		})
	};
});
