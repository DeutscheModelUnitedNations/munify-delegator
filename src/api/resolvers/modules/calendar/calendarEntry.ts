import {
	createOneCalendarEntryMutationObject,
	deleteOneCalendarEntryMutationObject,
	findManyCalendarEntryQueryObject,
	findUniqueCalendarEntryQueryObject,
	CalendarEntryIdFieldObject,
	CalendarEntryStartTimeFieldObject,
	CalendarEntryEndTimeFieldObject,
	CalendarEntryNameFieldObject,
	CalendarEntryDescriptionFieldObject,
	CalendarEntryFontAwesomeIconFieldObject,
	CalendarEntryColorFieldObject,
	CalendarEntryPlaceFieldObject,
	CalendarEntryRoomFieldObject,
	CalendarEntryCalendarDayFieldObject,
	CalendarEntryCalendarDayIdFieldObject,
	CalendarEntryCalendarTrackFieldObject,
	CalendarEntryCalendarTrackIdFieldObject,
	updateOneCalendarEntryMutationObject
} from '$db/generated/graphql/CalendarEntry';
import { builder } from '../../builder';
import { db } from '$db/db';

builder.prismaObject('CalendarEntry', {
	fields: (t) => ({
		id: t.field(CalendarEntryIdFieldObject),
		startTime: t.field(CalendarEntryStartTimeFieldObject),
		endTime: t.field(CalendarEntryEndTimeFieldObject),
		name: t.field(CalendarEntryNameFieldObject),
		description: t.field(CalendarEntryDescriptionFieldObject),
		fontAwesomeIcon: t.field(CalendarEntryFontAwesomeIconFieldObject),
		color: t.field(CalendarEntryColorFieldObject),
		place: t.field(CalendarEntryPlaceFieldObject),
		room: t.field(CalendarEntryRoomFieldObject),
		calendarDay: t.relation('calendarDay', CalendarEntryCalendarDayFieldObject),
		calendarDayId: t.field(CalendarEntryCalendarDayIdFieldObject),
		calendarTrack: t.relation('calendarTrack', CalendarEntryCalendarTrackFieldObject),
		calendarTrackId: t.field(CalendarEntryCalendarTrackIdFieldObject)
	})
});

builder.queryFields((t) => {
	const field = findManyCalendarEntryQueryObject(t);
	return {
		findManyCalendarEntries: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').CalendarEntry]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueCalendarEntryQueryObject(t);
	return {
		findUniqueCalendarEntry: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').CalendarEntry]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneCalendarEntryMutationObject(t);
	return {
		createOneCalendarEntry: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				const calendarDayId = args.data.calendarDayId;
				if (!calendarDayId) {
					throw new Error('Calendar day ID is required');
				}

				const calendarDay = await db.calendarDay.findUniqueOrThrow({
					where: { id: calendarDayId },
					select: { conferenceId: true }
				});

				const teamMember = await db.teamMember.findFirst({
					where: {
						conferenceId: calendarDay.conferenceId,
						userId: user.sub,
						role: 'PROJECT_MANAGEMENT'
					}
				});

				if (!teamMember) {
					throw new Error('Access denied - requires PROJECT_MANAGEMENT role');
				}

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = updateOneCalendarEntryMutationObject(t);
	return {
		updateOneCalendarEntry: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').CalendarEntry]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneCalendarEntryMutationObject(t);
	return {
		deleteOneCalendarEntry: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').CalendarEntry]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
