import { makeSeedTeamMember } from '../seed-data/teamMember';
import type { ConferenceSeed } from './context';
import {
	accountId,
	duplicateScenarios,
	scenarioPairs,
	scenarioUsers,
	type Participation
} from './duplicateScenarios';
import { addDelegation, addSingle, addSupervisor } from './participants';
import { addWaitingListEntry } from './conference';
import type { SeedBatch } from './batch';

/**
 * Writes the possible-duplicate scenarios (`duplicateScenarios.ts`) into the seed: the accounts,
 * who took part where, and the stored pairs. The accounts of the earlier conferences are in
 * "Seed 8 · Post" (the dev team is on its team, so participant care reads them anyway) and in
 * "Seed 10 · Other organizers" (it is not, so they are readable only through the pair); the new
 * ones are in "Seed 2 · Registration open", whose plausibility page lists the pairs.
 */

/** The users and the stored pairs. A dev account's user row exists already. */
export function addDuplicateScenarioAccounts(batch: SeedBatch) {
	batch.user.push(...scenarioUsers());
	batch.possibleDuplicate.push(...scenarioPairs());
}

/** Writes one part an account played, except a delegate's: those are gathered per delegation. */
function addPart(cs: ConferenceSeed, userId: string, part: Participation) {
	if (part.as === 'single') {
		addSingle(cs, { userId, applied: true, roleId: cs.customRoleIds[0] });
	} else if (part.as === 'supervisor') {
		addSupervisor(cs, { userId, attends: true });
	} else if (part.as === 'waitingList') {
		addWaitingListEntry(cs, userId);
	}
}

/** The parts the scenarios' accounts played in this conference; a no-op in the other ones. */
export function addDuplicateScenarioParticipants(cs: ConferenceSeed) {
	for (const scenario of duplicateScenarios) {
		const delegations = new Map<string, string[]>();
		for (const account of scenario.accounts) {
			const userId = accountId(scenario, account);
			for (const part of account.took.filter((took) => took.at === cs.plan.key)) {
				if (part.as !== 'delegate') {
					addPart(cs, userId, part);
					continue;
				}
				const group = part.group ?? account.name;
				delegations.set(group, [...(delegations.get(group) ?? []), userId]);
			}
		}
		for (const userIds of delegations.values()) {
			addDelegation(cs, {
				applied: true,
				members: userIds.map((userId, index) => ({ userId, head: index === 0 }))
			});
		}
	}
}

/** The other organizers' conference has a team of its own, and none of the dev personas. */
export function addElsewhereTeam(cs: ConferenceSeed) {
	cs.batch.teamMember.push(
		makeSeedTeamMember({
			conferenceId: cs.id,
			userId: cs.world.crowdUser('team'),
			role: 'PROJECT_MANAGEMENT'
		})
	);
}
