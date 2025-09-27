import {
	findManyWaitingListEntryQueryObject,
	findUniqueWaitingListEntryQueryObject,
	WaitingListEntryConferenceFieldObject,
	WaitingListEntryExperienceFieldObject,
	WaitingListEntryIdFieldObject,
	WaitingListEntryMotivationFieldObject,
	WaitingListEntryRequestsFieldObject,
	WaitingListEntrySchoolFieldObject,
	WaitingListEntryUserFieldObject
} from '$db/generated/graphql/WaitingListEntry';
import { builder } from '../builder';

builder.prismaObject('WaitingListEntry', {
	fields: (t) => ({
		id: t.field(WaitingListEntryIdFieldObject),
		school: t.field(WaitingListEntrySchoolFieldObject),
		experience: t.field(WaitingListEntryExperienceFieldObject),
		motivation: t.field(WaitingListEntryMotivationFieldObject),
		requests: t.field(WaitingListEntryRequestsFieldObject),
		conference: t.relation('conference', WaitingListEntryConferenceFieldObject),
		user: t.relation('user', WaitingListEntryUserFieldObject)
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
