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
					totalReviews: stats.total
				}))
				.sort((a, b) => b.firstReviews - a.firstReviews)
				.slice(0, 10);
		}
	})
}));
