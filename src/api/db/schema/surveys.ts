import {
	snakeCase,
	text,
	timestamp,
	integer,
	boolean,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps } from './helpers';
import { conferenceRef } from './conference';
import { participantRef } from './participants';

/** Surveys the team asks participants. */

export const surveyQuestion = snakeCase.table(
	'survey_question',
	{
		...defaultIdAndTimestamps,
		conferenceId: conferenceRef('restrict'),
		title: text().notNull(),
		description: text().notNull(),
		deadline: timestamp({ precision: 3 }).notNull(),
		draft: boolean().default(true).notNull(),
		hidden: boolean().default(false).notNull(),
		showSelectionOnDashboard: boolean().default(false).notNull()
	},
	(table) => [
		uniqueIndex('survey_question_conference_id_title_key').using(
			'btree',
			table.conferenceId.asc().nullsLast(),
			table.title.asc().nullsLast()
		)
	]
);

export const surveyOption = snakeCase.table(
	'survey_option',
	{
		...defaultIdAndTimestamps,
		questionId: text()
			.notNull()
			.references(() => surveyQuestion.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		title: text().notNull(),
		description: text().notNull(),
		upperLimit: integer().notNull()
	},
	(table) => [
		uniqueIndex('survey_option_question_id_title_key').using(
			'btree',
			table.questionId.asc().nullsLast(),
			table.title.asc().nullsLast()
		)
	]
);

export const surveyAnswer = snakeCase.table(
	'survey_answer',
	{
		...defaultIdAndTimestamps,
		questionId: text()
			.notNull()
			.references(() => surveyQuestion.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		/** Who answered; the question and this row are in the same conference (trigger). */
		conferenceParticipantId: participantRef('cascade'),
		optionId: text()
			.notNull()
			.references(() => surveyOption.id, { onDelete: 'restrict', onUpdate: 'cascade' })
	},
	(table) => [
		// One answer per person and question.
		uniqueIndex('survey_answer_question_id_conference_participant_id_key').using(
			'btree',
			table.questionId.asc().nullsLast(),
			table.conferenceParticipantId.asc().nullsLast()
		),
		index('survey_answer_conference_participant_id_idx').using(
			'btree',
			table.conferenceParticipantId.asc().nullsLast()
		)
	]
);
