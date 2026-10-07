import type { Insert } from '../rows';
import type { SeedBatch } from './batch';
import type { ConferencePlan } from './plans';

export interface SeedCommittee {
	id: string;
	name: string;
	abbreviation: string;
	nations: string[];
	agendaItemIds: string[];
}

export type CrowdKind = 'participant' | 'supervisor' | 'team';

/** What every part of the seed shares across conferences. */
export interface SeedWorld {
	batch: SeedBatch;
	/** Alpha-3 codes of every nation, lower case as the table stores them. */
	nations: string[];
	/** A new anonymous user of plausible age for the kind of role they will take. */
	crowdUser(kind: CrowdKind, options?: { incomplete?: boolean; ages?: [number, number] }): string;
}

/** One conference under construction: its structure, plus bookkeeping the scenarios share. */
export interface ConferenceSeed {
	plan: ConferencePlan;
	id: string;
	conference: Insert<'conference'>;
	startConference: Date;
	batch: SeedBatch;
	world: SeedWorld;
	committees: SeedCommittee[];
	nonStateActorIds: string[];
	customRoleIds: string[];
	/** Users holding a seat, for statuses, survey answers and papers. */
	acceptedUsers: string[];
	/** Delegations holding a nation, with their members' committees, for papers. */
	nationDelegations: {
		delegationId: string;
		nation: string;
		members: { userId: string; committeeId: string | null }[];
	}[];
	/** The anonymous delegations, for supervisors and the waiting list. */
	crowdDelegations: { headId: string; userIds: string[]; memberIds: string[] }[];
	/** Last document number handed out. */
	documentNumber: number;
	/** A deterministic id for a persona's row in this conference. */
	rowId(suffix: string): string;
	/** Draws from `make` until the value is new for this conference (entry codes, references). */
	uniqueCode(make: () => string): string;
}

export function createConferenceSeed(
	world: SeedWorld,
	plan: ConferencePlan,
	conference: Insert<'conference'> & { id: string },
	startConference: Date
): ConferenceSeed {
	const usedCodes = new Set<string>();
	return {
		plan,
		id: conference.id,
		conference,
		startConference,
		batch: world.batch,
		world,
		committees: [],
		nonStateActorIds: [],
		customRoleIds: [],
		acceptedUsers: [],
		nationDelegations: [],
		crowdDelegations: [],
		documentNumber: 0,
		rowId: (suffix) => `${conference.id}-${suffix}`,
		uniqueCode(make) {
			for (let attempt = 0; attempt < 1000; attempt++) {
				const code = make();
				if (!usedCodes.has(code)) {
					usedCodes.add(code);
					return code;
				}
			}
			throw new Error(`No unused code left in ${conference.id}; is a fixed code used twice?`);
		}
	};
}
