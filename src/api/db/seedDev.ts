import { faker } from '@faker-js/faker';
import { drizzle } from 'drizzle-orm/node-postgres';
import { reset } from 'drizzle-seed';
import * as schema from './schema';
import { unMemberNations } from './seed-data/nations';
import { makeSeedUser } from './seed-data/user';
import { makeSeedConference } from './seed-data/conference';
import { makeSeedCommittee } from './seed-data/committee';
import { makeSeedNSA } from './seed-data/nonStateActor';
import { makeSeedCustomConferenceRole } from './seed-data/customConferenceRole';
import { makeSeedDelegation } from './seed-data/delegation';
import { makeSeedDelegationMember } from './seed-data/delegationMember';
import { makeSeedConferenceSupervisor } from './seed-data/conferenceSupervisor';
import { makeSeedSingleParticipant } from './seed-data/singleParticipant';
import { makeSeedTeamMember } from './seed-data/teamMember';
import { makeSeedPaymentTransaction } from './seed-data/paymentTransaction';
import {
	makeSeedCalendarDay,
	makeSeedCalendarTrack,
	makeSeedCalendarEntry,
	makeSeedPlace
} from './seed-data/calendarDay';
import type { Insert } from './rows';

// Run outside SvelteKit (`bun run db:seed:dev`), so the connection string comes straight off the
// process rather than through `$config/private`.
const db = drizzle(process.env.DATABASE_URL!);

// A fixed faker seed keeps the generated data identical between runs, which makes the dev
// database reproducible and screenshots comparable.
faker.seed(123);

/** How many of each thing every conference gets. */
const COMMITTEES_PER_CONFERENCE = 10;
const NSAS_PER_CONFERENCE = 20;
const CUSTOM_ROLES_PER_CONFERENCE = 6;
const DELEGATIONS_PER_CONFERENCE = 6;
const SUPERVISORS_PER_CONFERENCE = 6;
/** The first three supervise delegations; the rest exist to show the unconnected case. */
const SUPERVISORS_WITH_STUDENTS = 3;
const SINGLE_PARTICIPANTS_PER_CONFERENCE = 11;
const TEAM_MEMBERS_PER_CONFERENCE = 8;
const PAID_DELEGATIONS_PER_CONFERENCE = 4;

function times<T>(count: number, make: (index: number) => T): T[] {
	return Array.from({ length: count }, (_unused, index) => make(index));
}

console.info('Resetting database...');
await reset(db, schema);

console.info('Seeding nations...');
const nations = await db.insert(schema.nation).values(unMemberNations()).returning();

console.info('Seeding users...');
const users = times(1000, () => makeSeedUser());
await db.insert(schema.user).values(users);

/** The user pool is handed out once: nobody holds two roles in the same conference. */
let usersTaken = 0;
function takeUser() {
	const user = users[usersTaken++];
	if (!user) {
		throw new Error('The seed ran out of users. Raise the pool size above.');
	}
	return user;
}

for (const conference of [
	makeSeedConference({ state: 'PRE' }),
	makeSeedConference({ state: 'PARTICIPANT_REGISTRATION' }),
	makeSeedConference({ state: 'PREPARATION' }),
	makeSeedConference({ state: 'ACTIVE' }),
	makeSeedConference({ state: 'POST' })
]) {
	console.info(`Seeding conference ${conference.title} (${conference.state})...`);
	await db.insert(schema.conference).values(conference);

	// Everything from PREPARATION onwards has its roles handed out, which is what unlocks the
	// assigned-state parts of the dashboards.
	const conferenceIsInAssignedState = !(['PRE', 'PARTICIPANT_REGISTRATION'] as const).some(
		(state) => state === conference.state
	);
	const conferenceId = conference.id!;

	const committees = times(COMMITTEES_PER_CONFERENCE, () => makeSeedCommittee({ conferenceId }));
	await db.insert(schema.committee).values(committees);

	// Which nations a committee represents. Collected per committee so a delegation can only be
	// assigned a nation that actually holds a seat somewhere.
	const committeeNations = committees.map((committee) => ({
		committee,
		nations: faker.helpers.arrayElements(nations, { min: 6, max: 36 })
	}));
	await db
		.insert(schema.committeeToNation)
		.values(
			committeeNations.flatMap(({ committee, nations: represented }) =>
				represented.map((nation) => ({ a: committee.id!, b: nation.alpha3Code }))
			)
		);
	const representedNations = [
		...new Map(
			committeeNations
				.flatMap(({ nations: represented }) => represented)
				.map((nation) => [nation.alpha3Code, nation])
		).values()
	];

	const nonStateActors = times(NSAS_PER_CONFERENCE, () => makeSeedNSA({ conferenceId }));
	await db.insert(schema.nonStateActor).values(nonStateActors);

	const customConferenceRoles = times(CUSTOM_ROLES_PER_CONFERENCE, () =>
		makeSeedCustomConferenceRole({ conferenceId })
	);
	await db.insert(schema.customConferenceRole).values(customConferenceRoles);

	// A delegation may hold at most one nation and at most one NSA per conference, so the
	// assignments are dealt from shuffled pools instead of picked at random.
	const nationsToAssign = faker.helpers.shuffle([...representedNations]);
	const nonStateActorsToAssign = faker.helpers.shuffle([...nonStateActors]);

	const delegations = times(DELEGATIONS_PER_CONFERENCE, (index) => {
		const delegation = makeSeedDelegation({ conferenceId });
		if (conferenceIsInAssignedState) {
			if (faker.datatype.boolean()) {
				delegation.assignedNationAlpha3Code = nationsToAssign[index]?.alpha3Code ?? null;
			} else {
				delegation.assignedNonStateActorId = nonStateActorsToAssign[index]?.id ?? null;
			}
		}
		return delegation;
	});
	await db.insert(schema.delegation).values(delegations);

	const delegationMembers = delegations.map((delegation) =>
		times(faker.number.int({ min: 1, max: 6 }), () =>
			makeSeedDelegationMember({
				delegationId: delegation.id!,
				conferenceId,
				userId: takeUser().id!,
				isHeadDelegate: false,
				assignedCommitteeId: conferenceIsInAssignedState ? committees[4].id : undefined
			})
		)
	);
	await db.insert(schema.delegationMember).values(delegationMembers.flat());

	// Three preferences per delegation: the two top-ranked nations and one NSA.
	await db.insert(schema.roleApplication).values(
		delegations.flatMap((delegation) => [
			{ delegationId: delegation.id!, rank: 0, nationId: representedNations[0].alpha3Code },
			{ delegationId: delegation.id!, rank: 1, nationId: representedNations[1].alpha3Code },
			{ delegationId: delegation.id!, rank: 2, nonStateActorId: nonStateActors[0].id }
		])
	);

	const supervisors = times(SUPERVISORS_PER_CONFERENCE, () =>
		makeSeedConferenceSupervisor({ conferenceId, userId: takeUser().id! })
	);
	await db.insert(schema.conferenceSupervisor).values(supervisors);

	// Supervisors are attached to members rather than to whole delegations, which is the only
	// link the schema has. The first two delegations are the supervised ones.
	const supervisedMembers = [...delegationMembers[0], ...delegationMembers[1]];
	await db
		.insert(schema.conferenceSupervisorToDelegationMember)
		.values(
			supervisors
				.slice(0, SUPERVISORS_WITH_STUDENTS)
				.flatMap((supervisor) =>
					supervisedMembers.map((member) => ({ a: supervisor.id!, b: member.id! }))
				)
		);

	const singleParticipants = times(SINGLE_PARTICIPANTS_PER_CONFERENCE, () =>
		makeSeedSingleParticipant({
			conferenceId,
			userId: takeUser().id!,
			assignedRoleId: conferenceIsInAssignedState
				? faker.helpers.arrayElement(customConferenceRoles).id
				: null
		})
	);
	await db.insert(schema.singleParticipant).values(singleParticipants);

	const teamMembers = times(TEAM_MEMBERS_PER_CONFERENCE, () =>
		makeSeedTeamMember({ conferenceId, userId: takeUser().id! })
	);
	await db.insert(schema.teamMember).values(teamMembers);

	// One transaction per delegation, paid by its first member on behalf of the others.
	const payingDelegations = delegationMembers.slice(0, PAID_DELEGATIONS_PER_CONFERENCE);
	const paymentTransactions = payingDelegations.map((members) =>
		makeSeedPaymentTransaction({ conferenceId, userId: members[0].userId })
	);
	await db.insert(schema.paymentTransaction).values(paymentTransactions);
	const paymentReferences = payingDelegations.flatMap((members, index) =>
		members.slice(1).map((member) => ({
			paymentTransactionId: paymentTransactions[index].id!,
			userId: member.userId
		}))
	);
	if (paymentReferences.length > 0) {
		await db.insert(schema.userReferenceInPaymentTransaction).values(paymentReferences);
	}

	if (conference.state === 'ACTIVE') {
		await seedCalendar(conferenceId, new Date(conference.startConference!));
	}
}

/**
 * A three-day programme for the running conference: shared ceremonies and breaks plus three
 * parallel committee tracks, which is what the calendar views need to be worth looking at.
 */
async function seedCalendar(conferenceId: string, firstDay: Date) {
	const dayNames = ['Donnerstag', 'Freitag', 'Samstag'];
	const dayDates = dayNames.map((_name, index) => {
		const date = new Date(firstDay);
		date.setDate(date.getDate() + index);
		return date;
	});

	const days = dayNames.map((name, index) =>
		makeSeedCalendarDay({ conferenceId, name, date: dayDates[index], sortOrder: index })
	);
	await db.insert(schema.calendarDay).values(days);

	const trackNames = ['GV Presse', 'IMO MRR', 'Sicherheitsrat'];
	const tracksPerDay = days.map((day) =>
		trackNames.map((name, sortOrder) =>
			makeSeedCalendarTrack({ calendarDayId: day.id!, name, sortOrder })
		)
	);
	await db.insert(schema.calendarTrack).values(tracksPerDay.flat());

	const landtag = makeSeedPlace({
		conferenceId,
		name: 'Landtag Niedersachsen',
		address: 'Hannah-Arendt-Platz 1, 30159 Hannover',
		latitude: 52.3613,
		longitude: 9.7414,
		directions: 'Vom Hauptbahnhof mit der U-Bahn Linie 3 oder 7 bis Waterloo, dann 5 Min zu Fuß.',
		info: 'Bitte Personalausweis mitbringen. Keine Getränke im Plenarsaal.'
	});
	const kulturzentrum = makeSeedPlace({
		conferenceId,
		name: 'Kulturzentrum',
		address: 'Beispielstr. 42, 30159 Hannover',
		latitude: 52.374,
		longitude: 9.7385
	});
	await db.insert(schema.place).values([landtag, kulturzentrum]);

	function at(date: Date, hours: number, minutes: number) {
		const time = new Date(date);
		time.setHours(hours, minutes, 0, 0);
		return time;
	}

	/** The same session in all three tracks, one room each. */
	function parallelSessions(
		dayIndex: number,
		name: string,
		from: [number, number],
		to: [number, number]
	) {
		return tracksPerDay[dayIndex].map((track, trackIndex) =>
			makeSeedCalendarEntry({
				calendarDayId: days[dayIndex].id!,
				calendarTrackId: track.id!,
				name,
				startTime: at(dayDates[dayIndex], from[0], from[1]),
				endTime: at(dayDates[dayIndex], to[0], to[1]),
				color: 'SESSION',
				fontAwesomeIcon: 'gavel',
				room: `Raum ${201 + trackIndex}`
			})
		);
	}

	const entries: Insert<'calendarEntry'>[] = [
		makeSeedCalendarEntry({
			calendarDayId: days[0].id!,
			name: 'Eröffnungsfeier',
			startTime: at(dayDates[0], 10, 0),
			endTime: at(dayDates[0], 11, 30),
			color: 'CEREMONY',
			fontAwesomeIcon: 'flag',
			placeId: landtag.id,
			room: 'Plenarsaal'
		}),
		makeSeedCalendarEntry({
			calendarDayId: days[0].id!,
			name: 'Mittagspause',
			startTime: at(dayDates[0], 11, 30),
			endTime: at(dayDates[0], 12, 30),
			color: 'BREAK',
			fontAwesomeIcon: 'utensils'
		}),
		...parallelSessions(0, 'Sitzung I', [12, 30], [14, 30]),
		makeSeedCalendarEntry({
			calendarDayId: days[0].id!,
			name: 'Kaffeepause',
			startTime: at(dayDates[0], 14, 30),
			endTime: at(dayDates[0], 15, 0),
			color: 'BREAK',
			fontAwesomeIcon: 'mug-hot'
		}),
		...parallelSessions(0, 'Sitzung II', [15, 0], [17, 0]),
		makeSeedCalendarEntry({
			calendarDayId: days[0].id!,
			name: 'Abendessen',
			startTime: at(dayDates[0], 17, 30),
			endTime: at(dayDates[0], 18, 30),
			color: 'SOCIAL',
			fontAwesomeIcon: 'utensils'
		}),
		...parallelSessions(1, 'Sitzung III', [9, 0], [11, 0]),
		makeSeedCalendarEntry({
			calendarDayId: days[1].id!,
			name: 'Mittagspause',
			startTime: at(dayDates[1], 11, 0),
			endTime: at(dayDates[1], 12, 0),
			color: 'BREAK',
			fontAwesomeIcon: 'utensils'
		}),
		makeSeedCalendarEntry({
			calendarDayId: days[1].id!,
			name: 'Workshop: Diplomatische Verhandlungen',
			startTime: at(dayDates[1], 12, 0),
			endTime: at(dayDates[1], 13, 30),
			color: 'WORKSHOP',
			fontAwesomeIcon: 'chalkboard-user',
			room: 'Saal A'
		}),
		...parallelSessions(1, 'Sitzung IV', [13, 30], [15, 30]),
		makeSeedCalendarEntry({
			calendarDayId: days[1].id!,
			name: 'Delegiertenabend',
			startTime: at(dayDates[1], 18, 0),
			endTime: at(dayDates[1], 22, 0),
			color: 'SOCIAL',
			fontAwesomeIcon: 'party-horn',
			placeId: kulturzentrum.id
		}),
		...parallelSessions(2, 'Sitzung V', [9, 0], [11, 0]),
		makeSeedCalendarEntry({
			calendarDayId: days[2].id!,
			name: 'Mittagspause',
			startTime: at(dayDates[2], 11, 0),
			endTime: at(dayDates[2], 12, 0),
			color: 'BREAK',
			fontAwesomeIcon: 'utensils'
		}),
		makeSeedCalendarEntry({
			calendarDayId: days[2].id!,
			name: 'Abschlussfeier',
			startTime: at(dayDates[2], 12, 0),
			endTime: at(dayDates[2], 14, 0),
			color: 'CEREMONY',
			fontAwesomeIcon: 'award',
			placeId: landtag.id,
			room: 'Plenarsaal'
		})
	];
	await db.insert(schema.calendarEntry).values(entries);
}

console.info('Done!');
process.exit(0);
