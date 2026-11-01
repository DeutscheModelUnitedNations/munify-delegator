import { db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { apiError, isForeignKeyViolation, isUniqueViolationOn } from '#api/services/errors';
import { surveyQuestionPubsub } from '#api/pubsub';
import { m } from '#lib/paraglide/messages';

/**
 * Turns what the database refuses about a survey row into a CONFLICT the client can show: a title
 * the question's conference (or the option's question) already has (`titleTaken`), and deleting a
 * row others still name through a `restrict` foreign key (`referenced`: options under a question,
 * answers picking an option, schedule entries limited to it).
 */
export async function refusingSurveyConflicts<T>({
	write,
	titleTaken,
	referenced
}: {
	write: Promise<T>;
	titleTaken?: () => string;
	referenced?: () => string;
}) {
	try {
		return await write;
	} catch (error) {
		if (titleTaken && isUniqueViolationOn({ error, column: 'title' })) {
			throw apiError({ code: 'CONFLICT', message: titleTaken() });
		}
		if (referenced && isForeignKeyViolation(error)) {
			throw apiError({ code: 'CONFLICT', message: referenced() });
		}
		throw error;
	}
}

/** Adds a survey question to a conference; a title it already has is refused. Returns its id. */
export async function createSurveyQuestion(
	values: Omit<typeof schema.surveyQuestion.$inferInsert, 'id'>
) {
	const { id } = await refusingSurveyConflicts({
		write: db
			.insert(schema.surveyQuestion)
			.values(values)
			.returning({ id: schema.surveyQuestion.id })
			.then(assertFirstEntryExists),
		titleTaken: m.surveyQuestionTitleTaken
	});
	surveyQuestionPubsub.created();
	return id;
}
