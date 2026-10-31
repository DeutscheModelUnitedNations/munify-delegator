import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import {
	assertCanCreateSurveyOption,
	registerSurveyOptionAbilities
} from './surveyOptionPermissions';
import { countAnswers, createSurveyOption, upperLimitSchema } from './surveyOptionService';
import { refusingSurveyConflicts } from '#api/handlers/surveyQuestion/surveyQuestionService';
import { assertFindFirstExists } from '@m1212e/rumble';
import { surveyOptionPubsub } from '#api/pubsub';
import { deleteIfAllowed, updateIfAllowed } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';

registerSurveyOptionAbilities();

const SurveyOptionRef = object({
	table: 'surveyOption',
	adjust: (t) => ({
		countSurveyAnswers: t.field({
			description:
				'How many participants picked this option - the survey result, in effect. Readable wherever the option is, so participants see how full it is.',
			type: 'Int',
			resolve: (option) => countAnswers(option.id)
		})
	})
});
query({ table: 'surveyOption' });

/** The option with this id, as far as the caller may read it. */
const readableOption = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.surveyOption.filter('read')).merge({ where: { id } }).query.single;

schemaBuilder.mutationFields((t) => ({
	createSurveyOption: t.drizzleField({
		description:
			'Adds an option to a survey question, with how many may pick it. A title the question already has is refused with CONFLICT.',
		type: SurveyOptionRef,
		args: {
			questionId: t.arg.id({ required: true }),
			title: t.arg.string({ required: true }),
			description: t.arg.string({ required: true }),
			upperLimit: t.arg
				.int({ required: true, description: 'How many may pick it; 0 for no limit.' })
				.validate(upperLimitSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateSurveyOption({ ctx, questionId: args.questionId });
			const id = await createSurveyOption({
				questionId: args.questionId,
				title: args.title,
				description: args.description,
				upperLimit: args.upperLimit
			});

			return db.query.surveyOption
				.findFirst(query(await readableOption({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateSurveyOption: t.drizzleField({
		description:
			'Changes the given fields of a survey option; the others stay as they are, and `null` leaves one alone too. A lower limit keeps the answers already given. A title the question already has is refused with CONFLICT.',
		type: SurveyOptionRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			description: t.arg.string(),
			upperLimit: t.arg
				.int({ description: 'How many may pick it; 0 for no limit.' })
				.validate(upperLimitSchema.nullish())
		},
		resolve: async (query, _root, args, ctx) => {
			await refusingSurveyConflicts({
				write: updateIfAllowed({
					ctx,
					table: 'surveyOption',
					id: args.id,
					// None is ever null in the table: null leaves it as it is, like undefined.
					values: {
						title: args.title ?? undefined,
						description: args.description ?? undefined,
						upperLimit: args.upperLimit ?? undefined,
						updatedAt: new Date()
					}
				}),
				titleTaken: m.surveyOptionTitleTaken
			});
			surveyOptionPubsub.updated(args.id);

			return db.query.surveyOption
				.findFirst(query(await readableOption({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteSurveyOption: t.field({
		description:
			'Deletes a survey option. Refused with CONFLICT while somebody has picked it or a schedule entry is limited to it; scanner sessions expecting it simply stop expecting it.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await refusingSurveyConflicts({
				write: deleteIfAllowed({ ctx, table: 'surveyOption', id: args.id }),
				referenced: m.surveyOptionInUse
			});
			surveyOptionPubsub.removed();

			return true;
		}
	})
}));
