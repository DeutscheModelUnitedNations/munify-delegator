import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import {
	assertCanCreateSurveyQuestion,
	registerSurveyQuestionAbilities
} from './surveyQuestionPermissions';
import { createSurveyQuestion, refusingSurveyConflicts } from './surveyQuestionService';
import { assertFindFirstExists } from '@m1212e/rumble';
import { nullToUndefined } from '#api/services/args';
import { surveyQuestionPubsub } from '#api/pubsub';
import { deleteIfAllowed, updateIfAllowed } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';

registerSurveyQuestionAbilities();

const SurveyQuestionRef = object({ table: 'surveyQuestion' });
query({ table: 'surveyQuestion' });

/** The question with this id, as far as the caller may read it. */
const readableQuestion = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.surveyQuestion.filter('read')).merge({ where: { id } }).query.single;

schemaBuilder.mutationFields((t) => ({
	createSurveyQuestion: t.drizzleField({
		description:
			'Adds a survey question to the conference, by default as a draft participants do not see yet. A title the conference already has is refused with CONFLICT.',
		type: SurveyQuestionRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			title: t.arg.string({ required: true }),
			description: t.arg.string({ required: true }),
			deadline: t.arg({
				type: 'DateTime',
				required: true,
				description: 'Until when participants answer and change their answer.'
			}),
			draft: t.arg.boolean({ description: 'Hidden from participants until published; default.' }),
			hidden: t.arg.boolean({ description: 'Kept from participants even once published.' }),
			showSelectionOnDashboard: t.arg.boolean({
				description: "Shows a participant's choice on their dashboard."
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateSurveyQuestion({ ctx, conferenceId: args.conferenceId });
			const id = await createSurveyQuestion({
				conferenceId: args.conferenceId,
				title: args.title,
				description: args.description,
				deadline: args.deadline,
				draft: nullToUndefined(args.draft),
				hidden: nullToUndefined(args.hidden),
				showSelectionOnDashboard: nullToUndefined(args.showSelectionOnDashboard)
			});

			return db.query.surveyQuestion
				.findFirst(query(await readableQuestion({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateSurveyQuestion: t.drizzleField({
		description:
			'Changes the given fields of a survey question; the others stay as they are, and `null` leaves one alone too. A title the conference already has is refused with CONFLICT.',
		type: SurveyQuestionRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			description: t.arg.string(),
			deadline: t.arg({ type: 'DateTime' }),
			draft: t.arg.boolean(),
			hidden: t.arg.boolean(),
			showSelectionOnDashboard: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await refusingSurveyConflicts({
				write: updateIfAllowed({
					ctx,
					table: 'surveyQuestion',
					id: args.id,
					values: {
						title: nullToUndefined(args.title),
						description: nullToUndefined(args.description),
						deadline: nullToUndefined(args.deadline),
						draft: nullToUndefined(args.draft),
						hidden: nullToUndefined(args.hidden),
						showSelectionOnDashboard: nullToUndefined(args.showSelectionOnDashboard),
						updatedAt: new Date()
					}
				}),
				titleTaken: m.surveyQuestionTitleTaken
			});
			surveyQuestionPubsub.updated(args.id);

			return db.query.surveyQuestion
				.findFirst(query(await readableQuestion({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteSurveyQuestion: t.field({
		description:
			'Deletes a survey question. Refused with CONFLICT while it still has options: delete those first.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await refusingSurveyConflicts({
				write: deleteIfAllowed({ ctx, table: 'surveyQuestion', id: args.id }),
				referenced: m.surveyQuestionHasOptions
			});
			surveyQuestionPubsub.removed();

			return true;
		}
	})
}));
