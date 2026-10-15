import type * as schema from '../schema';
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
	/**
	 * Draws from `make` until the value is new across every conference: supervisor connection
	 * codes and payment references are unique world-wide.
	 */
	uniqueCode(make: () => string): string;
}

/** A `uniqueCode` drawing against its own set of used values. */
export function createUniqueCode(scope: string) {
	const used = new Set<string>();
	return (make: () => string) => {
		for (let attempt = 0; attempt < 1000; attempt++) {
			const code = make();
			if (!used.has(code)) {
				used.add(code);
				return code;
			}
		}
		throw new Error(`No unused code left in ${scope}; is a fixed code used twice?`);
	};
}

/** One conference under construction: its structure, plus bookkeeping the scenarios share. */
export interface ConferenceSeed {
	plan: ConferencePlan;
	id: string;
	conference: typeof schema.conference.$inferInsert;
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
	/** Last access card number handed out to the crowd; the personas hold the low ones. */
	accessCardNumber: number;
	/** A deterministic id for a persona's row in this conference. */
	rowId(suffix: string): string;
	/** The conference's role for a nation (alpha-3), created the first time it is asked for. */
	nationRoleId(nation: string): string;
	/**
	 * The person's `conferenceParticipant` row in this conference, created the first time it is
	 * asked for. Statuses fill it in; registrations and supervision point at its id.
	 */
	participant(userId: string): typeof schema.conferenceParticipant.$inferInsert & { id: string };
	/** The `conferenceParticipant` id behind a delegation member or single participant row. */
	participantOfRow: Map<string, string>;
	/** Draws from `make` until the value is new for this conference (delegation entry codes). */
	uniqueCode(make: () => string): string;
}

export function createConferenceSeed(
	world: SeedWorld,
	plan: ConferencePlan,
	conference: typeof schema.conference.$inferInsert & { id: string },
	startConference: Date
): ConferenceSeed {
	const nationRoles = new Map<string, string>();
	const participants = new Map<
		string,
		typeof schema.conferenceParticipant.$inferInsert & { id: string }
	>();
	const rowId = (suffix: string) => `${conference.id}-${suffix}`;
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
		accessCardNumber: 100,
		rowId,
		participantOfRow: new Map(),
		participant(userId) {
			let row = participants.get(userId);
			if (!row) {
				row = { id: rowId(`participant-${userId}`), conferenceId: conference.id, userId };
				participants.set(userId, row);
				world.batch.conferenceParticipant.push(row);
			}
			return row;
		},
		nationRoleId(nation) {
			let id = nationRoles.get(nation);
			if (!id) {
				id = rowId(`nation-${nation}`);
				nationRoles.set(nation, id);
				world.batch.conferenceRole.push({
					id,
					conferenceId: conference.id,
					kind: 'NATION',
					nationAlpha3Code: nation
				});
			}
			return id;
		},
		uniqueCode: createUniqueCode(conference.id)
	};
}
