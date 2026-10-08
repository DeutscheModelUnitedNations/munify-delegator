import { devAccounts } from '../seed-data/devAccounts';
import { conferencePlans, invitationTokens, joinCodes, seedConferenceId } from './plans';

/** The console guide after seeding: which conference is which, and whom to sign in as. */
export function printOverview() {
	const line = (text = '') => console.info(text);

	line();
	line('Conferences (dashboard: /dashboard/<id>, management: /dashboard/<id>/management)');
	for (const plan of conferencePlans) {
		line(`  ${plan.conference.title.padEnd(36)} ${seedConferenceId(plan.key)}`);
		line(`  ${''.padEnd(36)} ${plan.summary}`);
	}

	line();
	line('Accounts on the oidc-mock login page');
	for (const account of devAccounts) {
		line(`  ${account.label.padEnd(48)} ${account.sub}`);
	}

	line();
	line('Codes');
	line(
		`  Join "Seed 2": new delegation ${joinCodes.newDelegation}, ready ${joinCodes.readyDelegation}, applied ${joinCodes.appliedDelegation} (refused)`
	);
	line(`  Join "Seed 3"/"Seed 4": late delegation ${joinCodes.lateDelegation}`);
	line(
		`  Supervisor codes: ${joinCodes.supervisor} (attending), ${joinCodes.supervisorAbsent} (absent), ${joinCodes.supervisorRejected} (rejected students)`
	);

	line();
	line('Team invitations in "Seed 5 · Preparation"');
	for (const [state, token] of Object.entries(invitationTokens)) {
		line(`  ${state.padEnd(8)} /auth/accept-invitation?token=${token}`);
	}
	line();
	line(
		'Possible duplicate: "Simon Beworben" (dev-reg-single-applied) had an earlier account with a'
	);
	line('  care note in "Seed 8 · Post"; the plausibility page of "Seed 2" shows the pair');
	line();
	line('Done!');
}
