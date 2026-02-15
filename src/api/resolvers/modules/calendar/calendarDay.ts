import {
	createOneCalendarDayMutationObject,
	deleteOneCalendarDayMutationObject,
	findManyCalendarDayQueryObject,
	findUniqueCalendarDayQueryObject,
	CalendarDayIdFieldObject,
	CalendarDayDateFieldObject,
	CalendarDayNameFieldObject,
	CalendarDaySortOrderFieldObject,
	CalendarDayConferenceFieldObject,
	CalendarDayConferenceIdFieldObject,
	updateOneCalendarDayMutationObject
} from '$db/generated/graphql/CalendarDay';
import { builder } from '../../builder';
import { db } from '$db/db';

builder.prismaObject('CalendarDay', {
	fields: (t) => ({
		id: t.field(CalendarDayIdFieldObject),
		date: t.field(CalendarDayDateFieldObject),
		name: t.field(CalendarDayNameFieldObject),
		sortOrder: t.field(CalendarDaySortOrderFieldObject),
		conference: t.relation('conference', CalendarDayConferenceFieldObject),
		conferenceId: t.field(CalendarDayConferenceIdFieldObject),
		tracks: t.relation('tracks', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CalendarTrack,
				orderBy: { sortOrder: 'asc' }
			})
		}),
		entries: t.relation('entries', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CalendarEntry,
				orderBy: { startTime: 'asc' }
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyCalendarDayQueryObject(t);
	return {
		findManyCalendarDays: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').CalendarDay]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueCalendarDayQueryObject(t);
	return {
		findUniqueCalendarDay: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').CalendarDay]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOneCalendarDayMutationObject(t);
	return {
		createOneCalendarDay: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx, info) => {
				const user = ctx.permissions.getLoggedInUserOrThrow();

				const conferenceId = args.data.conferenceId;
				if (!conferenceId) {
					throw new Error('Conference ID is required');
				}

				const teamMember = await db.teamMember.findFirst({
					where: {
						conferenceId,
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
	const field = updateOneCalendarDayMutationObject(t);
	return {
		updateOneCalendarDay: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').CalendarDay]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneCalendarDayMutationObject(t);
	return {
		deleteOneCalendarDay: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').CalendarDay]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
