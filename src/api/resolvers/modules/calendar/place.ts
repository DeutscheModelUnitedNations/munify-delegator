import {
	createOnePlaceMutationObject,
	deleteOnePlaceMutationObject,
	findManyPlaceQueryObject,
	findUniquePlaceQueryObject,
	PlaceIdFieldObject,
	PlaceNameFieldObject,
	PlaceAddressFieldObject,
	PlaceLatitudeFieldObject,
	PlaceLongitudeFieldObject,
	PlaceDirectionsFieldObject,
	PlaceInfoFieldObject,
	PlaceWebsiteUrlFieldObject,
	PlaceSitePlanDataURLFieldObject,
	PlaceConferenceFieldObject,
	PlaceConferenceIdFieldObject,
	updateOnePlaceMutationObject
} from '$db/generated/graphql/Place';
import { builder } from '../../builder';
import { db } from '$db/db';

builder.prismaObject('Place', {
	fields: (t) => ({
		id: t.field(PlaceIdFieldObject),
		name: t.field(PlaceNameFieldObject),
		address: t.field(PlaceAddressFieldObject),
		latitude: t.field(PlaceLatitudeFieldObject),
		longitude: t.field(PlaceLongitudeFieldObject),
		directions: t.field(PlaceDirectionsFieldObject),
		info: t.field(PlaceInfoFieldObject),
		websiteUrl: t.field(PlaceWebsiteUrlFieldObject),
		sitePlanDataURL: t.field(PlaceSitePlanDataURLFieldObject),
		conference: t.relation('conference', PlaceConferenceFieldObject),
		conferenceId: t.field(PlaceConferenceIdFieldObject),
		calendarEntries: t.relation('calendarEntries', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CalendarEntry
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyPlaceQueryObject(t);
	return {
		findManyPlaces: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Place]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniquePlaceQueryObject(t);
	return {
		findUniquePlace: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').Place]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = createOnePlaceMutationObject(t);
	return {
		createOnePlace: t.prismaField({
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
	const field = updateOnePlaceMutationObject(t);
	return {
		updateOnePlace: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Place]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOnePlaceMutationObject(t);
	return {
		deleteOnePlace: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').Place]
				};
				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});
