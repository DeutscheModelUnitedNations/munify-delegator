import { builder } from '../builder';
import {
	ResolutionIdFieldObject,
	ResolutionTitleFieldObject,
	ResolutionFileNameFieldObject,
	ResolutionConferenceFieldObject,
	ResolutionConferenceIdFieldObject,
	ResolutionCommitteeFieldObject,
	ResolutionCommitteeIdFieldObject,
	ResolutionCreatedAtFieldObject,
	findManyResolutionQueryObject,
	findUniqueResolutionQueryObject
} from '$db/generated/graphql/Resolution';
import { toDataURL } from '$api/services/fileToDataURL';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';

export const GQLResolution = builder.prismaObject('Resolution', {
	fields: (t) => ({
		id: t.field(ResolutionIdFieldObject),
		title: t.field(ResolutionTitleFieldObject),
		fileName: t.field(ResolutionFileNameFieldObject),
		conference: t.relation('conference', ResolutionConferenceFieldObject),
		conferenceId: t.field(ResolutionConferenceIdFieldObject),
		committee: t.relation('committee', {
			...ResolutionCommitteeFieldObject,
			nullable: true
		}),
		committeeId: t.field(ResolutionCommitteeIdFieldObject),
		createdAt: t.field(ResolutionCreatedAtFieldObject)
	})
});

builder.queryFields((t) => {
	const field = findManyResolutionQueryObject(t);
	return {
		findManyResolutions: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Resolution]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueResolutionQueryObject(t);
	return {
		findUniqueResolution: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').Resolution]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => ({
	createResolution: t.prismaField({
		type: 'Resolution',
		args: {
			conferenceId: t.arg.string({ required: true }),
			committeeId: t.arg.string({ required: false }),
			title: t.arg.string({ required: false }),
			file: t.arg({ type: 'File', required: true })
		},
		resolve: async (query, root, args, ctx) => {
			// Only management of the conference (those allowed to update it) may add resolutions.
			const conference = await db.conference.findFirst({
				where: {
					id: args.conferenceId,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Conference]
				},
				select: { id: true }
			});
			if (!conference) {
				throw new GraphQLError('You are not allowed to add resolutions to this conference.');
			}

			// A committee tag is optional, but if given it must belong to the same conference.
			if (args.committeeId) {
				const committee = await db.committee.findFirst({
					where: { id: args.committeeId, conferenceId: args.conferenceId },
					select: { id: true }
				});
				if (!committee) {
					throw new GraphQLError('The selected committee does not belong to this conference.');
				}
			}

			// PDF-only, max 10 MB - the management page enforces the same limits, but the
			// mutation can be called directly, so the real boundary is here.
			if (args.file.type !== 'application/pdf') {
				throw new GraphQLError('Only PDF files can be uploaded as resolutions.');
			}
			if (args.file.size > 10_000_000) {
				throw new GraphQLError('Resolution files must not exceed 10 MB.');
			}

			const content = await toDataURL(args.file);
			const fileName = args.file.name || 'resolution.pdf';

			return await db.resolution.create({
				data: {
					conferenceId: args.conferenceId,
					committeeId: args.committeeId ?? null,
					title: args.title?.trim() || fileName,
					fileName,
					content
				},
				...query
			});
		}
	})
}));

builder.mutationFields((t) => ({
	updateResolution: t.prismaField({
		type: 'Resolution',
		args: {
			id: t.arg.string({ required: true }),
			title: t.arg.string({ required: false }),
			// Pass `committeeId: null` to clear the committee tag, or omit to leave it unchanged.
			committeeId: t.arg.string({ required: false }),
			clearCommittee: t.arg.boolean({ required: false })
		},
		resolve: async (query, root, args, ctx) => {
			const resolution = await db.resolution.findFirst({
				where: {
					id: args.id,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Resolution]
				},
				select: { conferenceId: true }
			});
			if (!resolution) {
				throw new GraphQLError('You are not allowed to edit this resolution.');
			}

			if (args.committeeId) {
				const committee = await db.committee.findFirst({
					where: { id: args.committeeId, conferenceId: resolution.conferenceId },
					select: { id: true }
				});
				if (!committee) {
					throw new GraphQLError('The selected committee does not belong to this conference.');
				}
			}

			return await db.resolution.update({
				where: { id: args.id },
				data: {
					title: args.title?.trim() ? args.title.trim() : undefined,
					committeeId: args.clearCommittee ? null : (args.committeeId ?? undefined)
				},
				...query
			});
		}
	})
}));

builder.mutationFields((t) => ({
	deleteResolution: t.prismaField({
		type: 'Resolution',
		args: {
			id: t.arg.string({ required: true })
		},
		resolve: async (query, root, args, ctx) => {
			const resolution = await db.resolution.findFirst({
				where: {
					id: args.id,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').Resolution]
				},
				select: { id: true }
			});
			if (!resolution) {
				throw new GraphQLError('You are not allowed to delete this resolution.');
			}

			return await db.resolution.delete({
				where: { id: args.id },
				...query
			});
		}
	})
}));
