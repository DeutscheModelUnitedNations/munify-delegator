import {
	createOneCalendarTrackMutationObject,
	deleteOneCalendarTrackMutationObject,
	findManyCalendarTrackQueryObject,
	findUniqueCalendarTrackQueryObject,
	CalendarTrackIdFieldObject,
	CalendarTrackNameFieldObject,
	CalendarTrackDescriptionFieldObject,
	CalendarTrackSortOrderFieldObject,
	CalendarTrackCalendarDayFieldObject,
	CalendarTrackCalendarDayIdFieldObject,
	updateOneCalendarTrackMutationObject
} from '$db/generated/graphql/CalendarTrack';
import { builder } from '../../builder';
import { db } from '$db/db';

builder.prismaObject('CalendarTrack', {
	fields: (t) => ({
		id: t.field(CalendarTrackIdFieldObject),
		name: t.field(CalendarTrackNameFieldObject),
		description: t.field(CalendarTrackDescriptionFieldObject),
		sortOrder: t.field(CalendarTrackSortOrderFieldObject),
		calendarDay: t.relation('calendarDay', CalendarTrackCalendarDayFieldObject),
		calendarDayId: t.field(CalendarTrackCalendarDayIdFieldObject),
		entries: t.relation('entries', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CalendarEntry,
				orderBy: { startTime: 'asc' }
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyCalendarTrackQueryObject(t);
	return {
		findManyCalendarTracks: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').CalendarTrack]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueCalendarTrackQueryObject(t);
	return {
		findUniqueCalendarTrack: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').CalendarTrack]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneCalendarTrackMutationObject(t);
	return {
		createOneCalendarTrack: t.prismaField({
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
	const field = updateOneCalendarTrackMutationObject(t);
	return {
		updateOneCalendarTrack: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').CalendarTrack]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneCalendarTrackMutationObject(t);
	return {
		deleteOneCalendarTrack: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').CalendarTrack]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
