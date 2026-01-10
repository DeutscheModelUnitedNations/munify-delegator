import { builder } from '../../builder';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';
import { codenamize } from 'codenamize-ts';

// Configure codenamize with UN Secretary-General names
const generateAnonymizedName = (seed: string): string => {
	codenamize.use({
		adverb: [
			'very',
			'super',
			'ultra',
			'quite',
			'totally',
			'absolutely',
			'fairly',
			'really',
			'extremely',
			'incredibly',
			'particularly',
			'remarkably',
			'exceptionally',
			'tremendously',
			'fantastically'
		],
		mood: [
			'happy',
			'calm',
			'excited',
			'energetic',
			'hopeful',
			'content',
			'curious',
			'motivated',
			'cheerful',
			'determined',
			'optimistic',
			'confident',
			'magnificent',
			'splendid',
			'glorious'
		],
		unNoun: [
			'Trygve-Lie',
			'Dag-Hammarskjöld',
			'U-Thant',
			'Kurt-Waldheim',
			'Javier-Perez-de-Cuellar',
			'Boutros-Boutros-Ghali',
			'Kofi-Annan',
			'Ban-Ki-moon',
			'António-Guterres'
		]
	});

	return codenamize({
		seed,
		particles: ['adverb', 'mood', 'unNoun'],
		separator: ' ',
		capitalize: true
	});
};

// Define the ReviewerStat type for the leaderboard
const ReviewerStatType = builder.simpleObject('ReviewerStat', {
	fields: (t) => ({
		anonymizedName: t.string(),
		firstReviews: t.int(),
		totalReviews: t.int(),
		isCurrentUser: t.boolean()
	})
});

// Simple stats type for current user (no anonymized name needed)
const MyReviewStatsType = builder.simpleObject('MyReviewStats', {
	fields: (t) => ({
		firstReviews: t.int(),
		followUpReviews: t.int(),
		totalReviews: t.int()
	})
});

builder.queryFields((t) => ({
	reviewerLeaderboard: t.field({
		type: [ReviewerStatType],
		args: {
			conferenceId: t.arg.string({ required: true })
		},
		resolve: async (_, { conferenceId }, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Verify user is a team member with appropriate role
			const teamMember = await db.teamMember.findFirst({
				where: {
					conferenceId,
					userId: user.sub,
					role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
				}
			});

			if (!teamMember) {
				throw new GraphQLError('Access denied - requires team member status');
			}

			// Get all reviews for this conference, ordered by creation time
			const reviews = await db.paperReview.findMany({
				where: {
					paperVersion: {
						paper: { conferenceId }
					}
				},
				include: {
					paperVersion: {
						include: {
							paper: true
						}
					}
				},
				orderBy: { createdAt: 'asc' }
			});

			// Track first review per paper and total per reviewer
			const paperFirstReviewer = new Map<string, string>();
			const reviewerStats = new Map<string, { first: number; total: number }>();

			for (const review of reviews) {
				const paperId = review.paperVersion.paper.id;
				const reviewerId = review.reviewerId;

				// Initialize reviewer stats if needed
				if (!reviewerStats.has(reviewerId)) {
					reviewerStats.set(reviewerId, { first: 0, total: 0 });
				}

				const stats = reviewerStats.get(reviewerId)!;
				stats.total++;

				// Check if this is the first review for this paper
				if (!paperFirstReviewer.has(paperId)) {
					paperFirstReviewer.set(paperId, reviewerId);
					stats.first++;
				}
			}

			// Convert to array, anonymize names, sort by first reviews, limit to top 10
			return Array.from(reviewerStats.entries())
				.map(([id, stats]) => ({
					anonymizedName: generateAnonymizedName(id),
					firstReviews: stats.first,
					totalReviews: stats.total,
					isCurrentUser: id === user.sub
				}))
				.sort((a, b) => b.firstReviews - a.firstReviews)
				.slice(0, 10);
		}
	}),

	myReviewStats: t.field({
		type: MyReviewStatsType,
		nullable: true,
		args: {
			conferenceId: t.arg.string({ required: true })
		},
		resolve: async (_, { conferenceId }, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			// Verify user is a team member with appropriate role
			const teamMember = await db.teamMember.findFirst({
				where: {
					conferenceId,
					userId: user.sub,
					role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
				}
			});

			if (!teamMember) {
				return null; // Not a reviewer, no stats to show
			}

			// Get all reviews for this conference, ordered by creation time
			const reviews = await db.paperReview.findMany({
				where: {
					paperVersion: {
						paper: { conferenceId }
					}
				},
				include: {
					paperVersion: {
						include: {
							paper: true
						}
					}
				},
				orderBy: { createdAt: 'asc' }
			});

			// Track first review per paper
			const paperFirstReviewer = new Map<string, string>();
			const countedFirstReviewPapers = new Set<string>();
			let firstReviews = 0;
			let totalReviews = 0;

			for (const review of reviews) {
				const paperId = review.paperVersion.paper.id;
				const reviewerId = review.reviewerId;

				// Track first reviewer per paper
				if (!paperFirstReviewer.has(paperId)) {
					paperFirstReviewer.set(paperId, reviewerId);
				}

				// Count current user's reviews
				if (reviewerId === user.sub) {
					totalReviews++;
					// Only count as first review once per paper
					if (
						paperFirstReviewer.get(paperId) === user.sub &&
						!countedFirstReviewPapers.has(paperId)
					) {
						countedFirstReviewPapers.add(paperId);
						firstReviews++;
					}
				}
			}

			return {
				firstReviews,
				followUpReviews: totalReviews - firstReviews,
				totalReviews
			};
		}
	})
}));
