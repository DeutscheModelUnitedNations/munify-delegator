import { z } from 'zod';
import { db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { surveyOptionPubsub } from '#api/pubsub';
import { refusingSurveyConflicts } from '#api/handlers/surveyQuestion/surveyQuestionService';

/** How many may pick an option; 0 stands for no limit. */
export const upperLimitSchema = z
	.number()
	.int()
	.min(0, { error: () => m.surveyOptionUpperLimitNegative() });

/** Adds an option to a question; a title the question already has is refused. Returns its id. */
export async function createSurveyOption(
	values: Omit<typeof schema.surveyOption.$inferInsert, 'id'>
) {
	const { id } = await refusingSurveyConflicts({
		write: db
			.insert(schema.surveyOption)
			.values(values)
			.returning({ id: schema.surveyOption.id })
			.then(assertFirstEntryExists),
		titleTaken: m.surveyOptionTitleTaken
	});
	surveyOptionPubsub.created();
	return id;
}

/** How many participants picked the option, counted in the database. */
export function countAnswers(optionId: string) {
	return db.$count(
		schema.surveyAnswer,
		whereRows({ table: schema.surveyAnswer, filter: { optionId } })
	);
}
