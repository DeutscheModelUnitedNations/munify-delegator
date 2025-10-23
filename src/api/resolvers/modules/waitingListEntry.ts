import { fetchUserParticipations } from '$api/services/fetchUserParticipations';
import { db } from '$db/db';
import {
	findManyWaitingListEntryQueryObject,
	findUniqueWaitingListEntryQueryObject,
	WaitingListEntryConferenceFieldObject,
	WaitingListEntryExperienceFieldObject,
	WaitingListEntryIdFieldObject,
	WaitingListEntryMotivationFieldObject,
	WaitingListEntryRequestsFieldObject,
	WaitingListEntrySchoolFieldObject,
	WaitingListEntryUserFieldObject,
	WaitingListEntryCreatedAtFieldObject,
	WaitingListEntryHiddenFieldObject,
	WaitingListEntryAssignedFieldObject,
	createOneWaitingListEntryMutationObject,
	deleteOneWaitingListEntryMutationObject,
	updateOneWaitingListEntryMutationObject
} from '$db/generated/graphql/WaitingListEntry';
import { GraphQLError } from 'graphql';
import { waitingListFormSchema } from '../../../routes/(authenticated)/registration/[conferenceId]/waiting-list/form-schema';
import { builder } from '../builder';

builder.prismaObject('WaitingListEntry', {
	fields: (t) => ({
		id: t.field(WaitingListEntryIdFieldObject),
		school: t.field(WaitingListEntrySchoolFieldObject),
		experience: t.field(WaitingListEntryExperienceFieldObject),
		motivation: t.field(WaitingListEntryMotivationFieldObject),
		requests: t.field(WaitingListEntryRequestsFieldObject),
		conference: t.relation('conference', WaitingListEntryConferenceFieldObject),
		user: t.relation('user', WaitingListEntryUserFieldObject),
		hidden: t.field(WaitingListEntryHiddenFieldObject),
		assigned: t.field(WaitingListEntryAssignedFieldObject),
		createdAt: t.field(WaitingListEntryCreatedAtFieldObject)
	})
});

builder.queryFields((t) => {
	const field = findManyWaitingListEntryQueryObject(t);
	return {
		findManyWaitingListEntry: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').WaitingListEntry]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueWaitingListEntryQueryObject(t);
	return {
		findUniqueWaitingListEntry: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').WaitingListEntry]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneWaitingListEntryMutationObject(t);
	return {
		createOneWaitingListEntry: t.prismaField({
			...field,
			args: {
				conferenceId: t.arg.id(),
				motivation: t.arg.string(),
				school: t.arg.string(),
				experience: t.arg.string(),
				requests: t.arg.string({ required: false })
			},
			resolve: async (query, root, args, ctx) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				waitingListFormSchema.parse({ ...args, conferenceId: undefined });

				// if the user somehow is already participating in the conference, throw an error
				await fetchUserParticipations({
					conferenceId: args.conferenceId,
					userId: user.sub!,
					throwIfAnyIsFound: true
				});

				// guard against the user already being on the waiting list
				const existingEntry = await db.waitingListEntry.findFirst({
					where: {
						conferenceId: args.conferenceId,
						userId: user.sub!
					}
				});
				if (existingEntry) {
					throw new GraphQLError('You are already on the waiting list for this conference');
				}

				return await db.waitingListEntry.create({
					...query,
					data: {
						conference: {
							connect: {
								id: args.conferenceId
							}
						},
						user: {
							connect: {
								id: user.sub!
							}
						},
						motivation: args.motivation,
						school: args.school,
						experience: args.experience,
						requests: args.requests
					}
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneWaitingListEntryMutationObject(t);
	return {
		deleteOneWaitingListEntry: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').WaitingListEntry]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneWaitingListEntryMutationObject(t);
	return {
		updateOneWaitingListEntry: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').WaitingListEntry]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
