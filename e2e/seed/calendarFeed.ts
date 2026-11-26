/**
 * Fixtures for the schedule's calendar export (e2e/calendar/calendar-feed.spec.ts).
 *
 * A running conference of its own with the schedule switched on and two parallel tracks, GV and SR.
 * Fiona sits in SR and picked option A of a survey; one excursion is limited to option A, one to
 * option B. Every run builds it anew, Fiona's subscription link included.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedCalendarEntry } from '../../src/api/db/seed-data/calendarDay';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertGvAndSr, upsertSeatedDelegations } from './conference';
import { gvAndSrDay, insertSchedule, upsertScheduleConference } from './schedule';
import { upsertParticipant } from './participant';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const CALENDAR_FEED = {
	conferenceId: 'e2e00000conference0000ics',
	title: 'E2E Calendar Feed Conference',
	gvId: 'e2e00000icscommittee00001',
	srId: 'e2e00000icscommittee00002',
	gv: 'ICGV',
	sr: 'ICSR',
	fionaId: 'e2e-ics-fiona',
	/** On Fiona's track, on the other one, for everybody, and for each survey option */
	ownSession: 'Sitzung des SR',
	otherSession: 'Sitzung der GV',
	shared: 'Abschlussfeier',
	pickedExcursion: 'Exkursion A',
	otherExcursion: 'Exkursion B'
} as const;

const NATIONS = { deu: 'de' };
const DELEGATION_ID = 'e2e00000icsdelegation0001';
const MEMBER_ID = 'e2e00000icsmember00000001';
const QUESTION_ID = 'e2e00000icssurveyquestion';
const OPTION_A_ID = 'e2e00000icssurveyoption0a';
const OPTION_B_ID = 'e2e00000icssurveyoption0b';
const ANSWER_ID = 'e2e00000icssurveyanswer01';
const DATE = '2026-10-11';

export async function seedCalendarFeed(db: NodePgDatabase) {
	const conferenceId = await upsertScheduleConference(db, {
		id: CALENDAR_FEED.conferenceId,
		title: CALENDAR_FEED.title,
		nations: NATIONS
	});
	await upsertGvAndSr(db, { fixture: CALENDAR_FEED, nations: Object.keys(NATIONS) });

	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: CALENDAR_FEED.fionaId,
			givenName: 'Fiona',
			familyName: 'Feed'
		}
	]);
	await db.delete(schema.calendarFeed).where(eq(schema.calendarFeed.conferenceId, conferenceId));

	await upsertSeatedDelegations(db, { conferenceId, delegations: [[DELEGATION_ID, 'deu']] });
	const participantId = await upsertParticipant(db, conferenceId, CALENDAR_FEED.fionaId);
	const member = {
		...makeSeedDelegationMember({
			delegationId: DELEGATION_ID,
			conferenceParticipantId: participantId,
			assignedCommitteeId: CALENDAR_FEED.srId,
			isHeadDelegate: true
		}),
		id: MEMBER_ID
	};
	await db
		.insert(schema.delegationMember)
		.values(member)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });

	// the schedule goes first: its entries name the survey options, which cannot be deleted while named
	for (const table of [schema.calendarDay, schema.calendarTrack]) {
		await db.delete(table).where(eq(table.conferenceId, conferenceId));
	}
	await seedSurvey(db, { conferenceId, participantId });
	await seedSchedule(db, conferenceId);
}

async function seedSurvey(
	db: NodePgDatabase,
	{ conferenceId, participantId }: { conferenceId: string; participantId: string }
) {
	const question = {
		id: QUESTION_ID,
		conferenceId,
		title: 'Exkursion',
		description: 'Seeded by the e2e suite.',
		draft: false,
		hidden: false,
		deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
	};
	await db
		.insert(schema.surveyQuestion)
		.values(question)
		.onConflictDoUpdate({ target: schema.surveyQuestion.id, set: question });
	for (const option of [
		{ id: OPTION_A_ID, title: 'A' },
		{ id: OPTION_B_ID, title: 'B' }
	]) {
		const row = {
			...option,
			questionId: QUESTION_ID,
			description: 'Seeded option.',
			upperLimit: 0
		};
		await db
			.insert(schema.surveyOption)
			.values(row)
			.onConflictDoUpdate({ target: schema.surveyOption.id, set: row });
	}
	const answer = {
		id: ANSWER_ID,
		questionId: QUESTION_ID,
		conferenceParticipantId: participantId,
		optionId: OPTION_A_ID
	};
	await db
		.insert(schema.surveyAnswer)
		.values(answer)
		.onConflictDoUpdate({ target: schema.surveyAnswer.id, set: answer });
}

async function seedSchedule(db: NodePgDatabase, conferenceId: string) {
	const { day, gv, sr, at } = gvAndSrDay({ conferenceId, date: DATE });
	const planned = [
		{ name: CALENDAR_FEED.otherSession, from: '09:00', to: '11:00', tracks: [gv], options: [] },
		{ name: CALENDAR_FEED.ownSession, from: '09:00', to: '11:00', tracks: [sr], options: [] },
		{
			name: CALENDAR_FEED.pickedExcursion,
			from: '12:00',
			to: '14:00',
			tracks: [gv, sr],
			options: [OPTION_A_ID]
		},
		{
			name: CALENDAR_FEED.otherExcursion,
			from: '12:00',
			to: '14:00',
			tracks: [gv, sr],
			options: [OPTION_B_ID]
		},
		{ name: CALENDAR_FEED.shared, from: '15:00', to: '16:00', tracks: [gv, sr], options: [] }
	].map(({ name, from, to, tracks, options }) => ({
		entry: makeSeedCalendarEntry({
			calendarDayId: day.id,
			name,
			startTime: at(from),
			endTime: at(to),
			color: 'SESSION'
		}),
		tracks,
		surveyOptionIds: options
	}));

	await insertSchedule(db, {
		day,
		tracks: [
			{ track: gv, committeeId: CALENDAR_FEED.gvId },
			{ track: sr, committeeId: CALENDAR_FEED.srId }
		],
		planned
	});
}
