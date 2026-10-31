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
	const crowd = () => cs.world.crowdUser({ kind: 'participant' });

	if (cs.plan.key === 'registration') {
		// Created a moment ago: alone, no preferences, application texts still empty.
		addDelegation({
			cs,
			plan: {
				id: 'delegation-new',
				entryCode: joinCodes.newDelegation,
				applied: false,
				members: [{ userId: 'dev-reg-head-new' }],
				withoutTexts: true
			}
		});
		addSingle({
			cs,
			plan: {
				id: 'single-new',
				userId: 'dev-reg-single-new',
				applied: false,
				withoutTexts: true
			}
		});
	}

	if (cs.plan.key === 'registration') {
		addSingle({
			cs,
			plan: {
				id: 'single-mixed',
				userId: 'dev-mixed-supervisor',
				applied: true,
				preferences: cs.customRoleIds.slice(2, 4)
			}
		});
	}

	if (cs.plan.key === 'registration' || cs.plan.key === 'closed') {
		const ready =
			cs.plan.key === 'registration'
				? addDelegation({
						cs,
						plan: {
							id: 'delegation-ready',
							entryCode: joinCodes.readyDelegation,
							applied: false,
							members: [
								{ userId: 'dev-reg-head-ready', head: true },
								{ userId: 'dev-reg-member', head: false },
								{ userId: crowd(), head: false }
							],
							preferences: roomyPreferences({
								cs,
								size: 3,
								count: 3,
								options: { withNonStateActor: true }
							})
						}
					})
				: undefined;
		const applied = addDelegation({
			cs,
			plan: {
				id: 'delegation-applied',
				entryCode: joinCodes.appliedDelegation,
				applied: true,
				members: [{ userId: 'dev-reg-head-applied' }, { userId: crowd() }],
				preferences: roomyPreferences({
					cs,
					size: 2,
					count: 4,
					options: { withNonStateActor: true, skip: 3 }
				})
			}
		});
		addSingle({
			cs,
			plan: {
				id: 'single-applied',
				userId: 'dev-reg-single-applied',
				applied: true,
				preferences: cs.customRoleIds.slice(0, 2)
			}
		});
		addSupervisor({
			cs,
			plan: {
				id: 'supervisor',
				userId: 'dev-reg-supervisor',
				// Connection codes are unique across conferences; "Closed" draws a random one.
				code: cs.plan.key === 'registration' ? joinCodes.supervisor : undefined,
				attends: true,
				memberIds: [...(ready?.memberIds.values() ?? []), ...applied.memberIds.values()]
			}
		});
	}

	if (cs.plan.key === 'grace' || cs.plan.key === 'closed') {
		// Everything an application needs, but not sent: in "grace" the server still takes it,
		// in "closed" it refuses.
		addDelegation({
			cs,
			plan: {
				id: 'delegation-late',
				entryCode: joinCodes.lateDelegation,
				applied: false,
				members: [{ userId: 'dev-reg-late' }, { userId: crowd() }],
				preferences: roomyPreferences({ cs, size: 2, count: 3 })
			}
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
	'dev-nsa-delegate': doneAndPresent({ accessCardId: 'CARD-0003' }),
	'dev-single': doneAndPresent({ accessCardId: 'CARD-0004' }),
	'dev-supervisor': doneAndPresent({ accessCardId: 'CARD-0005' })
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
	// The scanner test run is taken off the certificates (`HIDDEN_FROM_CERTIFICATES`)
	'dev-head-delegate': ['Check-in Tag 1', 'Check-in Tag 2', 'Scanner-Test'],
	'dev-delegate': ['Check-in Tag 1'],
	'dev-nsa-delegate': ['Check-in Tag 1'],
	'dev-single': ['Check-in Tag 1'],
	'dev-supervisor': ['Check-in Tag 1']
};

/** The roles once seats are assigned, in both preparation conferences, Active and Post. */
export function addAssignedPersonas(cs: ConferenceSeed) {
	const crowd = () => cs.world.crowdUser({ kind: 'participant' });
	const [first, second, third] = cs.committees;
	const preparing = cs.plan.conference.state === 'PREPARATION';

	const german = addDelegation({
		cs,
		plan: {
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
			preferences: [{ nation: PERSONA_NATION }, ...roomyPreferences({ cs, size: 3, count: 2 })]
		}
	});

	const nsaPartner = crowd();
	addDelegation({
		cs,
		plan: {
			id: 'delegation-nsa',
			applied: true,
			nonStateActorId: cs.nonStateActorIds[0],
			members: [{ userId: 'dev-nsa-delegate' }, { userId: nsaPartner }],
			preferences: [
				{ nonStateActorId: cs.nonStateActorIds[0] },
				...roomyPreferences({ cs, size: 2, count: 2 })
			]
		}
	});

	const single = addSingle({
		cs,
		plan: {
			id: 'single',
			userId: 'dev-single',
			applied: true,
			roleId: cs.customRoleIds[0],
			preferences: cs.customRoleIds.slice(0, 2)
		}
	});

	// A team member elsewhere, a participant with a role here.
	if (['preparation', 'post'].includes(cs.plan.key)) {
		addSingle({
			cs,
			plan: {
				id: 'single-mixed',
				userId: 'dev-mixed-team',
				applied: true,
				roleId: cs.customRoleIds[3],
				preferences: cs.customRoleIds.slice(3, 5)
			}
		});
	}

	const rejected = addDelegation({
		cs,
		plan: {
			id: 'delegation-rejected',
			applied: true,
			members: [{ userId: 'dev-rejected-delegate' }, { userId: crowd() }],
			preferences: roomyPreferences({ cs, size: 2, count: 3, options: { skip: 2 } })
		}
	});
	addSingle({
		cs,
		plan: {
			id: 'single-rejected',
			userId: 'dev-rejected-single',
			applied: true,
			preferences: cs.customRoleIds.slice(1, 3)
		}
	});

	addPersonaSupervisors({
		cs,
		supervised: {
			delegationMemberIds: [...german.memberIds.values()],
			rejectedMemberIds: [...rejected.memberIds.values()],
			singleId: single
		}
	});
	addPersonaStatuses({ cs, nsaPartner });
}

/** The supervisors of the assigned personas: present, mixed, absent and of the rejected ones. */
function addPersonaSupervisors({
	cs,
	supervised
}: {
	cs: ConferenceSeed;
	supervised: { delegationMemberIds: string[]; rejectedMemberIds: string[]; singleId: string };
}) {
	// Connection codes are unique across conferences: the fixed ones belong to "Seed 5", and
	// "Seed 2" holds `joinCodes.supervisor`.
	const fixedCodes = cs.plan.key === 'preparation';
	addSupervisor({
		cs,
		plan: {
			id: 'supervisor',
			userId: 'dev-supervisor',
			attends: true,
			memberIds: [...supervised.delegationMemberIds, ...supervised.rejectedMemberIds]
		}
	});
	if (['preparation', 'active', 'post'].includes(cs.plan.key)) {
		addSupervisor({
			cs,
			plan: {
				id: 'supervisor-mixed',
				userId: 'dev-mixed-supervisor',
				attends: true,
				memberIds: supervised.delegationMemberIds
			}
		});
	}
	addSupervisor({
		cs,
		plan: {
			id: 'supervisor-absent',
			userId: 'dev-supervisor-absent',
			code: fixedCodes ? joinCodes.supervisorAbsent : undefined,
			attends: false,
			singleIds: [supervised.singleId]
		}
	});
	addSupervisor({
		cs,
		plan: {
			id: 'supervisor-rejected',
			userId: 'dev-supervisor-rejected',
			code: fixedCodes ? joinCodes.supervisorRejected : undefined,
			attends: true,
			memberIds: supervised.rejectedMemberIds
		}
	});
}

/** The statuses, attendance and payments of the assigned personas and the actor's partner. */
function addPersonaStatuses({ cs, nsaPartner }: { cs: ConferenceSeed; nsaPartner: string }) {
	if (!cs.plan.with.participantStatus) return;

	const preparing = cs.plan.conference.state === 'PREPARATION';
	const statuses = preparing ? preparationStatuses : conferenceStatuses;
	for (const userId of STATUS_HOLDERS) {
		const status = statuses[userId];
		if (!status) continue;
		const statusId = addStatus({ cs, userId, plan: status });
		const occasions = attendance[userId];
		if (cs.plan.with.attendance && occasions && status.didAttend) {
			addAttendance({ cs, statusId, recordedById: 'dev-team-member', occasions });
		}
	}
	addStatus({
		cs,
		userId: nsaPartner,
		plan: preparing ? NSA_PREPARATION_STATUS : doneAndPresent()
	});

	if (preparing) {
		// Paid for themselves and the minor; the head delegate's own transfer is still open.
		addPayment({
			cs,
			payerId: 'dev-delegate',
			forUserIds: ['dev-delegate', 'dev-delegate-minor'],
			received: true
		});
		addPayment({
			cs,
			payerId: 'dev-head-delegate',
			forUserIds: ['dev-head-delegate'],
			received: false
		});
		addPayment({
			cs,
			payerId: 'dev-nsa-delegate',
			forUserIds: ['dev-nsa-delegate', nsaPartner],
			received: true
		});
		addPayment({ cs, payerId: 'dev-single', forUserIds: ['dev-single'], received: false });
		addPayment({ cs, payerId: 'dev-supervisor', forUserIds: ['dev-supervisor'], received: false });
	} else {
		addPayment({
			cs,
			payerId: 'dev-head-delegate',
			forUserIds: ['dev-head-delegate', 'dev-delegate', 'dev-delegate-minor'],
			received: true
		});
		addPayment({
			cs,
			payerId: 'dev-nsa-delegate',
			forUserIds: ['dev-nsa-delegate', nsaPartner],
			received: true
		});
		addPayment({ cs, payerId: 'dev-single', forUserIds: ['dev-single'], received: true });
		addPayment({ cs, payerId: 'dev-supervisor', forUserIds: ['dev-supervisor'], received: true });
	}
}
