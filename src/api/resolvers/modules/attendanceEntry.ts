import {
	AttendanceEntryIdFieldObject,
	AttendanceEntryTimestampFieldObject,
	AttendanceEntryOccasionFieldObject,
	AttendanceEntryRecordedByFieldObject,
	AttendanceEntryCreatedAtFieldObject,
	AttendanceEntryUpdatedAtFieldObject,
	findManyAttendanceEntryQueryObject,
	deleteOneAttendanceEntryMutationObject
} from '$db/generated/graphql/AttendanceEntry';
import { GraphQLError } from 'graphql';
import { builder } from '../builder';
import { db } from '$db/db';

builder.prismaObject('AttendanceEntry', {
	fields: (t) => ({
		id: t.field(AttendanceEntryIdFieldObject),
		timestamp: t.field(AttendanceEntryTimestampFieldObject),
		occasion: t.field(AttendanceEntryOccasionFieldObject),
		recordedBy: t.relation('recordedBy', AttendanceEntryRecordedByFieldObject),
		conferenceParticipantStatus: t.relation('conferenceParticipantStatus'),
		createdAt: t.field(AttendanceEntryCreatedAtFieldObject),
		updatedAt: t.field(AttendanceEntryUpdatedAtFieldObject)
	})
});

builder.queryFields((t) => {
	const field = findManyAttendanceEntryQueryObject(t);
	return {
		findManyAttendanceEntries: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').AttendanceEntry]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => ({
	createOneAttendanceEntry: t.prismaField({
		type: 'AttendanceEntry',
		args: {
			userId: t.arg.string({ required: true }),
			conferenceId: t.arg.string({ required: true }),
			occasion: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const loggedInUser = ctx.permissions.getLoggedInUserOrThrow();

			// Verify logged-in user is a team member (any role) for this conference
			const teamMember = await db.teamMember.findFirst({
				where: {
					conferenceId: args.conferenceId,
					userId: loggedInUser.sub
				}
			});

			if (!teamMember && !loggedInUser.hasRole('admin')) {
				throw new GraphQLError('Only team members can create attendance entries.');
			}

			// Upsert ConferenceParticipantStatus so that it exists before creating the entry
			const status = await db.conferenceParticipantStatus.upsert({
				where: {
					userId_conferenceId: {
						userId: args.userId,
						conferenceId: args.conferenceId
					}
				},
				create: {
					userId: args.userId,
					conferenceId: args.conferenceId
				},
				update: {}
			});

			return db.attendanceEntry.create({
				...query,
				data: {
					conferenceParticipantStatusId: status.id,
					occasion: args.occasion,
					recordedById: loggedInUser.sub
				}
			});
		}
	})
}));

builder.mutationFields((t) => {
	const field = deleteOneAttendanceEntryMutationObject(t);
	return {
		deleteOneAttendanceEntry: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').AttendanceEntry]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
