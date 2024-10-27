import { builder } from '../../builder';
import {
	ConferenceEndConferenceFieldObject,
	ConferenceIdFieldObject,
	ConferenceImageDataURLFieldObject,
	ConferenceLanguageFieldObject,
	ConferenceLocationFieldObject,
	ConferenceLongTitleFieldObject,
	ConferenceStartAssignmentFieldObject,
	ConferenceStartConferenceFieldObject,
	ConferenceStartRegistrationFieldObject,
	ConferenceTitleFieldObject,
	ConferenceWebsiteFieldObject,
	deleteOneConferenceMutationObject,
	findManyConferenceQueryObject,
	findUniqueConferenceQueryObject,
	updateOneConferenceMutationObject
} from '$db/generated/graphql/Conference';
import { toDataURL } from '$api/services/fileToDataURL';
import { db } from '$db/db';

builder.prismaObject('Conference', {
	fields: (t) => ({
		id: t.field(ConferenceIdFieldObject),
		title: t.field(ConferenceTitleFieldObject),
		longTitle: t.field(ConferenceLongTitleFieldObject),
		location: t.field(ConferenceLocationFieldObject),
		language: t.field(ConferenceLanguageFieldObject),
		website: t.field(ConferenceWebsiteFieldObject),
		imageDataURL: t.field(ConferenceImageDataURLFieldObject),
		startRegistration: t.field(ConferenceStartRegistrationFieldObject),
		startAssignment: t.field(ConferenceStartAssignmentFieldObject),
		startConference: t.field(ConferenceStartConferenceFieldObject),
		endConference: t.field(ConferenceEndConferenceFieldObject),
		individualApplicationOptions: t.relation('individualApplicationOptions', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CustomConferenceRole
			})
		}),
		delegations: t.relation('delegations', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Delegation
			})
		}),
		nonStateActors: t.relation('nonStateActors', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').NonStateActor
			})
		}),
		conferenceSupervisors: t.relation('conferenceSupervisors', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').ConferenceSupervisor
			})
		}),
		conferenceUserStatus: t.relation('conferenceUserStatus', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').ConferenceParticipantStatus
			})
		}),
		teamMembers: t.relation('teamMembers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').TeamMember
			})
		}),
		committees: t.relation('committees', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Committee
			})
		}),
		singleParticipants: t.relation('singleParticipants', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').SingleParticipant
			})
		}),
		delegationMembers: t.relation('delegationMembers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').DelegationMember
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyConferenceQueryObject(t);
	return {
		findManyConferences: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Conference]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueConferenceQueryObject(t);
	return {
		findUniqueConference: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').Conference]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

// builder.mutationFields((t) => {
// 	const field = createOneConferenceMutationObject(t);
// 	return {
// 		createOneConference: t.prismaField({
// 			...field,

// 			resolve: async (query, root, args, ctx, info) => {
// 				// TODO check permissions
// when creating, take note of the file mappings for the image! See the update mutation for details on how to implement
// 				return field.resolve(query, root, args, ctx, info);
// 			}
// 		})
// 	};
// });

builder.mutationFields((t) => {
	const field = updateOneConferenceMutationObject(t);
	return {
		updateOneConference: t.prismaField({
			...field,
			args: {
				where: field.args.where,
				data: t.arg({
					type: t.builder.inputType('ConferenceUpdateDataInput', {
						fields: (t) => ({
							title: t.string(),
							longTitle: t.string({
								required: false
							}),
							location: t.string({
								required: false
							}),
							language: t.string({
								required: false
							}),
							website: t.string({
								required: false
							}),
							image: t.field({
								type: 'File',
								required: false
							}),
							startRegistration: t.field({ type: 'DateTime' }),
							startAssignment: t.field({ type: 'DateTime' }),
							startConference: t.field({ type: 'DateTime' }),
							endConference: t.field({ type: 'DateTime' })
						})
					})
				})
			},
			resolve: async (query, root, args, ctx) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Conference]
				};

				const dataURL = args.data.image ? await toDataURL(args.data.image) : undefined;
				delete args.data.image;

				return await db.conference.update({
					where: args.where,
					data: {
						...args.data,
						imageDataURL: dataURL
					},
					...query
				});
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneConferenceMutationObject(t);
	return {
		deleteOneConference: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').Conference]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
