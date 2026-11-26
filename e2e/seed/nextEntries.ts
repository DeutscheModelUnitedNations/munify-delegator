/**
 * Fixtures for the dashboard's next entries (e2e/dashboard/next-entries.spec.ts).
 *
 * A running conference of its own with the schedule switched on and two parallel tracks, GV and SR.
 * Nadja sits in SR, Cleo is participant care. The schedule is on one fixed day; the specs set the
 * browser's clock. Every run builds it anew.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedCalendarEntry, makeSeedPlace } from '../../src/api/db/seed-data/calendarDay';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertGvAndSr, upsertSeatedDelegations } from './conference';
import { gvAndSrDay, insertSchedule, upsertScheduleConference } from './schedule';
import { upsertParticipant } from './participant';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const NEXT_ENTRIES = {
	conferenceId: 'e2e00000conference0000nxt',
	gvId: 'e2e00000nxtcommittee00001',
	srId: 'e2e00000nxtcommittee00002',
	gv: 'NXGV',
	sr: 'NXSR',
	nadjaId: 'e2e-nxt-nadja',
	careId: 'e2e-nxt-care',
	/** Nadja's session, whose room the live spec changes */
	sessionId: 'e2e00000nxtentry000000001',
	/** The schedule's day; its times are Berlin wall-clock times (UTC+2 on it) */
	date: '2026-10-11'
} as const;

const NATIONS = { deu: 'de' };
const DELEGATION_ID = 'e2e00000nxtdelegation0001';
const MEMBER_ID = 'e2e00000nxtmember00000001';

export async function seedNextEntries(db: NodePgDatabase) {
	const conferenceId = await upsertScheduleConference(db, {
		id: NEXT_ENTRIES.conferenceId,
		title: 'E2E Next Entries Conference',
		nations: NATIONS
	});
	await upsertGvAndSr(db, { fixture: NEXT_ENTRIES, nations: Object.keys(NATIONS) });

	await upsertUsers(
		db,
		[
			{ id: NEXT_ENTRIES.nadjaId, givenName: 'Nadja', familyName: 'Naechste' },
			{ id: NEXT_ENTRIES.careId, givenName: 'Cleo', familyName: 'Care' }
		].map((person) => ({ ...makeSeedUser(), ...COMPLETE_PROFILE, ...person }))
	);
	await upsertTeamMember(db, conferenceId, NEXT_ENTRIES.careId, 'PARTICIPANT_CARE');

	await upsertSeatedDelegations(db, { conferenceId, delegations: [[DELEGATION_ID, 'deu']] });
	const member = {
		...makeSeedDelegationMember({
			delegationId: DELEGATION_ID,
			conferenceParticipantId: await upsertParticipant(db, conferenceId, NEXT_ENTRIES.nadjaId),
			assignedCommitteeId: NEXT_ENTRIES.srId,
			isHeadDelegate: true
		}),
		id: MEMBER_ID
	};
	await db
		.insert(schema.delegationMember)
		.values(member)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });

	await seedSchedule(db, conferenceId);
}

async function seedSchedule(db: NodePgDatabase, conferenceId: string) {
	for (const table of [schema.calendarDay, schema.calendarTrack, schema.place]) {
		await db.delete(table).where(eq(table.conferenceId, conferenceId));
	}

	const { day, gv, sr, at } = gvAndSrDay({ conferenceId, date: NEXT_ENTRIES.date });
	const place = makeSeedPlace({
		conferenceId,
		name: 'Landtag',
		directions: 'Mit der U-Bahn bis Waterloo.'
	});
	const planned = [
		{ name: 'Sitzung der GV', from: '09:00', to: '11:00', room: '101', tracks: [gv] },
		{
			id: NEXT_ENTRIES.sessionId,
			name: 'Sitzung des SR',
			from: '09:00',
			to: '11:00',
			room: '202',
			tracks: [sr]
		},
		{ name: 'Mittagessen', from: '12:00', to: '13:00', room: null, tracks: [gv, sr] },
		{ name: 'Abschlussfeier', from: '15:00', to: '16:00', room: 'Plenum', tracks: [gv, sr] }
	].map(({ id, name, from, to, room, tracks }) => {
		const entry = makeSeedCalendarEntry({
			calendarDayId: day.id,
			name,
			startTime: at(from),
			endTime: at(to),
			color: 'SESSION',
			placeId: place.id,
			room
		});
		return { entry: { ...entry, id: id ?? entry.id }, tracks };
	});

	await insertSchedule(db, {
		day,
		tracks: [
			{ track: gv, committeeId: NEXT_ENTRIES.gvId },
			{ track: sr, committeeId: NEXT_ENTRIES.srId }
		],
		places: [place],
		planned
	});
}
