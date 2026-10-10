import { faker } from '@faker-js/faker';
import type { ConferenceSeed } from './context';

const DAY_MS = 24 * 60 * 60 * 1000;

interface QuestionPlan {
	key: string;
	title: string;
	description: string;
	deadlineInDays: number;
	draft?: boolean;
	hidden?: boolean;
	showSelectionOnDashboard?: boolean;
	/** Title and seat limit; 0 means unlimited. */
	options: [string, number][];
}

const QUESTIONS: QuestionPlan[] = [
	{
		key: 'workshop',
		title: 'Workshop-Wahl',
		description: 'Welchen Workshop möchtest du besuchen? "Verhandlungstraining" ist ausgebucht.',
		deadlineInDays: 7,
		showSelectionOnDashboard: true,
		options: [
			['Verhandlungstraining', 3],
			['Rhetorik', 0],
			['Resolutionen schreiben', 40]
		]
	},
	{
		key: 'dinner',
		title: 'Essen beim Delegiertenabend',
		description: 'Was möchtest du essen?',
		deadlineInDays: 10,
		options: [
			['Pizza', 0],
			['Pasta', 0],
			['Salat', 0]
		]
	},
	{
		key: 'excursion',
		title: 'Exkursion',
		description: 'Die Anmeldefrist ist abgelaufen, die Wahl ist gesperrt.',
		deadlineInDays: -1,
		options: [
			['Bundestag', 20],
			['Museum', 20]
		]
	},
	{
		key: 'draft',
		title: 'Entwurf: T-Shirt-Größe',
		description: 'Noch nicht veröffentlicht.',
		deadlineInDays: 14,
		draft: true,
		options: [
			['S', 0],
			['M', 0],
			['L', 0]
		]
	},
	{
		key: 'hidden',
		title: 'Versteckt: Interne Abfrage',
		description: 'Veröffentlicht, aber für Teilnehmende ausgeblendet.',
		deadlineInDays: 14,
		hidden: true,
		options: [
			['Ja', 0],
			['Nein', 0]
		]
	}
];

/**
 * Who answered what: the delegate has answered some of the open questions, the single
 * participant all of them (so their survey section collapses into a summary), the head delegate
 * none (so every open one is flagged).
 */
const PERSONA_ANSWERS: [string, string, string][] = [
	['dev-delegate', 'workshop', 'Rhetorik'],
	['dev-delegate', 'excursion', 'Museum'],
	['dev-single', 'workshop', 'Resolutionen schreiben'],
	['dev-single', 'dinner', 'Pizza'],
	['dev-single', 'excursion', 'Bundestag']
];

export function addSurveys(cs: ConferenceSeed) {
	if (!cs.plan.with.surveys) return;

	const optionIds = new Map<string, string>();
	const questionIds = new Map<string, string>();
	for (const question of QUESTIONS) {
		const questionId = cs.rowId(`survey-${question.key}`);
		questionIds.set(question.key, questionId);
		cs.batch.surveyQuestion.push({
			id: questionId,
			conferenceId: cs.id,
			title: question.title,
			description: question.description,
			deadline: new Date(Date.now() + question.deadlineInDays * DAY_MS),
			draft: question.draft ?? false,
			hidden: question.hidden ?? false,
			showSelectionOnDashboard: question.showSelectionOnDashboard ?? false
		});
		for (const [title, upperLimit] of question.options) {
			const optionId = faker.database.mongodbObjectId();
			optionIds.set(`${question.key}/${title}`, optionId);
			cs.batch.surveyOption.push({
				id: optionId,
				questionId,
				title,
				description: `Option ${title}`,
				upperLimit
			});
		}
	}

	const answer = (userId: string, questionKey: string, optionTitle: string) => {
		const questionId = questionIds.get(questionKey);
		const optionId = optionIds.get(`${questionKey}/${optionTitle}`);
		if (questionId && optionId) cs.batch.surveyAnswer.push({ questionId, optionId, userId });
	};

	for (const [userId, questionKey, optionTitle] of PERSONA_ANSWERS) {
		answer(userId, questionKey, optionTitle);
	}

	// The crowd fills the limited workshop and answers the rest at random.
	const crowd = cs.acceptedUsers.filter((userId) => !userId.startsWith('dev-'));
	crowd.slice(0, 3).forEach((userId) => answer(userId, 'workshop', 'Verhandlungstraining'));
	for (const userId of crowd.slice(3)) {
		if (faker.datatype.boolean(0.4)) continue;
		answer(userId, 'workshop', faker.helpers.arrayElement(['Rhetorik', 'Resolutionen schreiben']));
		answer(userId, 'dinner', faker.helpers.arrayElement(['Pizza', 'Pasta', 'Salat']));
		answer(userId, 'excursion', faker.helpers.arrayElement(['Bundestag', 'Museum']));
	}
}
