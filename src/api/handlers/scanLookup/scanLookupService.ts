import { db } from '#api/db/db.js';
import { splitRole } from '#lib/helpers/conferenceRole.js';

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
	guardianConsent: 'PENDING',
	missingSurveyOptions: []
} as const;

async function findScannedPerson(conferenceId: string, code: string) {
	const inConference = { conferenceId };
	// the registrations reach their conference through the person's part in it
	const throughParticipant = { participant: inConference };
	const byCard = await db.query.conferenceParticipant.findFirst({
		where: { ...inConference, accessCardId: code },
		columns: { userId: true }
	});
	return db.query.user.findFirst({
		where: {
			id: byCard?.userId ?? code,
			// Only somebody with a part in this conference: a user id from anywhere else (an
			// identity code, a co-delegate, an author) must not hand any team member a stranger's
			// name and birthday, which the user read rules withhold from them.
			OR: [
				{ delegationMemberships: throughParticipant },
				{ singleParticipant: throughParticipant },
				{ conferenceSupervisor: throughParticipant },
				{ teamMember: inConference },
				{ waitingListEntry: inConference }
			]
		},
		columns: { id: true, givenName: true, familyName: true, birthday: true },
		with: {
			delegationMemberships: {
				where: throughParticipant,
				columns: { isHeadDelegate: true },
				with: {
					assignedCommittee: { columns: { abbreviation: true } },
					delegation: {
						columns: {},
						with: {
							assignedRole: {
								columns: { kind: true, name: true, fontAwesomeIcon: true },
								with: { nation: { columns: { alpha2Code: true, alpha3Code: true } } }
							}
						}
					}
				}
			},
			singleParticipant: {
				where: throughParticipant,
				columns: {},
				with: { assignedRole: { columns: { name: true } } }
			},
			conferenceSupervisor: { where: throughParticipant, columns: { id: true } },
			teamMember: { where: inConference, columns: { id: true } },
			waitingListEntry: { where: inConference, columns: { id: true } }
		}
	});
}

type ScannedPerson = NonNullable<Awaited<ReturnType<typeof findScannedPerson>>>;
type ScannedStatus = Awaited<ReturnType<typeof db.query.conferenceParticipant.findFirst>>;

type Role = NonNullable<
	ScannedPerson['delegationMemberships'][number]['delegation']['assignedRole']
>;

const NO_NATION = { nationAlpha2Code: null, nationAlpha3Code: null };
const NO_ACTOR = { nonStateActorName: null, nonStateActorIcon: null };

function nationSeat(nation: Role['nation'] | null) {
	return nation
		? { nationAlpha2Code: nation.alpha2Code, nationAlpha3Code: nation.alpha3Code }
		: NO_NATION;
}

function actorSeat(actor: Role | null) {
	return actor
		? { nonStateActorName: actor.name, nonStateActorIcon: actor.fontAwesomeIcon }
		: NO_ACTOR;
}

function describeSeat(person: ScannedPerson) {
	const member = person.delegationMemberships.at(0);
	const single = person.singleParticipant.at(0);
	const { nation, nonStateActor } = splitRole(member?.delegation.assignedRole);
	return {
		isHeadDelegate: member?.isHeadDelegate ?? false,
		...nationSeat(nation),
		...actorSeat(nonStateActor),
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
	// The team is found and named, but takes no part as a participant: it is never scanned in.
	const inConference =
		person.delegationMemberships.length > 0 ||
		person.singleParticipant.length > 0 ||
		isSupervisor ||
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

/**
 * The titles of the survey options the session expects, when the person picked none of them;
 * empty when they did, or when the session expects none.
 */
async function missingSurveyOptions(
	conferenceId: string,
	sessionId: string | null | undefined,
	participantId: string | undefined
) {
	if (!sessionId) return [];
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId, conferenceId },
		columns: {},
		with: {
			surveyOptions: {
				columns: { title: true },
				with: {
					surveyAnswers: {
						// Somebody without a participant row has answered nothing
						where: { conferenceParticipantId: participantId ?? '' },
						columns: { id: true }
					}
				}
			}
		}
	});
	const options = session?.surveyOptions ?? [];
	if (options.some((option) => option.surveyAnswers.length > 0)) return [];
	return options.map((option) => option.title);
}

/**
 * Looks the code up and describes the person it belongs to, or answers that nothing was found.
 * With a session, it also names the survey options the session expects that the person lacks.
 */
export async function lookupScan(conferenceId: string, code: string, sessionId?: string | null) {
	const person = await findScannedPerson(conferenceId, code);
	if (!person) return NOTHING_FOUND;
	const status = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId, userId: person.id }
	});
	return {
		...describePerson(person, status),
		missingSurveyOptions: await missingSurveyOptions(conferenceId, sessionId, status?.id)
	};
}
