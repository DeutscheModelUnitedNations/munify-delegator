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
	messagingTermsAcceptance: (typeof schema.messagingTermsAcceptance.$inferInsert)[];
	reviewerSnippet: (typeof schema.reviewerSnippet.$inferInsert)[];
	storedFile: (typeof schema.storedFile.$inferInsert)[];
	school: (typeof schema.school.$inferInsert)[];
	/** Not a table: the bucket objects of `storedFile`, written by `replaceSeedObjects`. */
	storedObject: { key: string; bytes: Uint8Array; mimeType: string }[];
	conferenceSeries: (typeof schema.conferenceSeries.$inferInsert)[];
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
	teamFunction: (typeof schema.teamFunction.$inferInsert)[];
	announcement: (typeof schema.announcement.$inferInsert)[];
	announcementAudience: (typeof schema.announcementAudience.$inferInsert)[];
	chat: (typeof schema.chat.$inferInsert)[];
	chatMessage: (typeof schema.chatMessage.$inferInsert)[];
	chatRead: (typeof schema.chatRead.$inferInsert)[];
	chatReport: (typeof schema.chatReport.$inferInsert)[];
	chatBlock: (typeof schema.chatBlock.$inferInsert)[];
	announcementAttachment: (typeof schema.announcementAttachment.$inferInsert)[];
	announcementRead: (typeof schema.announcementRead.$inferInsert)[];
	slackWorkspace: (typeof schema.slackWorkspace.$inferInsert)[];
	conferenceSlackWorkspace: (typeof schema.conferenceSlackWorkspace.$inferInsert)[];
	slackUserLookup: (typeof schema.slackUserLookup.$inferInsert)[];
	notificationPreference: (typeof schema.notificationPreference.$inferInsert)[];
	slackNotification: (typeof schema.slackNotification.$inferInsert)[];
	waitingListEntry: (typeof schema.waitingListEntry.$inferInsert)[];
	conferenceParticipant: (typeof schema.conferenceParticipant.$inferInsert)[];
	postalScan: (typeof schema.postalScan.$inferInsert)[];
	agreementDetail: (typeof schema.agreementDetail.$inferInsert)[];
	scannerAccess: (typeof schema.scannerAccess.$inferInsert)[];
	attendanceSession: (typeof schema.attendanceSession.$inferInsert)[];
	attendanceEntry: (typeof schema.attendanceEntry.$inferInsert)[];
	paymentTransaction: (typeof schema.paymentTransaction.$inferInsert)[];
	userReferenceInPaymentTransaction: (typeof schema.userReferenceInPaymentTransaction.$inferInsert)[];
	paper: (typeof schema.paper.$inferInsert)[];
	paperVersion: (typeof schema.paperVersion.$inferInsert)[];
	paperReview: (typeof schema.paperReview.$inferInsert)[];
	paperReviewDraft: (typeof schema.paperReviewDraft.$inferInsert)[];
	surveyQuestion: (typeof schema.surveyQuestion.$inferInsert)[];
	surveyOption: (typeof schema.surveyOption.$inferInsert)[];
	surveyAnswer: (typeof schema.surveyAnswer.$inferInsert)[];
	place: (typeof schema.place.$inferInsert)[];
	calendarDay: (typeof schema.calendarDay.$inferInsert)[];
	calendarTrack: (typeof schema.calendarTrack.$inferInsert)[];
	calendarDayToCalendarTrack: (typeof schema.calendarDayToCalendarTrack.$inferInsert)[];
	calendarTrackToCommittee: (typeof schema.calendarTrackToCommittee.$inferInsert)[];
	calendarTrackToConferenceRole: (typeof schema.calendarTrackToConferenceRole.$inferInsert)[];
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
	guidePage: (typeof schema.guidePage.$inferInsert)[];
	guidePageVersion: (typeof schema.guidePageVersion.$inferInsert)[];
	guideOutline: (typeof schema.guideOutline.$inferInsert)[];
	guideOutlineVersion: (typeof schema.guideOutlineVersion.$inferInsert)[];
}

export function emptyBatch(): SeedBatch {
	return {
		nation: [],
		user: [],
		messagingTermsAcceptance: [],
		reviewerSnippet: [],
		storedFile: [],
		school: [],
		storedObject: [],
		conferenceSeries: [],
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
		teamFunction: [],
		announcement: [],
		announcementAudience: [],
		chat: [],
		chatMessage: [],
		chatRead: [],
		chatReport: [],
		chatBlock: [],
		announcementAttachment: [],
		announcementRead: [],
		slackWorkspace: [],
		conferenceSlackWorkspace: [],
		slackUserLookup: [],
		notificationPreference: [],
		slackNotification: [],
		waitingListEntry: [],
		conferenceParticipant: [],
		postalScan: [],
		agreementDetail: [],
		scannerAccess: [],
		attendanceSession: [],
		attendanceEntry: [],
		paymentTransaction: [],
		userReferenceInPaymentTransaction: [],
		paper: [],
		paperVersion: [],
		paperReview: [],
		paperReviewDraft: [],
		surveyQuestion: [],
		surveyOption: [],
		surveyAnswer: [],
		place: [],
		calendarDay: [],
		calendarTrack: [],
		calendarDayToCalendarTrack: [],
		calendarTrackToCommittee: [],
		calendarTrackToConferenceRole: [],
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
		emailLog: [],
		guidePage: [],
		guidePageVersion: [],
		guideOutline: [],
		guideOutlineVersion: []
	};
}

/** Postgres takes at most 65535 parameters per statement; 500 rows stay well below that. */
const CHUNK = 500;

async function insertChunked<T>({
	rows,
	insert
}: {
	rows: T[];
	insert: (chunk: T[]) => Promise<unknown>;
}) {
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
export async function insertBatch({ db, batch }: { db: NodePgDatabase; batch: SeedBatch }) {
	const s = schema;
	await insertChunked({ rows: batch.nation, insert: (rows) => db.insert(s.nation).values(rows) });
	await insertChunked({ rows: batch.user, insert: (rows) => db.insert(s.user).values(rows) });
	await insertChunked({
		rows: batch.messagingTermsAcceptance,
		insert: (rows) => db.insert(s.messagingTermsAcceptance).values(rows)
	});
	await insertChunked({
		rows: batch.reviewerSnippet,
		insert: (rows) => db.insert(s.reviewerSnippet).values(rows)
	});
	await insertChunked({ rows: batch.school, insert: (rows) => db.insert(s.school).values(rows) });
	// Conferences and their files point at each other: the conference goes in without its file
	// columns, the files after it, and the columns last.
	const conferenceFiles = batch.conference.map(conferenceFileColumns);
	await insertChunked({
		rows: batch.conferenceSeries,
		insert: (rows) => db.insert(s.conferenceSeries).values(rows)
	});
	await insertChunked({
		rows: batch.conference,
		insert: (rows) =>
			db.insert(s.conference).values(rows.map((row) => ({ ...row, ...nullFileColumns })))
	});
	await insertChunked({
		rows: batch.storedFile,
		insert: (rows) => db.insert(s.storedFile).values(rows)
	});
	for (const [index, row] of batch.conference.entries()) {
		const files = conferenceFiles[index];
		if (row.id && files && Object.values(files).some(Boolean)) {
			await db
				.update(s.conference)
				.set(files)
				.where(whereRows({ table: s.conference, filter: { id: row.id } }));
		}
	}
	await insertChunked({
		rows: batch.committee,
		insert: (rows) => db.insert(s.committee).values(rows)
	});
	await insertChunked({
		rows: batch.conferenceRole,
		insert: (rows) => db.insert(s.conferenceRole).values(rows)
	});
	await insertChunked({
		rows: batch.committeeToRole,
		insert: (rows) => db.insert(s.committeeToRole).values(rows)
	});
	await insertChunked({
		rows: batch.committeeAgendaItem,
		insert: (rows) => db.insert(s.committeeAgendaItem).values(rows)
	});
	await insertChunked({
		rows: batch.resolution,
		insert: (rows) => db.insert(s.resolution).values(rows)
	});
	await insertGuide({ db, batch });
	await insertChunked({
		rows: batch.conferenceParticipant,
		insert: (rows) => db.insert(s.conferenceParticipant).values(rows)
	});
	await insertChunked({
		rows: batch.postalScan,
		insert: (rows) => db.insert(s.postalScan).values(rows)
	});
	await insertChunked({
		rows: batch.agreementDetail,
		insert: (rows) => db.insert(s.agreementDetail).values(rows)
	});
	await insertChunked({
		rows: batch.delegation,
		insert: (rows) => db.insert(s.delegation).values(rows)
	});
	await insertChunked({
		rows: batch.delegationMember,
		insert: (rows) => db.insert(s.delegationMember).values(rows)
	});
	await insertChunked({
		rows: batch.roleApplication,
		insert: (rows) => db.insert(s.roleApplication).values(rows)
	});
	await insertChunked({
		rows: batch.singleParticipant,
		insert: (rows) => db.insert(s.singleParticipant).values(rows)
	});
	await insertChunked({
		rows: batch.singleParticipantRoleWish,
		insert: (rows) => db.insert(s.singleParticipantRoleWish).values(rows)
	});
	await insertChunked({
		rows: batch.conferenceSupervisor,
		insert: (rows) => db.insert(s.conferenceSupervisor).values(rows)
	});
	await insertChunked({
		rows: batch.supervision,
		insert: (rows) => db.insert(s.supervision).values(rows)
	});
	await insertChunked({
		rows: batch.teamMember,
		insert: (rows) => db.insert(s.teamMember).values(rows)
	});
	await insertChunked({
		rows: batch.scannerAccess,
		insert: (rows) => db.insert(s.scannerAccess).values(rows)
	});
	await insertChunked({
		rows: batch.teamMemberInvitation,
		insert: (rows) => db.insert(s.teamMemberInvitation).values(rows)
	});
	await insertChunked({
		rows: batch.waitingListEntry,
		insert: (rows) => db.insert(s.waitingListEntry).values(rows)
	});
	await insertChunked({
		rows: batch.attendanceSession,
		insert: (rows) => db.insert(s.attendanceSession).values(rows)
	});
	await insertChunked({
		rows: batch.attendanceEntry,
		insert: (rows) => db.insert(s.attendanceEntry).values(rows)
	});
	await insertChunked({
		rows: batch.paymentTransaction,
		insert: (rows) => db.insert(s.paymentTransaction).values(rows)
	});
	await insertChunked({
		rows: batch.userReferenceInPaymentTransaction,
		insert: (rows) => db.insert(s.userReferenceInPaymentTransaction).values(rows)
	});
	await insertChunked({ rows: batch.paper, insert: (rows) => db.insert(s.paper).values(rows) });
	await insertChunked({
		rows: batch.paperVersion,
		insert: (rows) => db.insert(s.paperVersion).values(rows)
	});
	await insertChunked({
		rows: batch.paperReview,
		insert: (rows) => db.insert(s.paperReview).values(rows)
	});
	await insertChunked({
		rows: batch.paperReviewDraft,
		insert: (rows) => db.insert(s.paperReviewDraft).values(rows)
	});
	await insertChunked({
		rows: batch.surveyQuestion,
		insert: (rows) => db.insert(s.surveyQuestion).values(rows)
	});
	await insertChunked({
		rows: batch.surveyOption,
		insert: (rows) => db.insert(s.surveyOption).values(rows)
	});
	await insertChunked({
		rows: batch.surveyAnswer,
		insert: (rows) => db.insert(s.surveyAnswer).values(rows)
	});
	await insertChunked({ rows: batch.place, insert: (rows) => db.insert(s.place).values(rows) });
	await insertChunked({
		rows: batch.calendarDay,
		insert: (rows) => db.insert(s.calendarDay).values(rows)
	});
	await insertChunked({
		rows: batch.calendarTrack,
		insert: (rows) => db.insert(s.calendarTrack).values(rows)
	});
	await insertChunked({
		rows: batch.calendarDayToCalendarTrack,
		insert: (rows) => db.insert(s.calendarDayToCalendarTrack).values(rows)
	});
	await insertChunked({
		rows: batch.calendarTrackToCommittee,
		insert: (rows) => db.insert(s.calendarTrackToCommittee).values(rows)
	});
	await insertChunked({
		rows: batch.calendarTrackToConferenceRole,
		insert: (rows) => db.insert(s.calendarTrackToConferenceRole).values(rows)
	});
	await insertChunked({
		rows: batch.calendarEntry,
		insert: (rows) => db.insert(s.calendarEntry).values(rows)
	});
	await insertChunked({
		rows: batch.calendarEntryToCalendarTrack,
		insert: (rows) => db.insert(s.calendarEntryToCalendarTrack).values(rows)
	});
	await insertChunked({
		rows: batch.assignmentReview,
		insert: (rows) => db.insert(s.assignmentReview).values(rows)
	});
	await insertChunked({
		rows: batch.assignmentUnit,
		insert: (rows) => db.insert(s.assignmentUnit).values(rows)
	});
	await insertChunked({
		rows: batch.assignmentUnitMember,
		insert: (rows) => db.insert(s.assignmentUnitMember).values(rows)
	});
	await insertChunked({
		rows: batch.assignmentSingleRole,
		insert: (rows) => db.insert(s.assignmentSingleRole).values(rows)
	});
	await insertChunked({
		rows: batch.assignmentWeights,
		insert: (rows) => db.insert(s.assignmentWeights).values(rows)
	});
	await insertChunked({
		rows: batch.possibleDuplicate,
		insert: (rows) => db.insert(s.possibleDuplicate).values(rows)
	});
	await insertChunked({
		rows: batch.conferenceEmailSetting,
		insert: (rows) => db.insert(s.conferenceEmailSetting).values(rows)
	});
	await insertChunked({
		rows: batch.conferenceEmailText,
		insert: (rows) => db.insert(s.conferenceEmailText).values(rows)
	});
	await insertChunked({
		rows: batch.emailLog,
		insert: (rows) => db.insert(s.emailLog).values(rows)
	});
	await insertChunked({
		rows: batch.teamFunction,
		insert: (rows) => db.insert(s.teamFunction).values(rows)
	});
	await insertChunked({
		rows: batch.announcement,
		insert: (rows) => db.insert(s.announcement).values(rows)
	});
	await insertChunked({
		rows: batch.announcementAudience,
		insert: (rows) => db.insert(s.announcementAudience).values(rows)
	});
	await insertChunked({ rows: batch.chat, insert: (rows) => db.insert(s.chat).values(rows) });
	// a hidden message names the report it was hidden under
	await insertChunked({
		rows: batch.chatReport,
		insert: (rows) => db.insert(s.chatReport).values(rows)
	});
	await insertChunked({
		rows: batch.chatMessage,
		insert: (rows) => db.insert(s.chatMessage).values(rows)
	});
	await insertChunked({
		rows: batch.chatRead,
		insert: (rows) => db.insert(s.chatRead).values(rows)
	});
	await insertChunked({
		rows: batch.chatBlock,
		insert: (rows) => db.insert(s.chatBlock).values(rows)
	});
	await insertChunked({
		rows: batch.announcementAttachment,
		insert: (rows) => db.insert(s.announcementAttachment).values(rows)
	});
	await insertChunked({
		rows: batch.announcementRead,
		insert: (rows) => db.insert(s.announcementRead).values(rows)
	});
	await insertChunked({
		rows: batch.slackWorkspace,
		insert: (rows) => db.insert(s.slackWorkspace).values(rows)
	});
	await insertChunked({
		rows: batch.conferenceSlackWorkspace,
		insert: (rows) => db.insert(s.conferenceSlackWorkspace).values(rows)
	});
	await insertChunked({
		rows: batch.slackUserLookup,
		insert: (rows) => db.insert(s.slackUserLookup).values(rows)
	});
	await insertChunked({
		rows: batch.notificationPreference,
		insert: (rows) => db.insert(s.notificationPreference).values(rows)
	});
	await insertChunked({
		rows: batch.slackNotification,
		insert: (rows) => db.insert(s.slackNotification).values(rows)
	});
}

/**
 * The guide: pages first without their published version, which points back at them, then the
 * versions, then the pages' published version; then the sidebars.
 */
async function insertGuide({ db, batch }: { db: NodePgDatabase; batch: SeedBatch }) {
	const s = schema;
	await insertChunked({
		rows: batch.guidePage,
		insert: (rows) =>
			db.insert(s.guidePage).values(rows.map((row) => ({ ...row, publishedVersionId: null })))
	});
	await insertChunked({
		rows: batch.guidePageVersion,
		insert: (rows) => db.insert(s.guidePageVersion).values(rows)
	});
	for (const page of batch.guidePage) {
		if (!page.id || !page.publishedVersionId) continue;
		await db
			.update(s.guidePage)
			.set({ publishedVersionId: page.publishedVersionId })
			.where(whereRows({ table: s.guidePage, filter: { id: page.id } }));
	}
	await insertChunked({
		rows: batch.guideOutline,
		insert: (rows) => db.insert(s.guideOutline).values(rows)
	});
	await insertChunked({
		rows: batch.guideOutlineVersion,
		insert: (rows) => db.insert(s.guideOutlineVersion).values(rows)
	});
}
