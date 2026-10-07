import type { DevAccountSub } from '../seed-data/devAccounts';
import { PERSONA_NATION, doneAndPresent, roomyPreferences } from './conference';
import type { ConferenceSeed } from './context';
import {
	addAttendance,
	addDelegation,
	addPayment,
	addSingle,
	addStatus,
	addSupervisor,
	type StatusPlan
} from './participants';
import { joinCodes } from './plans';

/**
 * The dev accounts' parts in each conference. Every persona keeps one role across conferences,
 * so its dashboard lists the same participation at different stages.
 */

/** The application stages, in the three registration-phase conferences. */
export function addRegistrationPersonas(cs: ConferenceSeed) {
	const crowd = () => cs.world.crowdUser('participant');

	if (cs.plan.key === 'registration') {
		// Created a moment ago: alone, no preferences, application texts still empty.
		addDelegation(cs, {
			id: 'delegation-new',
			entryCode: joinCodes.newDelegation,
			applied: false,
			members: [{ userId: 'dev-reg-head-new' }],
			withoutTexts: true
		});
		addSingle(cs, {
			id: 'single-new',
			userId: 'dev-reg-single-new',
			applied: false,
			withoutTexts: true
		});
	}

	if (cs.plan.key === 'registration' || cs.plan.key === 'closed') {
		const ready =
			cs.plan.key === 'registration'
				? addDelegation(cs, {
						id: 'delegation-ready',
						entryCode: joinCodes.readyDelegation,
						applied: false,
						members: [
							{ userId: 'dev-reg-head-ready', head: true },
							{ userId: 'dev-reg-member', head: false },
							{ userId: crowd(), head: false }
						],
						preferences: roomyPreferences(cs, 3, 3, { withNonStateActor: true })
					})
				: undefined;
		const applied = addDelegation(cs, {
			id: 'delegation-applied',
			entryCode: joinCodes.appliedDelegation,
			applied: true,
			members: [{ userId: 'dev-reg-head-applied' }, { userId: crowd() }],
			preferences: roomyPreferences(cs, 2, 4, { withNonStateActor: true, skip: 3 })
		});
		addSingle(cs, {
			id: 'single-applied',
			userId: 'dev-reg-single-applied',
			applied: true,
			preferences: cs.customRoleIds.slice(0, 2)
		});
		addSupervisor(cs, {
			id: 'supervisor',
			userId: 'dev-reg-supervisor',
			code: joinCodes.supervisor,
			attends: true,
			memberIds: [...(ready?.memberIds.values() ?? []), ...applied.memberIds.values()]
		});
	}

	if (cs.plan.key === 'grace' || cs.plan.key === 'closed') {
		// Everything an application needs, but not sent: in "grace" the server still takes it,
		// in "closed" it refuses.
		addDelegation(cs, {
			id: 'delegation-late',
			entryCode: joinCodes.lateDelegation,
			applied: false,
			members: [{ userId: 'dev-reg-late' }, { userId: crowd() }],
			preferences: roomyPreferences(cs, 2, 3)
		});
	}
}

type Statuses = Partial<Record<DevAccountSub, StatusPlan>>;

const NSA_PREPARATION_STATUS: StatusPlan = {
	paymentStatus: 'DONE',
	termsAndConditions: 'DONE',
	mediaConsent: 'DONE',
	guardianConsent: 'DONE',
	mediaConsentStatus: 'ALLOWED_ALL',
	withDocumentNumber: true
};

/** Preparation: every combination of done, pending and problem somewhere among the personas. */
const preparationStatuses: Statuses = {
	'dev-head-delegate': {
		paymentStatus: 'PENDING',
		termsAndConditions: 'PENDING',
		mediaConsent: 'PENDING',
		mediaConsentStatus: 'NOT_SET'
	},
	'dev-delegate': {
		paymentStatus: 'DONE',
		termsAndConditions: 'PROBLEM',
		mediaConsent: 'DONE',
		mediaConsentStatus: 'PARTIALLY_ALLOWED',
		withDocumentNumber: true
	},
	'dev-delegate-minor': {
		paymentStatus: 'DONE',
		termsAndConditions: 'DONE',
		mediaConsent: 'DONE',
		guardianConsent: 'PENDING',
		mediaConsentStatus: 'ALLOWED_ALL'
	},
	'dev-nsa-delegate': NSA_PREPARATION_STATUS,
	'dev-single': {
		paymentStatus: 'PROBLEM',
		termsAndConditions: 'DONE',
		mediaConsent: 'PENDING',
		mediaConsentStatus: 'NOT_SET'
	}
	// The supervisors have no status row yet, which the app reads as everything pending.
};

/** During and after the conference: settled, apart from the minor who never showed up. */
const conferenceStatuses: Statuses = {
	'dev-head-delegate': doneAndPresent({ accessCardId: 'CARD-0001' }),
	'dev-delegate': doneAndPresent({
		accessCardId: 'CARD-0002',
		mediaConsentStatus: 'PARTIALLY_ALLOWED'
	}),
	'dev-delegate-minor': doneAndPresent({
		didAttend: false,
		mediaConsentStatus: 'NOT_ALLOWED',
		withDocumentNumber: false
	}),
	'dev-nsa-delegate': doneAndPresent(),
	'dev-single': doneAndPresent(),
	'dev-supervisor': doneAndPresent()
};

/** Whose status rows the tables above may describe, in a typed order to walk them in. */
const STATUS_HOLDERS: DevAccountSub[] = [
	'dev-head-delegate',
	'dev-delegate',
	'dev-delegate-minor',
	'dev-nsa-delegate',
	'dev-single',
	'dev-supervisor'
];

const attendance: Partial<Record<DevAccountSub, string[]>> = {
	'dev-head-delegate': ['Check-in Tag 1', 'Check-in Tag 2'],
	'dev-delegate': ['Check-in Tag 1'],
	'dev-nsa-delegate': ['Check-in Tag 1'],
	'dev-single': ['Check-in Tag 1'],
	'dev-supervisor': ['Check-in Tag 1']
};

/** The roles once seats are assigned, in both preparation conferences, Active and Post. */
export function addAssignedPersonas(cs: ConferenceSeed) {
	const crowd = () => cs.world.crowdUser('participant');
	const [first, second, third] = cs.committees;
	const preparing = cs.plan.conference.state === 'PREPARATION';

	const german = addDelegation(cs, {
		id: 'delegation-germany',
		entryCode: joinCodes.germanDelegation,
		applied: true,
		nation: PERSONA_NATION,
		members: [
			{ userId: 'dev-head-delegate', head: true, committeeId: first.id },
			{ userId: 'dev-delegate', head: false, committeeId: second.id },
			// Still without a committee while preparing, which gives the head delegate the
			// committee assignment task.
			{ userId: 'dev-delegate-minor', head: false, committeeId: preparing ? null : third.id }
		],
		preferences: [{ nation: PERSONA_NATION }, ...roomyPreferences(cs, 3, 2)]
	});

	const nsaPartner = crowd();
	addDelegation(cs, {
		id: 'delegation-nsa',
		applied: true,
		nonStateActorId: cs.nonStateActorIds[0],
		members: [{ userId: 'dev-nsa-delegate' }, { userId: nsaPartner }],
		preferences: [{ nonStateActorId: cs.nonStateActorIds[0] }, ...roomyPreferences(cs, 2, 2)]
	});

	const single = addSingle(cs, {
		id: 'single',
		userId: 'dev-single',
		applied: true,
		roleId: cs.customRoleIds[0],
		preferences: cs.customRoleIds.slice(0, 2)
	});

	const rejected = addDelegation(cs, {
		id: 'delegation-rejected',
		applied: true,
		members: [{ userId: 'dev-rejected-delegate' }, { userId: crowd() }],
		preferences: roomyPreferences(cs, 2, 3, { skip: 2 })
	});
	addSingle(cs, {
		id: 'single-rejected',
		userId: 'dev-rejected-single',
		applied: true,
		preferences: cs.customRoleIds.slice(1, 3)
	});

	addSupervisor(cs, {
		id: 'supervisor',
		userId: 'dev-supervisor',
		code: joinCodes.supervisor,
		attends: true,
		memberIds: [...german.memberIds.values(), ...rejected.memberIds.values()]
	});
	addSupervisor(cs, {
		id: 'supervisor-absent',
		userId: 'dev-supervisor-absent',
		code: joinCodes.supervisorAbsent,
		attends: false,
		singleIds: [single]
	});
	addSupervisor(cs, {
		id: 'supervisor-rejected',
		userId: 'dev-supervisor-rejected',
		code: joinCodes.supervisorRejected,
		attends: true,
		memberIds: [...rejected.memberIds.values()]
	});

	if (!cs.plan.with.participantStatus) return;

	const statuses = preparing ? preparationStatuses : conferenceStatuses;
	for (const userId of STATUS_HOLDERS) {
		const status = statuses[userId];
		if (!status) continue;
		const statusId = addStatus(cs, userId, status);
		const occasions = attendance[userId];
		if (cs.plan.with.attendance && occasions && status.didAttend) {
			addAttendance(cs, statusId, 'dev-team-member', occasions);
		}
	}
	addStatus(cs, nsaPartner, preparing ? NSA_PREPARATION_STATUS : doneAndPresent());

	if (preparing) {
		// Paid for themselves and the minor; the head delegate's own transfer is still open.
		addPayment(cs, 'dev-delegate', ['dev-delegate', 'dev-delegate-minor'], true);
		addPayment(cs, 'dev-head-delegate', ['dev-head-delegate'], false);
		addPayment(cs, 'dev-nsa-delegate', ['dev-nsa-delegate', nsaPartner], true);
		addPayment(cs, 'dev-single', ['dev-single'], false);
		addPayment(cs, 'dev-supervisor', ['dev-supervisor'], false);
	} else {
		addPayment(
			cs,
			'dev-head-delegate',
			['dev-head-delegate', 'dev-delegate', 'dev-delegate-minor'],
			true
		);
		addPayment(cs, 'dev-nsa-delegate', ['dev-nsa-delegate', nsaPartner], true);
		addPayment(cs, 'dev-single', ['dev-single'], true);
		addPayment(cs, 'dev-supervisor', ['dev-supervisor'], true);
	}
}
