import { faker } from '@faker-js/faker';
import type * as schema from '../schema';
import type { ConferenceSeed } from './context';
import { seedSchoolId } from './schools';

/**
 * Row builders for the ways a person takes part in a conference. Personas and crowd go through
 * the same functions, so both satisfy the same invariants: one head delegate per delegation, the
 * role applications ranked without gaps, a seat count that covers an applied delegation.
 */

const APPLICATION_TEXTS = {
	motivation: () => faker.lorem.sentences(2),
	experience: () => faker.helpers.arrayElement(['Keine', 'Zwei Schul-MUNs', faker.lorem.sentence()])
};

export interface MemberPlan {
	userId: string;
	head?: boolean;
	committeeId?: string | null;
}

export type RolePreference = { nation: string } | { nonStateActorId: string };

export interface DelegationPlan {
	/** Readable suffix for personas; crowd rows get a random id. */
	id?: string;
	entryCode?: string;
	applied: boolean;
	members: MemberPlan[];
	nation?: string;
	nonStateActorId?: string;
	preferences?: RolePreference[];
	/** Leaves the application texts empty, as a freshly created delegation has them. */
	withoutTexts?: boolean;
}

/** Entry codes use the app's alphabet, so a seeded one looks like one the app generated. */
const entryCode = () => faker.string.fromCharacters('6789BCDFGHJKLMNPQRTW', 6);

export function addDelegation(cs: ConferenceSeed, plan: DelegationPlan) {
	const delegationId = plan.id ? cs.rowId(plan.id) : faker.database.mongodbObjectId();
	const fixedCode = plan.entryCode;
	cs.batch.delegation.push({
		id: delegationId,
		conferenceId: cs.id,
		// Fixed codes go through `uniqueCode` too, so a random one drawn later cannot repeat them.
		entryCode: cs.uniqueCode(fixedCode ? () => fixedCode : entryCode),
		applied: plan.applied,
		motivation: plan.withoutTexts ? null : APPLICATION_TEXTS.motivation(),
		experience: plan.withoutTexts ? null : APPLICATION_TEXTS.experience(),
		assignedRoleId: plan.nation ? cs.nationRoleId(plan.nation) : (plan.nonStateActorId ?? null)
	});
	// Most delegations come from one school: every member names it as their own.
	const schoolId = plan.withoutTexts ? null : seedSchoolId(cs.batch);

	const memberIds = new Map<string, string>();
	plan.members.forEach((member, index) => {
		const memberId = plan.id
			? cs.rowId(`${plan.id}-member-${index}`)
			: faker.database.mongodbObjectId();
		memberIds.set(member.userId, memberId);
		const participant = cs.participant(member.userId);
		const participantId = participant.id;
		participant.schoolId = schoolId;
		cs.participantOfRow.set(memberId, participantId);
		cs.batch.delegationMember.push({
			id: memberId,
			delegationId,
			conferenceParticipantId: participantId,
			isHeadDelegate: member.head ?? index === 0,
			assignedCommitteeId: member.committeeId ?? null
		});
	});

	(plan.preferences ?? []).forEach((preference, index) => {
		cs.batch.roleApplication.push({
			delegationId,
			// Ranks run 1..n, as `normalizeRoleApplicationRanks` keeps them.
			rank: index + 1,
			roleId:
				'nation' in preference ? cs.nationRoleId(preference.nation) : preference.nonStateActorId
		});
	});

	if (plan.nation) {
		cs.nationDelegations.push({
			delegationId,
			nation: plan.nation,
			members: plan.members.map((member) => ({
				userId: member.userId,
				committeeId: member.committeeId ?? null
			}))
		});
	}
	if (plan.nation || plan.nonStateActorId) {
		cs.acceptedUsers.push(...plan.members.map((member) => member.userId));
	}
	return { delegationId, memberIds };
}

export interface SinglePlan {
	id?: string;
	userId: string;
	applied: boolean;
	roleId?: string;
	preferences?: string[];
	withoutTexts?: boolean;
}

export function addSingle(cs: ConferenceSeed, plan: SinglePlan) {
	const singleId = plan.id ? cs.rowId(plan.id) : faker.database.mongodbObjectId();
	const participant = cs.participant(plan.userId);
	const participantId = participant.id;
	participant.schoolId = plan.withoutTexts ? null : seedSchoolId(cs.batch);
	cs.participantOfRow.set(singleId, participantId);
	cs.batch.singleParticipant.push({
		id: singleId,
		conferenceParticipantId: participantId,
		applied: plan.applied,
		motivation: plan.withoutTexts ? null : APPLICATION_TEXTS.motivation(),
		experience: plan.withoutTexts ? null : APPLICATION_TEXTS.experience(),
		assignedRoleId: plan.roleId ?? null
	});
	for (const roleId of plan.preferences ?? []) {
		cs.batch.singleParticipantRoleWish.push({ a: roleId, b: singleId });
	}
	if (plan.roleId) cs.acceptedUsers.push(plan.userId);
	return singleId;
}

export interface SupervisorPlan {
	id?: string;
	userId: string;
	code?: string;
	attends: boolean;
	memberIds?: string[];
	singleIds?: string[];
}

export function addSupervisor(cs: ConferenceSeed, plan: SupervisorPlan) {
	const supervisorId = plan.id ? cs.rowId(plan.id) : faker.database.mongodbObjectId();
	const fixedCode = plan.code;
	const participant = cs.participant(plan.userId);
	participant.schoolId =
		faker.helpers.maybe(() => seedSchoolId(cs.batch), { probability: 0.8 }) ?? null;
	cs.batch.conferenceSupervisor.push({
		id: supervisorId,
		conferenceParticipantId: participant.id,
		plansOwnAttendenceAtConference: plan.attends,
		// Connection codes are unique across conferences, so a fixed one names one conference.
		connectionCode: cs.world.uniqueCode(fixedCode ? () => fixedCode : entryCode)
	});
	// Supervision links the people behind the registrations.
	for (const rowId of [...(plan.memberIds ?? []), ...(plan.singleIds ?? [])]) {
		const participantId = cs.participantOfRow.get(rowId);
		if (participantId) cs.batch.supervision.push({ a: supervisorId, b: participantId });
	}
	return supervisorId;
}

export type StatusPlan = Partial<
	Pick<
		typeof schema.conferenceParticipant.$inferInsert,
		| 'paymentStatus'
		| 'termsAndConditions'
		| 'guardianConsent'
		| 'mediaConsent'
		| 'mediaConsentStatus'
		| 'didAttend'
		| 'accessCardId'
	>
> & { withDocumentNumber?: boolean; withAccessCard?: boolean };

/** Fills in the person's status in the conference; returns their `conferenceParticipant` id. */
export function addStatus(cs: ConferenceSeed, userId: string, plan: StatusPlan) {
	const { withDocumentNumber, withAccessCard, ...status } = plan;
	const row = cs.participant(userId);
	Object.assign(row, {
		assignedDocumentNumber: withDocumentNumber ? ++cs.documentNumber : null,
		accessCardId: withAccessCard ? `CARD-${++cs.accessCardNumber}` : null,
		...status
	});
	return row.id;
}

/** Everything signed and paid, as most people are once the conference runs. */
export const allDone: StatusPlan = {
	paymentStatus: 'DONE',
	termsAndConditions: 'DONE',
	guardianConsent: 'DONE',
	mediaConsent: 'DONE',
	mediaConsentStatus: 'ALLOWED_ALL',
	withDocumentNumber: true
};

/** A payment reference as the app prints it: four groups of four unambiguous characters. */
const paymentReference = () =>
	faker.string.fromCharacters('ACDEFHJKMNPRTUVWXY3479', 16).replace(/(.{4})(?=.)/g, '$1-');

export function addPayment(
	cs: ConferenceSeed,
	payerId: string,
	forUserIds: string[],
	received: boolean
) {
	// The reference is the row's primary key, unique across conferences.
	const id = cs.world.uniqueCode(paymentReference);
	const createdAt = faker.date.recent({ days: 20 });
	cs.batch.paymentTransaction.push({
		id,
		payerParticipantId: cs.participant(payerId).id,
		amount: (cs.conference.feeAmount ?? 0) * forUserIds.length,
		createdAt,
		updatedAt: createdAt,
		recievedAt: received ? faker.date.between({ from: createdAt, to: new Date() }) : null
	});
	for (const userId of forUserIds) {
		cs.batch.userReferenceInPaymentTransaction.push({
			paymentTransactionId: id,
			conferenceParticipantId: cs.participant(userId).id
		});
	}
}

/** Occasions the team took off the certificates: a scan there is recorded, never certified. */
const HIDDEN_FROM_CERTIFICATES = new Set(['Scanner-Test']);

export function addAttendance(
	cs: ConferenceSeed,
	statusId: string,
	recordedById: string,
	occasions: string[]
) {
	occasions.forEach((occasion, day) => {
		const timestamp = new Date(cs.startConference);
		timestamp.setDate(timestamp.getDate() + day);
		timestamp.setHours(8, faker.number.int({ min: 0, max: 59 }), 0, 0);
		// One session per occasion, shared by everybody who attended it
		const sessionId = `${cs.id}-attendance-${occasion}`;
		if (!cs.batch.attendanceSession.some((session) => session.id === sessionId)) {
			const startedAt = new Date(timestamp);
			startedAt.setHours(8, 0, 0, 0);
			const endedAt = new Date(startedAt);
			endedAt.setHours(18, 0, 0, 0);
			cs.batch.attendanceSession.push({
				id: sessionId,
				conferenceId: cs.id,
				occasion,
				startedAt,
				endedAt,
				createdById: recordedById,
				showOnCertificate: !HIDDEN_FROM_CERTIFICATES.has(occasion)
			});
		}
		cs.batch.attendanceEntry.push({
			conferenceParticipantId: statusId,
			sessionId,
			timestamp,
			recordedById
		});
	});
}
