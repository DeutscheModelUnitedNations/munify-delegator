import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { whereRows } from '../whereRows';
import * as schema from '../schema';

/**
 * Every row the dev seed writes, collected in memory first and inserted in one go, in foreign
 * key order. Building the whole picture before writing anything lets a scenario reference a row
 * another one creates later, without the code having to care which table is written first.
 */
export interface SeedBatch {
	nation: (typeof schema.nation.$inferInsert)[];
	user: (typeof schema.user.$inferInsert)[];
	reviewerSnippet: (typeof schema.reviewerSnippet.$inferInsert)[];
	storedFile: (typeof schema.storedFile.$inferInsert)[];
	school: (typeof schema.school.$inferInsert)[];
	/** Not a table: the bucket objects of `storedFile`, written by `replaceSeedObjects`. */
	storedObject: { key: string; bytes: Uint8Array; mimeType: string }[];
	conference: (typeof schema.conference.$inferInsert)[];
	committee: (typeof schema.committee.$inferInsert)[];
	conferenceRole: (typeof schema.conferenceRole.$inferInsert)[];
	committeeToRole: (typeof schema.committeeToRole.$inferInsert)[];
	committeeAgendaItem: (typeof schema.committeeAgendaItem.$inferInsert)[];
	resolution: (typeof schema.resolution.$inferInsert)[];
	delegation: (typeof schema.delegation.$inferInsert)[];
	delegationMember: (typeof schema.delegationMember.$inferInsert)[];
	roleApplication: (typeof schema.roleApplication.$inferInsert)[];
	singleParticipant: (typeof schema.singleParticipant.$inferInsert)[];
	singleParticipantRoleWish: (typeof schema.singleParticipantRoleWish.$inferInsert)[];
	conferenceSupervisor: (typeof schema.conferenceSupervisor.$inferInsert)[];
	supervision: (typeof schema.supervision.$inferInsert)[];
	teamMember: (typeof schema.teamMember.$inferInsert)[];
	teamMemberInvitation: (typeof schema.teamMemberInvitation.$inferInsert)[];
	waitingListEntry: (typeof schema.waitingListEntry.$inferInsert)[];
	conferenceParticipant: (typeof schema.conferenceParticipant.$inferInsert)[];
	attendanceSession: (typeof schema.attendanceSession.$inferInsert)[];
	attendanceEntry: (typeof schema.attendanceEntry.$inferInsert)[];
	paymentTransaction: (typeof schema.paymentTransaction.$inferInsert)[];
	userReferenceInPaymentTransaction: (typeof schema.userReferenceInPaymentTransaction.$inferInsert)[];
	paper: (typeof schema.paper.$inferInsert)[];
	paperVersion: (typeof schema.paperVersion.$inferInsert)[];
	paperReview: (typeof schema.paperReview.$inferInsert)[];
	surveyQuestion: (typeof schema.surveyQuestion.$inferInsert)[];
	surveyOption: (typeof schema.surveyOption.$inferInsert)[];
	surveyAnswer: (typeof schema.surveyAnswer.$inferInsert)[];
	place: (typeof schema.place.$inferInsert)[];
	calendarDay: (typeof schema.calendarDay.$inferInsert)[];
	calendarTrack: (typeof schema.calendarTrack.$inferInsert)[];
	calendarEntry: (typeof schema.calendarEntry.$inferInsert)[];
	calendarEntryToCalendarTrack: (typeof schema.calendarEntryToCalendarTrack.$inferInsert)[];
	assignmentReview: (typeof schema.assignmentReview.$inferInsert)[];
	assignmentUnit: (typeof schema.assignmentUnit.$inferInsert)[];
	assignmentUnitMember: (typeof schema.assignmentUnitMember.$inferInsert)[];
	assignmentSingleRole: (typeof schema.assignmentSingleRole.$inferInsert)[];
	assignmentWeights: (typeof schema.assignmentWeights.$inferInsert)[];
	possibleDuplicate: (typeof schema.possibleDuplicate.$inferInsert)[];
	conferenceEmailSetting: (typeof schema.conferenceEmailSetting.$inferInsert)[];
	conferenceEmailText: (typeof schema.conferenceEmailText.$inferInsert)[];
	emailLog: (typeof schema.emailLog.$inferInsert)[];
}

export function emptyBatch(): SeedBatch {
	return {
		nation: [],
		user: [],
		reviewerSnippet: [],
		storedFile: [],
		school: [],
		storedObject: [],
		conference: [],
		committee: [],
		conferenceRole: [],
		committeeToRole: [],
		committeeAgendaItem: [],
		resolution: [],
		delegation: [],
		delegationMember: [],
		roleApplication: [],
		singleParticipant: [],
		singleParticipantRoleWish: [],
		conferenceSupervisor: [],
		supervision: [],
		teamMember: [],
		teamMemberInvitation: [],
		waitingListEntry: [],
		conferenceParticipant: [],
		attendanceSession: [],
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
		calendarEntry: [],
		calendarEntryToCalendarTrack: [],
		assignmentReview: [],
		assignmentUnit: [],
		assignmentUnitMember: [],
		assignmentSingleRole: [],
		assignmentWeights: [],
		possibleDuplicate: [],
		conferenceEmailSetting: [],
		conferenceEmailText: [],
		emailLog: []
	};
}

/** Postgres takes at most 65535 parameters per statement; 500 rows stay well below that. */
const CHUNK = 500;

async function insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
	for (let start = 0; start < rows.length; start += CHUNK) {
		await insert(rows.slice(start, start + CHUNK));
	}
}

const nullFileColumns = {
	imageFileId: null,
	guardianConsentFileId: null,
	mediaConsentFileId: null,
	termsAndConditionsFileId: null,
	contractFileId: null,
	certificateFileId: null,
	emblemFileId: null,
	logoFileId: null
} satisfies Partial<typeof schema.conference.$inferInsert>;

function conferenceFileColumns(row: typeof schema.conference.$inferInsert) {
	return {
		imageFileId: row.imageFileId ?? null,
		guardianConsentFileId: row.guardianConsentFileId ?? null,
		mediaConsentFileId: row.mediaConsentFileId ?? null,
		termsAndConditionsFileId: row.termsAndConditionsFileId ?? null,
		contractFileId: row.contractFileId ?? null,
		certificateFileId: row.certificateFileId ?? null,
		emblemFileId: row.emblemFileId ?? null,
		logoFileId: row.logoFileId ?? null
	};
}

/** Writes the batch, parents before children. */
export async function insertBatch(db: NodePgDatabase, batch: SeedBatch) {
	const s = schema;
	await insertChunked(batch.nation, (rows) => db.insert(s.nation).values(rows));
	await insertChunked(batch.user, (rows) => db.insert(s.user).values(rows));
	await insertChunked(batch.reviewerSnippet, (rows) => db.insert(s.reviewerSnippet).values(rows));
	await insertChunked(batch.school, (rows) => db.insert(s.school).values(rows));
	// Conferences and their files point at each other: the conference goes in without its file
	// columns, the files after it, and the columns last.
	const conferenceFiles = batch.conference.map(conferenceFileColumns);
	await insertChunked(batch.conference, (rows) =>
		db.insert(s.conference).values(rows.map((row) => ({ ...row, ...nullFileColumns })))
	);
	await insertChunked(batch.storedFile, (rows) => db.insert(s.storedFile).values(rows));
	for (const [index, row] of batch.conference.entries()) {
		const files = conferenceFiles[index];
		if (row.id && files && Object.values(files).some(Boolean)) {
			await db
				.update(s.conference)
				.set(files)
				.where(whereRows(s.conference, { id: row.id }));
		}
	}
	await insertChunked(batch.committee, (rows) => db.insert(s.committee).values(rows));
	await insertChunked(batch.conferenceRole, (rows) => db.insert(s.conferenceRole).values(rows));
	await insertChunked(batch.committeeToRole, (rows) => db.insert(s.committeeToRole).values(rows));
	await insertChunked(batch.committeeAgendaItem, (rows) =>
		db.insert(s.committeeAgendaItem).values(rows)
	);
	await insertChunked(batch.resolution, (rows) => db.insert(s.resolution).values(rows));
	await insertChunked(batch.conferenceParticipant, (rows) =>
		db.insert(s.conferenceParticipant).values(rows)
	);
	await insertChunked(batch.delegation, (rows) => db.insert(s.delegation).values(rows));
	await insertChunked(batch.delegationMember, (rows) => db.insert(s.delegationMember).values(rows));
	await insertChunked(batch.roleApplication, (rows) => db.insert(s.roleApplication).values(rows));
	await insertChunked(batch.singleParticipant, (rows) =>
		db.insert(s.singleParticipant).values(rows)
	);
	await insertChunked(batch.singleParticipantRoleWish, (rows) =>
		db.insert(s.singleParticipantRoleWish).values(rows)
	);
	await insertChunked(batch.conferenceSupervisor, (rows) =>
		db.insert(s.conferenceSupervisor).values(rows)
	);
	await insertChunked(batch.supervision, (rows) => db.insert(s.supervision).values(rows));
	await insertChunked(batch.teamMember, (rows) => db.insert(s.teamMember).values(rows));
	await insertChunked(batch.teamMemberInvitation, (rows) =>
		db.insert(s.teamMemberInvitation).values(rows)
	);
	await insertChunked(batch.waitingListEntry, (rows) => db.insert(s.waitingListEntry).values(rows));
	await insertChunked(batch.attendanceSession, (rows) =>
		db.insert(s.attendanceSession).values(rows)
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
	await insertChunked(batch.calendarEntryToCalendarTrack, (rows) =>
		db.insert(s.calendarEntryToCalendarTrack).values(rows)
	);
	await insertChunked(batch.assignmentReview, (rows) => db.insert(s.assignmentReview).values(rows));
	await insertChunked(batch.assignmentUnit, (rows) => db.insert(s.assignmentUnit).values(rows));
	await insertChunked(batch.assignmentUnitMember, (rows) =>
		db.insert(s.assignmentUnitMember).values(rows)
	);
	await insertChunked(batch.assignmentSingleRole, (rows) =>
		db.insert(s.assignmentSingleRole).values(rows)
	);
	await insertChunked(batch.assignmentWeights, (rows) =>
		db.insert(s.assignmentWeights).values(rows)
	);
	await insertChunked(batch.possibleDuplicate, (rows) =>
		db.insert(s.possibleDuplicate).values(rows)
	);
	await insertChunked(batch.conferenceEmailSetting, (rows) =>
		db.insert(s.conferenceEmailSetting).values(rows)
	);
	await insertChunked(batch.conferenceEmailText, (rows) =>
		db.insert(s.conferenceEmailText).values(rows)
	);
	await insertChunked(batch.emailLog, (rows) => db.insert(s.emailLog).values(rows));
}
