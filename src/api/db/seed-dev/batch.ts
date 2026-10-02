import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import type { Insert } from '../rows';

/**
 * Every row the dev seed writes, collected in memory first and inserted in one go, in foreign
 * key order. Building the whole picture before writing anything lets a scenario reference a row
 * another one creates later, without the code having to care which table is written first.
 */
export interface SeedBatch {
	nation: Insert<'nation'>[];
	user: Insert<'user'>[];
	reviewerSnippet: Insert<'reviewerSnippet'>[];
	conference: Insert<'conference'>[];
	committee: Insert<'committee'>[];
	committeeToNation: Insert<'committeeToNation'>[];
	committeeAgendaItem: Insert<'committeeAgendaItem'>[];
	nonStateActor: Insert<'nonStateActor'>[];
	customConferenceRole: Insert<'customConferenceRole'>[];
	delegation: Insert<'delegation'>[];
	delegationMember: Insert<'delegationMember'>[];
	roleApplication: Insert<'roleApplication'>[];
	singleParticipant: Insert<'singleParticipant'>[];
	customConferenceRoleToSingleParticipant: Insert<'customConferenceRoleToSingleParticipant'>[];
	conferenceSupervisor: Insert<'conferenceSupervisor'>[];
	conferenceSupervisorToDelegationMember: Insert<'conferenceSupervisorToDelegationMember'>[];
	conferenceSupervisorToSingleParticipant: Insert<'conferenceSupervisorToSingleParticipant'>[];
	teamMember: Insert<'teamMember'>[];
	teamMemberInvitation: Insert<'teamMemberInvitation'>[];
	waitingListEntry: Insert<'waitingListEntry'>[];
	conferenceParticipantStatus: Insert<'conferenceParticipantStatus'>[];
	attendanceEntry: Insert<'attendanceEntry'>[];
	paymentTransaction: Insert<'paymentTransaction'>[];
	userReferenceInPaymentTransaction: Insert<'userReferenceInPaymentTransaction'>[];
	paper: Insert<'paper'>[];
	paperVersion: Insert<'paperVersion'>[];
	paperReview: Insert<'paperReview'>[];
	surveyQuestion: Insert<'surveyQuestion'>[];
	surveyOption: Insert<'surveyOption'>[];
	surveyAnswer: Insert<'surveyAnswer'>[];
	place: Insert<'place'>[];
	calendarDay: Insert<'calendarDay'>[];
	calendarTrack: Insert<'calendarTrack'>[];
	calendarEntry: Insert<'calendarEntry'>[];
}

export function emptyBatch(): SeedBatch {
	return {
		nation: [],
		user: [],
		reviewerSnippet: [],
		conference: [],
		committee: [],
		committeeToNation: [],
		committeeAgendaItem: [],
		nonStateActor: [],
		customConferenceRole: [],
		delegation: [],
		delegationMember: [],
		roleApplication: [],
		singleParticipant: [],
		customConferenceRoleToSingleParticipant: [],
		conferenceSupervisor: [],
		conferenceSupervisorToDelegationMember: [],
		conferenceSupervisorToSingleParticipant: [],
		teamMember: [],
		teamMemberInvitation: [],
		waitingListEntry: [],
		conferenceParticipantStatus: [],
		attendanceEntry: [],
		paymentTransaction: [],
		userReferenceInPaymentTransaction: [],
		paper: [],
		paperVersion: [],
		paperReview: [],
		surveyQuestion: [],
		surveyOption: [],
		surveyAnswer: [],
		place: [],
		calendarDay: [],
		calendarTrack: [],
		calendarEntry: []
	};
}

/** Postgres takes at most 65535 parameters per statement; 500 rows stay well below that. */
const CHUNK = 500;

async function insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
	for (let start = 0; start < rows.length; start += CHUNK) {
		await insert(rows.slice(start, start + CHUNK));
	}
}

/** Writes the batch, parents before children. */
export async function insertBatch(db: NodePgDatabase, batch: SeedBatch) {
	const s = schema;
	await insertChunked(batch.nation, (rows) => db.insert(s.nation).values(rows));
	await insertChunked(batch.user, (rows) => db.insert(s.user).values(rows));
	await insertChunked(batch.reviewerSnippet, (rows) => db.insert(s.reviewerSnippet).values(rows));
	await insertChunked(batch.conference, (rows) => db.insert(s.conference).values(rows));
	await insertChunked(batch.committee, (rows) => db.insert(s.committee).values(rows));
	await insertChunked(batch.committeeToNation, (rows) =>
		db.insert(s.committeeToNation).values(rows)
	);
	await insertChunked(batch.committeeAgendaItem, (rows) =>
		db.insert(s.committeeAgendaItem).values(rows)
	);
	await insertChunked(batch.nonStateActor, (rows) => db.insert(s.nonStateActor).values(rows));
	await insertChunked(batch.customConferenceRole, (rows) =>
		db.insert(s.customConferenceRole).values(rows)
	);
	await insertChunked(batch.delegation, (rows) => db.insert(s.delegation).values(rows));
	await insertChunked(batch.delegationMember, (rows) => db.insert(s.delegationMember).values(rows));
	await insertChunked(batch.roleApplication, (rows) => db.insert(s.roleApplication).values(rows));
	await insertChunked(batch.singleParticipant, (rows) =>
		db.insert(s.singleParticipant).values(rows)
	);
	await insertChunked(batch.customConferenceRoleToSingleParticipant, (rows) =>
		db.insert(s.customConferenceRoleToSingleParticipant).values(rows)
	);
	await insertChunked(batch.conferenceSupervisor, (rows) =>
		db.insert(s.conferenceSupervisor).values(rows)
	);
	await insertChunked(batch.conferenceSupervisorToDelegationMember, (rows) =>
		db.insert(s.conferenceSupervisorToDelegationMember).values(rows)
	);
	await insertChunked(batch.conferenceSupervisorToSingleParticipant, (rows) =>
		db.insert(s.conferenceSupervisorToSingleParticipant).values(rows)
	);
	await insertChunked(batch.teamMember, (rows) => db.insert(s.teamMember).values(rows));
	await insertChunked(batch.teamMemberInvitation, (rows) =>
		db.insert(s.teamMemberInvitation).values(rows)
	);
	await insertChunked(batch.waitingListEntry, (rows) => db.insert(s.waitingListEntry).values(rows));
	await insertChunked(batch.conferenceParticipantStatus, (rows) =>
		db.insert(s.conferenceParticipantStatus).values(rows)
	);
	await insertChunked(batch.attendanceEntry, (rows) => db.insert(s.attendanceEntry).values(rows));
	await insertChunked(batch.paymentTransaction, (rows) =>
		db.insert(s.paymentTransaction).values(rows)
	);
	await insertChunked(batch.userReferenceInPaymentTransaction, (rows) =>
		db.insert(s.userReferenceInPaymentTransaction).values(rows)
	);
	await insertChunked(batch.paper, (rows) => db.insert(s.paper).values(rows));
	await insertChunked(batch.paperVersion, (rows) => db.insert(s.paperVersion).values(rows));
	await insertChunked(batch.paperReview, (rows) => db.insert(s.paperReview).values(rows));
	await insertChunked(batch.surveyQuestion, (rows) => db.insert(s.surveyQuestion).values(rows));
	await insertChunked(batch.surveyOption, (rows) => db.insert(s.surveyOption).values(rows));
	await insertChunked(batch.surveyAnswer, (rows) => db.insert(s.surveyAnswer).values(rows));
	await insertChunked(batch.place, (rows) => db.insert(s.place).values(rows));
	await insertChunked(batch.calendarDay, (rows) => db.insert(s.calendarDay).values(rows));
	await insertChunked(batch.calendarTrack, (rows) => db.insert(s.calendarTrack).values(rows));
	await insertChunked(batch.calendarEntry, (rows) => db.insert(s.calendarEntry).values(rows));
}
