import { devAccounts } from '../seed-data/devAccounts';
import { duplicateScenarios } from './duplicateScenarios';
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
	line('Possible duplicates (plausibility page of "Seed 2", sign in as dev-team-care)');
	for (const scenario of duplicateScenarios) {
		line(`  ${scenario.key.padEnd(24)} ${scenario.summary}`);
	}
	line();
	line('Done!');
}
