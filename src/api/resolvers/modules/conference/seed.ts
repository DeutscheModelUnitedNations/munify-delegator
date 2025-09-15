import { GraphQLError } from 'graphql';
import { builder } from '../../builder';
import { m } from '$lib/paraglide/messages';
import { ConferenceSeedingSchema } from '$lib/seeding/seedSchema';
import { db } from '$db/db';

builder.mutationFields((t) => {
	return {
		seedNewConference: t.field({
			type: t.builder.simpleObject('SeedNewConferenceResult', {
				fields: (t) => ({
					success: t.boolean(),
          conferenceId: t.string()
				})
			}),
			args: {
				data: t.arg({ type: 'JSONObject' })
			},
			resolve: async (root, args, ctx) => {
				const { user } = ctx.oidc;
				if (!user?.hasRole('admin')) {
					throw new GraphQLError(m.unauthorized({ error: 'User is not admin' }));
				}

				if (!args.data) {
					throw new GraphQLError(m.plausibilityIncompleteOrInvalidData());
				}

				const data = ConferenceSeedingSchema.parse(args.data);

				const conference = await db.$transaction(async (tx) => {
					const conference = await tx.conference.create({
						data: {
							...data.conference
						}
					});

					for (const nsa of data.nsa) {
						await tx.nonStateActor.create({
							data: {
								conferenceId: conference.id,
								...nsa
							}
						});
					}

					for (const customConferenceRole of data.customConferenceRole) {
						await tx.customConferenceRole.create({
							data: {
								conferenceId: conference.id,
								...customConferenceRole
							}
						});
					}

					for (const committee of data.committees) {
						await tx.committee.create({
							data: {
								...committee,
								conferenceId: conference.id,
								nations: {
									connect: committee.nations.map((n) => ({ alpha2Code: n.toLowerCase() }))
								}
							}
						});
					}

          return conference;
				});

				return {
					success: true,
					conferenceId: conference.id
				};
			}
		})
	};
});
