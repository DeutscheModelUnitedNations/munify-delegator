import { db } from '$api/db/db';

const NOTHING_FOUND = {
	found: false,
	userId: null,
	givenName: null,
	familyName: null,
	birthday: null,
	inConference: false,
	isHeadDelegate: false,
	isSupervisor: false,
	isTeamMember: false,
	isWaitingList: false,
	nationAlpha2Code: null,
	nationAlpha3Code: null,
	nonStateActorName: null,
	nonStateActorIcon: null,
	committeeAbbreviation: null,
	singleRoleName: null,
	accessCardId: null,
	didAttend: false,
	paymentStatus: 'PENDING',
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING'
} as const;

async function findScannedPerson(conferenceId: string, code: string) {
	const inConference = { conferenceId };
	const byCard = await db.query.conferenceParticipantStatus.findFirst({
		where: { ...inConference, accessCardId: code },
		columns: { userId: true }
	});
	return db.query.user.findFirst({
		where: { id: byCard?.userId ?? code },
		columns: { id: true, givenName: true, familyName: true, birthday: true },
		with: {
			delegationMemberships: {
				where: inConference,
				columns: { isHeadDelegate: true },
				with: {
					assignedCommittee: { columns: { abbreviation: true } },
					delegation: {
						columns: {},
						with: {
							assignedNation: { columns: { alpha2Code: true, alpha3Code: true } },
							assignedNonStateActor: { columns: { name: true, fontAwesomeIcon: true } }
						}
					}
				}
			},
			singleParticipant: {
				where: inConference,
				columns: {},
				with: { assignedRole: { columns: { name: true } } }
			},
			conferenceSupervisor: { where: inConference, columns: { id: true } },
			teamMember: { where: inConference, columns: { id: true } },
			waitingListEntry: { where: inConference, columns: { id: true } }
		}
	});
}

type ScannedPerson = NonNullable<Awaited<ReturnType<typeof findScannedPerson>>>;
type ScannedStatus = Awaited<ReturnType<typeof db.query.conferenceParticipantStatus.findFirst>>;

type Member = ScannedPerson['delegationMemberships'][number];

const NO_NATION = { nationAlpha2Code: null, nationAlpha3Code: null };
const NO_ACTOR = { nonStateActorName: null, nonStateActorIcon: null };

function nationSeat(nation: Member['delegation']['assignedNation'] | undefined) {
	return nation
		? { nationAlpha2Code: nation.alpha2Code, nationAlpha3Code: nation.alpha3Code }
		: NO_NATION;
}

function actorSeat(actor: Member['delegation']['assignedNonStateActor'] | undefined) {
	return actor
		? { nonStateActorName: actor.name, nonStateActorIcon: actor.fontAwesomeIcon }
		: NO_ACTOR;
}

function describeSeat(person: ScannedPerson) {
	const member = person.delegationMemberships.at(0);
	const single = person.singleParticipant.at(0);
	return {
		isHeadDelegate: member?.isHeadDelegate ?? false,
		...nationSeat(member?.delegation.assignedNation),
		...actorSeat(member?.delegation.assignedNonStateActor),
		committeeAbbreviation: member?.assignedCommittee?.abbreviation ?? null,
		singleRoleName: single?.assignedRole?.name ?? null
	};
}

const NO_STATUS = {
	accessCardId: null,
	didAttend: false,
	paymentStatus: 'PENDING',
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING'
} as const;

function describeStatus(status: ScannedStatus) {
	const { accessCardId, didAttend, paymentStatus, termsAndConditions, guardianConsent } =
		status ?? NO_STATUS;
	return { accessCardId, didAttend, paymentStatus, termsAndConditions, guardianConsent };
}

function describePerson(person: ScannedPerson, status: ScannedStatus) {
	const isSupervisor = person.conferenceSupervisor.length > 0;
	const isTeamMember = person.teamMember.length > 0;
	const isWaitingList = person.waitingListEntry.length > 0;
	const inConference =
		person.delegationMemberships.length > 0 ||
		person.singleParticipant.length > 0 ||
		isSupervisor ||
		isTeamMember ||
		isWaitingList;
	return {
		found: true,
		userId: person.id,
		givenName: person.givenName,
		familyName: person.familyName,
		birthday: person.birthday?.toISOString().slice(0, 10) ?? null,
		inConference,
		isSupervisor,
		isTeamMember,
		isWaitingList,
		...describeSeat(person),
		...describeStatus(status)
	};
}

/** Looks the code up and describes the person it belongs to, or answers that nothing was found. */
export async function lookupScan(conferenceId: string, code: string) {
	const person = await findScannedPerson(conferenceId, code);
	if (!person) return NOTHING_FOUND;
	const status = await db.query.conferenceParticipantStatus.findFirst({
		where: { conferenceId, userId: person.id }
	});
	return describePerson(person, status);
}
