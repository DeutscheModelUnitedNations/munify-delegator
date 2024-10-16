import { builder } from './builder';
import { ConferenceIdFieldObject, findManyConferenceQueryObject } from '$db/generated/graphql/Conference';

builder.prismaObject('Conference', {
	fields: (t) => ({
		id: t.field(ConferenceIdFieldObject)
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
          AND: [ctx.permissions.allowDatabaseAccessTo("read").Conference],
        };

        return field.resolve(query, root, args, ctx, info);
      },
    }),
  };
});