import { faker } from '@faker-js/faker';
import type { Insert } from '../rows';
import type { ConferenceSeed } from './context';

/**
 * Row builders for the ways a person takes part in a conference. Personas and crowd go through
 * the same functions, so both satisfy the same invariants: one head delegate per delegation, the
 * role applications ranked without gaps, a seat count that covers an applied delegation.
 */

const APPLICATION_TEXTS = {
	school: () =>
		`${faker.helpers.arrayElement(['Gymnasium', 'Gesamtschule', 'Berufskolleg'])} ${faker.location.city()}`,
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
		school: plan.withoutTexts ? null : APPLICATION_TEXTS.school(),
		motivation: plan.withoutTexts ? null : APPLICATION_TEXTS.motivation(),
		experience: plan.withoutTexts ? null : APPLICATION_TEXTS.experience(),
		assignedNationAlpha3Code: plan.nation ?? null,
		assignedNonStateActorId: plan.nonStateActorId ?? null
	});

	const memberIds = new Map<string, string>();
	plan.members.forEach((member, index) => {
		const memberId = plan.id
			? cs.rowId(`${plan.id}-member-${index}`)
			: faker.database.mongodbObjectId();
		memberIds.set(member.userId, memberId);
		cs.batch.delegationMember.push({
			id: memberId,
			conferenceId: cs.id,
			delegationId,
			userId: member.userId,
			isHeadDelegate: member.head ?? index === 0,
			assignedCommitteeId: member.committeeId ?? null
		});
	});

	(plan.preferences ?? []).forEach((preference, index) => {
		cs.batch.roleApplication.push({
			delegationId,
			// Ranks run 1..n, as `normalizeRoleApplicationRanks` keeps them.
			rank: index + 1,
			...('nation' in preference
				? { nationId: preference.nation }
				: { nonStateActorId: preference.nonStateActorId })
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
	cs.batch.singleParticipant.push({
		id: singleId,
		conferenceId: cs.id,
		userId: plan.userId,
		applied: plan.applied,
		school: plan.withoutTexts ? null : APPLICATION_TEXTS.school(),
		motivation: plan.withoutTexts ? null : APPLICATION_TEXTS.motivation(),
		experience: plan.withoutTexts ? null : APPLICATION_TEXTS.experience(),
		assignedRoleId: plan.roleId ?? null,
		assignmentDetails: plan.roleId ? 'Ausschuss nach Absprache mit der Konferenzleitung' : null
	});
	for (const roleId of plan.preferences ?? []) {
		cs.batch.customConferenceRoleToSingleParticipant.push({ a: roleId, b: singleId });
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
	cs.batch.conferenceSupervisor.push({
		id: supervisorId,
		conferenceId: cs.id,
		userId: plan.userId,
		plansOwnAttendenceAtConference: plan.attends,
		connectionCode: cs.uniqueCode(fixedCode ? () => fixedCode : entryCode)
	});
	for (const memberId of plan.memberIds ?? []) {
		cs.batch.conferenceSupervisorToDelegationMember.push({ a: supervisorId, b: memberId });
	}
	for (const singleId of plan.singleIds ?? []) {
		cs.batch.conferenceSupervisorToSingleParticipant.push({ a: supervisorId, b: singleId });
	}
	return supervisorId;
}

export type StatusPlan = Partial<
	Pick<
		Insert<'conferenceParticipantStatus'>,
		| 'paymentStatus'
		| 'termsAndConditions'
		| 'guardianConsent'
		| 'mediaConsent'
		| 'mediaConsentStatus'
		| 'didAttend'
		| 'accessCardId'
	>
> & { withDocumentNumber?: boolean; withAccessCard?: boolean };

export function addStatus(cs: ConferenceSeed, userId: string, plan: StatusPlan) {
	const { withDocumentNumber, withAccessCard, ...status } = plan;
	const statusId = faker.database.mongodbObjectId();
	cs.batch.conferenceParticipantStatus.push({
		id: statusId,
		conferenceId: cs.id,
		userId,
		assignedDocumentNumber: withDocumentNumber ? ++cs.documentNumber : null,
		accessCardId: withAccessCard ? `CARD-${++cs.accessCardNumber}` : null,
		...status
	});
	return statusId;
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
	const id = cs.uniqueCode(paymentReference);
	const createdAt = faker.date.recent({ days: 20 });
	cs.batch.paymentTransaction.push({
		id,
		conferenceId: cs.id,
		userId: payerId,
		amount: (cs.conference.feeAmount ?? 0) * forUserIds.length,
		createdAt,
		updatedAt: createdAt,
		recievedAt: received ? faker.date.between({ from: createdAt, to: new Date() }) : null
	});
	for (const userId of forUserIds) {
		cs.batch.userReferenceInPaymentTransaction.push({ paymentTransactionId: id, userId });
	}
}

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
		cs.batch.attendanceEntry.push({
			conferenceParticipantStatusId: statusId,
			occasion,
			timestamp,
			recordedById
		});
	});
}
