import { faker } from '@faker-js/faker';
import { makeSeedConference } from '../seed-data/conference';
import type { DevAccountSub } from '../seed-data/devAccounts';
import { createConferenceSeed, type ConferenceSeed, type SeedWorld } from './context';
import {
	addAttendance,
	addDelegation,
	addPayment,
	addSingle,
	addStatus,
	addSupervisor,
	allDone,
	type RolePreference,
	type StatusPlan
} from './participants';
import {
	COMMITTEE_CATALOG,
	CUSTOM_ROLE_CATALOG,
	NSA_CATALOG,
	seedConferenceId,
	type ConferencePlan
} from './plans';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The nation every participant persona's delegation represents in the assigned conferences. */
export const PERSONA_NATION = 'deu';
/** How many committees seat the persona nation, so each of its three delegates gets one. */
const PERSONA_COMMITTEES = 3;

const AGENDA_TOPICS = [
	'Klimaschutz und Anpassung',
	'Cybersicherheit',
	'Zugang zu sauberem Wasser',
	'Schutz von Geflüchteten',
	'Nukleare Abrüstung',
	'Bildung für alle',
	'Pandemievorsorge',
	'Sicherheit auf See',
	'Künstliche Intelligenz',
	'Ernährungssicherheit',
	'Pressefreiheit',
	'Rechte indigener Völker'
] as const;

const REVIEW_HELP = ['UNSPECIFIED', 'HELP_NEEDED', 'NO_HELP_WANTED'] as const;

export interface ConferenceTemplates {
	contract: string;
	guardianConsent: string;
	mediaConsent: string;
	termsAndConditions: string;
	certificate: string;
}

/** The conference row and what every conference has: committees, agenda, actors and roles. */
export function buildConferenceStructure(
	world: SeedWorld,
	plan: ConferencePlan,
	templates: ConferenceTemplates
): ConferenceSeed {
	const at = (days: number) => new Date(Date.now() + days * DAY_MS);
	const startConference = at(plan.days.startConference);
	startConference.setHours(9, 0, 0, 0);
	const endConference = at(plan.days.endConference);
	endConference.setHours(17, 0, 0, 0);

	const conference = {
		...makeSeedConference({
			state: plan.conference.state,
			startAssignment: at(plan.days.startAssignment),
			startConference,
			endConference
		}),
		id: seedConferenceId(plan.key),
		location: 'Hannover',
		language: 'Deutsch',
		website: 'https://example.org',
		currency: 'EUR',
		feeAmount: 85,
		linkToPreparationGuide: 'https://example.org/vorbereitung',
		info: null,
		contractContent: plan.with.templates ? templates.contract : null,
		guardianConsentContent: plan.with.templates ? templates.guardianConsent : null,
		mediaConsentContent: plan.with.templates ? templates.mediaConsent : null,
		termsAndConditionsContent: plan.with.templates ? templates.termsAndConditions : null,
		certificateContent: plan.with.certificate ? templates.certificate : null,
		unlockPayments: false,
		unlockPostals: false,
		assignmentReleased: plan.assigned,
		assignmentReleasedAt: plan.assigned ? at(plan.days.startAssignment) : null,
		...plan.conference
	};
	world.batch.conference.push(conference);
	const cs = createConferenceSeed(world, plan, conference, startConference);

	COMMITTEE_CATALOG.slice(0, plan.crowd.committees).forEach((entry, index) => {
		const committeeId = cs.rowId(`committee-${entry.abbreviation.toLowerCase()}`);
		const others = world.nations.filter((nation) => nation !== PERSONA_NATION);
		const nations = faker.helpers.arrayElements(others, {
			min: plan.crowd.nationsPerCommittee[0],
			max: plan.crowd.nationsPerCommittee[1]
		});
		if (index < PERSONA_COMMITTEES) nations.push(PERSONA_NATION);

		world.batch.committee.push({
			id: committeeId,
			conferenceId: cs.id,
			name: entry.name,
			abbreviation: entry.abbreviation,
			numOfSeatsPerDelegation: index === 0 ? 1 : faker.number.int({ min: 1, max: 2 }),
			resolutionHeadline: faker.helpers.maybe(() => `Resolution der ${entry.name}`) ?? null
		});
		world.batch.committeeToNation.push(...nations.map((nation) => ({ a: committeeId, b: nation })));

		const agendaItemIds = [0, 1].map((item) => {
			const agendaItemId = `${committeeId}-agenda-${item}`;
			world.batch.committeeAgendaItem.push({
				id: agendaItemId,
				committeeId,
				title: AGENDA_TOPICS[(index * 2 + item) % AGENDA_TOPICS.length],
				teaserText: item === 0 ? faker.lorem.sentence() : null,
				reviewHelpStatus: REVIEW_HELP[(index * 2 + item) % REVIEW_HELP.length]
			});
			return agendaItemId;
		});

		cs.committees.push({
			id: committeeId,
			name: entry.name,
			abbreviation: entry.abbreviation,
			nations,
			agendaItemIds
		});
	});

	NSA_CATALOG.slice(0, plan.crowd.nonStateActors).forEach((entry, index) => {
		const nonStateActorId = cs.rowId(`nsa-${entry.abbreviation.toLowerCase()}`);
		world.batch.nonStateActor.push({
			id: nonStateActorId,
			conferenceId: cs.id,
			name: entry.name,
			abbreviation: entry.abbreviation,
			description: faker.lorem.sentence(),
			fontAwesomeIcon: entry.icon,
			// The persona actor seats a full delegation, so applying never trims it away.
			seatAmount: index === 0 ? 3 : faker.number.int({ min: 2, max: 3 })
		});
		cs.nonStateActorIds.push(nonStateActorId);
	});

	CUSTOM_ROLE_CATALOG.slice(0, plan.crowd.customRoles).forEach((entry, index) => {
		const roleId = cs.rowId(`role-${index}`);
		world.batch.customConferenceRole.push({
			id: roleId,
			conferenceId: cs.id,
			name: entry.name,
			description: entry.description,
			fontAwesomeIcon: entry.icon,
			seatAmount: faker.number.int({ min: 2, max: 5 })
		});
		cs.customRoleIds.push(roleId);
	});

	return cs;
}

/** Seats a delegation of `size` would have as a nation: summed over the committees it sits in. */
export function nationSeats(cs: ConferenceSeed, nation: string) {
	return cs.committees
		.filter((committee) => committee.nations.includes(nation))
		.reduce((sum, committee) => {
			const row = cs.batch.committee.find((candidate) => candidate.id === committee.id);
			return sum + (row?.numOfSeatsPerDelegation ?? 1);
		}, 0);
}

/**
 * Role preferences a delegation of `size` can keep when it applies: the server drops every
 * nation or actor with fewer seats than members, so only roomy ones are offered.
 */
export function roomyPreferences(
	cs: ConferenceSeed,
	size: number,
	count: number,
	options: { withNonStateActor?: boolean; skip?: number } = {}
): RolePreference[] {
	const nations = [...new Set(cs.committees.flatMap((committee) => committee.nations))]
		.filter((nation) => nation !== PERSONA_NATION && nationSeats(cs, nation) >= size)
		.sort((a, b) => nationSeats(cs, b) - nationSeats(cs, a) || a.localeCompare(b));
	const picked: RolePreference[] = nations
		.slice(options.skip ?? 0, (options.skip ?? 0) + count)
		.map((nation) => ({ nation }));
	if (options.withNonStateActor && cs.nonStateActorIds[0]) {
		picked[picked.length - 1] = { nonStateActorId: cs.nonStateActorIds[0] };
	}
	return picked;
}

/** A crowd participant's status: mostly fine, sometimes stuck, more settled the later it is. */
function crowdStatus(cs: ConferenceSeed): StatusPlan {
	const running = cs.plan.conference.state !== 'PREPARATION';
	const pick = () =>
		faker.helpers.weightedArrayElement([
			{ weight: running ? 18 : 6, value: 'DONE' as const },
			{ weight: running ? 1 : 3, value: 'PENDING' as const },
			{ weight: 1, value: 'PROBLEM' as const }
		]);
	return {
		paymentStatus: pick(),
		termsAndConditions: pick(),
		guardianConsent: pick(),
		mediaConsent: pick(),
		mediaConsentStatus: faker.helpers.arrayElement([
			'NOT_SET',
			'ALLOWED_ALL',
			'PARTIALLY_ALLOWED',
			'NOT_ALLOWED'
		] as const),
		didAttend: cs.plan.with.attendance ? faker.datatype.boolean(0.9) : false,
		withDocumentNumber: running || faker.datatype.boolean(0.5)
	};
}

/**
 * Anonymous participants around the personas, so tables, statistics, the assignment tools and
 * the seat overview have volume. Runs after the personas, whose fixed codes and nation are then
 * already taken.
 */
export function addCrowd(cs: ConferenceSeed) {
	const { plan, world } = cs;
	const nationPool = faker.helpers.shuffle(
		[...new Set(cs.committees.flatMap((committee) => committee.nations))].filter(
			(nation) => nation !== PERSONA_NATION
		)
	);
	const actorPool = faker.helpers.shuffle(cs.nonStateActorIds.slice(1));
	const appliedShare =
		plan.key === 'registration' ? 0.5 : plan.key === 'pre' ? 0 : plan.assigned ? 1 : 0.8;

	const crowdDelegations: { headId: string; userIds: string[]; memberIds: string[] }[] = [];
	for (let index = 0; index < plan.crowd.delegations; index++) {
		// Three in four applicants get a seat; two in three of those a nation.
		const seated = plan.assigned && index % 4 !== 3;
		const nation = seated && index % 3 !== 2 ? nationPool.pop() : undefined;
		const nonStateActorId = seated && !nation ? actorPool.pop() : undefined;
		const committees = nation
			? cs.committees.filter((committee) => committee.nations.includes(nation))
			: [];

		const size = faker.number.int({ min: 2, max: 5 });
		// The first delegate of the first delegation is 27: the plausibility check flags them.
		const userIds = Array.from({ length: size }, (_unused, memberIndex) =>
			world.crowdUser('participant', {
				ages: index === 0 && memberIndex === 1 ? [27, 27] : undefined,
				incomplete: index === 1 && memberIndex === 1
			})
		);
		const { memberIds } = addDelegation(cs, {
			applied: faker.datatype.boolean(appliedShare),
			members: userIds.map((userId, memberIndex) => ({
				userId,
				committeeId: committees.length > 0 ? committees[memberIndex % committees.length].id : null
			})),
			nation,
			nonStateActorId,
			preferences: roomyPreferences(cs, Math.min(size, 3), faker.number.int({ min: 3, max: 5 }), {
				withNonStateActor: faker.datatype.boolean(),
				skip: index % 4
			})
		});
		crowdDelegations.push({
			headId: userIds[0],
			userIds,
			memberIds: [...memberIds.values()]
		});

		if (nation || nonStateActorId) {
			if (plan.with.participantStatus) {
				for (const userId of userIds) {
					const statusId = addStatus(cs, userId, crowdStatus(cs));
					if (plan.with.attendance && faker.datatype.boolean(0.9)) {
						addAttendance(cs, statusId, 'dev-team-member', ['Check-in Tag 1']);
					}
				}
				if (index % 2 === 0) addPayment(cs, userIds[0], userIds, faker.datatype.boolean(0.7));
			}
		}
	}

	const singleIds: string[] = [];
	for (let index = 0; index < plan.crowd.singles; index++) {
		const userId = world.crowdUser('participant');
		const roleId =
			plan.assigned && index % 4 !== 3 ? faker.helpers.arrayElement(cs.customRoleIds) : undefined;
		singleIds.push(
			addSingle(cs, {
				userId,
				applied: faker.datatype.boolean(appliedShare),
				roleId,
				preferences: faker.helpers.arrayElements(cs.customRoleIds, { min: 1, max: 3 })
			})
		);
		if (roleId && plan.with.participantStatus) addStatus(cs, userId, crowdStatus(cs));
	}

	for (let index = 0; index < plan.crowd.supervisors; index++) {
		const students = faker.helpers.arrayElements(crowdDelegations, { min: 1, max: 2 });
		const userId = world.crowdUser('supervisor', {
			// The first supervisor is 19: the plausibility check flags them as too young.
			ages: index === 0 ? [19, 19] : undefined
		});
		addSupervisor(cs, {
			userId,
			attends: faker.datatype.boolean(0.7),
			memberIds: students.flatMap((delegation) => delegation.memberIds),
			singleIds: faker.helpers.arrayElements(singleIds, { min: 0, max: 2 })
		});
		if (plan.with.participantStatus) addStatus(cs, userId, crowdStatus(cs));
	}

	cs.crowdDelegations = crowdDelegations;
}

export interface WaitingListEntryPlan {
	assigned?: boolean;
	hidden?: boolean;
	/** When the person signed up; their place on the list follows from it. */
	createdAt?: Date;
}

export function addWaitingListEntry(
	cs: ConferenceSeed,
	userId: string,
	plan: WaitingListEntryPlan = {}
) {
	cs.batch.waitingListEntry.push({
		conferenceId: cs.id,
		userId,
		school: `Gymnasium ${faker.location.city()}`,
		experience: faker.lorem.sentence(),
		motivation: faker.lorem.sentences(2),
		requests: faker.helpers.maybe(() => 'Gerne zusammen mit meiner Freundin') ?? null,
		assigned: plan.assigned ?? false,
		hidden: plan.hidden ?? false,
		...(plan.createdAt ? { createdAt: plan.createdAt, updatedAt: plan.createdAt } : {})
	});
}

/**
 * The waiting list, sized from the seats and participants so the status light shows `target`:
 * a few entries leave vacancies, more than twenty beyond the free seats make the list long.
 */
export function addWaitingList(cs: ConferenceSeed, personaUserId: DevAccountSub) {
	const target = cs.plan.with.waitingList;
	if (!target) return;

	const seats =
		cs.committees.reduce((sum, committee) => sum + committee.nations.length, 0) +
		cs.nonStateActorIds.length;
	const freeSeats = Math.max(seats - cs.acceptedUsers.length, 0);
	const entries = target === 'VACANCIES' ? 5 : freeSeats + 25;
	const entry = (userId: string, overrides: WaitingListEntryPlan = {}) =>
		addWaitingListEntry(cs, userId, overrides);

	entry(personaUserId);
	// Two who already got a seat from the list, and two hidden as duplicates or no-shows.
	const seatedFromList = cs.crowdDelegations.flatMap((delegation) => delegation.userIds).slice(-2);
	for (const userId of seatedFromList) entry(userId, { assigned: true });
	for (let index = 0; index < 2; index++)
		entry(cs.world.crowdUser('participant'), { hidden: true });
	for (let index = 5; index < entries; index++) entry(cs.world.crowdUser('participant'));
}

/** Everyone signed, paid and present, apart from what `overrides` says. */
export const doneAndPresent = (overrides: StatusPlan = {}): StatusPlan => ({
	...allDone,
	didAttend: true,
	...overrides
});
