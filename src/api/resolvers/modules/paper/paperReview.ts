import {
	PaperReviewCommentsFieldObject,
	PaperReviewCreatedAtFieldObject,
	PaperReviewIdFieldObject,
	PaperReviewReviewerFieldObject,
	PaperReviewPaperVersionFieldObject,
	PaperReviewStatusBeforeFieldObject,
	PaperReviewStatusAfterFieldObject
} from '$db/generated/graphql/PaperReview';
import { builder } from '../../builder';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';
import { PaperStatus, Json } from '$db/generated/graphql/inputs';

builder.prismaObject('PaperReview', {
	fields: (t) => ({
		id: t.field(PaperReviewIdFieldObject),
		comments: t.field(PaperReviewCommentsFieldObject),
		statusBefore: t.field(PaperReviewStatusBeforeFieldObject),
		statusAfter: t.field(PaperReviewStatusAfterFieldObject),
		paperVersion: t.relation('paperVersion', PaperReviewPaperVersionFieldObject),
		reviewer: t.relation('reviewer', PaperReviewReviewerFieldObject),
		createdAt: t.field(PaperReviewCreatedAtFieldObject)
	})
});

builder.mutationFields((t) => ({
	createPaperReview: t.prismaField({
		type: 'PaperReview',
		args: {
			paperId: t.arg.string({ required: true }),
			comments: t.arg({ type: Json, required: true }),
			newStatus: t.arg({ type: PaperStatus, required: true })
		},
		resolve: async (query, root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			return await db.$transaction(async (tx) => {
				// Get paper and verify permissions
				const paper = await tx.paper.findUniqueOrThrow({
					where: { id: args.paperId },
					include: {
						versions: {
							orderBy: { version: 'desc' },
							take: 1
						},
						conference: {
							include: {
								teamMembers: {
									where: {
										userId: user.sub,
										role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
									}
								}
							}
						}
					}
				});

				// Check if user is a team member with review permissions
				if (paper.conference.teamMembers.length === 0) {
					throw new GraphQLError('Only team members can create reviews');
				}

				// Validate status transition
				const currentStatus = paper.status;
				const validTransitions: Record<string, string[]> = {
					SUBMITTED: ['CHANGES_REQUESTED', 'ACCEPTED'],
					CHANGES_REQUESTED: ['ACCEPTED'],
					ACCEPTED: ['CHANGES_REQUESTED']
				};

				if (!validTransitions[currentStatus]?.includes(args.newStatus)) {
					throw new GraphQLError(
						`Invalid status transition from ${currentStatus} to ${args.newStatus}`
					);
				}

				const latestVersion = paper.versions[0];
				if (!latestVersion) {
					throw new GraphQLError('Paper has no versions - cannot create review');
				}

				// Create the review
				const review = await tx.paperReview.create({
					...query,
					data: {
						comments: args.comments ?? {},
						paperVersionId: latestVersion.id,
						reviewerId: user.sub,
						statusBefore: currentStatus,
						statusAfter: args.newStatus
					}
				});

				// Update paper and version status
				await tx.paper.update({
					where: { id: args.paperId },
					data: { status: args.newStatus }
				});

				await tx.paperVersion.update({
					where: { id: latestVersion.id },
					data: { status: args.newStatus }
				});

				return review;
			});
		}
	})
}));
