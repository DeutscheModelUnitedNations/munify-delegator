import { builder } from '../builder';
import {
  CommitteeAgendaItemCommitteeFieldObject,
  CommitteeAgendaItemIdFieldObject,
  CommitteeAgendaItemTeaserTextFieldObject,
  CommitteeAgendaItemTitleFieldObject,
  createOneCommitteeAgendaItemMutationObject,
  deleteOneCommitteeAgendaItemMutationObject,
  findManyCommitteeAgendaItemQueryObject,
  findUniqueCommitteeAgendaItemQueryObject,
  updateOneCommitteeAgendaItemMutationObject
} from '$db/generated/graphql/CommitteeAgendaItem';

builder.prismaObject('CommitteeAgendaItem', {
  fields: (t) => ({
    id: t.field(CommitteeAgendaItemIdFieldObject),
    title: t.field(CommitteeAgendaItemTitleFieldObject),
    teaserText: t.field(CommitteeAgendaItemTeaserTextFieldObject),
    committee: t.relation('committee', CommitteeAgendaItemCommitteeFieldObject)
  })
});

builder.queryFields((t) => {
  const field = findManyCommitteeAgendaItemQueryObject(t);
  return {
    findManyAgendaItems: t.prismaField({
      ...field,
      resolve: (query, root, args, ctx, info) => {
        args.where = {
          ...args.where,
          AND: [ctx.permissions.allowDatabaseAccessTo('list').CommitteeAgendaItem]
        };

        return field.resolve(query, root, args, ctx, info);
      }
    })
  };
});

builder.queryFields((t) => {
  const field = findUniqueCommitteeAgendaItemQueryObject(t);
  return {
    findUniqueAgendaItem: t.prismaField({
      ...field,
      resolve: (query, root, args, ctx, info) => {
        args.where = {
          ...args.where,
          AND: [ctx.permissions.allowDatabaseAccessTo('read').CommitteeAgendaItem]
        };

        return field.resolve(query, root, args, ctx, info);
      }
    })
  };
});

builder.mutationFields((t) => {
  const field = createOneCommitteeAgendaItemMutationObject(t);
  return {
    createOneAgendaItem: t.prismaField({
      ...field,
      resolve: async (query, root, args, ctx, info) => {
        args.data = {
          ...args.data,
        };

        return field.resolve(query, root, args, ctx, info);
      }
    })
  };
});

builder.mutationFields((t) => {
  const field = updateOneCommitteeAgendaItemMutationObject(t);
  return {
    updateOneAgendaItem: t.prismaField({
      ...field,
      resolve: (query, root, args, ctx, info) => {
        args.where = {
          ...args.where,
          AND: [ctx.permissions.allowDatabaseAccessTo('update').CommitteeAgendaItem]
        };
        return field.resolve(query, root, args, ctx, info);
      }
    })
  };
});

builder.mutationFields((t) => {
  const field = deleteOneCommitteeAgendaItemMutationObject(t);
  return {
    deleteOneAgendaItem: t.prismaField({
      ...field,
      resolve: (query, root, args, ctx, info) => {
        args.where = {
          ...args.where,
          AND: [ctx.permissions.allowDatabaseAccessTo('delete').CommitteeAgendaItem]
        };
        return field.resolve(query, root, args, ctx, info);
      }
    })
  };
});
