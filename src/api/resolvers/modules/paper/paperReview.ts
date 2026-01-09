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
import { sendNewReviewNotification } from '$api/services/email';

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
						author: {
							select: {
								email: true,
								given_name: true,
								family_name: true
							}
						},
						agendaItem: {
							select: {
								title: true,
								committee: {
									select: {
										abbreviation: true
									}
								}
							}
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

				// Validate status transition - reviews can set any reviewable status
				const currentStatus = paper.status;
				const reviewableStatuses = ['SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED'];
				const allowedNewStatuses = ['CHANGES_REQUESTED', 'ACCEPTED'];

				if (!reviewableStatuses.includes(currentStatus)) {
					throw new GraphQLError(`Cannot review a paper with status ${currentStatus}`);
				}

				if (!allowedNewStatuses.includes(args.newStatus)) {
					throw new GraphQLError(`Invalid review status: ${args.newStatus}`);
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

				// Send email notification to the paper author (fire-and-forget, don't block the response)
				const paperTypeLabels: Record<string, string> = {
					POSITION_PAPER: 'Positionspapier',
					WORKING_PAPER: 'Arbeitspapier',
					INTRODUCTION_PAPER: 'Einführungspapier'
				};

				const statusLabels: Record<string, string> = {
					CHANGES_REQUESTED: 'Änderungen angefordert',
					ACCEPTED: 'Akzeptiert'
				};

				// Construct paper title from agenda item (similar to frontend display)
				const paperTitle = paper.agendaItem
					? `${paper.agendaItem.committee.abbreviation}: ${paper.agendaItem.title}`
					: (paperTypeLabels[paper.type] ?? paper.type);

				const baseUrl = ctx.url.origin;
				sendNewReviewNotification({
					recipientEmail: paper.author.email,
					recipientName: `${paper.author.given_name} ${paper.author.family_name}`,
					paperTitle,
					paperType: paperTypeLabels[paper.type] ?? paper.type,
					reviewerName: `${user.given_name} ${user.family_name}`,
					reviewerEmail: user.email,
					newStatus: statusLabels[args.newStatus] ?? args.newStatus,
					conferenceTitle: paper.conference.title,
					paperUrl: `${baseUrl}/dashboard/${paper.conferenceId}/paperhub/${paper.id}`
				}).catch((error) => {
					console.error('Failed to send review notification email:', error);
				});

				return review;
			});
		}
	})
}));
