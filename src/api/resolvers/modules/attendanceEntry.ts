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
			conferenceParticipantStatusId: t.arg.string({ required: true }),
			occasion: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Verify the user has permission by checking the conference participant status
			const status = await db.conferenceParticipantStatus.findUniqueOrThrow({
				where: {
					id: args.conferenceParticipantStatusId,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').ConferenceParticipantStatus]
				}
			});

			return db.attendanceEntry.create({
				...query,
				data: {
					conferenceParticipantStatusId: status.id,
					occasion: args.occasion,
					recordedById: user.sub
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
